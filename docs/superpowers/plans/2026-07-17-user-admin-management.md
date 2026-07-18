# User Admin Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add plain-language tier descriptions, let admins edit a teammate's email + password, and give every staff user a self-service Account page — all in-portal, no email flows.

**Architecture:** Two backend handler changes in the existing dependency-free Worker (`workers/api/src/lib/admin.js`): extend `patchUser` to accept `email`/`password`, and add a `POST /api/auth/change-email` self-service endpoint, both sharing one `isValidEmail` helper. Three frontend changes: a static tier-description map rendered in the admin UI, email+password fields on the existing Edit dialog, and a new `/admin/account` page. No DB migration — tiers are the fixed 4 bands and the `users` table already has `email`/`password_hash`.

**Tech Stack:** Cloudflare Worker (plain ESM, SubtleCrypto), D1 (SQLite), `node:test` unit tests with a mock DB; React 18 + Vite + Tailwind + shadcn/ui (Radix) frontend, react-router-dom v6, cookie/JWT session via `AuthContext`.

## Global Constraints

- **base44 hard-cut:** never reintroduce `@base44/sdk`, `@base44/vite-plugin`, base44 webhooks, or base44 `functions/`. The Worker runtime stays **dependency-free** (no npm packages in Worker code).
- **Cloudflare access:** all wrangler/CF calls go through `workers/api/cf-wrangler.cjs` (fleet OAuth). Never print/log/serialize the CF token; never use `--remote` except a human-approved prod deploy. **Nothing deploys or merges to `main` without Levi's explicit approval** — this plan STOPS at a mergeable branch.
- **Passwords** are only ever stored hashed via `hashPassword` (format `v1:salt:hash`). Raw passwords are never logged or returned. `MIN_PASSWORD_LEN = 8`.
- **Email normalization:** store emails **trimmed + lowercased**, matching `inviteUser` (`admin.js:212`) and login (`index.js:90`), both `.trim().toLowerCase()`. Login looks accounts up by the lowercased email, so a mixed-case stored email would lock the user out.
- **Super admin (rank 0) stays immutable via every API path.** `patchUser`'s existing `SUPER_TIER_RANK` guard (admin.js:291) must keep running *before* any of the new fields are written.
- **Tier descriptions are display-only** — they carry no authorization meaning; the Worker enforces every capability. Copy is **verbatim** from the spec (do not paraphrase).
- **No** email notifications, verification, or recovery flows. **No** forced session invalidation on email/password change (documented decision — deactivation is the immediate-cutoff tool).

---

## File Structure

**Backend (Worker):**
- `workers/api/src/lib/admin.js` — MODIFY: add module-level `isValidEmail`; extend `patchUser`; add `changeEmail` handler + its route-table entry.
- `workers/api/test/admin.test.mjs` — MODIFY: add unit tests for the `patchUser` email/password branches and for `change-email`.

**Frontend:**
- `src/components/admin/tierDescriptions.js` — CREATE: the static `TIER_DESCRIPTIONS` map + `tierDescription(id)` helper.
- `src/components/admin/UsersPanel.jsx` — MODIFY: a shared `TierOptions` component (name + description per dropdown item), a People-tab legend, and the Edit dialog's new Email + password fields.
- `src/components/admin/TiersPanel.jsx` — MODIFY: render each tier's description under its name.
- `src/api/admin.js` — MODIFY: add the `changeEmail` client.
- `src/pages/admin/AdminAccount.jsx` — CREATE: the self-service Account page (change email + change password).
- `src/App.jsx` — MODIFY: import `AdminAccount`; add the un-guarded `/admin/account` route.
- `src/components/admin/AdminLayout.jsx` — MODIFY: an always-visible Account nav item (outside the capability-filtered list).

**Task order & dependencies:** Task 1 → Task 2 (Task 2 consumes `isValidEmail` from Task 1). Task 3 → Task 4 (Task 4 uses the `TierOptions` component Task 3 adds). Task 5 consumes Task 2's endpoint. Execute in numeric order.

---

### Task 1: Backend — `patchUser` email + password editing (+ `isValidEmail` helper)

**Files:**
- Modify: `workers/api/src/lib/admin.js` (extend `patchUser`, lines 294-318; add `isValidEmail` near `safeParseArray`, line 400)
- Test: `workers/api/test/admin.test.mjs`

