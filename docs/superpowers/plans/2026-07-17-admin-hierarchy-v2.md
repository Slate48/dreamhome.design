# Admin Hierarchy v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redefine the staff hierarchy into four fixed bands (Super / Level 1 / Level 2 / Member) where any `users`-capable admin sees the whole admin roster and may create/edit peers, while deletion and deactivation stay restricted to strictly-lower ranks.

**Architecture:** Two pure rank predicates in `rbac.js` (`canManage` = own-level-or-below for create/edit/reinvite; `canDelete` = strictly-below for delete/deactivate) drive the API handlers in `admin.js`. A data-only D1 migration (`0005`) adds the Member tier and relabels/re-caps the existing tiers. The frontend renders the full roster and gates per-row actions on server-provided `can_edit`/`can_delete` flags — every mutation is re-checked server-side (defense in depth). A new real-D1 smoke script exercises the actual invite/patch/delete SQL against a local SQLite (via wrangler `--local`) to catch schema/constraint drift like the invite-500 `NOT NULL` bug the mock harness could not.

**Tech Stack:** Cloudflare Worker (dependency-free ES modules), D1/SQLite, `node:test` for unit tests, wrangler `--local` for the smoke test, React 18 + Vite + shadcn/ui for the admin panel.

**Full design spec:** `docs/superpowers/specs/2026-07-17-admin-hierarchy-v2-design.md`

## Global Constraints

- The 9 capability keys are fixed and ordered: `['portfolio','team','faqs','process','investment','testimonials','inquiries','settings','users']`. Member caps = the first 7 (no `settings`, no `users`).
- Super admin is rank 0, tier id `tier_superadmin`, `is_system=1` — a permanent locked singleton, immutable via every API path; no non-super may target it, assign it, or see it in a list.
- Fixed 4 bands: ranks 0/1/2/3 with tier ids `tier_superadmin`/`tier_admin`/`tier_manager`/`tier_member`. Tier ids are REUSED (never renamed) so existing `users.tier_id` references stay valid.
- Worker runtime stays dependency-free (no new npm packages in the Worker bundle); tests add no new runtime/dev dependency — the smoke test drives the already-present wrangler.
- Never reintroduce base44 (`@base44/sdk`, `@base44/vite-plugin`, webhooks, `functions/`).
- All Cloudflare/wrangler calls go through `workers/api/cf-wrangler.cjs` (fleet OAuth); never print/log/serialize the CF token, and never use `--remote` in this plan (local `--local` state only).
- Nothing deploys or merges to `main` without Levi's explicit approval. This plan ends at a green, reviewed branch.
- Worker unit tests run from `workers/api/` with `node --test test/` (no package.json, `.mjs` files). The default suite must stay fast and must NOT require wrangler/network — the real-D1 check is a standalone script (`test/db-smoke.mjs`, not `*.test.mjs`), run on demand.
- The frontend has no test framework; frontend task verification is `npm run build` (exit 0) + `npm run lint` (exit 0) + manual, matching the existing hierarchy work.

---

### Task 1: Rank predicates (`canManage` own-or-below, add `canDelete`)

**Files:**
- Modify: `workers/api/src/lib/rbac.js:21-26`
- Test: `workers/api/test/rbac.test.mjs:24-29` (rewrite) + append `canDelete` tests

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `canManage(actorRank, targetRank) → boolean` — `true` if `actorRank === 0`, else `Number.isInteger(targetRank) && targetRank >= actorRank`.
  - `canDelete(actorRank, targetRank) → boolean` — `true` if `actorRank === 0`, else `Number.isInteger(targetRank) && targetRank > actorRank`.
  - Both exported from `rbac.js`; Tasks 2 and 3 import them.

- [ ] **Step 1: Rewrite the `canManage` test and add `canDelete` tests**

In `workers/api/test/rbac.test.mjs`, first update the import (line 3-5) to include `canDelete`:

```js
import {
  CAPABILITIES, ENTITY_CAPABILITY, canManage, canDelete, capsSubsetOf, isValidCapabilitySet,
} from '../src/lib/rbac.js'
```

Then replace the test at lines 24-29 (`'canManage: only strictly-lower ranks'`) with:

