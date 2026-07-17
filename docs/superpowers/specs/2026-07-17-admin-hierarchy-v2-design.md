# Admin Hierarchy v2 — Design

**Date:** 2026-07-17
**Supersedes the rank rules in:** `docs/superpowers/specs/2026-07-16-admin-role-hierarchy-design.md`
**Status:** approved by Levi (2026-07-17)

## Motivation
The shipped hierarchy scoped both *visibility* and *management* to "strictly below
your rank." In practice that meant an Admin logged in and saw an empty "No admins yet"
list — they couldn't see peers or superiors at all. Levi refined the intended model:
admins should *see* the whole admin roster and be able to *create/edit* peers, while
*deletion* stays restricted. This spec redefines the tiers and the rank rules.

## The org model (fixed 4 bands)
| Rank | Tier id | Name | Who | Default capabilities |
|------|---------|------|-----|----------------------|
| 0 | `tier_superadmin` | Super Admin | Levi only (`admin@48labs.studio`); locked singleton (`is_system=1`) | all 9 (bypasses every check) |
| 1 | `tier_admin` | Level 1 | Client CEO | all 9 (incl. `users`, `settings`) |
| 2 | `tier_manager` | Level 2 | Directors, store managers | all 9 (incl. `users`, `settings`) |
| 3 | `tier_member` | Member | Employees, contractors | 7 content caps only — **no** `users`, **no** `settings` |

- The 9 capability keys are unchanged: `portfolio, team, faqs, process, investment,
  testimonials, inquiries, settings, users`.
- Member caps = `['portfolio','team','faqs','process','investment','testimonials','inquiries']`.
- Level 1 and Level 2 have identical capabilities; they differ **only** by rank
  (which governs who they can act on). "Fixed 4 bands" = no arbitrary depth beyond
  these four ranks; tier ids are reused so existing `users.tier_id` references stay valid.

## Rank rules
Two pure predicates in `rbac.js` (super, rank 0, always bypasses):

```
canManage(actorRank, targetRank)  // create / edit / reinvite  — OWN LEVEL OR BELOW
  actorRank === 0  → true
  else             → Number.isInteger(targetRank) && targetRank >= actorRank

canDelete(actorRank, targetRank)  // delete / deactivate       — STRICTLY BELOW
  actorRank === 0  → true
  else             → Number.isInteger(targetRank) && targetRank > actorRank
```

Operation matrix (non-super actor; super does everything):

| Operation | Predicate | Notes |
|-----------|-----------|-------|
| See in list | (special, below) | any `users`-capable admin sees the whole roster |
| Invite / create | `canManage` on the assigned tier | tier must be assignable: `rank >= actor`, `rank !== 0`, `is_system=0`, caps ⊆ actor's caps |
| Edit name / tier | `canManage` on target | tier change constrained to an assignable tier (same rule as invite) |
| Reinvite (pending) | `canManage` on target | |
| Deactivate (`is_active → 0`) | `canDelete` on target | disabling a peer is delete-like → strictly below only |
| Delete | `canDelete` on target | never self, never super, never a peer |

Invariants retained from v1: the super tier can never be assigned/created/edited/deleted
via any API path; no one may target the super account (rank 0) unless they are super;
you cannot delete your own account; self-service PATCH still edits only your own
`full_name`.

## Visibility (`GET /api/admin/users`)
Gated by the `users` capability (members lack it → 403, and the nav hides the page).
Returns the roster the viewer is allowed to see:

- **Non-super viewer:** all `role='staff'` rows where `tier_rank !== 0` (Super hidden)
  and `id !== me.id` (self excluded).
- **Super viewer:** all `role='staff'` rows where `id !== me.id`.

Each returned row is annotated server-side (the frontend renders buttons from these,
but every mutation re-checks server-side — defense in depth):
- `can_edit`  = `canManage(me.rank, row.rank)`
- `can_delete` = `canDelete(me.rank, row.rank)`

Rows include: `id, email, full_name, tier_id, tier_name, rank, is_active, status,
invited_by, can_edit, can_delete`.

**Confidentiality:** hiding rank 0 from non-super viewers keeps Levi's white-label
super account (`admin@48labs.studio`) invisible to the client's own L1/L2 admins.

