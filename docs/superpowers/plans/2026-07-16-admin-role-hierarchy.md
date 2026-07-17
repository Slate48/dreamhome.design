# Admin Role Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give staff a ranked, capability-based admin hierarchy where anyone can create/manage users ranked below them, with `super_admin` reserved as a locked singleton, onboarding via tokenized copy-link invites.

**Architecture:** D1 gains an `admin_tiers` table (name + unique rank + capability JSON) and `users` gains `tier_id`/`is_active`/invite columns. The Worker resolves the caller's live rank + capabilities on every request (JOIN in `getSession`) and gates each route by capability; new `/api/admin/*` and `/api/auth/invite/*` handlers live in a focused `admin.js` module with pure rules in `rbac.js`. The React SPA reads capabilities from `/api/auth/me` to filter nav and guard routes (UI only — the Worker is the enforcement boundary).

**Tech Stack:** Cloudflare Workers (D1, R2), Web Crypto (no npm deps in the Worker), React 18 + Vite 6 + react-router-dom v6 + shadcn/ui, `node --test` for Worker unit tests.

## Global Constraints

- **base44 is HARD-CUT** — never import `@base44/sdk`, `@base44/vite-plugin`, base44 webhooks, or base44 `functions/`.
- **Worker stays dependency-free** — Web Crypto / fetch only; add no npm packages to `workers/api`.
- **All Cloudflare/wrangler calls go through the fleet credential isolation** (`resolveCfCreds(null)` + `cfDeployEnv()`); the Worker deploys **manually** via fleet OAuth (CI has no token, project not in `projects.json`). **Never print/log/serialize the CF token.**
- **Deploy pipeline:** `staging` → dev.dreamhome.design (verify) → PR `staging`→`main` (live, protected). Feature branch is `claude/admin-role-hierarchy`.
- **Tenancy confidential** — the agency label lives only in the repo/PROJECT.md; never broadcast it.
- **super_admin is a permanent singleton** — the system tier (rank 0, `is_system=1`) and the super_admin account cannot be created, assigned, renamed, reordered, demoted, deactivated, or deleted through any API path.
- **Capabilities are enforced server-side**, always read live from D1 (never trusted from the JWT). The client copy gates UI only.
- **Invite tokens are stored hashed** (SHA-256); the raw token exists only inside the copy-link and is unrecoverable afterward (regenerate via re-invite).
- **Node 20+** required for the test suite (global Web Crypto + stable `node --test`).

Capability keys (canonical, 9): `portfolio · team · faqs · process · investment · testimonials · inquiries · settings · users`.

---

## File Structure

**Worker (`workers/api/`)**
- Create `migrations/0003_admin_tiers.sql` — table + user columns + tier seed + role backfill.
- Create `src/lib/rbac.js` — capability constants + pure authorization helpers.
- Modify `src/lib/auth.js` — session JOIN (rank/caps/is_active), `requireStaff`/`requireCapability`, invite-token helpers; remove `requireRole` (in the index wiring task).
- Create `src/lib/admin.js` — `handleAdminRoutes` (tiers, users, invite-accept, change-password).
- Modify `src/index.js` — wire `handleAdminRoutes`; swap CMS write/inquiry gating to `requireCapability`; upload → `requireAuth`.
- Create `test/_mock.mjs`, `test/rbac.test.mjs`, `test/auth.test.mjs`, `test/admin.test.mjs`.

**Frontend (`src/`)**
- Modify `lib/AuthContext.jsx` — expose `can(cap)`.
- Create `components/CapabilityGuard.jsx`.
- Modify `components/admin/AdminLayout.jsx` — capability-filtered nav + Admins item + tier badge.
- Create `api/admin.js` — fetch wrappers for the new endpoints.
- Create `components/admin/UsersPanel.jsx`, `components/admin/TiersPanel.jsx`.
- Create `pages/admin/AdminUsers.jsx` — tabs shell.
- Create `pages/InviteAccept.jsx` — public `/invite/:token` set-password page.
- Modify `App.jsx` — routes (`/invite/:token`, `/admin/users`), staff gate, per-route CapabilityGuard.
- Modify `lib/PageNotFound.jsx` — `role === 'admin'` → `role === 'staff'`.

**Config**
- Modify `package.json` — add `"test": "node --test workers/api/test/"`.

---

## Task 1: D1 migration — tiers table, user columns, seed + backfill

**Files:**
- Create: `workers/api/migrations/0003_admin_tiers.sql`

**Interfaces:**
- Produces: `admin_tiers(id, name, rank UNIQUE, capabilities JSON, is_system, created_date, updated_date)`; seeded tier ids `tier_superadmin` (rank 0, system), `tier_admin` (rank 1), `tier_manager` (rank 2); `users` columns `tier_id, is_active, invited_by, invite_token_hash, invite_expires`; `users.role` values narrowed to `client|staff`.

- [ ] **Step 1: Write the migration**

Create `workers/api/migrations/0003_admin_tiers.sql`:

```sql
-- 0003_admin_tiers.sql — staff RBAC: ranked tiers + per-tier capabilities and
-- tokenized copy-link invites.
-- Spec: docs/superpowers/specs/2026-07-16-admin-role-hierarchy-design.md

CREATE TABLE IF NOT EXISTS admin_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rank INTEGER NOT NULL UNIQUE,             -- 0 = super admin (reserved); lower = more power
  capabilities TEXT NOT NULL DEFAULT '[]',  -- JSON array of capability keys
  is_system INTEGER NOT NULL DEFAULT 0,     -- 1 = locked (super admin tier)
  created_date TEXT NOT NULL,
  updated_date TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_tiers_rank ON admin_tiers(rank);

-- users additions (SQLite ADD COLUMN allows a constant default on NOT NULL)
ALTER TABLE users ADD COLUMN tier_id TEXT;
ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN invited_by TEXT;
ALTER TABLE users ADD COLUMN invite_token_hash TEXT;
ALTER TABLE users ADD COLUMN invite_expires TEXT;
CREATE INDEX IF NOT EXISTS idx_users_invite_token ON users(invite_token_hash);

-- seed tiers
INSERT OR IGNORE INTO admin_tiers (id, name, rank, capabilities, is_system, created_date, updated_date) VALUES
  ('tier_superadmin', 'Super Admin', 0,
   '["portfolio","team","faqs","process","investment","testimonials","inquiries","settings","users"]', 1,
   '2026-07-16T00:00:00.000Z', '2026-07-16T00:00:00.000Z'),
  ('tier_admin', 'Admin', 1,
   '["portfolio","team","faqs","process","investment","testimonials","inquiries","settings","users"]', 0,
   '2026-07-16T00:00:00.000Z', '2026-07-16T00:00:00.000Z'),
  ('tier_manager', 'Manager', 2,
   '["portfolio","team","faqs","process","investment","testimonials","inquiries"]', 0,
   '2026-07-16T00:00:00.000Z', '2026-07-16T00:00:00.000Z');

-- backfill existing accounts onto tiers; narrow role to client|staff
UPDATE users SET tier_id = 'tier_superadmin', role = 'staff' WHERE role = 'super_admin';
UPDATE users SET tier_id = 'tier_admin',      role = 'staff' WHERE role = 'admin';
UPDATE users SET tier_id = 'tier_manager',    role = 'staff' WHERE role = 'manager';
-- clients: role stays 'client', tier_id stays NULL
```

- [ ] **Step 2: Validate against a throwaway local SQLite that mirrors the current schema**

Run (uses the system `sqlite3`; validates the SQL parses and produces the expected rows — does NOT touch D1):