```js
test('canManage: own level or below (create/edit/reinvite)', () => {
  assert.equal(canManage(2, 3), true)  // below
  assert.equal(canManage(2, 2), true)  // peer — now allowed
  assert.equal(canManage(1, 1), true)  // peer at Level 1
  assert.equal(canManage(2, 1), false) // superior — never
  assert.equal(canManage(2, null), false)
  assert.equal(canManage(2, undefined), false)
  assert.equal(canManage(2, 1.5), false) // non-integer guard
})

test('canDelete: strictly below only (delete/deactivate)', () => {
  assert.equal(canDelete(0, 0), true)  // super bypasses everything
  assert.equal(canDelete(0, 2), true)
  assert.equal(canDelete(2, 3), true)  // below
  assert.equal(canDelete(2, 2), false) // peer — never delete a peer
  assert.equal(canDelete(1, 1), false) // peer at Level 1
  assert.equal(canDelete(2, 1), false) // superior
  assert.equal(canDelete(2, null), false)
  assert.equal(canDelete(2, 1.5), false) // non-integer guard
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd workers/api && node --test test/rbac.test.mjs`
Expected: FAIL — `canDelete` is `undefined` (not exported yet) and `canManage(2,2)` returns `false` under the current `>` logic.

- [ ] **Step 3: Update `canManage` and add `canDelete` in `rbac.js`**

Replace lines 21-26 of `workers/api/src/lib/rbac.js`:

```js
// rank 0 (super admin) manages everyone; otherwise you may act on your OWN level
// or below (higher rank number = lower privilege). Governs create / edit / reinvite.
export function canManage(actorRank, targetRank) {
  if (actorRank === 0) return true
  return Number.isInteger(targetRank) && targetRank >= actorRank
}

// Delete / deactivate is stricter than manage: only STRICTLY-lower ranks — never a
// peer, never a superior. Super (rank 0) bypasses.
export function canDelete(actorRank, targetRank) {
  if (actorRank === 0) return true
  return Number.isInteger(targetRank) && targetRank > actorRank
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd workers/api && node --test test/rbac.test.mjs`
Expected: PASS — all rbac tests green.

- [ ] **Step 5: Run the full worker suite (no regressions)**

Run: `cd workers/api && node --test test/`
Expected: `admin.test.mjs` now has failures (its old semantics are addressed in Tasks 2-3) — that is expected and handled next. `rbac.test.mjs` and `auth.test.mjs` PASS.

- [ ] **Step 6: Commit**

```bash
git add workers/api/src/lib/rbac.js workers/api/test/rbac.test.mjs
git commit -m "feat(rbac): canManage own-or-below + add canDelete strictly-below"
```

---

### Task 2: Broaden `listUsers` visibility + `can_edit`/`can_delete` annotations

**Files:**
- Modify: `workers/api/src/lib/admin.js:12` (import), `admin.js:177-199` (`listUsers` + its doc comment)
- Test: `workers/api/test/admin.test.mjs:190-206` (extend) + one new non-super visibility test

**Interfaces:**
- Consumes: `canManage`, `canDelete` from Task 1.
- Produces: `GET /api/admin/users` returns rows shaped
  `{ id, email, full_name, tier_id, tier_name, rank, is_active, status, invited_by, can_edit, can_delete }`.
  - Non-super viewer: all `role='staff'` rows where `rank !== 0` and `id !== me.id`.
  - Super viewer: all `role='staff'` rows where `id !== me.id`.
  - `can_edit = canManage(me.rank, row.rank)`, `can_delete = canDelete(me.rank, row.rank)`.
  - Task 6 (frontend) consumes `can_edit`/`can_delete`.

- [ ] **Step 1: Add the `canDelete` import**

In `workers/api/src/lib/admin.js`, change line 12 from:

```js
import { isValidCapabilitySet, canManage, capsSubsetOf } from './rbac.js'
```

to:

```js
import { isValidCapabilitySet, canManage, canDelete, capsSubsetOf } from './rbac.js'
```

- [ ] **Step 2: Extend the existing listUsers test and add a non-super test**

In `workers/api/test/admin.test.mjs`, first add a Level-2 fixture after the `adminRow` definition (after line 28):

```js
const managerRow = {
  id: 'u_mg', email: 'mg@x.com', role: 'staff', full_name: 'MG', tier_id: 'tier_manager',
  is_active: 1, tier_name: 'Level 2', tier_rank: 2,
  tier_caps: '["portfolio","team","faqs","process","investment","testimonials","inquiries","settings","users"]',
}
```

Then, in the existing test `'GET /api/admin/users: excludes the actor ...'` (lines 190-206), after the last assertion (line 205), add annotation checks:

```js
  const byId = Object.fromEntries(list.map(r => [r.id, r]))
  assert.equal(byId.u_ad.can_edit, true)   // super manages anyone
  assert.equal(byId.u_ad.can_delete, true) // super deletes anyone
  assert.equal(byId.u_mg.can_edit, true)
  assert.equal(byId.u_mg.can_delete, true)
```

Then add a new test immediately after that test's closing `})`:

```js
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
```