## Endpoint changes (`workers/api/src/lib/admin.js`)
- `listUsers` — drop the `canManage` filter; return the full visible roster (rule
  above) with `can_edit`/`can_delete` annotations. Keep `WHERE u.role='staff'`.
- `inviteUser` — unchanged logic; the new `canManage` (≥) now permits own-level
  invites. Reword the 403 copy from "below your own" → "at or below your own".
- `patchUser` — manage-gate stays `canManage`; the `is_active` branch, **only when
  setting it to 0/false**, additionally requires `canDelete(me.rank, target.tier_rank)`
  (deactivation is delete-like). Tier-assign guard unchanged (still blocks super,
  still `canManage`, still caps-subset).
- `deleteUser` — switch the gate from `canManage` to **`canDelete`** (this is the
  load-bearing change; without it the new `canManage` semantics would let peers delete
  each other).
- `reinviteUser` — unchanged; `canManage` (≥) now permits own-level reinvite.

## Migration `0005_hierarchy_v2.sql`
- `INSERT OR IGNORE` a new `tier_member` (rank 3, the 7 content caps, `is_system=0`).
- Relabel + re-cap existing tiers: `tier_admin` → name "Level 1"; `tier_manager` →
  name "Level 2" **and** capabilities set to all 9. (Tier ids unchanged; `users.tier_id`
  references remain valid.) Super tier untouched.
- No user rows move: current `tier_admin` users stay Level 1, `tier_manager` users
  become Level 2 (with the widened caps). No existing members.

## Frontend (`src/components/admin/UsersPanel.jsx`, invite/edit dialogs)
- Render the full roster the API returns (admins + members, tier shown per row).
- Per row: show an **Edit** control iff `row.can_edit`; show **Delete** iff
  `row.can_delete`; a peer (edit-yes/delete-no) shows Edit but not Delete. Rows with
  neither show no action buttons.
- Add an **Edit dialog** (new): change `full_name` and `tier` (tier options = assignable
  tiers, `rank >= me.rank`, excluding super). Wire to `PATCH /api/admin/users/:id`.
- Invite dialog: assignable tier options = `rank >= me.rank`, excluding super (was
  strictly-below).
- Nav (`AdminLayout`): no change — members lack `users`+`settings` caps, so the existing
  capability-filtered nav already hides **Admins** and **Site Settings** for them.
- Copy: the panel subtitle "You can only assign tiers below your own" → "at or below
  your own."

## Testing strategy (closes the mock-only gap that hid the invite 500)
1. **Pure rank rules — `test/rbac.test.mjs`:** exhaustive tables for `canManage` and
   `canDelete` across ranks 0–3 in both actor/target directions, incl. non-integer
   target guards. This is where the rules are authoritatively verified (no DB, no flake).
2. **Handler branching — `test/admin.test.mjs`:** mock-DB tests that peer **edit** is
   allowed, peer **delete** is 403, peer **deactivate** is 403, own-level **invite** is
   allowed, super is never a target, and `listUsers` hides super from a non-super viewer
   and annotates `can_edit`/`can_delete`.
3. **Real-DB integration smoke — new `test/db-smoke.test.mjs`:** apply all migrations
   (`0002`→`0005`) to a real local D1 (via wrangler's local SQLite state — **no new
   runtime/dev dependency**; wrangler is already present) and run the actual
   invite/patch/delete SQL to catch schema/constraint drift like the `NOT NULL` bug.
   If a reliable in-process binding isn't available, fall back to driving
   `wrangler d1 execute --local` from the test. The Worker runtime bundle stays
   dependency-free regardless.

## Out of scope
- The Tiers-management tab stays super-only and unchanged (creating/reordering tiers is
  a super-only power; with fixed bands it simply won't be used, but ripping it out is
  not part of this change).
- No changes to the client portal, public site, or auth/session mechanics.

## Global constraints
- Never reintroduce base44 (`@base44/sdk`, `@base44/vite-plugin`, webhooks, `functions/`).
- Worker runtime stays dependency-free; all Cloudflare/wrangler calls go through
  `cf-wrangler.cjs` / `cf-provision.js` fleet OAuth; never print/log the CF token.
- Super admin is a permanent locked singleton, immutable via any API path.
- Nothing deploys or merges to `main` without Levi's explicit approval.
