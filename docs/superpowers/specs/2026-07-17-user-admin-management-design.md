# User Admin Management — Design

**Date:** 2026-07-17
**Status:** approved by Levi (2026-07-17)
**Builds on:** Admin Hierarchy v2 (`docs/superpowers/specs/2026-07-17-admin-hierarchy-v2-design.md`, shipped at prod `1fddabf` / Worker `79370609`).

## Motivation
Three follow-ups after the v2 hierarchy shipped:
1. The tier labels ("Level 1", "Level 2", "Member") don't tell a non-technical client what each level *is* or that Level 1/2 are admins. Add plain-language descriptions.
2. Admins need to correct a teammate's **email** and reset their **password** directly in the portal — no email-based reset flow.
3. Every signed-in staff user needs a self-service **Account** page to change their own email and password.

## Feature 1 — Tier descriptions (static, frontend-only)
A static map keyed by tier id lives in the frontend (no DB column, no migration — tiers are the fixed 4 bands). One description string per tier, rendered in three places:
- Under each option in the **Invite** and **Edit** tier dropdowns (`UsersPanel.jsx`).
- A short **legend** on the People tab (below the panel subtitle).
- Under each tier name in the super-only **Tiers tab** (`TiersPanel.jsx`).

**Exact copy (verbatim — do not paraphrase in code):**

| Tier id | Label | Description |
|---|---|---|
| `tier_admin` | Level 1 | Full administrator — complete access to all content, site settings, and team management. The top level of your team; can add and edit anyone at or below, and remove or deactivate Level 2s and Members. |
| `tier_manager` | Level 2 | Administrator — the same full access as Level 1 (all content, settings, and team), one step down in the hierarchy. Can manage Members and peers, but can't remove a Level 1. |
| `tier_member` | Member | Content editor — can create and edit site content (portfolio, team, FAQs, process, investment, testimonials, inquiries), but can't change site settings or manage the team. |
| `tier_superadmin` | Super Admin | Platform owner — unrestricted access. (Only shown to the super admin; hidden from client admins by the existing roster filter.) |

The map is keyed by tier id with a graceful fallback (a tier with no entry renders its name and no description — never an error). Descriptions are display-only; they carry no authorization meaning.

## Feature 2 — Admin edits another user's email + password
Extend the existing `patchUser` handler (`workers/api/src/lib/admin.js`) — the non-self, `canManage`-gated, super-blocked branch. All existing guards are unchanged (self-branch still edits only own `full_name`; `id === me.id` never reaches this code; `target.tier_rank === SUPER_TIER_RANK` still 403s; `canManage(me.rank, target.tier_rank)` still gates). Two new optional body fields are handled after the existing `tier_id` block:

- **`email`** (optional): if `typeof body.email === 'string' && body.email.trim()`:
  - Trim **and lowercase** — matches the *actual* existing invite/login behavior. Both `inviteUser` (`admin.js:212`) and login (`index.js:90`) do `.trim().toLowerCase()`, and login looks the account up by the lowercased email. Storing a mixed-case address here would lock the user out (their lowercased login lookup would never match). *(Corrected 2026-07-17: an earlier draft of this spec said "do not lowercase"; that was factually wrong about the existing behavior and would have shipped a login-lockout bug.)*
  - Reject invalid format with `400 { error: 'Enter a valid email address' }` via a shared `isValidEmail` helper.
  - **Uniqueness pre-check:** `SELECT id FROM users WHERE email = ? AND id != ?` (target id). If a row exists → `409 { error: 'That email is already in use' }`. (The column is `NOT NULL UNIQUE`; the pre-check turns a raw constraint 500 into a clean 409.)
  - Add `email = ?` to the update.