```bash
cd workers/api
rm -f /tmp/dh-mig-test.db
sqlite3 /tmp/dh-mig-test.db < migrations/0001_public_content.sql
sqlite3 /tmp/dh-mig-test.db < migrations/0002_users.sql
# seed one of each legacy role to prove the backfill
sqlite3 /tmp/dh-mig-test.db "INSERT INTO users (id,email,password_hash,role,full_name,created_date,updated_date) VALUES
 ('u_sa','sa@x.com','v1:00:00','super_admin','SA','t','t'),
 ('u_ad','ad@x.com','v1:00:00','admin','AD','t','t'),
 ('u_mg','mg@x.com','v1:00:00','manager','MG','t','t'),
 ('u_cl','cl@x.com','v1:00:00','client','CL','t','t');"
sqlite3 /tmp/dh-mig-test.db < migrations/0003_admin_tiers.sql
echo "--- tiers ---"; sqlite3 /tmp/dh-mig-test.db "SELECT rank,name,is_system FROM admin_tiers ORDER BY rank;"
echo "--- users ---"; sqlite3 /tmp/dh-mig-test.db "SELECT email,role,tier_id,is_active FROM users ORDER BY email;"
```

Expected: three tiers (0 Super Admin sys=1, 1 Admin, 2 Manager); `sa`→staff/tier_superadmin, `ad`→staff/tier_admin, `mg`→staff/tier_manager, `cl`→client/NULL; all `is_active=1`.

- [ ] **Step 3: Commit**

```bash
cd /Users/levielizaga/Sites/clients/whitelabel/echohouse/dreamhome/site
git add workers/api/migrations/0003_admin_tiers.sql
git commit -m "feat(db): 0003 admin_tiers + user tier/invite columns + role backfill

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

> Remote D1 apply (`wrangler d1 migrations apply wl-dreamhome-db --remote`) is deferred to the deploy task (Task 15) and runs through fleet OAuth.

---

## Task 2: RBAC pure helpers + capability constants

**Files:**
- Create: `workers/api/src/lib/rbac.js`
- Create: `workers/api/test/rbac.test.mjs`
- Modify: `package.json` (add `test` script)

**Interfaces:**
- Produces:
  - `CAPABILITIES: string[]` (the 9 keys)
  - `ENTITY_CAPABILITY: Record<string,string>` (CMS entity → capability)
  - `canManage(actorRank: number|0, targetRank: number|null): boolean`
  - `capsSubsetOf(requested: string[], actorCaps: string[], actorRank: number): boolean`
  - `isValidCapabilitySet(caps: any): boolean`

- [ ] **Step 1: Add the test script to package.json**

In `package.json` `"scripts"`, add after `"preview"`:

```json
    "test": "node --test workers/api/test/"
```

- [ ] **Step 2: Write the failing test**

Create `workers/api/test/rbac.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CAPABILITIES, ENTITY_CAPABILITY, canManage, capsSubsetOf, isValidCapabilitySet,
} from '../src/lib/rbac.js'

test('CAPABILITIES has the 9 canonical keys', () => {
  assert.deepEqual(CAPABILITIES, [
    'portfolio', 'team', 'faqs', 'process', 'investment', 'testimonials', 'inquiries', 'settings', 'users',
  ])
})

test('ENTITY_CAPABILITY maps every CMS entity', () => {
  assert.equal(ENTITY_CAPABILITY.PortfolioItem, 'portfolio')
  assert.equal(ENTITY_CAPABILITY.SiteSettings, 'settings')
  assert.equal(ENTITY_CAPABILITY.Testimonial, 'testimonials')
})

test('canManage: super (rank 0) manages anyone', () => {
  assert.equal(canManage(0, 5), true)
  assert.equal(canManage(0, 0), true)
})

test('canManage: only strictly-lower ranks', () => {
  assert.equal(canManage(2, 3), true)
  assert.equal(canManage(2, 2), false) // peer
  assert.equal(canManage(2, 1), false) // superior
  assert.equal(canManage(2, null), false)
})

test('capsSubsetOf: super bypasses', () => {
  assert.equal(capsSubsetOf(['settings'], [], 0), true)
})

test('capsSubsetOf: requested must be within actor caps', () => {
  assert.equal(capsSubsetOf(['portfolio'], ['portfolio', 'faqs'], 2), true)
  assert.equal(capsSubsetOf(['settings'], ['portfolio'], 2), false)
  assert.equal(capsSubsetOf('nope', ['portfolio'], 2), false)
})