**Interfaces:**
- Consumes (already imported at admin.js:11): `hashPassword`; module const `MIN_PASSWORD_LEN` (admin.js:335); `canManage`, `loadStaffTarget`, `SUPER_TIER_RANK`, all already in the file.
- Produces:
  - `isValidEmail(s: string) => boolean` — module-scope helper in `admin.js`, consumed by Task 2.
  - `PATCH /api/admin/users/:id` now additionally accepts optional body fields `email` (string) and `password` (string), handled in the non-self, `canManage`-gated, super-blocked branch only.

- [ ] **Step 1: Write the failing tests**

Add these tests to the end of `workers/api/test/admin.test.mjs` (the helpers `ctxAs`, `adminRow`, `superRow`, `hashPassword` are already imported/defined at the top of that file):

```js
test('PATCH /api/admin/users/:id: updates a lower user’s email (trimmed + lowercased, 200)', async () => {
  let updateSql = null, updateBinds = null
  const ctx = await ctxAs({ id: 'u_ad', role: 'staff', _row: adminRow }, {
    method: 'PATCH', path: '/api/admin/users/u_mem', body: { email: '  New.Addr@Example.com ' },
    reads: (sql, binds) => {
      if (sql.includes("u.role = 'staff'")) return { first: { id: 'u_mem', tier_rank: 3, tier_id: 'tier_member', is_active: 1, has_password: 1 } }
      if (sql.includes('AND id != ?')) return { first: null } // email free
      if (sql.startsWith('UPDATE users SET')) { updateSql = sql; updateBinds = binds; return { run: { meta: { changes: 1 } } } }
      return {}
    },
  })
  const res = await handleAdminRoutes(ctx)
  assert.equal(res.status, 200)
  assert.match(updateSql, /email = \?/)
  assert.ok(updateBinds.includes('new.addr@example.com'), 'email stored trimmed + lowercased')
})

test('PATCH /api/admin/users/:id: duplicate email is rejected (409)', async () => {
  const ctx = await ctxAs({ id: 'u_ad', role: 'staff', _row: adminRow }, {
    method: 'PATCH', path: '/api/admin/users/u_mem', body: { email: 'taken@example.com' },
    reads: (sql) => {
      if (sql.includes("u.role = 'staff'")) return { first: { id: 'u_mem', tier_rank: 3, tier_id: 'tier_member', is_active: 1, has_password: 1 } }
      if (sql.includes('AND id != ?')) return { first: { id: 'u_someone_else' } } // email taken
      return {}
    },
  })
  assert.equal((await handleAdminRoutes(ctx)).status, 409)
})

test('PATCH /api/admin/users/:id: invalid email format is rejected (400)', async () => {
  const ctx = await ctxAs({ id: 'u_ad', role: 'staff', _row: adminRow }, {
    method: 'PATCH', path: '/api/admin/users/u_mem', body: { email: 'not-an-email' },
    reads: (sql) => sql.includes("u.role = 'staff'")
      ? { first: { id: 'u_mem', tier_rank: 3, tier_id: 'tier_member', is_active: 1, has_password: 1 } } : {},
  })
  assert.equal((await handleAdminRoutes(ctx)).status, 400)
})

test('PATCH /api/admin/users/:id: sets a new password (hashes, writes password_hash, never raw, 200)', async () => {
  let updateSql = null, updateBinds = null
  const ctx = await ctxAs({ id: 'u_ad', role: 'staff', _row: adminRow }, {
    method: 'PATCH', path: '/api/admin/users/u_mem', body: { password: 'brandnewpw1' },
    reads: (sql, binds) => {
      if (sql.includes("u.role = 'staff'")) return { first: { id: 'u_mem', tier_rank: 3, tier_id: 'tier_member', is_active: 1, has_password: 1 } }
      if (sql.startsWith('UPDATE users SET')) { updateSql = sql; updateBinds = binds; return { run: { meta: { changes: 1 } } } }
      return {}
    },
  })
  const res = await handleAdminRoutes(ctx)
  assert.equal(res.status, 200)
  assert.match(updateSql, /password_hash = \?/)
  assert.ok(updateBinds.some((b) => typeof b === 'string' && b.startsWith('v1:')), 'a v1: password hash is bound')
  assert.ok(!updateBinds.includes('brandnewpw1'), 'the raw password is never stored')
})

test('PATCH /api/admin/users/:id: rejects a short new password (400)', async () => {
  const ctx = await ctxAs({ id: 'u_ad', role: 'staff', _row: adminRow }, {
    method: 'PATCH', path: '/api/admin/users/u_mem', body: { password: 'short' },
    reads: (sql) => sql.includes("u.role = 'staff'")
      ? { first: { id: 'u_mem', tier_rank: 3, tier_id: 'tier_member', is_active: 1, has_password: 1 } } : {},
  })
  assert.equal((await handleAdminRoutes(ctx)).status, 400)
})

test('PATCH /api/admin/users/:id: super target carrying email+password still 403s before any write', async () => {
  let updateRan = false
  const ctx = await ctxAs({ id: 'u_sa', role: 'staff', _row: superRow }, {
    method: 'PATCH', path: '/api/admin/users/u_other',
    body: { email: 'x@y.com', password: 'longenough1' },
    reads: (sql) => {
      if (sql.includes("u.role = 'staff'")) return { first: { id: 'u_other', tier_rank: 0, tier_id: 'tier_superadmin', is_active: 1, has_password: 1 } }
      if (sql.startsWith('UPDATE users SET')) { updateRan = true; return {} }
      return {}
    },
  })
  assert.equal((await handleAdminRoutes(ctx)).status, 403)
  assert.equal(updateRan, false, 'the UPDATE must not run for a super-admin target')
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd "$(git rev-parse --show-toplevel)" && npm test`
Expected: FAIL — the email/password tests fail because `patchUser` ignores `email`/`password` (the email test's UPDATE won't contain `email = ?`; the invalid-email test returns 200 not 400; etc.). Existing tests still pass.

