# Admin Role Hierarchy — Design Spec

**Date:** 2026-07-16
**Status:** Approved for planning (awaiting spec review)
**Repo:** wl-dreamhome-site / wl-dreamhome-api (Dream Home Design, base44→CF)

## Problem

Today the admin side has a flat, hard-coded role enum (`client | manager | admin |
super_admin`) stored as `users.role`, and **no way to manage user accounts** — staff
are seeded straight into D1. Levi (the sole super admin) needs to add admins, and those
admins need to add their own admins, with meaningful, differentiated levels
(e.g. "Admin", "Content Manager") that can nest without a fixed limit.

## Confirmed decisions (from brainstorming)

1. **Governance = rank ladder.** Each staff user has a numeric rank; you can see and
   manage any user ranked strictly *below* you (lower privilege). No branch/subtree
   ownership — reach is purely by rank.
2. **Per-tier capabilities.** Each tier carries a capability checklist deciding *what*
   it can do (which admin sections it may touch). "Content Manager" therefore means
   something concrete.
3. **Named tiers, super-admin-managed.** Super admin maintains a list of named tiers,
   each with a rank + capabilities; other admins assign existing lower tiers when
   inviting.
4. **Invite via copy-link now, email later.** New admins are created in a pending state
   with a tokenized invite link the creator copies and hands out. Automated email is a
   deferred, additive config step — the invite mechanism ships fully now.

## Non-goals (out of scope)

- **Automated email delivery** of invites. Copy-link only. (Provider + sending-domain
  DNS is a known blocker; wiring email later is purely additive.)
- **Client-account management** and the earlier "client invites people to their portal"
  idea. This spec governs **staff** only. Client accounts remain as they are.
- **Portal data migration** (Project/Document/Selection/Message/Invoice) — separate
  project, untouched here.
- **Delegated tier management** (letting non-super admins define sub-tiers). v1 keeps
  tier CRUD super-admin-only; easily delegated later without schema change.

## Core model

A **tier** is `{ name, rank, capabilities[] }`.

- **rank**: integer, **lower = more power**, unique across tiers. Rank `0` is the
  reserved super-admin system tier.
- **capabilities**: subset of the capability keys below. The super-admin tier implicitly
  has *all* capabilities regardless of stored value (gated by `rank === 0` / `is_system`).
- **Manageability rule:** actor may act on a target iff `target.tier.rank >
  actor.tier.rank`. Equal rank (peers) and lower rank (higher privilege) are forbidden.
  Super admin (rank 0) can act on everyone except itself for destructive ops.

### Capabilities (1:1 with admin sidebar sections)

| Capability     | Admin section / route      | Gated entity (Worker)         |
|----------------|----------------------------|-------------------------------|
| `portfolio`    | Portfolio `/admin/portfolio`   | `PortfolioItem`           |
| `team`         | Team & Founders `/admin/team`  | `TeamMember`              |
| `faqs`         | FAQs `/admin/faqs`             | `FAQItem`                 |
| `process`      | Process Steps `/admin/process` | `ProcessStage`            |
| `investment`   | Investment `/admin/investment` | `InvestmentTier`          |
| `testimonials` | Testimonials `/admin/testimonials` | `Testimonial`         |
| `inquiries`    | Inquiries `/admin/inquiries`   | `ContactInquiry` (GET)    |
| `settings`     | Site Settings `/admin/settings`| `SiteSettings`            |
| `users`        | Admins `/admin/users` (NEW)    | tier + user management    |

Dashboard (`/admin`) requires no capability — visible to any staff user.

### Anti-escalation invariants (enforced server-side)

When creating or editing a user, the actor may only:
1. Assign a tier ranked **below** the actor's own tier (`newTier.rank > actor.rank`), and
2. Assign a tier whose capabilities are a **subset** of the actor's capabilities.

You cannot mint someone more powerful than yourself, nor hand out a capability you lack.
Super admin bypasses both (has all capabilities, rank 0).

### Super-admin singleton (permanent)

- The super-admin tier is `is_system = 1`, `rank = 0`, seeded once. It cannot be renamed,
  reordered, deleted, or have its capabilities changed via any API path.
- No endpoint may assign a user to the super-admin tier (invite/patch reject it).
- The super-admin user cannot be demoted, deactivated, or deleted via the API.

## Data model

### New table `admin_tiers` (migration `0003_admin_tiers.sql`)