test('isValidCapabilitySet: only known, unique keys', () => {
  assert.equal(isValidCapabilitySet(['portfolio', 'faqs']), true)
  assert.equal(isValidCapabilitySet([]), true)
  assert.equal(isValidCapabilitySet(['portfolio', 'portfolio']), false)
  assert.equal(isValidCapabilitySet(['bogus']), false)
  assert.equal(isValidCapabilitySet('portfolio'), false)
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../src/lib/rbac.js'`.

- [ ] **Step 4: Write minimal implementation**

Create `workers/api/src/lib/rbac.js`:

```js
// Pure, dependency-free authorization rules for the staff role hierarchy.
// Kept side-effect-free so it is trivially unit-testable (see test/rbac.test.mjs).

// The 9 capability keys — 1:1 with the admin sidebar sections.
export const CAPABILITIES = [
  'portfolio', 'team', 'faqs', 'process', 'investment', 'testimonials', 'inquiries', 'settings', 'users',
]

// CMS entity (D1 table / API path) -> capability required to write it.
// ContactInquiry is gated by 'inquiries' on GET and has no generic CRUD, so it is not here.
export const ENTITY_CAPABILITY = {
  PortfolioItem: 'portfolio',
  TeamMember: 'team',
  FAQItem: 'faqs',
  ProcessStage: 'process',
  InvestmentTier: 'investment',
  Testimonial: 'testimonials',
  SiteSettings: 'settings',
}

// rank 0 (super admin) manages everyone; otherwise only strictly-lower ranks
// (higher rank number = lower privilege). Peers and superiors are off-limits.
export function canManage(actorRank, targetRank) {
  if (actorRank === 0) return true
  return Number.isInteger(targetRank) && targetRank > actorRank
}

// You may only grant capabilities you hold (super admin bypasses).
export function capsSubsetOf(requested, actorCaps, actorRank) {
  if (actorRank === 0) return true
  if (!Array.isArray(requested)) return false
  return requested.every((c) => actorCaps.includes(c))
}

// A tier's capability list must be an array of known, non-duplicate keys.
export function isValidCapabilitySet(caps) {
  if (!Array.isArray(caps)) return false
  const seen = new Set()
  for (const c of caps) {
    if (!CAPABILITIES.includes(c)) return false
    if (seen.has(c)) return false
    seen.add(c)
  }
  return true
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test`
Expected: PASS (all rbac tests).

- [ ] **Step 6: Commit**

```bash
git add package.json workers/api/src/lib/rbac.js workers/api/test/rbac.test.mjs
git commit -m "feat(api): rbac capability constants + pure rank/subset helpers + node --test

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Auth — session JOIN, capability guards, invite-token helpers

**Files:**
- Modify: `workers/api/src/lib/auth.js`
- Create: `workers/api/test/_mock.mjs`
- Create: `workers/api/test/auth.test.mjs`

**Interfaces:**
- Consumes: existing `signJwt`, `verifyJwt`, `hashPassword`, `verifyPassword`, `bytesToHex`, `bytesToBase64Url`, `readCookie`, `json` (all already in `auth.js`/`http.js`).
- Produces:
  - `getSession(context)` now resolves `{ id, email, role, full_name, tier_id, tier_name, rank, capabilities: string[], is_active: boolean, persistent: boolean }` and returns `null` for missing/inactive users.
  - `requireStaff(context) -> { user } | { response }`
  - `requireCapability(context, cap) -> { user } | { response }`
  - `sha256Hex(input: string) -> Promise<string>`
  - `generateInviteToken() -> string`
  - `INVITE_TTL_S: number` (604800)

- [ ] **Step 1: Write the shared test mock**

Create `workers/api/test/_mock.mjs`:

```js
// Minimal D1 + request/context mocks for unit-testing Worker logic without a real DB.
// resolver(sql, binds) -> { first?, all?, run? }; unspecified reads default to null / empty.

export function mockDb(resolver) {
  return {
    prepare(sql) {
      let binds = []
      const stmt = {
        bind(...args) { binds = args; return stmt },
        async first() { return resolver(sql, binds).first ?? null },
        async all() { return resolver(sql, binds).all ?? { results: [] } },
        async run() { return resolver(sql, binds).run ?? { meta: { changes: 1 } } },
      }
      return stmt
    },
    async batch(stmts) { return stmts.map(() => ({ meta: { changes: 1 } })) },
  }
}

export function mockContext({ db, secret = 'test-secret', cookie = null, method = 'GET', path = '/api/x', body = null }) {
  const headers = new Map()
  if (cookie) headers.set('Cookie', cookie)
  const url = `https://portal.dreamhome.design${path}`
  return {
    request: {
      url, method,
      headers: { get: (h) => headers.get(h) ?? null },
      async json() { if (body == null) throw new Error('no body'); return body },
    },
    env: { JWT_SECRET: secret, DB: db },
  }
}
```

- [ ] **Step 2: Write the failing test**

Create `workers/api/test/auth.test.mjs`:

```js
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `requireStaff`/`sha256Hex`/`generateInviteToken`/`INVITE_TTL_S` are not exported yet; `getSession` still returns the old shape (no `rank`).

- [ ] **Step 4: Implement the auth changes**

In `workers/api/src/lib/auth.js`:

(a) After the `REMEMBER_MAX_AGE_S`/`SESSION_JWT_TTL_S` constants, add:

```js
export const INVITE_TTL_S = 7 * 24 * 60 * 60 // 7 days
```

(b) Add token helpers near the password section (they reuse the existing `bytesToHex`):

```js
// SHA-256 hex — used to store invite tokens hashed (raw token only lives in the link).
export async function sha256Hex(input) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return bytesToHex(new Uint8Array(digest))
}

// Opaque, url-safe invite token (256 bits). The raw value is returned once (in the
// copy-link); only its sha256Hex is persisted.
export function generateInviteToken() {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)))
}
```

(c) Replace the whole `getSession` function with:

```js
export async function getSession(context) {
  const { request, env } = context
  const token = readCookie(request, COOKIE)
  if (!token) return null
  if (!env.JWT_SECRET) return null
  const payload = await verifyJwt(token, env.JWT_SECRET)
  if (!payload || !payload.sub) return null

  // Re-fetch live every request — never trust the JWT's role/rank. A LEFT JOIN so
  // clients (no tier) still resolve; rank/capabilities come from the tier.
  const row = await env.DB
    .prepare(
      `SELECT u.id, u.email, u.role, u.full_name, u.tier_id, u.is_active,
              t.name AS tier_name, t.rank AS tier_rank, t.capabilities AS tier_caps
       FROM users u LEFT JOIN admin_tiers t ON t.id = u.tier_id
       WHERE u.id = ?`
    )
    .bind(payload.sub)
    .first()
  if (!row) return null
  if (row.is_active === 0) return null // deactivated account: session dies next request

  let capabilities = []
  if (row.tier_caps) {
    try { capabilities = JSON.parse(row.tier_caps) } catch { capabilities = [] }
  }
  const rank = Number.isInteger(row.tier_rank) ? row.tier_rank : null

  return {
    id: row.id, email: row.email, role: row.role, full_name: row.full_name,
    tier_id: row.tier_id, tier_name: row.tier_name || null, rank, capabilities,
    is_active: row.is_active !== 0,
    persistent: payload.rmb === true,
  }
}
```

(d) After `requireAuth`, add (leave the existing `requireRole` in place for now — Task 7 removes it with its callers):

```js
export async function requireStaff(context) {
  const result = await requireAuth(context)
  if (result.response) return result
  if (result.user.role !== 'staff') {
    return { response: json({ error: 'Staff access required' }, 403) }
  }
  return result
}

export async function requireCapability(context, capability) {
  const result = await requireStaff(context)
  if (result.response) return result
  const { user } = result
  if (user.rank === 0 || (user.capabilities || []).includes(capability)) return result
  return { response: json({ error: 'Insufficient privileges' }, 403) }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test`
Expected: PASS (rbac + auth suites).

- [ ] **Step 6: Commit**

```bash
git add workers/api/src/lib/auth.js workers/api/test/_mock.mjs workers/api/test/auth.test.mjs
git commit -m "feat(api): session rank/capabilities JOIN, requireStaff/requireCapability, invite-token helpers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Admin routes — tier management

**Files:**
- Create: `workers/api/src/lib/admin.js`
- Create: `workers/api/test/admin.test.mjs`

**Interfaces:**
- Consumes: `requireStaff`, `requireCapability`, `getSession` (auth.js); `canManage`, `capsSubsetOf`, `isValidCapabilitySet` (rbac.js); `json`, `parseJson`, `nowIso`, `newId` (http.js).
- Produces: `handleAdminRoutes(context) -> Promise<Response|null>` (returns `null` when the path is not an admin/auth-invite route). This task adds the `/api/admin/tiers*` branches; Tasks 5–6 extend the same function.

- [ ] **Step 1: Write the failing test**

Create `workers/api/test/admin.test.mjs`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../src/lib/admin.js'`.

- [ ] **Step 3: Implement `admin.js` with the tier branches**

Create `workers/api/src/lib/admin.js`:

```js
// Admin-only route handlers: tier management, staff user management, invite
// acceptance, and self change-password. Split out of index.js to keep each file
// focused. handleAdminRoutes returns a Response for a matched route, or null so
// index.js can continue to its generic entity routing.

import { json, parseJson, nowIso, newId } from './http.js'
import {
  requireAuth, requireStaff, requireCapability, getSession,
  hashPassword, verifyPassword, signJwt, buildSessionCookie,
  sha256Hex, generateInviteToken, INVITE_TTL_S,
} from './auth.js'
import { canManage, capsSubsetOf, isValidCapabilitySet } from './rbac.js'

const SUPER_TIER_RANK = 0

export async function handleAdminRoutes(context) {
  const { request, env } = context
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (rbac + auth + admin tier tests).

- [ ] **Step 5: Commit**

```bash
git add workers/api/src/lib/admin.js workers/api/test/admin.test.mjs
git commit -m "feat(api): tier management routes (create/patch/reorder/delete), super-admin gated

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Admin routes — staff user management + invites

**Files:**
- Modify: `workers/api/src/lib/admin.js`
- Modify: `workers/api/test/admin.test.mjs`

**Interfaces:**
- Consumes: everything from Task 4.
- Produces (added to `handleAdminRoutes`): `GET/POST /api/admin/users`, `PATCH/DELETE /api/admin/users/:id`, `POST /api/admin/users/:id/reinvite`. Invite/reinvite responses include `invite_url` (`${origin}/invite/<rawToken>`).

- [ ] **Step 1: Add failing tests**

Append to `workers/api/test/admin.test.mjs`:

```js
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
    reads: (sql) => sql.includes('FROM users u JOIN admin_tiers') || sql.includes('FROM users u LEFT JOIN admin_tiers t ON t.id = u.tier_id\n       WHERE u.id = ? LIMIT')
      ? {} : {},
  })
  // target lookup below uses a dedicated query; script it:
  assert.ok(ctx) // placeholder guarded by the impl query in Step 3
})
```

> Note: the DELETE-super test's `reads` is finalized in Step 3 once the target-lookup SQL is fixed; keep it asserting a 403 there.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — user routes not yet handled (invite returns null → `res.status` throws).

- [ ] **Step 3: Implement the user routes**

In `workers/api/src/lib/admin.js`, add these route lines inside `handleAdminRoutes` **before** `return null`:

```js
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
```

Add these functions to `admin.js` (before the trailing `safeParseArray` helper):

```js
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
  if (target.has_password && target.is_active) return json({ error: 'That user has already accepted their invite' }, 409)

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
```

Finalize the DELETE-super test from Step 1 by replacing its `reads` so `loadStaffTarget` returns a super target:

```js
test('DELETE /api/admin/users/:id: cannot delete a super-admin target', async () => {
  const ctx = await ctxAs({ id: 'u_sa', role: 'staff', _row: superRow }, {
    method: 'DELETE', path: '/api/admin/users/u_other',
    reads: (sql) => sql.includes("u.role = 'staff'")
      ? { first: { id: 'u_other', tier_rank: 0, is_active: 1, has_password: 1, tier_id: 'tier_superadmin' } } : {},
  })
  assert.equal((await handleAdminRoutes(ctx)).status, 403)
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add workers/api/src/lib/admin.js workers/api/test/admin.test.mjs
git commit -m "feat(api): staff user management + copy-link invites (rank + capability-subset gated)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Admin routes — invite acceptance + change-password

**Files:**
- Modify: `workers/api/src/lib/admin.js`
- Modify: `workers/api/test/admin.test.mjs`

**Interfaces:**
- Produces (added to `handleAdminRoutes`): `GET /api/auth/invite/:token` (public → `{ email, full_name, tier_name }`), `POST /api/auth/invite/:token` (public, `{ password }` → sets password, activates, issues session cookie), `POST /api/auth/change-password` (auth, `{ current_password, new_password }`).

- [ ] **Step 1: Add failing tests**

Append to `workers/api/test/admin.test.mjs`:

```js
import { sha256Hex } from '../src/lib/auth.js'

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — invite/change-password routes not handled yet.

- [ ] **Step 3: Implement**

In `handleAdminRoutes`, add **before** `return null` (and before the generic-looking matches so `/api/auth/*` is caught here):

```js
  // ---- invite acceptance (public, token-gated) + self change-password ----
  const inviteItem = pathname.match(/^\/api\/auth\/invite\/([A-Za-z0-9_-]+)$/)
  if (inviteItem) {
    if (method === 'GET') return getInvite(context, inviteItem[1])
    if (method === 'POST') return acceptInvite(context, inviteItem[1])
    return json({ error: 'method not allowed' }, 405)
  }
  if (pathname === '/api/auth/change-password' && method === 'POST') return changePassword(context)
```

Add the functions (before `safeParseArray`):

```js
const MIN_PASSWORD_LEN = 8

async function findPendingInvite(env, token) {
  const hash = await sha256Hex(token)
  const row = await env.DB
    .prepare(
      `SELECT u.id, u.email, u.full_name, u.role, u.invite_expires, t.name AS tier_name
       FROM users u LEFT JOIN admin_tiers t ON t.id = u.tier_id
       WHERE u.invite_token_hash = ? AND u.is_active = 0`
    ).bind(hash).first()
  if (!row) return null
  if (!row.invite_expires || new Date(row.invite_expires).getTime() <= Date.now()) return null
  return row
}

// GET /api/auth/invite/:token
async function getInvite(context, token) {
  const row = await findPendingInvite(context.env, token)
  if (!row) return json({ error: 'This invite link is invalid or has expired' }, 404)
  return json({ email: row.email, full_name: row.full_name, tier_name: row.tier_name || null })
}

// POST /api/auth/invite/:token  { password }
async function acceptInvite(context, token) {
  const body = await parseJson(context.request)
  const password = body.password || ''
  const row = await findPendingInvite(context.env, token)
  if (!row) return json({ error: 'This invite link is invalid or has expired' }, 404)
  if (password.length < MIN_PASSWORD_LEN) {
    return json({ error: `Password must be at least ${MIN_PASSWORD_LEN} characters` }, 400)
  }
  if (!context.env.JWT_SECRET) return json({ error: 'Server auth is not configured' }, 500)

  const passwordHash = await hashPassword(password)
  await context.env.DB
    .prepare('UPDATE users SET password_hash = ?, is_active = 1, invite_token_hash = NULL, invite_expires = NULL, updated_date = ? WHERE id = ?')
    .bind(passwordHash, nowIso(), row.id)
    .run()

  const jwt = await signJwt({ sub: row.id, email: row.email, role: row.role, rmb: false }, context.env.JWT_SECRET)
  return json(
    { success: true, user: { id: row.id, email: row.email, full_name: row.full_name, role: row.role } },
    200,
    { 'Set-Cookie': buildSessionCookie(jwt, { persistent: false }) }
  )
}

// POST /api/auth/change-password  { current_password, new_password }
async function changePassword(context) {
  const auth = await requireAuth(context)
  if (auth.response) return auth.response
  const body = await parseJson(context.request)
  const current = body.current_password || ''
  const next = body.new_password || ''
  if (next.length < MIN_PASSWORD_LEN) return json({ error: `Password must be at least ${MIN_PASSWORD_LEN} characters` }, 400)

  const row = await context.env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(auth.user.id).first()
  const ok = await verifyPassword(current, row ? row.password_hash : null)
  if (!ok) return json({ error: 'Current password is incorrect' }, 400)

  await context.env.DB.prepare('UPDATE users SET password_hash = ?, updated_date = ? WHERE id = ?')
    .bind(await hashPassword(next), nowIso(), auth.user.id).run()
  return json({ success: true })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (full worker suite).

- [ ] **Step 5: Commit**

```bash
git add workers/api/src/lib/admin.js workers/api/test/admin.test.mjs
git commit -m "feat(api): invite acceptance (public token) + self change-password

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Wire admin routes into index.js + swap to capability gating

**Files:**
- Modify: `workers/api/src/index.js`
- Modify: `workers/api/src/lib/auth.js` (remove now-unused `requireRole`)

**Interfaces:**
- Consumes: `handleAdminRoutes` (admin.js), `requireCapability`, `requireAuth` (auth.js), `ENTITY_CAPABILITY` (rbac.js).
- Produces: no new exports; behavior — admin/invite routes handled; CMS writes gated per entity capability; ContactInquiry GET gated by `inquiries`; upload gated by `requireAuth`.

- [ ] **Step 1: Update imports in `index.js`**

Replace the auth/entity import lines (currently lines 16–18):

```js
import { json, parseJson, nowIso, newId, CORS } from './lib/http.js'
import { verifyPassword, signJwt, buildSessionCookie, clearSessionCookie, requireCapability, requireAuth, getSession, REMEMBER_MAX_AGE_S } from './lib/auth.js'
import { ENTITIES, CMS_ENTITIES, getEntity, hydrate, dehydrate } from './lib/entities.js'
import { ENTITY_CAPABILITY } from './lib/rbac.js'
import { handleAdminRoutes } from './lib/admin.js'
```

- [ ] **Step 2: Dispatch admin routes early**

In `index.js`, immediately after the `logout` route block (right after the `if (pathname === '/api/auth/logout' ...)` handler, before the `// ---- upload ...` comment), add:

```js
    // ---- admin/user/tier management + invite acceptance + change-password ----
    const adminResp = await handleAdminRoutes(context)
    if (adminResp) return adminResp
```

- [ ] **Step 3: Swap upload + CMS + inquiry gating to capabilities**

Change the upload gate:

```js
    if (pathname === '/api/upload' && method === 'POST') {
      const auth = await requireAuth(context)
      if (auth.response) return auth.response
      return handleUpload(request, env)
    }
```

In the item routes (`itemMatch`), change **both** the PATCH and DELETE gates from the old `requireRole([...])` to:

```js
        const auth = await requireCapability(context, ENTITY_CAPABILITY[entityName])
        if (auth.response) return auth.response
```

In the collection POST for CMS entities, change the gate to:

```js
      const auth = await requireCapability(context, ENTITY_CAPABILITY[entity])
      if (auth.response) return auth.response
```

In the staff-only GET block (`if (!meta.publicRead) { ... }`), change to:

```js
    if (!meta.publicRead) {
      const auth = await requireCapability(context, 'inquiries')
      if (auth.response) return auth.response
    }
```

- [ ] **Step 4: Remove the dead `requireRole` from `auth.js`**

Delete the entire `export async function requireRole(...) { ... }` block (last function in `auth.js`). It has no remaining callers.

- [ ] **Step 5: Verify the Worker still builds and the suite passes**

Run:

```bash
cd /Users/levielizaga/Sites/clients/whitelabel/echohouse/dreamhome/site
npx wrangler deploy --config workers/api/wrangler.toml --dry-run --outdir /tmp/dh-worker-dry 2>&1 | tail -5
npm test 2>&1 | tail -5
```

Expected: dry-run bundles with no import/resolve errors; `npm test` all pass.

- [ ] **Step 6: Local route-order smoke test with `wrangler dev` (optional but recommended)**

Run (Ctrl-C after checking):

```bash
cd workers/api && npx wrangler dev --local --port 8799 &
sleep 3
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8799/api/admin/users   # expect 401 (no cookie), NOT 404
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8799/api/auth/invite/x # expect 404 (invalid token), NOT a 500
kill %1
```

Expected: `/api/admin/users` → 401 (auth required, proving it isn't falling through to the entity 404); `/api/auth/invite/x` → 404.

- [ ] **Step 7: Commit**

```bash
git add workers/api/src/index.js workers/api/src/lib/auth.js
git commit -m "feat(api): wire admin routes + capability-gated CMS/inquiry/upload; drop requireRole

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: AuthContext — expose `can(cap)`

**Files:**
- Modify: `src/lib/AuthContext.jsx`

**Interfaces:**
- Consumes: `/api/auth/me` now returns `rank`, `capabilities`, `tier_name` (Task 9 of the Worker is live for real, but the shape is additive; `user` already stores the whole `/me` object).
- Produces: context value gains `can(capability) => boolean`.

- [ ] **Step 1: Add the `can` helper**

In `src/lib/AuthContext.jsx`, before the `return (` of `AuthProvider`, add:

```js
  // UI-only capability check (the Worker enforces every request). rank 0 = super admin.
  const can = useCallback((capability) => {
    if (!user) return false;
    if (user.rank === 0) return true;
    return Array.isArray(user.capabilities) && user.capabilities.includes(capability);
  }, [user]);
```

Then add `can,` to the context `value={{ ... }}` object (next to `checkUserAuth,`).

- [ ] **Step 2: Verify build + lint**

Run:

```bash
npm run build 2>&1 | tail -3
npm run lint 2>&1 | tail -5
```

Expected: build exits 0; lint reports no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/AuthContext.jsx
git commit -m "feat(auth): expose can(capability) for UI gating

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: CapabilityGuard + route wiring

**Files:**
- Create: `src/components/CapabilityGuard.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `useAuth().can`, `useAuth().isLoadingAuth`.
- Produces: `<CapabilityGuard capability="...">children</CapabilityGuard>` — renders children if allowed, else redirects staff to `/admin`.

- [ ] **Step 1: Create the guard**

Create `src/components/CapabilityGuard.jsx`:

```jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

// Assumes a parent RoleGuard already established the user is staff. Gates a single
// admin section by capability; staff without it are sent to the dashboard.
export default function CapabilityGuard({ capability, children }) {
  const { isLoadingAuth, can } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-cream">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }
  if (!can(capability)) return <Navigate to="/admin" replace />;
  return children;
}
```

- [ ] **Step 2: Wire routes in `App.jsx`**

Add imports near the other imports:

```jsx
import CapabilityGuard from './components/CapabilityGuard';
import AdminUsers from './pages/admin/AdminUsers';
import InviteAccept from './pages/InviteAccept';
```

Add the public invite route right after the `<Route path="/login" element={<Login />} />` line:

```jsx
      <Route path="/invite/:token" element={<InviteAccept />} />
```

Change the admin route group: replace `allowedRoles={['manager', 'admin', 'super_admin']}` with `allowedRoles={['staff']}`, and wrap each element with its capability. The admin group becomes:

```jsx
      {/* Admin portal — staff, gated per-section by capability */}
      <Route element={
        <RoleGuard allowedRoles={['staff']} redirectTo="/">
          <AdminLayout />
        </RoleGuard>
      }>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/portfolio" element={<CapabilityGuard capability="portfolio"><AdminPortfolio /></CapabilityGuard>} />
        <Route path="/admin/team" element={<CapabilityGuard capability="team"><AdminTeam /></CapabilityGuard>} />
        <Route path="/admin/faqs" element={<CapabilityGuard capability="faqs"><AdminFAQs /></CapabilityGuard>} />
        <Route path="/admin/process" element={<CapabilityGuard capability="process"><AdminProcess /></CapabilityGuard>} />
        <Route path="/admin/investment" element={<CapabilityGuard capability="investment"><AdminInvestment /></CapabilityGuard>} />
        <Route path="/admin/testimonials" element={<CapabilityGuard capability="testimonials"><AdminTestimonials /></CapabilityGuard>} />
        <Route path="/admin/inquiries" element={<CapabilityGuard capability="inquiries"><AdminInquiries /></CapabilityGuard>} />
        <Route path="/admin/settings" element={<CapabilityGuard capability="settings"><AdminSettings /></CapabilityGuard>} />
        <Route path="/admin/users" element={<CapabilityGuard capability="users"><AdminUsers /></CapabilityGuard>} />
      </Route>
```

> The client portal group keeps `allowedRoles={['client']}` — unchanged.

- [ ] **Step 3: Verify build + lint**

Run:

```bash
npm run build 2>&1 | tail -3
npm run lint 2>&1 | tail -5
```

Expected: build 0 (note: `AdminUsers`/`InviteAccept` don't exist yet → this step will fail to build until Tasks 12/14; create minimal stubs now so the build stays green).

Create stub `src/pages/admin/AdminUsers.jsx`:

```jsx
export default function AdminUsers() { return null; }
```

Create stub `src/pages/InviteAccept.jsx`:

```jsx
export default function InviteAccept() { return null; }
```

Re-run build; expected exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/CapabilityGuard.jsx src/App.jsx src/pages/admin/AdminUsers.jsx src/pages/InviteAccept.jsx
git commit -m "feat(routing): staff gate + per-section CapabilityGuard + public /invite route (stubs)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Sidebar — capability-filtered nav + Admins item + tier badge

**Files:**
- Modify: `src/components/admin/AdminLayout.jsx`

**Interfaces:**
- Consumes: `useAuth().can`, `user.tier_name`.
- Produces: nav filtered by capability; new "Admins" item (`/admin/users`, capability `users`); role badge shows `tier_name`.

- [ ] **Step 1: Add capabilities to navItems + the Admins entry**

In `src/components/admin/AdminLayout.jsx`, update the icon import to include `ShieldCheck`, and rewrite `navItems`:

```jsx
import {
  LayoutGrid, Users, HelpCircle, GitBranch, DollarSign,
  Settings, Image, Menu, X, LogOut, ChevronRight, Star, Inbox, ShieldCheck
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', path: '/admin', icon: LayoutGrid },
  { label: 'Portfolio', path: '/admin/portfolio', icon: Image, capability: 'portfolio' },
  { label: 'Team & Founders', path: '/admin/team', icon: Users, capability: 'team' },
  { label: 'FAQs', path: '/admin/faqs', icon: HelpCircle, capability: 'faqs' },
  { label: 'Process Steps', path: '/admin/process', icon: GitBranch, capability: 'process' },
  { label: 'Investment', path: '/admin/investment', icon: DollarSign, capability: 'investment' },
  { label: 'Testimonials', path: '/admin/testimonials', icon: Star, capability: 'testimonials' },
  { label: 'Inquiries', path: '/admin/inquiries', icon: Inbox, capability: 'inquiries' },
  { label: 'Admins', path: '/admin/users', icon: ShieldCheck, capability: 'users' },
  { label: 'Site Settings', path: '/admin/settings', icon: Settings, capability: 'settings' },
];
```

- [ ] **Step 2: Filter the nav + show tier name**

In the component body, pull `can` from `useAuth()`:

```jsx
  const { user, logout, can } = useAuth();
  const visibleNav = navItems.filter((i) => !i.capability || can(i.capability));
```

Change the nav `.map(navItems ...)` to `.map(visibleNav ...)`.

Replace the role badge line (`{ROLE_LABELS[user.role] || user.role}`) with:

```jsx
                {user.tier_name || 'Staff'}
```

and delete the now-unused `ROLE_LABELS` constant.

- [ ] **Step 3: Verify build + lint**

Run:

```bash
npm run build 2>&1 | tail -3 && npm run lint 2>&1 | tail -5
```

Expected: exit 0, no lint errors (confirm `ROLE_LABELS` removal left no references).

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/AdminLayout.jsx
git commit -m "feat(admin): capability-filtered sidebar + Admins nav + live tier badge

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Frontend admin API client

**Files:**
- Create: `src/api/admin.js`

**Interfaces:**
- Produces:
  - `listTiers()`, `createTier({name,capabilities})`, `updateTier(id,{name?,capabilities?})`, `reorderTiers(orderedIds)`, `deleteTier(id)`
  - `listUsers()`, `inviteUser({email,full_name,tier_id})`, `updateUser(id,{full_name?,tier_id?,is_active?})`, `deleteUser(id)`, `reinviteUser(id)`
  - `getInvite(token)`, `acceptInvite(token,password)`, `changePassword(current,next)`
  - Each returns parsed JSON or throws `Error(message)` on non-2xx.

- [ ] **Step 1: Create the client**

Create `src/api/admin.js`:

```js
// Thin fetch wrappers for the wl-dreamhome-api admin/invite endpoints. Same-origin,
// cookie session. Throws Error(server message) on non-2xx so callers can toast it.

async function req(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// tiers
export const listTiers = () => req('/api/admin/tiers');
export const createTier = (body) => req('/api/admin/tiers', { method: 'POST', body });
export const updateTier = (id, body) => req(`/api/admin/tiers/${id}`, { method: 'PATCH', body });
export const reorderTiers = (orderedIds) => req('/api/admin/tiers/reorder', { method: 'POST', body: { orderedIds } });
export const deleteTier = (id) => req(`/api/admin/tiers/${id}`, { method: 'DELETE' });

// users
export const listUsers = () => req('/api/admin/users');
export const inviteUser = (body) => req('/api/admin/users', { method: 'POST', body });
export const updateUser = (id, body) => req(`/api/admin/users/${id}`, { method: 'PATCH', body });
export const deleteUser = (id) => req(`/api/admin/users/${id}`, { method: 'DELETE' });
export const reinviteUser = (id) => req(`/api/admin/users/${id}/reinvite`, { method: 'POST' });

// invite acceptance + self
export const getInvite = (token) => req(`/api/auth/invite/${token}`);
export const acceptInvite = (token, password) => req(`/api/auth/invite/${token}`, { method: 'POST', body: { password } });
export const changePassword = (current_password, new_password) =>
  req('/api/auth/change-password', { method: 'POST', body: { current_password, new_password } });
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -3`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/api/admin.js
git commit -m "feat(admin): frontend API client for tiers/users/invites

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Admins page — People panel

**Files:**
- Create: `src/components/admin/UsersPanel.jsx`
- Modify: `src/pages/admin/AdminUsers.jsx`

**Interfaces:**
- Consumes: `src/api/admin.js`, `useAuth()` (for `user.rank` to compute assignable tiers), shadcn `Table`, `Dialog`, `Select`, `Button`, `Input`, `Label`, `Badge`, `Switch`, `AlertDialog`, `use-toast`.
- Produces: `<UsersPanel />` — lists manageable staff, invite dialog (returns a copy-link), edit tier, activate/deactivate, delete, and copy-link for pending users (via reinvite).

- [ ] **Step 1: Build the People panel**

Create `src/components/admin/UsersPanel.jsx`:

```jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import {
  listUsers, inviteUser, updateUser, deleteUser, reinviteUser, listTiers,
} from '@/api/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { Copy, UserPlus, Trash2 } from 'lucide-react';

const STATUS_STYLES = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  disabled: 'bg-gray-200 text-gray-600',
};

export default function UsersPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Tiers this user may assign: below their rank (super sees all non-super tiers).
  const assignableTiers = tiers.filter(
    (t) => !t.is_system && (user?.rank === 0 || t.rank > user?.rank),
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, t] = await Promise.all([listUsers(), listTiers()]);
      setUsers(u);
      setTiers(t);
    } catch (e) {
      toast({ title: 'Could not load admins', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const copyLink = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Invite link copied', description: 'Share it with the new admin.' });
    } catch {
      toast({ title: 'Copy this link', description: url });
    }
  };

  const onReinvite = async (id) => {
    try {
      const { invite_url } = await reinviteUser(id);
      await copyLink(invite_url);
    } catch (e) {
      toast({ title: 'Could not create link', description: e.message, variant: 'destructive' });
    }
  };

  const onToggleActive = async (u) => {
    try {
      await updateUser(u.id, { is_active: !u.is_active });
      load();
    } catch (e) {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    }
  };

  const onChangeTier = async (u, tier_id) => {
    try {
      await updateUser(u.id, { tier_id });
      load();
    } catch (e) {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    }
  };

  const onConfirmDelete = async () => {
    try {
      await deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="font-body text-sm text-muted-foreground">
          Admins you can manage. You can only assign tiers below your own.
        </p>
        <Button onClick={() => setInviteOpen(true)} className="bg-gold hover:bg-gold/90 text-white" disabled={!assignableTiers.length}>
          <UserPlus size={16} className="mr-2" /> Invite admin
        </Button>
      </div>

      {loading ? (
        <p className="font-body text-sm text-muted-foreground">Loading…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-muted-foreground">No admins yet.</TableCell></TableRow>
            )}
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.full_name}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Select value={u.tier_id} onValueChange={(v) => onChangeTier(u, v)}>
                    <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {assignableTiers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Badge className={STATUS_STYLES[u.status]}>{u.status}</Badge>
                </TableCell>
                <TableCell className="text-right space-x-2 whitespace-nowrap">
                  {u.status === 'pending' && (
                    <Button variant="outline" size="sm" onClick={() => onReinvite(u.id)}>
                      <Copy size={14} className="mr-1" /> Invite link
                    </Button>
                  )}
                  {u.status !== 'pending' && (
                    <Button variant="outline" size="sm" onClick={() => onToggleActive(u)}>
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setDeleteTarget(u)}>
                    <Trash2 size={14} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        tiers={assignableTiers}
        onInvited={load}
        copyLink={copyLink}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this admin?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.full_name} ({deleteTarget?.email}) will lose access immediately. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={onConfirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InviteDialog({ open, onClose, tiers, onInvited, copyLink }) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [tierId, setTierId] = useState('');
  const [link, setLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setEmail(''); setFullName(''); setTierId(''); setLink(''); };

  const submit = async () => {
    setSubmitting(true);
    try {
      const { invite_url } = await inviteUser({ email, full_name: fullName, tier_id: tierId });
      setLink(invite_url);
      onInvited();
    } catch (e) {
      toast({ title: 'Invite failed', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Invite an admin</DialogTitle></DialogHeader>
        {link ? (
          <div className="space-y-3">
            <p className="font-body text-sm text-muted-foreground">
              Invite created. Copy this link and send it to the new admin — it expires in 7 days.
            </p>
            <div className="flex gap-2">
              <Input readOnly value={link} className="text-xs" />
              <Button onClick={() => copyLink(link)}><Copy size={16} /></Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="inv-name" className="text-xs">Full name</Label>
              <Input id="inv-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="inv-email" className="text-xs">Email</Label>
              <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Tier</Label>
              <Select value={tierId} onValueChange={setTierId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a tier" /></SelectTrigger>
                <SelectContent>
                  {tiers.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <DialogFooter>
          {link ? (
            <Button onClick={() => { reset(); onClose(); }}>Done</Button>
          ) : (
            <Button
              className="bg-gold hover:bg-gold/90 text-white"
              disabled={submitting || !email || !fullName || !tierId}
              onClick={submit}
            >
              {submitting ? 'Creating…' : 'Create invite'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Render the People panel from AdminUsers (temporary single-panel)**

Replace `src/pages/admin/AdminUsers.jsx`:

```jsx
import React from 'react';
import UsersPanel from '@/components/admin/UsersPanel';

export default function AdminUsers() {
  return (
    <div>
      <h1 className="font-heading text-3xl text-foreground mb-1">Admins</h1>
      <p className="font-body text-muted-foreground mb-6">Manage admin accounts and their access.</p>
      <UsersPanel />
    </div>
  );
}
```

- [ ] **Step 3: Verify build + lint**

Run: `npm run build 2>&1 | tail -3 && npm run lint 2>&1 | tail -5`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/UsersPanel.jsx src/pages/admin/AdminUsers.jsx
git commit -m "feat(admin): People panel — invite (copy-link), tier change, (de)activate, delete

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Admins page — Tiers panel (super admin only) + tabs

**Files:**
- Create: `src/components/admin/TiersPanel.jsx`
- Modify: `src/pages/admin/AdminUsers.jsx`

**Interfaces:**
- Consumes: `src/api/admin.js`, `useAuth()` (`user.rank === 0` to show/enable), shadcn `Tabs`, `Table`, `Checkbox`, `Input`, `Button`, `AlertDialog`, `use-toast`, lucide `ChevronUp/ChevronDown`.
- Produces: `<TiersPanel />` (create/rename/reorder/delete tiers + capability checkboxes); AdminUsers becomes a two-tab shell (People always; Tiers only when `user.rank === 0`).

- [ ] **Step 1: Build the Tiers panel**

Create `src/components/admin/TiersPanel.jsx`:

```jsx
import React, { useEffect, useState, useCallback } from 'react';
import { listTiers, createTier, updateTier, reorderTiers, deleteTier } from '@/api/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { ChevronUp, ChevronDown, Trash2, Plus, Lock } from 'lucide-react';

const CAPABILITIES = [
  'portfolio', 'team', 'faqs', 'process', 'investment', 'testimonials', 'inquiries', 'settings', 'users',
];

export default function TiersPanel() {
  const { toast } = useToast();
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setTiers(await listTiers()); }
    catch (e) { toast({ title: 'Could not load tiers', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const editable = tiers.filter((t) => !t.is_system);

  const onCreate = async () => {
    if (!newName.trim()) return;
    try { await createTier({ name: newName.trim(), capabilities: [] }); setNewName(''); load(); }
    catch (e) { toast({ title: 'Create failed', description: e.message, variant: 'destructive' }); }
  };

  const onToggleCap = async (tier, cap) => {
    const has = tier.capabilities.includes(cap);
    const next = has ? tier.capabilities.filter((c) => c !== cap) : [...tier.capabilities, cap];
    try { await updateTier(tier.id, { capabilities: next }); load(); }
    catch (e) { toast({ title: 'Update failed', description: e.message, variant: 'destructive' }); }
  };

  const onRename = async (tier, name) => {
    if (!name.trim() || name === tier.name) return;
    try { await updateTier(tier.id, { name: name.trim() }); load(); }
    catch (e) { toast({ title: 'Rename failed', description: e.message, variant: 'destructive' }); }
  };

  const onMove = async (index, dir) => {
    const arr = [...editable];
    const j = index + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[index], arr[j]] = [arr[j], arr[index]];
    try { await reorderTiers(arr.map((t) => t.id)); load(); }
    catch (e) { toast({ title: 'Reorder failed', description: e.message, variant: 'destructive' }); }
  };

  const onConfirmDelete = async () => {
    try { await deleteTier(deleteTarget.id); setDeleteTarget(null); load(); }
    catch (e) { toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }); }
  };

  if (loading) return <p className="font-body text-sm text-muted-foreground">Loading…</p>;

  return (
    <div>
      <p className="font-body text-sm text-muted-foreground mb-4">
        Higher in the list = more power. The super admin tier is locked.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Order</TableHead>
            <TableHead>Tier</TableHead>
            {CAPABILITIES.map((c) => <TableHead key={c} className="text-center text-xs">{c}</TableHead>)}
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tiers.map((t) => {
            const idx = editable.findIndex((e) => e.id === t.id);
            return (
              <TableRow key={t.id}>
                <TableCell>
                  {t.is_system ? <Lock size={14} className="text-muted-foreground" /> : (
                    <div className="flex flex-col">
                      <button onClick={() => onMove(idx, -1)} disabled={idx === 0} className="disabled:opacity-30"><ChevronUp size={14} /></button>
                      <button onClick={() => onMove(idx, 1)} disabled={idx === editable.length - 1} className="disabled:opacity-30"><ChevronDown size={14} /></button>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {t.is_system ? (
                    <span className="font-medium">{t.name}</span>
                  ) : (
                    <Input
                      defaultValue={t.name}
                      className="h-8 w-36"
                      onBlur={(e) => onRename(t, e.target.value)}
                    />
                  )}
                </TableCell>
                {CAPABILITIES.map((c) => (
                  <TableCell key={c} className="text-center">
                    <Checkbox
                      checked={t.is_system || t.capabilities.includes(c)}
                      disabled={t.is_system}
                      onCheckedChange={() => onToggleCap(t, c)}
                    />
                  </TableCell>
                ))}
                <TableCell>
                  {!t.is_system && (
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setDeleteTarget(t)}>
                      <Trash2 size={14} />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="flex items-end gap-2 mt-4">
        <div>
          <Label htmlFor="new-tier" className="text-xs">New tier name</Label>
          <Input id="new-tier" value={newName} onChange={(e) => setNewName(e.target.value)} className="mt-1 w-48" />
        </div>
        <Button onClick={onCreate} disabled={!newName.trim()}><Plus size={16} className="mr-1" /> Add tier</Button>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tier “{deleteTarget?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              You can only delete a tier with no admins assigned to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={onConfirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Step 2: Make AdminUsers a two-tab shell**

Replace `src/pages/admin/AdminUsers.jsx`:

```jsx
import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UsersPanel from '@/components/admin/UsersPanel';
import TiersPanel from '@/components/admin/TiersPanel';

export default function AdminUsers() {
  const { user } = useAuth();
  const isSuper = user?.rank === 0;

  return (
    <div>
      <h1 className="font-heading text-3xl text-foreground mb-1">Admins</h1>
      <p className="font-body text-muted-foreground mb-6">Manage admin accounts and their access.</p>
      <Tabs defaultValue="people">
        <TabsList>
          <TabsTrigger value="people">People</TabsTrigger>
          {isSuper && <TabsTrigger value="tiers">Tiers</TabsTrigger>}
        </TabsList>
        <TabsContent value="people" className="mt-6"><UsersPanel /></TabsContent>
        {isSuper && <TabsContent value="tiers" className="mt-6"><TiersPanel /></TabsContent>}
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 3: Verify build + lint**

Run: `npm run build 2>&1 | tail -3 && npm run lint 2>&1 | tail -5`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/TiersPanel.jsx src/pages/admin/AdminUsers.jsx
git commit -m "feat(admin): Tiers panel (create/rename/reorder/delete + capabilities) + People/Tiers tabs

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: Invite-accept page + PageNotFound role fix

**Files:**
- Modify: `src/pages/InviteAccept.jsx`
- Modify: `src/lib/PageNotFound.jsx`

**Interfaces:**
- Consumes: `useParams().token`, `getInvite`/`acceptInvite` (api/admin.js), `useAuth().checkUserAuth`, shadcn `Input`/`Button`/`Label`, `Logo`.
- Produces: a working `/invite/:token` set-password page; PageNotFound admin link keyed off `role === 'staff'`.

- [ ] **Step 1: Build the invite page**

Replace `src/pages/InviteAccept.jsx`:

```jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInvite, acceptInvite } from '@/api/admin';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Logo from '@/components/shared/Logo';

export default function InviteAccept() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { checkUserAuth } = useAuth();
  const [state, setState] = useState('loading'); // loading | ready | invalid
  const [invite, setInvite] = useState(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    getInvite(token)
      .then((data) => { if (alive) { setInvite(data); setState('ready'); } })
      .catch(() => { if (alive) setState('invalid'); });
    return () => { alive = false; };
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setSubmitting(true);
    try {
      const { user } = await acceptInvite(token, password);
      await checkUserAuth();
      navigate(user?.role === 'client' ? '/portal' : '/admin', { replace: true });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8"><Logo /></div>
        <div className="bg-white rounded-xl border border-border p-8 shadow-sm">
          {state === 'loading' && <p className="font-body text-sm text-muted-foreground text-center">Checking your invite…</p>}
          {state === 'invalid' && (
            <div className="text-center">
              <h1 className="font-heading text-2xl mb-2">Invite unavailable</h1>
              <p className="font-body text-sm text-muted-foreground">
                This invite link is invalid or has expired. Ask whoever invited you for a fresh link.
              </p>
            </div>
          )}
          {state === 'ready' && (
            <>
              <h1 className="font-heading text-2xl text-center mb-1">Set your password</h1>
              <p className="font-body text-muted-foreground text-sm text-center mb-6">
                Welcome, {invite.full_name} — you're joining as {invite.tier_name || 'an admin'}.
              </p>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <Label htmlFor="pw" className="text-xs">Password</Label>
                  <Input id="pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" required />
                </div>
                <div>
                  <Label htmlFor="pw2" className="text-xs">Confirm password</Label>
                  <Input id="pw2" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1" required />
                </div>
                {error && <p className="font-body text-sm text-red-500" role="alert">{error}</p>}
                <Button type="submit" disabled={submitting} className="w-full bg-gold hover:bg-gold/90 text-white">
                  {submitting ? 'Setting up…' : 'Set password & sign in'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Fix the PageNotFound role check**

In `src/lib/PageNotFound.jsx` (~line 44), change:

```jsx
                    {isFetched && authData.isAuthenticated && authData.user?.role === 'admin' && (
```

to:

```jsx
                    {isFetched && authData.isAuthenticated && authData.user?.role === 'staff' && (
```

- [ ] **Step 3: Verify build + lint**

Run: `npm run build 2>&1 | tail -3 && npm run lint 2>&1 | tail -5`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/pages/InviteAccept.jsx src/lib/PageNotFound.jsx
git commit -m "feat(auth): invite-accept set-password page; PageNotFound admin link -> role staff

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: Integration verification + deploy (staging → dev → PR → live)

**Files:** none (operational).

**Interfaces:** consumes the full feature; produces a verified live deployment.

> Deploy actions run through the fleet credential isolation and require Levi's go per project discipline. The Worker is deployed **manually** (CI has no token). Do not print the CF token.

- [ ] **Step 1: Full local gate**

Run:

```bash
cd /Users/levielizaga/Sites/clients/whitelabel/echohouse/dreamhome/site
npm test 2>&1 | tail -6
npm run build 2>&1 | tail -3
npm run lint 2>&1 | tail -5
```

Expected: all worker tests pass; build exits 0; lint clean.

- [ ] **Step 2: Push the feature branch and open a PR into `staging`**

```bash
git push -u origin claude/admin-role-hierarchy
gh pr create --base staging --head claude/admin-role-hierarchy \
  --title "feat: admin role hierarchy (ranked tiers + capabilities + copy-link invites)" \
  --body "Implements docs/superpowers/specs/2026-07-16-admin-role-hierarchy-design.md. Also includes the admin sidebar fix.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

- [ ] **Step 3: Apply migration 0003 to remote D1 (fleet OAuth)**

Using the fleet credential isolation (mirror `scratchpad/cf-deploy-worker.cjs`; never print the token):

```bash
# via the fleet-OAuth wrangler wrapper, from workers/api:
#   npx wrangler d1 migrations apply wl-dreamhome-db --remote
```

Then verify exactly one super admin exists and the backfill landed:

```bash
#   npx wrangler d1 execute wl-dreamhome-db --remote \
#     --command "SELECT u.email, u.role, t.name, t.rank FROM users u LEFT JOIN admin_tiers t ON t.id=u.tier_id ORDER BY t.rank;"
```

Expected: exactly one row at rank 0 (the intended super admin — confirm with Levi it is the correct account, since the pre-migration data showed a "48Labs Admin" super_admin). If more than one, demote the extras to `tier_admin` before continuing.

- [ ] **Step 4: Deploy the Worker manually (fleet OAuth)**

```bash
# node scratchpad/cf-deploy-worker.cjs deploy   (resolveCfCreds(null) + cfDeployEnv; token never printed)
```

Expected: a new `wl-dreamhome-api` version id; `/api/auth/me` → 401 signed-out; public GET still 200.

- [ ] **Step 5: Verify on dev (staging Pages build)**

After the staging PR merges, `wl-dreamhome-site-dev` rebuilds → dev.dreamhome.design. In-browser on the dev portal host:
- Sign in as super admin → **Admins** appears; **Tiers** tab present; create a "Content Manager" tier (content caps only).
- Invite an admin into a lower tier → copy the link → open it in a private window → set password → lands on the dashboard with only the permitted nav.
- Confirm a limited admin can't see Site Settings / Admins; confirm they cannot invite into a tier at/above their rank.
- Deactivate the test admin → their next action bounces them to `/login`.

- [ ] **Step 6: Promote to live**

Open a PR `staging` → `main`; on merge, `wl-dreamhome-site` rebuilds → dreamhome.design + portal + www. Re-run Step 4's manual Worker deploy if the Worker changed since the dev verify (it did — deploy once against production D1, which is the same `wl-dreamhome-db`). Spot-check portal.dreamhome.design live.

- [ ] **Step 7: Final commit / cleanup**

No code changes; confirm branches at the merged commit and the todo list is complete.

---

## Self-Review

**1. Spec coverage**

| Spec item | Task |
|---|---|
| Rank ladder, `canManage` strictly-below | 2 (helper), 5 (users), 4 (tiers) |
| Per-tier capabilities + checklist | 1 (schema), 4 (tier CRUD), 13 (UI) |
| Named tiers, super-admin-managed | 4 (super-only gate), 13 (Tiers panel) |
| Capability keys 1:1 with sidebar | 2 (`CAPABILITIES`/`ENTITY_CAPABILITY`), 10 (nav) |
| Anti-escalation (rank-below + subset) | 2 (`capsSubsetOf`), 5 (invite/patch) |
| super_admin singleton immutability | 1 (`is_system`), 4 (patch/delete/reorder guards), 5 (assign/delete guards) |
| Session rank/caps live from D1; inactive → null | 3 (`getSession`) |
| Capability-gated CMS/inquiry/upload | 7 |
| Tier + user + invite + change-password endpoints | 4, 5, 6, wired in 7 |
| Copy-link invite (hashed token, expiry, reinvite) | 3 (helpers), 5 (invite/reinvite), 6 (accept) |
| Frontend caps + nav filter + guards | 8, 9, 10 |
| Admins page (People + Tiers) | 12, 13 |
| Invite-accept page | 14 |
| `role` → client/staff; PageNotFound fix | 1 (backfill), 14 |
| Migration/backfill of manager/admin/super | 1 |
| Unit tests for rules + build gate | 2, 3, 4, 5, 6; build/lint in 8–14 |
| Deploy staging→main, manual Worker | 15 |
| Out of scope: email, clients, portal data | respected (copy-link only; staff-only endpoints) |

No gaps.

**2. Placeholder scan:** No "TBD"/"handle edge cases"/"similar to Task N". The one forward-reference (Task 5's DELETE-super `reads`) is resolved with concrete code in the same task's Step 3.

**3. Type consistency:** `handleAdminRoutes(context)` signature consistent across 4/5/6/7. `getSession` return shape (`rank`, `capabilities`, `tier_name`, `is_active`) consistent across auth.js, admin.js, AuthContext, UI. `can(capability)` name consistent (AuthContext → CapabilityGuard → AdminLayout). API client names (`inviteUser`, `reinviteUser`, `reorderTiers`, etc.) match their usages in UsersPanel/TiersPanel/InviteAccept. Capability key list identical in rbac.js and TiersPanel (`CAPABILITIES`).