- **`password`** (optional): if `typeof body.password === 'string' && body.password`:
  - Enforce `body.password.length >= MIN_PASSWORD_LEN` (8); else `400 { error: 'Password must be at least 8 characters' }`.
  - Hash via the existing `hashPassword` and add `password_hash = ?` to the update. **Admin authority → no current-password required.**
  - **No session invalidation** (Levi's call): the reset applies to future logins; existing JWT sessions expire naturally. To cut access immediately, use **Deactivate** (which already kills the session on the next request).

Empty/absent `email`/`password` are simply not written (the existing "no writable fields → 400" guard still applies if the whole body is empty). Field order in the built `sets`/`binds` is: full_name, is_active, tier_id, email, password_hash, then updated_date — email and password appended after the current fields.

## Feature 3 — Self Account page
Every signed-in staff user gets a self-service Account page.

**New route + nav:**
- Route `/admin/account` rendering a new `AdminAccount` page inside the existing `AdminLayout`.
- A new **Account** nav item in `AdminLayout`, visible to **all** staff (NOT capability-filtered — everyone owns their account). It sits outside the capability-gated `visibleNav` list.

**Two forms on the page:**
- **Change email:** `new_email` + `current_password` → new `POST /api/auth/change-email`.
- **Change password:** `current_password` + `new_password` (+ a client-side "confirm" field that must match) → the existing `POST /api/auth/change-password` (already exposed by the `changePassword` API client).

Both require current-password confirmation (matches the existing change-password contract). After a successful email change the page refetches the session (`/api/auth/me`) so the displayed email updates; no re-login is required because `getSession` reads the user row from the DB by id, so the session survives an email change.

**New endpoint `POST /api/auth/change-email` (`admin.js`)** — public route table entry next to change-password:
```
requireAuth (401 if not signed in)
body = { current_password, new_email }
new_email = trim + lowercase (same as invite/login); if !isValidEmail(new_email) -> 400 { error: 'Enter a valid email address' }
row = SELECT password_hash FROM users WHERE id = me.id
if !verifyPassword(current_password, row?.password_hash) -> 403 { error: 'Current password is incorrect' }
dupe = SELECT id FROM users WHERE email = ? AND id != me.id ; if dupe -> 409 { error: 'That email is already in use' }
UPDATE users SET email = ?, updated_date = ? WHERE id = me.id
-> 200 { success: true, email: new_email }
```
`verifyPassword` runs even against a null/missing hash (constant-time), consistent with login. No new JWT is issued (the display email comes from the DB via `getSession`, not the token payload).

**New frontend API client:** `changeEmail(current_password, new_email)` in `src/api/admin.js`, mirroring the existing `changePassword`.

## Shared helper
`isValidEmail(s)` — a lightweight format check (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`), added once in `admin.js` and used by both `patchUser` and `changeEmail`. Worker stays dependency-free.

## Frontend edit-dialog changes (`UsersPanel.jsx`)
The existing Edit dialog (name + tier) gains:
- An **Email** input, prefilled from `target.email`.
- A **"Set a new password"** input (type=password), with helper "Leave blank to keep the current password. Minimum 8 characters." Blank → the field is omitted from the PATCH body.
- On save, the body is `{ full_name, tier_id, email }` plus `password` only when non-blank. Client-side: email required (non-empty); if a password is typed it must be ≥ 8 chars (server re-validates regardless).

## Testing strategy
- **Backend unit (`workers/api/test/admin.test.mjs`)**, mock DB:
  - `patchUser`: email updates (success); duplicate email → 409; invalid email → 400; password set hashes and writes `password_hash`; short password → 400; peer/super/self guards still hold with the new fields present (e.g. a super-target PATCH carrying email/password still 403s before any write).
  - `change-email`: wrong current password → 403; duplicate email → 409; invalid format → 400; success → 200 and the UPDATE ran with the new email.
- The mock DB does not enforce SQL constraints, so the uniqueness **pre-check** (not the DB constraint) is what the tests exercise — the pre-check is the behavior under test.
- **Frontend:** `npm run build` + `npm run lint` (no frontend test framework), plus manual verification.

## Global constraints
- Never reintroduce base44 (`@base44/*`, webhooks, `functions/`). Worker runtime stays dependency-free.
- All Cloudflare/wrangler calls go through `cf-wrangler.cjs` fleet OAuth; never print/log the CF token; never `--remote` except the (human-approved) prod deploy.
- The super admin (rank 0) stays immutable via every API path — `patchUser`'s super guard is unchanged and covers the new fields.
- Passwords are only ever stored hashed (`hashPassword`); raw passwords never logged or returned.
- Nothing deploys or merges to `main` without Levi's explicit approval.

## Out of scope
- No email notifications, email-verification, or forgotten-password/recovery flows ("just do it in the portal").
- No password-strength rules beyond the existing 8-character minimum.
- No forced session invalidation on password/email change (documented decision).
- Tiers remain the fixed 4 bands; no DB schema change in this project.
