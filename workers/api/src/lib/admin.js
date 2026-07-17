// Admin-only route handlers: tier management, staff user management, invite
// acceptance, and self change-password. Split out of index.js to keep each file
// focused. handleAdminRoutes returns a Response for a matched route, or null so
// index.js can continue to its generic entity routing.
//
// NOTE: this file currently only implements the /api/admin/tiers* branches
// (Task 4). Tasks 5-6 extend handleAdminRoutes with user-management and
// invite/change-password branches, adding their own imports at that point.

import { json, parseJson, nowIso, newId } from './http.js'
import { requireStaff, requireCapability } from './auth.js'
import { isValidCapabilitySet } from './rbac.js'

const SUPER_TIER_RANK = 0

export async function handleAdminRoutes(context) {
  const { request } = context
  const url = new URL(request.url)
  const { pathname } = url
  const method = request.method

  // ---- tier management (/api/admin/tiers*) ----
  if (pathname === '/api/admin/tiers' && method === 'GET') return listTiers(context)
  if (pathname === '/api/admin/tiers' && method === 'POST') return createTier(context)
  if (pathname === '/api/admin/tiers/reorder' && method === 'POST') return reorderTiers(context)
  const tierItem = pathname.match(/^\/api\/admin\/tiers\/([A-Za-z0-9_-]+)$/)
  if (tierItem) {
    if (method === 'PATCH') return patchTier(context, tierItem[1])
    if (method === 'DELETE') return deleteTier(context, tierItem[1])
    return json({ error: 'method not allowed' }, 405)
  }

  return null
}

// GET /api/admin/tiers — any user-capable staff (for the invite tier picker).
async function listTiers(context) {
  const auth = await requireCapability(context, 'users')
  if (auth.response) return auth.response
  const rs = await context.env.DB
    .prepare('SELECT id, name, rank, capabilities, is_system FROM admin_tiers ORDER BY rank ASC')
    .all()
  const tiers = (rs.results || []).map((t) => ({
    id: t.id, name: t.name, rank: t.rank, is_system: !!t.is_system,
    capabilities: safeParseArray(t.capabilities),
  }))
  return json(tiers)
}

// POST /api/admin/tiers — super admin only.
async function createTier(context) {
  const auth = await requireStaff(context)
  if (auth.response) return auth.response
  if (auth.user.rank !== SUPER_TIER_RANK) return json({ error: 'Only the super admin can manage tiers' }, 403)

  const body = await parseJson(context.request)
  const name = (body.name || '').trim()
  const capabilities = body.capabilities
  if (!name) return json({ error: 'name is required' }, 400)
  if (!isValidCapabilitySet(capabilities)) return json({ error: 'invalid capabilities' }, 400)

  const maxRow = await context.env.DB.prepare('SELECT MAX(rank) AS maxrank FROM admin_tiers').first()
  const rank = (maxRow && Number.isInteger(maxRow.maxrank) ? maxRow.maxrank : 0) + 1
  const id = newId()
  const now = nowIso()
  await context.env.DB
    .prepare('INSERT INTO admin_tiers (id, name, rank, capabilities, is_system, created_date, updated_date) VALUES (?,?,?,?,0,?,?)')
    .bind(id, name, rank, JSON.stringify(capabilities), now, now)
    .run()
  return json({ id, name, rank, capabilities, is_system: false }, 201)
}

// PATCH /api/admin/tiers/:id — super admin only; system tier immutable.
async function patchTier(context, id) {
  const auth = await requireStaff(context)
  if (auth.response) return auth.response
  if (auth.user.rank !== SUPER_TIER_RANK) return json({ error: 'Only the super admin can manage tiers' }, 403)

  const tier = await context.env.DB.prepare('SELECT id, is_system, rank FROM admin_tiers WHERE id = ?').bind(id).first()
  if (!tier) return json({ error: 'not found' }, 404)
  if (tier.is_system || tier.rank === SUPER_TIER_RANK) return json({ error: 'The super admin tier is locked' }, 403)

  const body = await parseJson(context.request)
  const sets = []
  const binds = []
  if (typeof body.name === 'string' && body.name.trim()) { sets.push('name = ?'); binds.push(body.name.trim()) }
  if ('capabilities' in body) {
    if (!isValidCapabilitySet(body.capabilities)) return json({ error: 'invalid capabilities' }, 400)
    sets.push('capabilities = ?'); binds.push(JSON.stringify(body.capabilities))
  }
  if (!sets.length) return json({ error: 'no writable fields' }, 400)
  sets.push('updated_date = ?'); binds.push(nowIso())
  binds.push(id)
  await context.env.DB.prepare(`UPDATE admin_tiers SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run()
  const row = await context.env.DB.prepare('SELECT id, name, rank, capabilities, is_system FROM admin_tiers WHERE id = ?').bind(id).first()
  return json({ id: row.id, name: row.name, rank: row.rank, is_system: !!row.is_system, capabilities: safeParseArray(row.capabilities) })
}

// POST /api/admin/tiers/reorder — super admin only. Body { orderedIds: [...] } excludes
// the super tier; reassigns ranks 1..N. Two-pass (temp negatives) to dodge the UNIQUE(rank).
async function reorderTiers(context) {
  const auth = await requireStaff(context)
  if (auth.response) return auth.response
  if (auth.user.rank !== SUPER_TIER_RANK) return json({ error: 'Only the super admin can manage tiers' }, 403)

  const body = await parseJson(context.request)
  const ids = Array.isArray(body.orderedIds) ? body.orderedIds : null
  if (!ids || !ids.length) return json({ error: 'orderedIds required' }, 400)

  const now = nowIso()
  const pass1 = ids.map((id, i) =>
    context.env.DB.prepare('UPDATE admin_tiers SET rank = ?, updated_date = ? WHERE id = ? AND is_system = 0')
      .bind(-(i + 1), now, id))
  const pass2 = ids.map((id, i) =>
    context.env.DB.prepare('UPDATE admin_tiers SET rank = ? WHERE id = ? AND is_system = 0')
      .bind(i + 1, id))
  await context.env.DB.batch([...pass1, ...pass2])
  return json({ success: true })
}

// DELETE /api/admin/tiers/:id — super admin only; system locked; blocked if users assigned.
async function deleteTier(context, id) {
  const auth = await requireStaff(context)
  if (auth.response) return auth.response
  if (auth.user.rank !== SUPER_TIER_RANK) return json({ error: 'Only the super admin can manage tiers' }, 403)

  const tier = await context.env.DB.prepare('SELECT id, is_system, rank FROM admin_tiers WHERE id = ?').bind(id).first()
  if (!tier) return json({ error: 'not found' }, 404)
  if (tier.is_system || tier.rank === SUPER_TIER_RANK) return json({ error: 'The super admin tier is locked' }, 403)

  const countRow = await context.env.DB.prepare('SELECT COUNT(*) AS n FROM users WHERE tier_id = ?').bind(id).first()
  if (countRow && countRow.n > 0) return json({ error: 'Reassign the tier’s users before deleting it' }, 409)

  await context.env.DB.prepare('DELETE FROM admin_tiers WHERE id = ?').bind(id).run()
  return json({ success: true })
}

function safeParseArray(text) {
  if (!text) return []
  try { const v = JSON.parse(text); return Array.isArray(v) ? v : [] } catch { return [] }
}
