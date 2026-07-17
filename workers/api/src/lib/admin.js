// Admin-only route handlers: tier management, staff user management, invite
// acceptance, and self change-password. Split out of index.js to keep each file
// focused. handleAdminRoutes returns a Response for a matched route, or null so
// index.js can continue to its generic entity routing.
//
// NOTE: this file implements the /api/admin/tiers* branches (Task 4) and the
// /api/admin/users* staff-management + copy-link invite branches (Task 5).
// Task 6 extends handleAdminRoutes further with invite-accept and
// change-password branches, adding its own imports at that point.

import { json, parseJson, nowIso, newId } from './http.js'
import { requireStaff, requireCapability, requireAuth, getSession, sha256Hex, generateInviteToken, INVITE_TTL_S } from './auth.js'
import { isValidCapabilitySet, canManage, capsSubsetOf } from './rbac.js'

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

  // ---- staff user management (/api/admin/users*) ----
  if (pathname === '/api/admin/users' && method === 'GET') return listUsers(context)
  if (pathname === '/api/admin/users' && method === 'POST') return inviteUser(context)
  const reinvite = pathname.match(/^\/api\/admin\/users\/([A-Za-z0-9_-]+)\/reinvite$/)
  if (reinvite && method === 'POST') return reinviteUser(context, reinvite[1])
  const userItem = pathname.match(/^\/api\/admin\/users\/([A-Za-z0-9_-]+)$/)
  if (userItem) {
    if (method === 'PATCH') return patchUser(context, userItem[1])
    if (method === 'DELETE') return deleteUser(context, userItem[1])
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

// Fetch a manageable staff user (must exist, be staff, and outrank comparison happens
// at the call site). Returns the row with tier rank, or null.
async function loadStaffTarget(env, id) {
  return env.DB
    .prepare(
      `SELECT u.id, u.email, u.full_name, u.tier_id, u.is_active, u.invited_by,
              (u.password_hash IS NOT NULL) AS has_password,
              t.name AS tier_name, t.rank AS tier_rank
       FROM users u JOIN admin_tiers t ON t.id = u.tier_id
       WHERE u.id = ? AND u.role = 'staff'`
    ).bind(id).first()
}

function userStatus(row) {
  if (row.is_active) return 'active'
  return row.has_password ? 'disabled' : 'pending'
}

// GET /api/admin/users — staff you may manage (rank strictly below yours; super sees all).
async function listUsers(context) {
  const auth = await requireCapability(context, 'users')
  if (auth.response) return auth.response
  const me = auth.user
  const rs = await context.env.DB
    .prepare(
      `SELECT u.id, u.email, u.full_name, u.tier_id, u.is_active, u.invited_by,
              (u.password_hash IS NOT NULL) AS has_password,
              t.name AS tier_name, t.rank AS tier_rank
       FROM users u JOIN admin_tiers t ON t.id = u.tier_id
       WHERE u.role = 'staff'
       ORDER BY t.rank ASC, u.full_name ASC`
    ).all()
  const rows = (rs.results || [])
    .filter((r) => r.id !== me.id && canManage(me.rank, r.tier_rank))
    .map((r) => ({
      id: r.id, email: r.email, full_name: r.full_name, tier_id: r.tier_id,
      tier_name: r.tier_name, rank: r.tier_rank, is_active: !!r.is_active,
      status: userStatus(r), invited_by: r.invited_by || null,
    }))
  return json(rows)
}

// POST /api/admin/users — invite { email, full_name, tier_id }.
async function inviteUser(context) {
  const auth = await requireCapability(context, 'users')
  if (auth.response) return auth.response
  const me = auth.user
  const body = await parseJson(context.request)
  const email = (body.email || '').trim().toLowerCase()
  const fullName = (body.full_name || '').trim()
  const tierId = body.tier_id
  if (!email || !fullName || !tierId) return json({ error: 'email, full_name, and tier_id are required' }, 400)

  const tier = await context.env.DB.prepare('SELECT id, rank, capabilities, is_system FROM admin_tiers WHERE id = ?').bind(tierId).first()
  if (!tier) return json({ error: 'unknown tier' }, 400)
  if (tier.is_system || tier.rank === SUPER_TIER_RANK) return json({ error: 'Cannot assign the super admin tier' }, 403)
  if (!canManage(me.rank, tier.rank)) return json({ error: 'You can only assign tiers below your own' }, 403)
  if (!capsSubsetOf(safeParseArray(tier.capabilities), me.capabilities, me.rank)) {
    return json({ error: 'That tier grants capabilities you do not have' }, 403)
  }

  const existing = await context.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (existing) return json({ error: 'A user with that email already exists' }, 409)

  const id = newId()
  const now = nowIso()
  const rawToken = generateInviteToken()
  const tokenHash = await sha256Hex(rawToken)
  const expires = new Date(Date.now() + INVITE_TTL_S * 1000).toISOString()
  await context.env.DB
    .prepare(
      `INSERT INTO users (id, email, password_hash, role, full_name, tier_id, is_active,
                          invited_by, invite_token_hash, invite_expires, created_date, updated_date)
       VALUES (?, ?, NULL, 'staff', ?, ?, 0, ?, ?, ?, ?, ?)`
    )
    .bind(id, email, fullName, tierId, me.id, tokenHash, expires, now, now)
    .run()

  const origin = new URL(context.request.url).origin
  return json({
    user: { id, email, full_name: fullName, tier_id: tierId, status: 'pending', is_active: false },
    invite_url: `${origin}/invite/${rawToken}`,
  }, 201)
}

// POST /api/admin/users/:id/reinvite — fresh token + link for a pending user.
async function reinviteUser(context, id) {
  const auth = await requireCapability(context, 'users')
  if (auth.response) return auth.response
  const me = auth.user
  const target = await loadStaffTarget(context.env, id)
  if (!target) return json({ error: 'not found' }, 404)
  if (!canManage(me.rank, target.tier_rank)) return json({ error: 'Insufficient privileges' }, 403)
  if (target.has_password) return json({ error: 'That user has already set up their account' }, 409)

  const rawToken = generateInviteToken()
  const tokenHash = await sha256Hex(rawToken)
  const expires = new Date(Date.now() + INVITE_TTL_S * 1000).toISOString()
  await context.env.DB
    .prepare('UPDATE users SET invite_token_hash = ?, invite_expires = ?, is_active = 0, updated_date = ? WHERE id = ?')
    .bind(tokenHash, expires, nowIso(), id)
    .run()
  const origin = new URL(context.request.url).origin
  return json({ invite_url: `${origin}/invite/${rawToken}` })
}

// PATCH /api/admin/users/:id — self may change own full_name only; otherwise manage below.
async function patchUser(context, id) {
  const authed = await requireAuth(context)
  if (authed.response) return authed.response
  const me = await getSession(context)
  const body = await parseJson(context.request)

  if (id === me.id) {
    if (typeof body.full_name !== 'string' || !body.full_name.trim()) {
      return json({ error: 'You may only update your own name here' }, 400)
    }
    await context.env.DB.prepare('UPDATE users SET full_name = ?, updated_date = ? WHERE id = ?')
      .bind(body.full_name.trim(), nowIso(), id).run()
    return json({ success: true })
  }

  const capGate = await requireCapability(context, 'users')
  if (capGate.response) return capGate.response
  const target = await loadStaffTarget(context.env, id)
  if (!target) return json({ error: 'not found' }, 404)
  if (target.tier_rank === SUPER_TIER_RANK) return json({ error: 'The super admin cannot be modified' }, 403)
  if (!canManage(me.rank, target.tier_rank)) return json({ error: 'Insufficient privileges' }, 403)

  const sets = []
  const binds = []
  if (typeof body.full_name === 'string' && body.full_name.trim()) { sets.push('full_name = ?'); binds.push(body.full_name.trim()) }
  if ('is_active' in body) { sets.push('is_active = ?'); binds.push(body.is_active ? 1 : 0) }
  if ('tier_id' in body) {
    const tier = await context.env.DB.prepare('SELECT id, rank, capabilities, is_system FROM admin_tiers WHERE id = ?').bind(body.tier_id).first()
    if (!tier) return json({ error: 'unknown tier' }, 400)
    if (tier.is_system || tier.rank === SUPER_TIER_RANK) return json({ error: 'Cannot assign the super admin tier' }, 403)
    if (!canManage(me.rank, tier.rank)) return json({ error: 'You can only assign tiers below your own' }, 403)
    if (!capsSubsetOf(safeParseArray(tier.capabilities), me.capabilities, me.rank)) {
      return json({ error: 'That tier grants capabilities you do not have' }, 403)
    }
    sets.push('tier_id = ?'); binds.push(body.tier_id)
  }
  if (!sets.length) return json({ error: 'no writable fields' }, 400)
  sets.push('updated_date = ?'); binds.push(nowIso())
  binds.push(id)
  await context.env.DB.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run()
  return json({ success: true })
}

// DELETE /api/admin/users/:id — hard-delete a staff user ranked below you (never self/super).
async function deleteUser(context, id) {
  const auth = await requireCapability(context, 'users')
  if (auth.response) return auth.response
  const me = auth.user
  if (id === me.id) return json({ error: 'You cannot delete your own account' }, 403)
  const target = await loadStaffTarget(context.env, id)
  if (!target) return json({ error: 'not found' }, 404)
  if (target.tier_rank === SUPER_TIER_RANK) return json({ error: 'The super admin cannot be deleted' }, 403)
  if (!canManage(me.rank, target.tier_rank)) return json({ error: 'Insufficient privileges' }, 403)
  await context.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run()
  return json({ success: true })
}

function safeParseArray(text) {
  if (!text) return []
  try { const v = JSON.parse(text); return Array.isArray(v) ? v : [] } catch { return [] }
}
