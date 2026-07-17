import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mockDb, mockContext } from './_mock.mjs'
import { signJwt, COOKIE, sha256Hex, hashPassword } from '../src/lib/auth.js'
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
const managerRow = {
  id: 'u_mg', email: 'mg@x.com', role: 'staff', full_name: 'MG', tier_id: 'tier_manager',
  is_active: 1, tier_name: 'Level 2', tier_rank: 2,
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

test('POST /api/admin/tiers/reorder: super reorders via two-pass ranks, guarding system tiers', async () => {
  const ids = ['tier_a', 'tier_b', 'tier_c']
  const ctx = await ctxAs({ id: 'u_sa', role: 'staff', _row: superRow }, {
    method: 'POST', path: '/api/admin/tiers/reorder', body: { orderedIds: ids },
  })
  const res = await handleAdminRoutes(ctx)
  assert.equal(res.status, 200)
  assert.equal((await res.json()).success, true)
  const batched = ctx.env.DB.batched
  assert.equal(batched.length, ids.length * 2)           // two passes
  batched.slice(0, ids.length).forEach((s, i) => assert.equal(s.binds[0], -(i + 1))) // pass 1: negative temp ranks
  batched.slice(ids.length).forEach((s, i) => assert.equal(s.binds[0], i + 1))       // pass 2: final 1..N
  batched.forEach((s) => assert.match(s.sql, /is_system = 0/))                        // every UPDATE guards system tiers
})

test('POST /api/admin/tiers/reorder: non-super is forbidden', async () => {
  const ctx = await ctxAs({ id: 'u_ad', role: 'staff', _row: adminRow }, {
    method: 'POST', path: '/api/admin/tiers/reorder', body: { orderedIds: ['tier_a'] },
  })
  assert.equal((await handleAdminRoutes(ctx)).status, 403)
})

test('DELETE /api/admin/tiers/:id: system tier cannot be deleted (403)', async () => {
  const ctx = await ctxAs({ id: 'u_sa', role: 'staff', _row: superRow }, {
    method: 'DELETE', path: '/api/admin/tiers/tier_superadmin',
    reads: (sql) => sql.includes('FROM admin_tiers WHERE id')
      ? { first: { id: 'tier_superadmin', is_system: 1, rank: 0 } } : {},
  })
  assert.equal((await handleAdminRoutes(ctx)).status, 403)
})

test('POST /api/admin/users: rejects assigning the super tier', async () => {
  const ctx = await ctxAs({ id: 'u_sa', role: 'staff', _row: superRow }, {
    method: 'POST', path: '/api/admin/users', body: { email: 'x@y.com', full_name: 'X', tier_id: 'tier_superadmin' },
    reads: (sql) => sql.includes('FROM admin_tiers WHERE id')
      ? { first: { id: 'tier_superadmin', rank: 0, capabilities: '[]', is_system: 1 } } : {},
  })
  assert.equal((await handleAdminRoutes(ctx)).status, 403)
})

test('POST /api/admin/users: admin cannot invite into a tier at/above its own rank', async () => {
  const ctx = await ctxAs({ id: 'u_ad', role: 'staff', _row: adminRow }, {
    method: 'POST', path: '/api/admin/users', body: { email: 'x@y.com', full_name: 'X', tier_id: 'tier_admin' },
    reads: (sql) => sql.includes('FROM admin_tiers WHERE id')
      ? { first: { id: 'tier_admin', rank: 1, capabilities: '["portfolio"]', is_system: 0 } } : {},
  })
  assert.equal((await handleAdminRoutes(ctx)).status, 403)
})

test('POST /api/admin/users: creates a pending invite and returns a copy-link', async () => {
  const ctx = await ctxAs({ id: 'u_sa', role: 'staff', _row: superRow }, {
    method: 'POST', path: '/api/admin/users', body: { email: 'New@Y.com', full_name: 'New', tier_id: 'tier_manager' },
    reads: (sql) => {
      if (sql.includes('FROM admin_tiers WHERE id')) return { first: { id: 'tier_manager', rank: 2, capabilities: '["faqs"]', is_system: 0 } }
      if (sql.includes('FROM users WHERE email')) return { first: null } // email free
      return {}
    },
  })
  const res = await handleAdminRoutes(ctx)
  assert.equal(res.status, 201)
  const j = await res.json()
  assert.match(j.invite_url, /^https:\/\/portal\.dreamhome\.design\/invite\/[A-Za-z0-9_-]+$/)
  assert.equal(j.user.email, 'new@y.com') // lowercased
  assert.equal(j.user.status, 'pending')
})

test('DELETE /api/admin/users/:id: cannot delete a super-admin target', async () => {
  const ctx = await ctxAs({ id: 'u_sa', role: 'staff', _row: superRow }, {
    method: 'DELETE', path: '/api/admin/users/u_other',
    reads: (sql) => sql.includes("u.role = 'staff'")
      ? { first: { id: 'u_other', tier_rank: 0, is_active: 1, has_password: 1, tier_id: 'tier_superadmin' } } : {},
  })
  assert.equal((await handleAdminRoutes(ctx)).status, 403)
})

test('PATCH /api/admin/users/:id self-branch updates only full_name, ignoring extra fields', async () => {
  let updateSql = null
  const jwt = await signJwt({ sub: 'u_ad', role: 'staff', rmb: false }, SECRET)
  const db = mockDb((sql, binds) => {
    if (sql.includes('FROM users u LEFT JOIN admin_tiers')) return { first: adminRow }
    if (sql.startsWith('UPDATE users SET')) { updateSql = sql; return { run: { meta: { changes: 1 } } } }
    return {}
  })
  const ctx = mockContext({ db, cookie: cookieFor(jwt), method: 'PATCH', path: '/api/admin/users/u_ad',
    body: { full_name: 'Renamed', tier_id: 'tier_superadmin', is_active: 0 } })
  const res = await handleAdminRoutes(ctx)
  assert.equal(res.status, 200)
  assert.match(updateSql, /full_name/)
  assert.doesNotMatch(updateSql, /tier_id/)
  assert.doesNotMatch(updateSql, /is_active/)
})

test('PATCH /api/admin/users/:id: cannot modify a super-admin target', async () => {
  const ctx = await ctxAs({ id: 'u_sa', role: 'staff', _row: superRow }, {
    method: 'PATCH', path: '/api/admin/users/u_other', body: { is_active: 0 },
    reads: (sql) => sql.includes("u.role = 'staff'")
      ? { first: { id: 'u_other', tier_rank: 0, tier_id: 'tier_superadmin', is_active: 1, has_password: 1 } } : {},
  })
  assert.equal((await handleAdminRoutes(ctx)).status, 403)
})

test('PATCH /api/admin/users/:id: cannot modify a peer/higher-ranked target', async () => {
  const ctx = await ctxAs({ id: 'u_ad', role: 'staff', _row: adminRow }, {
    method: 'PATCH', path: '/api/admin/users/u_peer', body: { is_active: 0 },
    reads: (sql) => sql.includes("u.role = 'staff'")
      ? { first: { id: 'u_peer', tier_rank: 1, tier_id: 'tier_admin', is_active: 1, has_password: 1 } } : {},
  })
  assert.equal((await handleAdminRoutes(ctx)).status, 403)
})

test('GET /api/admin/users: excludes the actor via the id clause even when rank would allow self', async () => {
  const rows = [
    { id: 'u_sa', tier_rank: 0, tier_name: 'Super Admin', tier_id: 'tier_superadmin', is_active: 1, has_password: 1, email: 'sa@x', full_name: 'SA', invited_by: null },
    { id: 'u_ad', tier_rank: 1, tier_name: 'Admin', tier_id: 'tier_admin', is_active: 1, has_password: 1, email: 'ad@x', full_name: 'AD', invited_by: 'u_sa' },
    { id: 'u_mg', tier_rank: 2, tier_name: 'Manager', tier_id: 'tier_manager', is_active: 1, has_password: 1, email: 'mg@x', full_name: 'MG', invited_by: 'u_ad' },
  ]
  const ctx = await ctxAs({ id: 'u_sa', role: 'staff', _row: superRow }, {
    method: 'GET', path: '/api/admin/users',
    reads: (sql) => sql.includes("WHERE u.role = 'staff'") ? { all: { results: rows } } : {},
  })
  const res = await handleAdminRoutes(ctx)
  assert.equal(res.status, 200)
  const list = await res.json()
  const ids = list.map(r => r.id)
  assert.ok(!ids.includes('u_sa'), 'actor own row must be excluded by the id clause')
  assert.ok(ids.includes('u_ad') && ids.includes('u_mg'), 'lower-ranked rows must be kept')
  const byId = Object.fromEntries(list.map(r => [r.id, r]))
  assert.equal(byId.u_ad.can_edit, true)   // super manages anyone
  assert.equal(byId.u_ad.can_delete, true) // super deletes anyone
  assert.equal(byId.u_mg.can_edit, true)
  assert.equal(byId.u_mg.can_delete, true)
})

test('GET /api/admin/users: non-super viewer hides the super row and annotates edit/delete', async () => {
  const rows = [
    { id: 'u_sa', tier_rank: 0, tier_name: 'Super Admin', tier_id: 'tier_superadmin', is_active: 1, has_password: 1, email: 'sa@x', full_name: 'SA', invited_by: null },
    { id: 'u_ad', tier_rank: 1, tier_name: 'Level 1', tier_id: 'tier_admin', is_active: 1, has_password: 1, email: 'ad@x', full_name: 'AD', invited_by: 'u_sa' },
    { id: 'u_peer', tier_rank: 1, tier_name: 'Level 1', tier_id: 'tier_admin', is_active: 1, has_password: 1, email: 'peer@x', full_name: 'Peer', invited_by: 'u_sa' },
    { id: 'u_mem', tier_rank: 3, tier_name: 'Member', tier_id: 'tier_member', is_active: 1, has_password: 1, email: 'mem@x', full_name: 'Mem', invited_by: 'u_ad' },
  ]
  const ctx = await ctxAs({ id: 'u_ad', role: 'staff', _row: adminRow }, {
    method: 'GET', path: '/api/admin/users',
    reads: (sql) => sql.includes("WHERE u.role = 'staff'") ? { all: { results: rows } } : {},
  })
  const res = await handleAdminRoutes(ctx)
  assert.equal(res.status, 200)
  const list = await res.json()
  const byId = Object.fromEntries(list.map(r => [r.id, r]))
  assert.ok(!byId.u_sa, 'super row hidden from a non-super viewer')
  assert.ok(!byId.u_ad, 'own row excluded')
  assert.equal(byId.u_peer.can_edit, true)    // canManage(1,1) — peer editable
  assert.equal(byId.u_peer.can_delete, false) // canDelete(1,1) — peer not deletable
  assert.equal(byId.u_mem.can_edit, true)
  assert.equal(byId.u_mem.can_delete, true)   // rank 3 is strictly below rank 1
})

test('POST /api/admin/users/:id/reinvite: rejects a user who already has a password (409)', async () => {
  const ctx = await ctxAs({ id: 'u_sa', role: 'staff', _row: superRow }, {
    method: 'POST', path: '/api/admin/users/u_active/reinvite',
    reads: (sql) => sql.includes("u.role = 'staff'")
      ? { first: { id: 'u_active', tier_rank: 2, tier_id: 'tier_manager', is_active: 1, has_password: 1 } } : {},
  })
  assert.equal((await handleAdminRoutes(ctx)).status, 409)
})

test('POST /api/admin/users/:id/reinvite: rejects a deactivated user who has a password (409, not resurrectable)', async () => {
  const ctx = await ctxAs({ id: 'u_sa', role: 'staff', _row: superRow }, {
    method: 'POST', path: '/api/admin/users/u_deactivated/reinvite',
    reads: (sql) => sql.includes("u.role = 'staff'")
      ? { first: { id: 'u_deactivated', tier_rank: 2, tier_id: 'tier_manager', is_active: 0, has_password: 1 } } : {},
  })
  assert.equal((await handleAdminRoutes(ctx)).status, 409)
})

test('POST /api/admin/users/:id/reinvite: forbidden for a target the actor cannot manage', async () => {
  const ctx = await ctxAs({ id: 'u_ad', role: 'staff', _row: adminRow }, {
    method: 'POST', path: '/api/admin/users/u_peer/reinvite',
    reads: (sql) => sql.includes("u.role = 'staff'")
      ? { first: { id: 'u_peer', tier_rank: 1, tier_id: 'tier_admin', is_active: 0, has_password: 0 } } : {},
  })
  assert.equal((await handleAdminRoutes(ctx)).status, 403)
})

test('POST /api/admin/users: stores only the SHA-256 hash of the invite token, never the raw token', async () => {
  let insertBinds = null
  const ctx = await ctxAs({ id: 'u_sa', role: 'staff', _row: superRow }, {
    method: 'POST', path: '/api/admin/users', body: { email: 'New@Y.com', full_name: 'New', tier_id: 'tier_manager' },
    reads: (sql, binds) => {
      if (sql.includes('FROM admin_tiers WHERE id')) return { first: { id: 'tier_manager', rank: 2, capabilities: '["faqs"]', is_system: 0 } }
      if (sql.includes('FROM users WHERE email')) return { first: null }
      if (sql.includes('INSERT INTO users')) { insertBinds = binds; return {} }
      return {}
    },
  })
  const res = await handleAdminRoutes(ctx)
  assert.equal(res.status, 201)
  const { invite_url } = await res.json()
  const rawToken = invite_url.split('/invite/')[1]
  const expectedHash = await sha256Hex(rawToken)
  assert.ok(insertBinds.includes(expectedHash), 'INSERT must bind the token hash')
  assert.ok(!insertBinds.includes(rawToken), 'INSERT must NOT bind the raw token')
})

test('GET /api/auth/invite/:token: valid pending token returns the invitee', async () => {
  const raw = 'rawtoken123'
  const hash = await sha256Hex(raw)
  const future = new Date(Date.now() + 1000 * 60).toISOString()
  const db = mockDb((sql, binds) => {
    if (sql.includes('invite_token_hash = ?') && binds[0] === hash) {
      return { first: { email: 'new@y.com', full_name: 'New', invite_expires: future, tier_name: 'Manager' } }
    }
    return {}
  })
  const ctx = mockContext({ db, method: 'GET', path: `/api/auth/invite/${raw}` })
  const res = await handleAdminRoutes(ctx)
  assert.equal(res.status, 200)
  assert.equal((await res.json()).email, 'new@y.com')
})

test('GET /api/auth/invite/:token: expired token is 404', async () => {
  const raw = 'expired'
  const hash = await sha256Hex(raw)
  const past = new Date(Date.now() - 1000).toISOString()
  const db = mockDb((sql, binds) => (sql.includes('invite_token_hash = ?') && binds[0] === hash)
    ? { first: { email: 'x@y.com', full_name: 'X', invite_expires: past, tier_name: 'Manager' } } : {})
  const ctx = mockContext({ db, method: 'GET', path: `/api/auth/invite/${raw}` })
  assert.equal((await handleAdminRoutes(ctx)).status, 404)
})

test('POST /api/auth/invite/:token: sets password and issues a session cookie', async () => {
  const raw = 'acceptme'
  const hash = await sha256Hex(raw)
  const future = new Date(Date.now() + 1000 * 60).toISOString()
  const db = mockDb((sql, binds) => (sql.includes('invite_token_hash = ?') && binds[0] === hash)
    ? { first: { id: 'u_new', email: 'new@y.com', full_name: 'New', role: 'staff', invite_expires: future } } : {})
  const ctx = mockContext({ db, method: 'POST', path: `/api/auth/invite/${raw}`, body: { password: 'longenough1' } })
  const res = await handleAdminRoutes(ctx)
  assert.equal(res.status, 200)
  assert.match(res.headers.get('Set-Cookie') || '', /dreamhome_session=/)
})

test('POST /api/auth/invite/:token: rejects a short password (400)', async () => {
  const raw = 'shortpw'
  const hash = await sha256Hex(raw)
  const future = new Date(Date.now() + 1000 * 60).toISOString()
  const db = mockDb((sql, binds) => (sql.includes('invite_token_hash = ?') && binds[0] === hash)
    ? { first: { id: 'u_new', email: 'n@y.com', full_name: 'N', role: 'staff', invite_expires: future } } : {})
  const ctx = mockContext({ db, method: 'POST', path: `/api/auth/invite/${raw}`, body: { password: 'short' } })
  assert.equal((await handleAdminRoutes(ctx)).status, 400)
})

test('POST /api/auth/change-password: unauthenticated is 401', async () => {
  const db = mockDb(() => ({}))
  const ctx = mockContext({ db, method: 'POST', path: '/api/auth/change-password',
    body: { current_password: 'x', new_password: 'newlongpassword' } })
  assert.equal((await handleAdminRoutes(ctx)).status, 401)
})

test('POST /api/auth/change-password: rejects a short new password (400)', async () => {
  const stored = await hashPassword('correcthorse')
  const ctx = await ctxAs({ id: 'u_ad', role: 'staff', _row: adminRow }, {
    method: 'POST', path: '/api/auth/change-password',
    body: { current_password: 'correcthorse', new_password: 'short' },
    reads: (sql) => sql.includes('SELECT password_hash FROM users') ? { first: { password_hash: stored } } : {},
  })
  assert.equal((await handleAdminRoutes(ctx)).status, 400)
})

test('POST /api/auth/change-password: rejects when current password is wrong (400)', async () => {
  const stored = await hashPassword('correcthorse')
  const ctx = await ctxAs({ id: 'u_ad', role: 'staff', _row: adminRow }, {
    method: 'POST', path: '/api/auth/change-password',
    body: { current_password: 'wrongpw', new_password: 'newlongpassword' },
    reads: (sql) => sql.includes('SELECT password_hash FROM users') ? { first: { password_hash: stored } } : {},
  })
  assert.equal((await handleAdminRoutes(ctx)).status, 400)
})

test('POST /api/auth/change-password: updates the password when current is correct (200)', async () => {
  const stored = await hashPassword('correcthorse')
  const ctx = await ctxAs({ id: 'u_ad', role: 'staff', _row: adminRow }, {
    method: 'POST', path: '/api/auth/change-password',
    body: { current_password: 'correcthorse', new_password: 'newlongpassword' },
    reads: (sql) => sql.includes('SELECT password_hash FROM users') ? { first: { password_hash: stored } } : {},
  })
  assert.equal((await handleAdminRoutes(ctx)).status, 200)
})
