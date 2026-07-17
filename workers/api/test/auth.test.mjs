import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mockDb, mockContext } from './_mock.mjs'
import {
  signJwt, getSession, requireStaff, requireCapability,
  sha256Hex, generateInviteToken, INVITE_TTL_S, COOKIE,
} from '../src/lib/auth.js'

const SECRET = 'test-secret'
const cookieFor = (jwt) => `${COOKIE}=${jwt}`

function sessionRow(over = {}) {
  return {
    id: 'u1', email: 'a@b.c', role: 'staff', full_name: 'A',
    tier_id: 'tier_admin', is_active: 1, tier_name: 'Admin', tier_rank: 1,
    tier_caps: '["portfolio","faqs"]', ...over,
  }
}

test('getSession resolves rank + parsed capabilities live from D1', async () => {
  const jwt = await signJwt({ sub: 'u1', role: 'staff', rmb: false }, SECRET)
  const db = mockDb(() => ({ first: sessionRow() }))
  const s = await getSession(mockContext({ db, cookie: cookieFor(jwt) }))
  assert.equal(s.rank, 1)
  assert.deepEqual(s.capabilities, ['portfolio', 'faqs'])
  assert.equal(s.tier_name, 'Admin')
  assert.equal(s.is_active, true)
})

test('getSession returns null for an inactive user', async () => {
  const jwt = await signJwt({ sub: 'u1', role: 'staff', rmb: false }, SECRET)
  const db = mockDb(() => ({ first: sessionRow({ is_active: 0 }) }))
  assert.equal(await getSession(mockContext({ db, cookie: cookieFor(jwt) })), null)
})

test('requireCapability: rank 0 passes any capability', async () => {
  const jwt = await signJwt({ sub: 'u1', role: 'staff', rmb: false }, SECRET)
  const db = mockDb(() => ({ first: sessionRow({ tier_rank: 0, tier_caps: '[]' }) }))
  const r = await requireCapability(mockContext({ db, cookie: cookieFor(jwt) }), 'settings')
  assert.ok(r.user && !r.response)
})

test('requireCapability: denies a capability the tier lacks (403)', async () => {
  const jwt = await signJwt({ sub: 'u1', role: 'staff', rmb: false }, SECRET)
  const db = mockDb(() => ({ first: sessionRow({ tier_caps: '["portfolio"]' }) }))
  const r = await requireCapability(mockContext({ db, cookie: cookieFor(jwt) }), 'settings')
  assert.equal(r.response.status, 403)
})

test('requireStaff: rejects a client (403)', async () => {
  const jwt = await signJwt({ sub: 'u1', role: 'client', rmb: false }, SECRET)
  const db = mockDb(() => ({ first: sessionRow({ role: 'client', tier_id: null, tier_rank: null, tier_caps: null }) }))
  const r = await requireStaff(mockContext({ db, cookie: cookieFor(jwt) }))
  assert.equal(r.response.status, 403)
})

test('sha256Hex is deterministic and hex', async () => {
  const h = await sha256Hex('hello')
  assert.equal(h, '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
})

test('generateInviteToken is unique and url-safe', () => {
  const a = generateInviteToken(); const b = generateInviteToken()
  assert.notEqual(a, b)
  assert.match(a, /^[A-Za-z0-9_-]+$/)
  assert.equal(INVITE_TTL_S, 604800)
})