- [ ] **Step 3: Run the listUsers tests to verify they fail**

Run: `cd workers/api && node --test test/admin.test.mjs`
Expected: FAIL on the two listUsers tests — current `listUsers` filters with `canManage` (drops peers/super) and returns no `can_edit`/`can_delete` fields.

- [ ] **Step 4: Rewrite `listUsers` in `admin.js`**

Replace lines 177-199 of `workers/api/src/lib/admin.js` (the doc comment through the end of `listUsers`):

```js
// GET /api/admin/users — the roster the viewer may see. A non-super viewer sees
// every staff row except the super account (rank 0) and their own; super sees all
// but self. Each row is annotated can_edit/can_delete; every mutation re-checks
// server-side, so these flags are for UI affordance only (defense in depth).
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
    .filter((r) => r.id !== me.id && (me.rank === SUPER_TIER_RANK || r.tier_rank !== SUPER_TIER_RANK))
    .map((r) => ({
      id: r.id, email: r.email, full_name: r.full_name, tier_id: r.tier_id,
      tier_name: r.tier_name, rank: r.tier_rank, is_active: !!r.is_active,
      status: userStatus(r), invited_by: r.invited_by || null,
      can_edit: canManage(me.rank, r.tier_rank),
      can_delete: canDelete(me.rank, r.tier_rank),
    }))
  return json(rows)
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd workers/api && node --test test/admin.test.mjs`
Expected: the two listUsers tests PASS. Other admin tests tied to old mutation semantics may still fail — fixed in Task 3.

- [ ] **Step 6: Commit**

```bash
git add workers/api/src/lib/admin.js workers/api/test/admin.test.mjs
git commit -m "feat(admin): listUsers returns full visible roster with can_edit/can_delete"
```

---

### Task 3: Mutation gates — invite copy, deactivate=canDelete, delete=canDelete, reinvite semantics

**Files:**
- Modify: `workers/api/src/lib/admin.js:215` (invite copy), `admin.js:291` (patch is_active gate), `admin.js:296` (patch tier copy), `admin.js:318` (delete gate)
- Test: `workers/api/test/admin.test.mjs` — rewrite the invite/patch/reinvite tests at lines 120-127, 181-188, 226-233; add peer-delete + lower-delete tests

**Interfaces:**
- Consumes: `canManage`, `canDelete` (Task 1); `managerRow` fixture (added in Task 2).
- Produces: final server-side rules —
  - Invite/reinvite/tier-assign gated by `canManage` (own-or-below), copy reads "at or below your own".
  - Deactivate (`is_active → 0`) additionally requires `canDelete`; activate (`→ 1`) needs only `canManage`.
  - Delete gated by `canDelete` (strictly below), after the never-self / never-super guards.

- [ ] **Step 1: Rewrite the invite and reinvite peer/higher tests; add delete tests**

In `workers/api/test/admin.test.mjs`:

(a) Replace the test at lines 120-127 (`'admin cannot invite into a tier at/above its own rank'`) with these two tests:

```js
test('POST /api/admin/users: admin can invite at their own level (peer tier)', async () => {
  const ctx = await ctxAs({ id: 'u_ad', role: 'staff', _row: adminRow }, {
    method: 'POST', path: '/api/admin/users', body: { email: 'peer@y.com', full_name: 'Peer', tier_id: 'tier_admin' },
    reads: (sql) => {
      if (sql.includes('FROM admin_tiers WHERE id')) return { first: { id: 'tier_admin', rank: 1, capabilities: '["portfolio"]', is_system: 0 } }
      if (sql.includes('FROM users WHERE email')) return { first: null }
      return {}
    },
  })
  assert.equal((await handleAdminRoutes(ctx)).status, 201)
})

test('POST /api/admin/users: cannot invite into a tier above your own rank', async () => {
  const ctx = await ctxAs({ id: 'u_mg', role: 'staff', _row: managerRow }, {
    method: 'POST', path: '/api/admin/users', body: { email: 'up@y.com', full_name: 'Up', tier_id: 'tier_admin' },
    reads: (sql) => sql.includes('FROM admin_tiers WHERE id')
      ? { first: { id: 'tier_admin', rank: 1, capabilities: '["portfolio"]', is_system: 0 } } : {},
  })
  assert.equal((await handleAdminRoutes(ctx)).status, 403)
})
```

(b) Replace the test at lines 181-188 (`'cannot modify a peer/higher-ranked target'`) with these three tests:

```js
test("PATCH /api/admin/users/:id: can edit a peer's name (manage allows own level)", async () => {
  let updateSql = null
  const ctx = await ctxAs({ id: 'u_ad', role: 'staff', _row: adminRow }, {
    method: 'PATCH', path: '/api/admin/users/u_peer', body: { full_name: 'Renamed' },
    reads: (sql) => {
      if (sql.includes("u.role = 'staff'")) return { first: { id: 'u_peer', tier_rank: 1, tier_id: 'tier_admin', is_active: 1, has_password: 1 } }
      if (sql.startsWith('UPDATE users SET')) { updateSql = sql; return { run: { meta: { changes: 1 } } } }
      return {}
    },
  })
  const res = await handleAdminRoutes(ctx)
  assert.equal(res.status, 200)
  assert.match(updateSql, /full_name/)
})

test('PATCH /api/admin/users/:id: cannot DEACTIVATE a peer (deactivate is delete-like)', async () => {
  const ctx = await ctxAs({ id: 'u_ad', role: 'staff', _row: adminRow }, {
    method: 'PATCH', path: '/api/admin/users/u_peer', body: { is_active: 0 },
    reads: (sql) => sql.includes("u.role = 'staff'")
      ? { first: { id: 'u_peer', tier_rank: 1, tier_id: 'tier_admin', is_active: 1, has_password: 1 } } : {},
  })
  assert.equal((await handleAdminRoutes(ctx)).status, 403)
})

test('PATCH /api/admin/users/:id: cannot modify a higher-ranked target', async () => {
  const ctx = await ctxAs({ id: 'u_mg', role: 'staff', _row: managerRow }, {
    method: 'PATCH', path: '/api/admin/users/u_ad', body: { full_name: 'x' },
    reads: (sql) => sql.includes("u.role = 'staff'")
      ? { first: { id: 'u_ad', tier_rank: 1, tier_id: 'tier_admin', is_active: 1, has_password: 1 } } : {},
  })
  assert.equal((await handleAdminRoutes(ctx)).status, 403)
})
```

(c) Replace the test at lines 226-233 (`'reinvite: forbidden for a target the actor cannot manage'`) with a higher-ranked-target case:

```js
test('POST /api/admin/users/:id/reinvite: forbidden for a higher-ranked target', async () => {
  const ctx = await ctxAs({ id: 'u_mg', role: 'staff', _row: managerRow }, {
    method: 'POST', path: '/api/admin/users/u_ad/reinvite',
    reads: (sql) => sql.includes("u.role = 'staff'")
      ? { first: { id: 'u_ad', tier_rank: 1, tier_id: 'tier_admin', is_active: 0, has_password: 0 } } : {},
  })
  assert.equal((await handleAdminRoutes(ctx)).status, 403)
})
```

(d) Add two DELETE tests (place them after the existing `'cannot delete a super-admin target'` test, ~line 153):

```js
test('DELETE /api/admin/users/:id: cannot delete a peer (delete is strictly-below)', async () => {
  const ctx = await ctxAs({ id: 'u_ad', role: 'staff', _row: adminRow }, {
    method: 'DELETE', path: '/api/admin/users/u_peer',
    reads: (sql) => sql.includes("u.role = 'staff'")
      ? { first: { id: 'u_peer', tier_rank: 1, tier_id: 'tier_admin', is_active: 1, has_password: 1 } } : {},
  })
  assert.equal((await handleAdminRoutes(ctx)).status, 403)
})

test('DELETE /api/admin/users/:id: deletes a lower-ranked target', async () => {
  const ctx = await ctxAs({ id: 'u_ad', role: 'staff', _row: adminRow }, {
    method: 'DELETE', path: '/api/admin/users/u_mem',
    reads: (sql) => sql.includes("u.role = 'staff'")
      ? { first: { id: 'u_mem', tier_rank: 3, tier_id: 'tier_member', is_active: 1, has_password: 1 } } : {},
  })
  assert.equal((await handleAdminRoutes(ctx)).status, 200)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd workers/api && node --test test/admin.test.mjs`
Expected: FAIL — the new peer-invite expects 201 (old code 403s a peer), peer-name-edit expects 200 (old code 403s), peer-deactivate needs the new `canDelete` gate, peer-delete needs `deleteUser` on `canDelete`, and reinvite/higher tests need the new semantics.

- [ ] **Step 3: Update the invite copy in `inviteUser`**

In `workers/api/src/lib/admin.js` line 215, change:

```js
  if (!canManage(me.rank, tier.rank)) return json({ error: 'You can only assign tiers below your own' }, 403)
```

to:

```js
  if (!canManage(me.rank, tier.rank)) return json({ error: 'You can only assign tiers at or below your own' }, 403)
```

- [ ] **Step 4: Add the deactivate=canDelete gate and update tier copy in `patchUser`**

In `workers/api/src/lib/admin.js`, replace line 291:

```js
  if ('is_active' in body) { sets.push('is_active = ?'); binds.push(body.is_active ? 1 : 0) }
```

with:

```js
  if ('is_active' in body) {
    const active = body.is_active ? 1 : 0
    if (active === 0 && !canDelete(me.rank, target.tier_rank)) {
      return json({ error: 'You cannot deactivate someone at your own level' }, 403)
    }
    sets.push('is_active = ?'); binds.push(active)
  }
```

Then, in the tier-assign branch, change line 296:

```js
    if (!canManage(me.rank, tier.rank)) return json({ error: 'You can only assign tiers below your own' }, 403)
```

to:

```js
    if (!canManage(me.rank, tier.rank)) return json({ error: 'You can only assign tiers at or below your own' }, 403)
```

- [ ] **Step 5: Switch `deleteUser` to `canDelete`**

In `workers/api/src/lib/admin.js` line 318, change:

```js
  if (!canManage(me.rank, target.tier_rank)) return json({ error: 'Insufficient privileges' }, 403)
```

to:

```js
  if (!canDelete(me.rank, target.tier_rank)) return json({ error: 'Insufficient privileges' }, 403)
```

(Also update the `deleteUser` doc comment at line 309 from "ranked below you" — it already says "below you", which stays accurate under `canDelete`.)

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd workers/api && node --test test/admin.test.mjs`
Expected: PASS — all admin tests green.

- [ ] **Step 7: Run the full worker suite (no regressions)**

Run: `cd workers/api && node --test test/`
Expected: PASS — `rbac.test.mjs`, `admin.test.mjs`, `auth.test.mjs` all green.

- [ ] **Step 8: Commit**

```bash
git add workers/api/src/lib/admin.js workers/api/test/admin.test.mjs
git commit -m "feat(admin): peer create/edit allowed; delete+deactivate require strictly-below"
```

---

### Task 4: Migration `0005_hierarchy_v2.sql` (Member tier + relabel/re-cap)

**Files:**
- Create: `workers/api/migrations/0005_hierarchy_v2.sql`

**Interfaces:**
- Consumes: the tier ids seeded by `0003` (`tier_superadmin`/`tier_admin`/`tier_manager`).
- Produces: after `0005`, `admin_tiers` holds four rows — `tier_superadmin` (rank 0, unchanged), `tier_admin` (rank 1, name "Level 1", all 9 caps), `tier_manager` (rank 2, name "Level 2", all 9 caps), `tier_member` (rank 3, name "Member", 7 content caps, `is_system=0`). Verified by Task 5's smoke script.

- [ ] **Step 1: Write the migration file**

Create `workers/api/migrations/0005_hierarchy_v2.sql`:

```sql
-- 0005_hierarchy_v2.sql — Admin Hierarchy v2 (fixed 4 bands).
-- Spec: docs/superpowers/specs/2026-07-17-admin-hierarchy-v2-design.md
--
-- Data-only: adds the Member tier and relabels/re-caps the two client-owned tiers.
-- Tier ids are UNCHANGED so existing users.tier_id references stay valid; no user
-- rows move. The super tier (tier_superadmin, rank 0, is_system=1) is untouched.
-- Idempotent: INSERT OR IGNORE + UPDATE ... WHERE id, safe to re-run.

-- New: Member tier (rank 3) — the 7 content capabilities only (no settings, no users).
INSERT OR IGNORE INTO admin_tiers (id, name, rank, capabilities, is_system, created_date, updated_date) VALUES
  ('tier_member', 'Member', 3,
   '["portfolio","team","faqs","process","investment","testimonials","inquiries"]', 0,
   '2026-07-17T00:00:00.000Z', '2026-07-17T00:00:00.000Z');

-- Level 1 (was "Admin", rank 1) — relabel only; capabilities are already all 9.
UPDATE admin_tiers
  SET name = 'Level 1', updated_date = '2026-07-17T00:00:00.000Z'
  WHERE id = 'tier_admin';

-- Level 2 (was "Manager", rank 2) — relabel AND widen to all 9 capabilities.
UPDATE admin_tiers
  SET name = 'Level 2',
      capabilities = '["portfolio","team","faqs","process","investment","testimonials","inquiries","settings","users"]',
      updated_date = '2026-07-17T00:00:00.000Z'
  WHERE id = 'tier_manager';