```sql
CREATE TABLE IF NOT EXISTS admin_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rank INTEGER NOT NULL UNIQUE,           -- 0 = super admin (reserved)
  capabilities TEXT NOT NULL DEFAULT '[]',-- JSON array of capability keys
  is_system INTEGER NOT NULL DEFAULT 0,   -- 1 = locked (super admin tier)
  created_date TEXT NOT NULL,
  updated_date TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_tiers_rank ON admin_tiers(rank);
```

### `users` additions

```sql
ALTER TABLE users ADD COLUMN tier_id TEXT;            -- FK -> admin_tiers.id; NULL for clients
ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN invited_by TEXT;         -- creator user id (audit)
ALTER TABLE users ADD COLUMN invite_token_hash TEXT;  -- SHA-256 of raw invite token; NULL once accepted
ALTER TABLE users ADD COLUMN invite_expires TEXT;     -- ISO expiry; NULL once accepted
CREATE INDEX IF NOT EXISTS idx_users_invite_token ON users(invite_token_hash);
```

`users.role` narrows in meaning to `'client' | 'staff'`. The old `manager`/`admin`/
`super_admin` values are backfilled to `'staff'`; privilege now lives entirely in the tier.

### Seed + backfill (in `0003`)

- Seed system tier: `super_admin` (rank 0, `is_system=1`, all capabilities).
- Seed editable tier `Admin` (rank 1, all 9 capabilities).
- Seed editable tier `Manager` (rank 2, `portfolio, team, faqs, process, investment,
  testimonials, inquiries` — i.e. content + inquiries, **no** `settings`/`users`, matching
  today's "manager: no user management, no site settings").
- Backfill existing users:
  - `super_admin` → `role='staff'`, `tier_id=<super_admin tier>`.
  - `admin`       → `role='staff'`, `tier_id=<Admin tier>`.
  - `manager`     → `role='staff'`, `tier_id=<Manager tier>`.
  - `client`      → `role='client'`, `tier_id=NULL`.
  - All existing accounts `is_active=1`.

## Authorization (Worker)

`auth.js`:
- `getSession` JOINs `users` → `admin_tiers` and returns the live `rank`, `capabilities`
  (parsed array), `tier_name`, and `is_active`. **Inactive users resolve to `null`** (a
  deactivated user's session dies on their next request). Role/rank/caps are always the
  live D1 values — never trusted from the JWT (unchanged discipline).
- Replace `requireRole(ctx, [...])` with:
  - `requireStaff(ctx)` — authenticated + `role === 'staff'` (coarse gate).
  - `requireCapability(ctx, cap)` — staff + (`rank === 0` or `capabilities.includes(cap)`),
    else 403.
- Helper `canManage(actor, targetRank)` = `actor.rank === 0 || targetRank > actor.rank`.
- Helper `capsSubsetOf(requested, actor)` = `actor.rank === 0 || requested ⊆ actor.caps`.

`index.js` route gating changes:
- CMS entity write (`POST`/`PATCH`/`DELETE /api/<Entity>`): `requireCapability` for that
  entity's mapped capability (table above) instead of the current staff allowlist.
- `GET` on staff-only entities (`ContactInquiry`): `requireCapability(ctx, 'inquiries')`.
- `POST /api/upload`: unchanged — any authenticated user (clients included).
- Public reads and the public `POST /api/ContactInquiry` contact form: unchanged.

### Login / JWT

- Login `SELECT` adds `is_active`. A pending invite (no `password_hash`) fails the
  password check naturally. An `is_active=0` account with a valid password → `403`
  ("This account has been deactivated"). JWT payload unchanged (`sub, email, role, rmb`);
  `role` is now `'client' | 'staff'`.

## New API endpoints

### Tier management — super-admin only (`rank === 0`)

- `GET  /api/admin/tiers` — list all tiers (any `users`-capable staff may read, for the
  invite tier picker; the super_admin tier is included but flagged non-assignable).
- `POST /api/admin/tiers` — create `{ name, capabilities[] }`; server assigns
  `rank = max(rank)+1`. Super-admin only.
- `PATCH /api/admin/tiers/:id` — update `{ name?, capabilities? }`. Super-admin only.
  System tier (rank 0) is immutable → 403.
- `POST /api/admin/tiers/reorder` — body `{ orderedIds: [...] }` (excludes super tier);
  atomically reassigns ranks `1..N`. Super-admin only.
- `DELETE /api/admin/tiers/:id` — super-admin only; blocked (409) if any user is assigned
  to the tier, and blocked for the system tier.

### Staff user management — `users` capability + rank/subset rules

- `GET /api/admin/users` — staff accounts the caller may see: those with
  `tier.rank > actor.rank` (super admin sees all). Returns `id, email, full_name,
  tier_id, tier_name, rank, is_active, status (active|pending|disabled), invited_by`.
- `POST /api/admin/users` — invite `{ email, full_name, tier_id }`. Validates
  `canManage` + `capsSubsetOf(tier.caps)` + tier not super. Creates row with
  `password_hash=NULL, is_active=0, invited_by=actor`, generates raw token, stores its
  SHA-256 + 7-day expiry. Returns `{ user, invite_url }`.
- `PATCH /api/admin/users/:id` — edit `{ full_name?, tier_id?, is_active? }` for a target
  with `tier.rank > actor.rank`; tier changes re-check `canManage` + subset + not-super.
  A user may PATCH **their own** `full_name` only (not tier/active).
- `POST /api/admin/users/:id/reinvite` — regenerate token + expiry for a pending user;
  returns fresh `invite_url`.
- `DELETE /api/admin/users/:id` — hard-delete a target with `tier.rank > actor.rank`.
  Cannot target self or super admin.

### Invite acceptance — public, token-gated

- `GET  /api/auth/invite/:token` — hash token, find pending non-expired user; return
  `{ email, full_name, tier_name }`. 404 on invalid/expired.
- `POST /api/auth/invite/:token` — body `{ password }`; on valid token set `password_hash`,
  `is_active=1`, clear `invite_token_hash`/`invite_expires`, issue a (non-persistent)
  session cookie, return `{ success, user }`.

### Self-service

- `POST /api/auth/change-password` — authenticated; `{ current_password, new_password }`;
  verifies current, updates hash.

## Frontend

- **AuthContext** (`src/lib/AuthContext.jsx`): `/api/auth/me` now returns
  `rank, capabilities, tier_name`. Store them; expose `can(cap)` =
  `rank === 0 || capabilities.includes(cap)`. Used for UI gating only — the Worker
  enforces every request.
- **Sidebar** (`AdminLayout.jsx`): `navItems` gain a `capability` field; filter to items
  where `!capability || can(capability)`. Add `{ label: 'Admins', path: '/admin/users',
  icon: ShieldCheck, capability: 'users' }`. Role badge shows the live `tier_name`.
- **Guards** (`src/components/`): keep `RoleGuard` for the coarse `client`/`staff` gate;
  add `CapabilityGuard` ({ capability, children }) that redirects staff lacking the cap
  to `/admin`. Wire per admin route (Settings → `settings`, Admins → `users`, each content
  page → its capability). Update `App.jsx` admin block from the old role allowlist to
  `RoleGuard(['staff'])` + `CapabilityGuard`.
- **Admins page** (`src/pages/admin/AdminUsers.jsx`, NEW): two tabs —
  - **People**: table of manageable staff (tier, status, invited-by). Actions: Invite
    (email + name + tier picker limited to assignable tiers), Edit tier, Activate/
    Deactivate, Delete, and **Copy invite link** for pending users.
  - **Tiers** (super-admin only): list tiers with rank + capability checkboxes; create /
    rename / reorder / delete; super tier shown locked.
- **Invite page** (`src/pages/InviteAccept.jsx`, NEW): public route `/invite/:token`
  (sibling of `/login`, works on the portal host). Validates token via GET, shows email/
  name, collects a new password, POSTs to accept, then routes to the dashboard.
- **PageNotFound.jsx**: replace the `user?.role === 'admin'` check (line ~44) with a staff
  check (`role === 'staff'`).

## Testing

- **Unit** (extend the `auth-unit-test`-style harness): `canManage` rank comparison;
  `capsSubsetOf`; super-admin immutability (assign/demote/delete rejected); invite token
  hash + expiry (valid, expired, wrong token); inactive user → `getSession` null and login
  403; capability gate allows/denies correctly.
- **Build:** `npm run build` clean.
- **In-browser:** super admin creates a tier + invites an admin; copy-link accept flow
  sets password and logs in; a limited admin sees only its permitted nav; rank rules block
  editing a peer/superior; deactivation logs a user out on next request.

## Implementation phases

1. **Schema** — `0003_admin_tiers.sql` (table + columns + seed + backfill); apply to D1.
2. **Worker** — session enrichment, `requireStaff`/`requireCapability`, capability-gated
   CMS routes, tier + user + invite + change-password endpoints, super-admin invariants.
3. **Frontend** — AuthContext caps, nav filtering, `CapabilityGuard`, Admins page (People
   + Tiers), invite-accept page, PageNotFound fix.
4. **Tests + build**, then **deploy** (staging → dev verify → PR staging→main; Worker
   deployed manually via fleet OAuth per the standing operational note).
