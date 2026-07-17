import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mockDb, mockContext } from './_mock.mjs'
import { signJwt, COOKIE } from '../src/lib/auth.js'
import { handleAdminRoutes } from '../src/lib/admin.js'

const SECRET = 'test-secret'
const cookieFor = (jwt) => `${COOKIE}=${jwt}`

// Build a context whose session row is `me` and whose other reads come from `reads`.
async function ctxAs(me, { method = 'GET', path = '/api/admin/tiers', body = null, reads = () => ({}) } = {}) {
  const jwt = await signJwt({ sub: me.id, role: me.role, rmb: false }, SECRET)
  const db = mockDb((sql, binds) => {
    if (sql.includes('FROM users u LEFT JOIN admin_tiers')) return { first: me._row }
    return reads(sql, binds)
  })
  return mockContext({ db, cookie: cookieFor(jwt), method, path, body })
}

const superRow = {
  id: 'u_sa', email: 'sa@x.com', role: 'staff', full_name: 'SA', tier_id: 'tier_superadmin',
  is_active: 1, tier_name: 'Super Admin', tier_rank: 0, tier_caps: '[]',
}
const adminRow = {
  id: 'u_ad', email: 'ad@x.com', role: 'staff', full_name: 'AD', tier_id: 'tier_admin',
  is_active: 1, tier_name: 'Admin', tier_rank: 1,
  tier_caps: '["portfolio","team","faqs","process","investment","testimonials","inquiries","settings","users"]',
}

test('non-admin path returns null (falls through to index.js)', async () => {
  const ctx = await ctxAs({ id: 'u_sa', role: 'staff', _row: superRow }, { path: '/api/PortfolioItem' })
  assert.equal(await handleAdminRoutes(ctx), null)
})

test('POST /api/admin/tiers: non-super is forbidden', async () => {
  const ctx = await ctxAs({ id: 'u_ad', role: 'staff', _row: adminRow },
    { method: 'POST', path: '/api/admin/tiers', body: { name: 'X', capabilities: ['faqs'] } })
  const res = await handleAdminRoutes(ctx)
  assert.equal(res.status, 403)
})

test('POST /api/admin/tiers: super creates with next rank', async () => {
  const ctx = await ctxAs({ id: 'u_sa', role: 'staff', _row: superRow }, {
    method: 'POST', path: '/api/admin/tiers', body: { name: 'Content Manager', capabilities: ['faqs', 'portfolio'] },
    reads: (sql) => sql.includes('MAX(rank)') ? { first: { maxrank: 2 } } : {},
  })
  const res = await handleAdminRoutes(ctx)
  assert.equal(res.status, 201)
  const j = await res.json()
  assert.equal(j.rank, 3)
  assert.equal(j.name, 'Content Manager')
})

test('POST /api/admin/tiers: rejects an unknown capability (400)', async () => {
  const ctx = await ctxAs({ id: 'u_sa', role: 'staff', _row: superRow },
    { method: 'POST', path: '/api/admin/tiers', body: { name: 'X', capabilities: ['bogus'] } })
  assert.equal((await handleAdminRoutes(ctx)).status, 400)
})

test('PATCH /api/admin/tiers/:id: system tier is immutable (403)', async () => {
  const ctx = await ctxAs({ id: 'u_sa', role: 'staff', _row: superRow }, {
    method: 'PATCH', path: '/api/admin/tiers/tier_superadmin', body: { name: 'Nope' },
    reads: (sql) => sql.includes('FROM admin_tiers WHERE id') ? { first: { id: 'tier_superadmin', is_system: 1, rank: 0 } } : {},
  })
  assert.equal((await handleAdminRoutes(ctx)).status, 403)
})

test('DELETE /api/admin/tiers/:id: blocked while users are assigned (409)', async () => {
  const ctx = await ctxAs({ id: 'u_sa', role: 'staff', _row: superRow }, {
    method: 'DELETE', path: '/api/admin/tiers/tier_manager',
    reads: (sql) => {
      if (sql.includes('FROM admin_tiers WHERE id')) return { first: { id: 'tier_manager', is_system: 0, rank: 2 } }
      if (sql.includes('COUNT(*)')) return { first: { n: 3 } }
      return {}
    },
  })
  assert.equal((await handleAdminRoutes(ctx)).status, 409)
})