```

- [ ] **Step 2: Apply it to a throwaway local D1 to verify it parses and produces the expected rows**

Run (from `workers/api`, isolated local state under the scratchpad):

```bash
cd workers/api
SMOKE_STATE="/private/tmp/claude-501/-Users-levielizaga-Sites-clients-whitelabel-echohouse-dreamhome-site/cc82a313-a6c8-41d8-bc5b-7a59e69a6c21/scratchpad/d1-0005-verify"
rm -rf "$SMOKE_STATE"
for f in 0001_public_content 0002_users 0003_admin_tiers 0004_users_password_nullable 0005_hierarchy_v2; do
  node cf-wrangler.cjs d1 execute wl-dreamhome-db --local --persist-to "$SMOKE_STATE" --file="migrations/$f.sql" </dev/null
done
node cf-wrangler.cjs d1 execute wl-dreamhome-db --local --persist-to "$SMOKE_STATE" \
  --command "SELECT id, name, rank, is_system, capabilities FROM admin_tiers ORDER BY rank;" </dev/null
```

Expected: four rows in rank order — `tier_superadmin` "Super Admin" rank 0 is_system 1; `tier_admin` "Level 1" rank 1; `tier_manager` "Level 2" rank 2 with all 9 caps; `tier_member` "Member" rank 3 with the 7 content caps. No SQL errors.

- [ ] **Step 3: Commit**

```bash
git add workers/api/migrations/0005_hierarchy_v2.sql
git commit -m "feat(db): migration 0005 — add Member tier, relabel Level 1/2, widen Level 2 caps"
```

---

### Task 5: Real-D1 smoke script (`test/db-smoke.mjs`)

**Files:**
- Create: `workers/api/test/db-smoke.mjs`

**Interfaces:**
- Consumes: migrations `0001`→`0005`; `cf-wrangler.cjs` (fleet OAuth); wrangler `--local`.
- Produces: a standalone runnable script — `node test/db-smoke.mjs` (from `workers/api`) prints `SMOKE PASS` and exits 0 on success, prints the failure and exits 1 otherwise. It is NOT picked up by `node --test test/` (filename is `.mjs`, not `.test.mjs`), so the default unit suite stays fast and wrangler-free.

**Why this exists:** the `_mock.mjs` harness enforces no SQL constraints, which is why the invite-500 (`NOT NULL constraint failed: users.password_hash`) slipped past every unit test. This script runs the actual invite/patch/delete SQL against a real SQLite so that class of drift fails loudly.

- [ ] **Step 1: Write the smoke script**

Create `workers/api/test/db-smoke.mjs`:

```js
// Real-D1 smoke test — applies migrations 0001..0005 to a fresh LOCAL SQLite (via
// wrangler --local through the fleet cf-wrangler wrapper) and runs the actual
// invite/deactivate/delete SQL. Catches schema/constraint drift the mock harness
// cannot (e.g. the NOT NULL password_hash bug that produced the invite-500).
//
// Run:  cd workers/api && node test/db-smoke.mjs
// Not a *.test.mjs on purpose: `node --test test/` must stay fast and wrangler-free.
// Requires local fleet OAuth (cf-wrangler resolves creds) but never touches --remote.

import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const API_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const DB = 'wl-dreamhome-db'
const STATE = mkdtempSync(join(tmpdir(), 'dreamhome-d1-smoke-'))
const MIGRATIONS = [
  '0001_public_content', '0002_users', '0003_admin_tiers',
  '0004_users_password_nullable', '0005_hierarchy_v2',
]