- [ ] **Step 3: Add the `isValidEmail` helper**

In `workers/api/src/lib/admin.js`, add this function directly above the existing `safeParseArray` function (currently at line 400):

```js
// Lightweight email-format check (Worker stays dependency-free). Shared by
// patchUser and changeEmail. Not RFC-exhaustive — a pragmatic guard against typos.
function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}
```

- [ ] **Step 4: Extend `patchUser` with the email + password branches**

In `workers/api/src/lib/admin.js`, in `patchUser`, insert the two blocks below **immediately after** the existing `tier_id` block (after line 313 `}`), i.e. between the end of the `if ('tier_id' in body) { ... }` block and the `if (!sets.length)` guard:

```js
  if (typeof body.email === 'string' && body.email.trim()) {
    const email = body.email.trim().toLowerCase()
    if (!isValidEmail(email)) return json({ error: 'Enter a valid email address' }, 400)
    const dupe = await context.env.DB.prepare('SELECT id FROM users WHERE email = ? AND id != ?').bind(email, id).first()
    if (dupe) return json({ error: 'That email is already in use' }, 409)
    sets.push('email = ?'); binds.push(email)
  }
  if (typeof body.password === 'string' && body.password) {
    if (body.password.length < MIN_PASSWORD_LEN) return json({ error: `Password must be at least ${MIN_PASSWORD_LEN} characters` }, 400)
    sets.push('password_hash = ?'); binds.push(await hashPassword(body.password))
  }
```

The existing guards above this point are unchanged: the self-branch (`id === me.id`) still only edits `full_name` and never reaches here; `requireCapability('users')`, the `SUPER_TIER_RANK` 403, and `canManage(me.rank, target.tier_rank)` all still run first. The existing `if (!sets.length) return json({ error: 'no writable fields' }, 400)` still applies when the body has no writable fields.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd "$(git rev-parse --show-toplevel)" && npm test`
Expected: PASS — all new tests green, all pre-existing tests still green.

- [ ] **Step 6: Commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add workers/api/src/lib/admin.js workers/api/test/admin.test.mjs
git commit -m "feat(admin-api): patchUser can set a user's email + password"
```

---

### Task 2: Backend — `POST /api/auth/change-email` self-service endpoint

**Files:**
- Modify: `workers/api/src/lib/admin.js` (route entry near line 52; new `changeEmail` handler after `changePassword`, line 398)
- Test: `workers/api/test/admin.test.mjs`