function wrangler(args) {
  const r = spawnSync('node', ['cf-wrangler.cjs', 'd1', 'execute', DB, '--local', '--persist-to', STATE, ...args],
    { cwd: API_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (r.status !== 0) {
    throw new Error(`wrangler d1 execute failed (exit ${r.status}):\n${r.stdout}\n${r.stderr}`)
  }
  return r.stdout
}

function query(sql) {
  const out = wrangler(['--command', sql])
  // wrangler prints a JSON array of result objects after its banner; grab it.
  const start = out.indexOf('[')
  const parsed = JSON.parse(out.slice(start))
  return parsed[0].results
}

function assert(cond, msg) { if (!cond) throw new Error(`ASSERT FAILED: ${msg}`) }

try {
  // 1. Apply every migration in order (each its own transaction).
  for (const m of MIGRATIONS) wrangler([`--file=migrations/${m}.sql`])

  // 2. The four fixed tiers exist with the expected ranks/names.
  const tiers = query('SELECT id, name, rank FROM admin_tiers ORDER BY rank;')
  assert(tiers.length === 4, `expected 4 tiers, got ${tiers.length}`)
  assert(tiers[0].id === 'tier_superadmin' && tiers[0].rank === 0, 'rank 0 super')
  assert(tiers[1].id === 'tier_admin' && tiers[1].name === 'Level 1', 'rank 1 Level 1')
  assert(tiers[2].id === 'tier_manager' && tiers[2].name === 'Level 2', 'rank 2 Level 2')
  assert(tiers[3].id === 'tier_member' && tiers[3].name === 'Member', 'rank 3 Member')

  // 3. THE REGRESSION GUARD: a pending invite inserts with password_hash = NULL.
  //    Pre-0004 this threw "NOT NULL constraint failed: users.password_hash".
  wrangler(['--command',
    "INSERT INTO users (id, email, password_hash, role, full_name, tier_id, is_active, invited_by, invite_token_hash, invite_expires, created_date, updated_date) " +
    "VALUES ('smoke_u', 'smoke@x.com', NULL, 'staff', 'Smoke', 'tier_manager', 0, 'smoke_inviter', 'deadbeef', '2099-01-01T00:00:00.000Z', '2026-07-17T00:00:00.000Z', '2026-07-17T00:00:00.000Z');"])
  const pending = query("SELECT id, is_active, (password_hash IS NULL) AS no_pw FROM users WHERE id = 'smoke_u';")
  assert(pending.length === 1 && pending[0].no_pw === 1 && pending[0].is_active === 0, 'pending invite row present with NULL password')

  // 4. Deactivate (is_active -> 0) then hard-delete succeed at the SQL level.
  wrangler(['--command', "UPDATE users SET is_active = 0 WHERE id = 'smoke_u';"])
  wrangler(['--command', "DELETE FROM users WHERE id = 'smoke_u';"])
  const gone = query("SELECT COUNT(*) AS n FROM users WHERE id = 'smoke_u';")
  assert(gone[0].n === 0, 'row deleted')

  console.log('SMOKE PASS — migrations 0001..0005 apply; NULL-password invite + deactivate + delete all succeed')
  process.exit(0)
} catch (e) {
  console.error('SMOKE FAIL —', e.message)
  process.exit(1)
} finally {
  rmSync(STATE, { recursive: true, force: true })
}
```

- [ ] **Step 2: Run the smoke script to verify it passes**

Run: `cd workers/api && node test/db-smoke.mjs`
Expected: prints `SMOKE PASS ...` and exits 0. (First run may take ~10-20s for wrangler cold-starts.)

- [ ] **Step 3: Confirm the default unit suite ignores it and stays green/fast**

Run: `cd workers/api && node --test test/`
Expected: PASS, and the output does NOT include `db-smoke` (node's test runner only picks up `*.test.*` files).

- [ ] **Step 4: Commit**

```bash
git add workers/api/test/db-smoke.mjs
git commit -m "test(db): real-D1 smoke — migrations + NULL-password invite/patch/delete"
```

---

### Task 6: Frontend — full roster, per-row action gating, Edit dialog

**Files:**
- Modify: `src/components/admin/UsersPanel.jsx`

**Interfaces:**
- Consumes: `GET /api/admin/users` rows with `can_edit`/`can_delete` (Task 2); `updateUser(id, { full_name, tier_id, is_active })`, `deleteUser`, `reinviteUser`, `inviteUser`, `listTiers`, `listUsers` from `@/api/admin` (unchanged signatures).
- Produces: a People panel that renders every returned row (admins + members), shows a tier badge, gates the Edit dialog on `can_edit` and Delete on `can_delete`, gates Deactivate on `can_delete` / Activate + Reinvite on `can_edit`, and offers a new Edit dialog to change name + tier.

> This repo has no frontend test framework; verification is `npm run build` + `npm run lint` + manual, matching the prior hierarchy work. There is no failing-test step for this task.

- [ ] **Step 1: Update `assignableTiers`, panel copy, and add Edit-dialog state**

In `src/components/admin/UsersPanel.jsx`, change the `assignableTiers` filter (lines 42-44) from `t.rank > user?.rank` to `t.rank >= user?.rank`:

```js
  // Tiers this user may assign: their own level or below (super sees all non-super tiers).
  const assignableTiers = tiers.filter(
    (t) => !t.is_system && (user?.rank === 0 || t.rank >= user?.rank),
  );
```

Add an edit-target state next to `deleteTarget` (after line 39):

```js
  const [editTarget, setEditTarget] = useState(null);
```

Change the panel subtitle (lines 110-112) from "Admins you can manage. You can only assign tiers below your own." to:

```jsx
        <p className="font-body text-sm text-muted-foreground">
          Your team. You can invite and edit people at or below your own level; only
          people below your level can be deactivated or removed.
        </p>
```

- [ ] **Step 2: Replace the per-row Tier, Status, and Actions cells with gated controls**

Replace lines 139-166 (the Tier `<TableCell>`, the Status `<TableCell>`, and the Actions `<TableCell>` — all three) with a read-only tier badge, the unchanged status badge, and per-row gated buttons:

```jsx
                <TableCell>
                  <Badge variant="outline">{u.tier_name}</Badge>
                </TableCell>
                <TableCell>
                  <Badge className={STATUS_STYLES[u.status]}>{u.status}</Badge>
                </TableCell>
                <TableCell className="text-right space-x-2 whitespace-nowrap">
                  {u.status === 'pending' && u.can_edit && (
                    <Button variant="outline" size="sm" onClick={() => onReinvite(u.id)}>
                      <Copy size={14} className="mr-1" /> Invite link
                    </Button>
                  )}
                  {u.status !== 'pending' && u.is_active && u.can_delete && (
                    <Button variant="outline" size="sm" onClick={() => onToggleActive(u)}>
                      Deactivate
                    </Button>
                  )}
                  {u.status !== 'pending' && !u.is_active && u.can_edit && (
                    <Button variant="outline" size="sm" onClick={() => onToggleActive(u)}>
                      Activate
                    </Button>
                  )}
                  {u.can_edit && (
                    <Button variant="outline" size="sm" onClick={() => setEditTarget(u)}>
                      <Pencil size={14} className="mr-1" /> Edit
                    </Button>
                  )}
                  {u.can_delete && (
                    <Button variant="ghost" size="sm" className="text-red-500" aria-label="Delete admin" onClick={() => setDeleteTarget(u)}>
                      <Trash2 size={14} />
                    </Button>
                  )}
                </TableCell>
```

The Tier cell no longer renders an inline `<Select>` — editing the tier now happens in the Edit dialog (Step 4). The replacement block already contains the Status cell, so after this edit there must be exactly one Status `<TableCell>` in the row.

- [ ] **Step 3: Add the `Pencil` icon import and empty-state copy**

Change the lucide import (line 24) to add `Pencil`:

```js
import { Copy, UserPlus, Trash2, Pencil } from 'lucide-react';
```

Change the empty-state row (line 133) from "No admins yet." to:

```jsx
              <TableRow><TableCell colSpan={5} className="text-muted-foreground">No team members yet.</TableCell></TableRow>
```

- [ ] **Step 4: Add the Edit dialog and replace the dead `onChangeTier` handler**

The inline tier `<Select>` was removed in Step 2, so its `onChangeTier` handler (lines 88-95) is now dead code (would fail `no-unused-vars` lint). Replace the entire `onChangeTier` function with an `onSaveEdit` handler:

```js
  const onSaveEdit = async (id, body) => {
    try {
      await updateUser(id, body);
      setEditTarget(null);
      load();
    } catch (e) {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    }
  };
```

Render an `<EditDialog>` alongside `<InviteDialog>` (after line 179, before the delete `<AlertDialog>`):

```jsx
      <EditDialog
        target={editTarget}
        onClose={() => setEditTarget(null)}
        tiers={assignableTiers}
        onSave={onSaveEdit}
      />
```

Add the `EditDialog` component at the end of the file (after the `InviteDialog` function's closing brace, ~line 273):

```jsx
function EditDialog({ target, onClose, tiers, onSave }) {
  const [fullName, setFullName] = useState('');
  const [tierId, setTierId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (target) { setFullName(target.full_name || ''); setTierId(target.tier_id || ''); }
  }, [target]);

  const submit = async () => {
    setSaving(true);
    try {
      await onSave(target.id, { full_name: fullName, tier_id: tierId });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit {target?.full_name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-name" className="text-xs">Full name</Label>
            <Input id="edit-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
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
        <DialogFooter>
          <Button
            className="bg-gold hover:bg-gold/90 text-white"
            disabled={saving || !fullName || !tierId}
            onClick={submit}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: Build and lint**

Run: `npm run build`
Expected: exit 0, a `dist/` bundle produced, no errors.

Run: `npm run lint`
Expected: exit 0 (no new lint errors from the changed file).

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/UsersPanel.jsx
git commit -m "feat(admin-ui): full roster, per-row can_edit/can_delete gating, Edit dialog"
```

---

## Post-plan: whole-branch review + STOP

After Task 6, dispatch the final whole-branch code review (most capable model) over `git merge-base main HEAD`..HEAD. Then **STOP** — do not merge to `main` or deploy the Worker/Pages. Both require Levi's explicit approval. When approved, the deploy sequence is: apply `0005` to prod D1 via `cf-wrangler.cjs d1 execute wl-dreamhome-db --remote --file=migrations/0005_hierarchy_v2.sql`, deploy the Worker manually (`cf-wrangler.cjs deploy`), then merge to `main` (Pages auto-deploys the frontend).