**Interfaces:**
- Consumes: `isValidEmail` (Task 1); `requireAuth`, `verifyPassword` (both already imported at admin.js:11); `json`, `parseJson`, `nowIso` (imported).
- Produces: `POST /api/auth/change-email` with body `{ current_password, new_email }` →
  - `401` if not signed in; `400` invalid email format; `403` wrong current password; `409` duplicate email; `200 { success: true, email }` on success.

- [ ] **Step 1: Write the failing tests**

Add to the end of `workers/api/test/admin.test.mjs`:

```js
test('POST /api/auth/change-email: unauthenticated is 401', async () => {
  const db = mockDb(() => ({}))
  const ctx = mockContext({ db, method: 'POST', path: '/api/auth/change-email',
    body: { current_password: 'x', new_email: 'new@y.com' } })
  assert.equal((await handleAdminRoutes(ctx)).status, 401)
})

test('POST /api/auth/change-email: invalid email format is 400', async () => {
  const stored = await hashPassword('correcthorse')
  const ctx = await ctxAs({ id: 'u_ad', role: 'staff', _row: adminRow }, {
    method: 'POST', path: '/api/auth/change-email',
    body: { current_password: 'correcthorse', new_email: 'nope' },
    reads: (sql) => sql.includes('SELECT password_hash FROM users') ? { first: { password_hash: stored } } : {},
  })
  assert.equal((await handleAdminRoutes(ctx)).status, 400)
})

test('POST /api/auth/change-email: wrong current password is 403', async () => {
  const stored = await hashPassword('correcthorse')
  const ctx = await ctxAs({ id: 'u_ad', role: 'staff', _row: adminRow }, {
    method: 'POST', path: '/api/auth/change-email',
    body: { current_password: 'wrongpw', new_email: 'new@y.com' },
    reads: (sql) => sql.includes('SELECT password_hash FROM users') ? { first: { password_hash: stored } } : {},
  })
  assert.equal((await handleAdminRoutes(ctx)).status, 403)
})

test('POST /api/auth/change-email: duplicate email is 409', async () => {
  const stored = await hashPassword('correcthorse')
  const ctx = await ctxAs({ id: 'u_ad', role: 'staff', _row: adminRow }, {
    method: 'POST', path: '/api/auth/change-email',
    body: { current_password: 'correcthorse', new_email: 'taken@y.com' },
    reads: (sql) => {
      if (sql.includes('SELECT password_hash FROM users')) return { first: { password_hash: stored } }
      if (sql.includes('AND id != ?')) return { first: { id: 'u_other' } }
      return {}
    },
  })
  assert.equal((await handleAdminRoutes(ctx)).status, 409)
})

test('POST /api/auth/change-email: success updates the email (200, trimmed + lowercased)', async () => {
  const stored = await hashPassword('correcthorse')
  let updateBinds = null
  const ctx = await ctxAs({ id: 'u_ad', role: 'staff', _row: adminRow }, {
    method: 'POST', path: '/api/auth/change-email',
    body: { current_password: 'correcthorse', new_email: '  Fresh@Y.com ' },
    reads: (sql, binds) => {
      if (sql.includes('SELECT password_hash FROM users')) return { first: { password_hash: stored } }
      if (sql.includes('AND id != ?')) return { first: null }
      if (sql.startsWith('UPDATE users SET email')) { updateBinds = binds; return { run: { meta: { changes: 1 } } } }
      return {}
    },
  })
  const res = await handleAdminRoutes(ctx)
  assert.equal(res.status, 200)
  const j = await res.json()
  assert.equal(j.email, 'fresh@y.com')
  assert.ok(updateBinds.includes('fresh@y.com'), 'UPDATE binds the trimmed + lowercased email')
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd "$(git rev-parse --show-toplevel)" && npm test`
Expected: FAIL — `/api/auth/change-email` is unrouted, so `handleAdminRoutes` returns `null`; the new tests throw / mismatch (the 401 test's `null` has no `.status`). Existing tests still pass.

- [ ] **Step 3: Add the route-table entry**

In `workers/api/src/lib/admin.js`, add this line immediately after the existing change-password route (line 52 `if (pathname === '/api/auth/change-password' && method === 'POST') return changePassword(context)`):

```js
  if (pathname === '/api/auth/change-email' && method === 'POST') return changeEmail(context)
```

- [ ] **Step 4: Add the `changeEmail` handler**

In `workers/api/src/lib/admin.js`, add this function immediately after `changePassword` (after line 398 `}`):

```js
// POST /api/auth/change-email  { current_password, new_email }
// Self-service: any signed-in user changes their own sign-in email. The session
// survives because getSession resolves the user by JWT `sub` (id), not by email.
// Wrong-password returns 403 (per spec — proving identity is an authorization step;
// change-password returns 400 for the same case, kept as-is to avoid churn).
async function changeEmail(context) {
  const auth = await requireAuth(context)
  if (auth.response) return auth.response
  const body = await parseJson(context.request)
  const current = body.current_password || ''
  const newEmail = (body.new_email || '').trim().toLowerCase()
  if (!isValidEmail(newEmail)) return json({ error: 'Enter a valid email address' }, 400)

  const row = await context.env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(auth.user.id).first()
  const ok = await verifyPassword(current, row ? row.password_hash : null)
  if (!ok) return json({ error: 'Current password is incorrect' }, 403)

  const dupe = await context.env.DB.prepare('SELECT id FROM users WHERE email = ? AND id != ?').bind(newEmail, auth.user.id).first()
  if (dupe) return json({ error: 'That email is already in use' }, 409)

  await context.env.DB.prepare('UPDATE users SET email = ?, updated_date = ? WHERE id = ?')
    .bind(newEmail, nowIso(), auth.user.id).run()
  return json({ success: true, email: newEmail })
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd "$(git rev-parse --show-toplevel)" && npm test`
Expected: PASS — all `change-email` tests green; every prior test still green.

- [ ] **Step 6: Commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add workers/api/src/lib/admin.js workers/api/test/admin.test.mjs
git commit -m "feat(auth-api): self-service POST /api/auth/change-email"
```

---

### Task 3: Frontend — static tier descriptions

**Files:**
- Create: `src/components/admin/tierDescriptions.js`
- Modify: `src/components/admin/UsersPanel.jsx` (add `TierOptions`; use it in the Invite dropdown; add the People-tab legend)
- Modify: `src/components/admin/TiersPanel.jsx` (description under each tier name)

**Interfaces:**
- Produces:
  - `TIER_DESCRIPTIONS` (object keyed by tier id) and `tierDescription(tierId) => string` from `src/components/admin/tierDescriptions.js`.
  - `TierOptions({ tiers })` component in `UsersPanel.jsx` — renders `<SelectItem>`s (name + muted description) for a tier list. Consumed here by the Invite dropdown and in Task 4 by the Edit dropdown.
- Consumes: existing `tiers`/`assignableTiers` state and shadcn `Select*` primitives already imported in both panels.

> Note (verbatim copy): the `tier_superadmin` entry is the plain description only — `'Platform owner — unrestricted access.'` The spec table's trailing parenthetical ("Only shown to the super admin; hidden…") is a display-rule note, not shown copy. Copy the three client-facing strings exactly as written, including the em-dashes (`—`) and straight apostrophes.

- [ ] **Step 1: Create the tier-description map**

Create `src/components/admin/tierDescriptions.js`:

```js
// Plain-language descriptions for the fixed 4-band staff hierarchy, keyed by tier id.
// DISPLAY-ONLY — these carry no authorization meaning (the Worker enforces every
// capability). Copy is verbatim from the approved design spec (2026-07-17). A tier
// with no entry renders its name and no description (graceful fallback, never an error).
export const TIER_DESCRIPTIONS = {
  tier_admin:
    'Full administrator — complete access to all content, site settings, and team management. The top level of your team; can add and edit anyone at or below, and remove or deactivate Level 2s and Members.',
  tier_manager:
    'Administrator — the same full access as Level 1 (all content, settings, and team), one step down in the hierarchy. Can manage Members and peers, but can\'t remove a Level 1.',
  tier_member:
    'Content editor — can create and edit site content (portfolio, team, FAQs, process, investment, testimonials, inquiries), but can\'t change site settings or manage the team.',
  tier_superadmin: 'Platform owner — unrestricted access.',
};

export function tierDescription(tierId) {
  return TIER_DESCRIPTIONS[tierId] || '';
}
```

- [ ] **Step 2: Add the `TierOptions` component and use it in the Invite dropdown (`UsersPanel.jsx`)**

Add the import near the other imports at the top of `src/components/admin/UsersPanel.jsx`:

```jsx
import { tierDescription } from '@/components/admin/tierDescriptions';
```

Add this module-level component to `UsersPanel.jsx` (e.g. directly above `function InviteDialog`):

```jsx
// Renders tier <SelectItem>s with the tier name and its plain-language description.
// Shared by the Invite and Edit dropdowns.
function TierOptions({ tiers }) {
  return tiers.map((t) => (
    <SelectItem key={t.id} value={t.id}>
      <div className="flex flex-col">
        <span>{t.name}</span>
        {tierDescription(t.id) && (
          <span className="text-xs text-muted-foreground">{tierDescription(t.id)}</span>
        )}
      </div>
    </SelectItem>
  ));
}
```

In `InviteDialog`, replace the current dropdown body:

```jsx
                <SelectContent>
                  {tiers.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
                </SelectContent>
```

with:

```jsx
                <SelectContent>
                  <TierOptions tiers={tiers} />
                </SelectContent>
```

- [ ] **Step 3: Add the People-tab legend (`UsersPanel.jsx`)**

In the `UsersPanel` return, immediately after the header `<div className="flex items-center justify-between mb-4"> … </div>` block (the one containing the subtitle `<p>` and the "Invite admin" button) and before the `{loading ? …}` block, insert:

```jsx
      <div className="mb-6 rounded-lg border border-border bg-muted/30 p-4 space-y-1.5">
        <p className="font-body text-xs font-medium text-foreground">What the levels mean</p>
        {tiers.filter((t) => !t.is_system).map((t) => (
          <p key={t.id} className="font-body text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{t.name}:</span> {tierDescription(t.id)}
          </p>
        ))}
      </div>
```

(`tiers` is the full list from `listTiers`; `!t.is_system` drops the super tier. `tierDescription` returns `''` for any unmapped tier, so the line degrades gracefully.)

- [ ] **Step 4: Render descriptions in `TiersPanel.jsx`**

Add the import near the top of `src/components/admin/TiersPanel.jsx`:

```jsx
import { tierDescription } from '@/components/admin/tierDescriptions';
```

In the "Tier" `<TableCell>` (the one holding the name `<span>` / rename `<Input>`), append a description line so the cell becomes:

```jsx
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
                  {tierDescription(t.id) && (
                    <p className="mt-1 text-xs text-muted-foreground max-w-xs">{tierDescription(t.id)}</p>
                  )}
                </TableCell>
```

- [ ] **Step 5: Verify lint + build**

Run: `cd "$(git rev-parse --show-toplevel)" && npm run lint && npm run build`
Expected: lint clean (no new warnings/errors), build succeeds (`dist/` produced, no errors).

- [ ] **Step 6: Commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add src/components/admin/tierDescriptions.js src/components/admin/UsersPanel.jsx src/components/admin/TiersPanel.jsx
git commit -m "feat(admin-ui): plain-language tier descriptions (dropdowns, legend, tiers tab)"
```

---

### Task 4: Frontend — Edit dialog gains Email + password fields

**Files:**
- Modify: `src/components/admin/UsersPanel.jsx` (`EditDialog` only)

**Interfaces:**
- Consumes: Task 1's `PATCH /api/admin/users/:id` accepting `email` + optional `password`; the `updateUser(id, body)` client (already imported at UsersPanel.jsx:4) which posts that PATCH; the `TierOptions` component from Task 3.
- Produces: on save, `onSave(target.id, body)` where `body = { full_name, tier_id, email }` plus `password` only when the field is non-blank.

> The existing `onSaveEdit` handler (UsersPanel.jsx:89) already calls `updateUser(id, body)` and reloads — it passes `body` through unchanged, so no change is needed there. Only `EditDialog` changes.

- [ ] **Step 1: Replace the `EditDialog` component**

In `src/components/admin/UsersPanel.jsx`, replace the entire existing `EditDialog` function with:

```jsx
function EditDialog({ target, onClose, tiers, onSave }) {
  const [fullName, setFullName] = useState('');
  const [tierId, setTierId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (target) {
      setFullName(target.full_name || '');
      setTierId(target.tier_id || '');
      setEmail(target.email || '');
      setPassword('');
    }
  }, [target]);

  const pwTooShort = password.length > 0 && password.length < 8;

  const submit = async () => {
    setSaving(true);
    try {
      const body = { full_name: fullName, tier_id: tierId, email: email.trim() };
      if (password) body.password = password;
      await onSave(target.id, body);
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
            <Label htmlFor="edit-email" className="text-xs">Email</Label>
            <Input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Tier</Label>
            <Select value={tierId} onValueChange={setTierId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a tier" /></SelectTrigger>
              <SelectContent><TierOptions tiers={tiers} /></SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="edit-password" className="text-xs">Set a new password</Label>
            <Input id="edit-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
            <p className="mt-1 text-xs text-muted-foreground">Leave blank to keep the current password. Minimum 8 characters.</p>
          </div>
        </div>
        <DialogFooter>
          <Button
            className="bg-gold hover:bg-gold/90 text-white"
            disabled={saving || !fullName || !tierId || !email.trim() || pwTooShort}
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

- [ ] **Step 2: Verify lint + build**

Run: `cd "$(git rev-parse --show-toplevel)" && npm run lint && npm run build`
Expected: lint clean, build succeeds.

- [ ] **Step 3: Commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add src/components/admin/UsersPanel.jsx
git commit -m "feat(admin-ui): edit a user's email + set a new password in the Edit dialog"
```

---

### Task 5: Frontend — `changeEmail` client + Account page + route + nav item

**Files:**
- Modify: `src/api/admin.js` (add `changeEmail`)
- Create: `src/pages/admin/AdminAccount.jsx`
- Modify: `src/App.jsx` (import + `/admin/account` route, NO `CapabilityGuard`)
- Modify: `src/components/admin/AdminLayout.jsx` (always-visible Account nav item)

**Interfaces:**
- Consumes: Task 2's `POST /api/auth/change-email`; the existing `changePassword` client (`src/api/admin.js:32`); `useAuth()`'s `user` and `checkUserAuth` (both already provided by `AuthContext`).
- Produces: `changeEmail(current_password, new_email)` client; the `/admin/account` route and its nav entry.

- [ ] **Step 1: Add the `changeEmail` API client**

In `src/api/admin.js`, add directly below the existing `changePassword` export (line 32-33):

```js
export const changeEmail = (current_password, new_email) =>
  req('/api/auth/change-email', { method: 'POST', body: { current_password, new_email } });
```

- [ ] **Step 2: Create the Account page**

Create `src/pages/admin/AdminAccount.jsx`:

```jsx
import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { changeEmail, changePassword } from '@/api/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export default function AdminAccount() {
  const { user, checkUserAuth } = useAuth();
  const { toast } = useToast();

  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const submitEmail = async () => {
    setEmailSaving(true);
    try {
      await changeEmail(emailPassword, newEmail.trim());
      await checkUserAuth();
      setNewEmail(''); setEmailPassword('');
      toast({ title: 'Email updated', description: 'Your sign-in email has been changed.' });
    } catch (e) {
      toast({ title: 'Could not update email', description: e.message, variant: 'destructive' });
    } finally {
      setEmailSaving(false);
    }
  };

  const pwMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const submitPassword = async () => {
    setPwSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      toast({ title: 'Password updated', description: 'Use your new password next time you sign in.' });
    } catch (e) {
      toast({ title: 'Could not update password', description: e.message, variant: 'destructive' });
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="max-w-xl">
      <h1 className="font-heading text-3xl text-foreground mb-1">Account</h1>
      <p className="font-body text-muted-foreground mb-6">Manage your own sign-in email and password.</p>

      <section className="mb-8 rounded-lg border border-border p-6">
        <h2 className="font-heading text-lg text-foreground mb-1">Email</h2>
        <p className="font-body text-sm text-muted-foreground mb-4">Current: {user?.email}</p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="acct-new-email" className="text-xs">New email</Label>
            <Input id="acct-new-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="acct-email-pw" className="text-xs">Current password</Label>
            <Input id="acct-email-pw" type="password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} className="mt-1" />
          </div>
          <Button
            className="bg-gold hover:bg-gold/90 text-white"
            disabled={emailSaving || !newEmail.trim() || !emailPassword}
            onClick={submitEmail}
          >
            {emailSaving ? 'Saving…' : 'Update email'}
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-border p-6">
        <h2 className="font-heading text-lg text-foreground mb-4">Password</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="acct-cur-pw" className="text-xs">Current password</Label>
            <Input id="acct-cur-pw" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="acct-new-pw" className="text-xs">New password</Label>
            <Input id="acct-new-pw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1" />
            <p className="mt-1 text-xs text-muted-foreground">Minimum 8 characters.</p>
          </div>
          <div>
            <Label htmlFor="acct-confirm-pw" className="text-xs">Confirm new password</Label>
            <Input id="acct-confirm-pw" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1" />
            {pwMismatch && <p className="mt-1 text-xs text-red-500">Passwords don't match.</p>}
          </div>
          <Button
            className="bg-gold hover:bg-gold/90 text-white"
            disabled={pwSaving || !currentPassword || newPassword.length < 8 || newPassword !== confirmPassword}
            onClick={submitPassword}
          >
            {pwSaving ? 'Saving…' : 'Update password'}
          </Button>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Add the route (`src/App.jsx`)**

Add the import alongside the other admin-page imports (after `import AdminUsers from './pages/admin/AdminUsers';`, line 23):

```jsx
import AdminAccount from './pages/admin/AdminAccount';
```

Add the route inside the admin `<Route element={<RoleGuard …><AdminLayout /></RoleGuard>}>` group, immediately after the `/admin/users` route (line 139). **No `CapabilityGuard`** — every staff user owns their account:

```jsx
        <Route path="/admin/account" element={<AdminAccount />} />
```

- [ ] **Step 4: Add the always-visible Account nav item (`AdminLayout.jsx`)**

Add `UserCog` to the existing `lucide-react` import (the destructured list at lines 3-6):

```jsx
import {
  LayoutGrid, Users, HelpCircle, GitBranch, DollarSign,
  Settings, Image, Menu, X, LogOut, ChevronRight, Star, Inbox, ShieldCheck, UserCog
} from 'lucide-react';
```

Inside the `<nav>`, immediately after the `{visibleNav.map(item => { … })}` block and before the closing `</nav>`, add the Account link (rendered unconditionally — outside the capability filter):

```jsx
          <Link
            to="/admin/account"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-body text-sm transition-colors ${
              location.pathname === '/admin/account'
                ? 'bg-gold text-white'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <UserCog size={16} />
            Account
            {location.pathname === '/admin/account' && <ChevronRight size={14} className="ml-auto" />}
          </Link>
```

- [ ] **Step 5: Verify lint + build**

Run: `cd "$(git rev-parse --show-toplevel)" && npm run lint && npm run build`
Expected: lint clean, build succeeds.

- [ ] **Step 6: Commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add src/api/admin.js src/pages/admin/AdminAccount.jsx src/App.jsx src/components/admin/AdminLayout.jsx
git commit -m "feat(admin-ui): self-service Account page (change own email + password)"
```

---

## Manual verification (after all tasks, before requesting deploy approval)

Not automated (no frontend test framework). On a local `npm run dev` or a preview deploy, signed in as a staff user:
1. **Admins → People:** the "What the levels mean" legend lists Level 1 / Level 2 / Member with their descriptions; the Invite and Edit tier dropdowns show a description under each tier name.
2. **Admins → Tiers** (super only): each tier row shows its description under the name.
3. **Edit a lower-ranked user:** change their email → saves; set a new password → that user can sign in with the new password; the old password no longer works on a fresh login.
4. **Duplicate email:** editing a user to an email already in use shows "That email is already in use".
5. **Account page:** change own email with the correct password → the sidebar/user email updates without re-login; wrong password → "Current password is incorrect". Change own password with confirm-mismatch → Save disabled; correct → toast, new password works next sign-in.
6. **Member account** (7 caps, no `users`): sees the Account nav item, does **not** see Admins or Site Settings.

## Post-implementation

Run the whole-branch review, then STOP. Merge to `main`, the manual Worker deploy, and any prod D1 work all require Levi's explicit approval (no migration is needed for this work — schema is unchanged).
