# ROADMAP — Dream Home Design (base44 → Cloudflare migration)

> Phased migration off base44 onto the 100%-Cloudflare fleet stack. Execute in
> order — nothing moves on until the current phase is green + deployed. Pattern
> reference: the fleet's Slate48 base44→CF migration (per-entity Worker/Functions
> over D1, cookie-session auth, R2 media, Resend). DO NOT execute the rip-out until
> Levi approves this plan.
> Last updated: 2026-07-06.

## Phase 0 — Onboard + CF deploy target ✅ DONE (2026-07-06)
- Adopted into the fleet as `client-whitelabel` (echohouse/dreamhome/site).
- Registered in `global_files/projects.json` + FleetManager state.
- CF Pages `wl-dreamhome-site` created on the fleet account (OAuth) and deployed
  (direct upload of `npm run build` → `dist`). Live: https://wl-dreamhome-site.pages.dev
  (build clean; base44 backend calls dead at runtime — expected).
- Inventory written (docs/FEATURES.md): 21 routes, 14 entities, auth, one file-upload
  integration, no functions/LLM/email, Stripe deps unused.
- Custom domain `dreamhome.design` NOT attached — zone not in fleet CF account
  (Levi blocker; see PROJECT.md).

## Migration inventory (source for the phases below)
- **Routes:** 21 (7 public, 7 client-portal, 8 admin) — docs/FEATURES.md.
- **Entities:** 14 (User, Project, Document, Selection, Message, Invoice,
  ContactInquiry, PortfolioItem, ProcessStage, InvestmentTier, FAQItem, TeamMember,
  Testimonial, SiteSettings) — → D1 tables in `wl-dreamhome-db`.
- **Auth:** `base44.auth.*` + `RoleGuard`, 4 roles (client/manager/admin/super_admin).
- **Files:** `Core.UploadFile` (client document uploads) — → R2.
- **Payments:** `@stripe/*` present, unused.
- **Data source for seed:** in-repo record files (base44 pushes records into
  `Cinedex/dream-home-design`) + Levi's full DB export. NO base44 API scrape. As of
  onboarding the record files have not landed yet — expected under `base44/` or a
  new `data/`/`records/` dir (docs/FEATURES.md "Data source for the D1 seed").

## Fast-track — PUBLIC SITE migrated to Cloudflare ✅ DONE (2026-07-06)
Public-site-first slice (public routes only), on branch `feat/migrate-public-site`:
- **D1 `wl-dreamhome-db`** created on the fleet account; schema
  `workers/api/migrations/0001_public_content.sql` (8 public-content tables +
  ContactInquiry). Seeded idempotently from `database_export.json`
  (`workers/api/seed-from-export.cjs`): PortfolioItem 55, TeamMember 30, FAQItem 8,
  ProcessStage 8, InvestmentTier 3, Testimonial 3, SiteSettings 1 — verified in D1.
- **Worker `wl-dreamhome-api`** (https://wl-dreamhome-api.levi-371.workers.dev):
  read-only GET `/api/<Entity>` (base44 .list/.filter semantics) + POST
  `/api/ContactInquiry`. CORS-enabled.
- **Frontend:** `src/api/publicContent.js` shim; the 7 public pages + `useSiteSettings`
  now read from the Worker, OFF `@base44/sdk`. Portal/admin deliberately still on the SDK.
- **Deployed + verified live:** the deployed SPA fetches the Worker (200) and renders
  real export content (portfolio titles + footer contact from D1).
- **Later phases:** portal + admin routes; images still on `media.base44.com` (→ R2
  in P5); `<title>Base44 APP</title>` (cosmetic, P1 full).

## DNS cutover prep — STAGING BLOCKED (see docs/DNS_CUTOVER.md) ⚠️
Authoritative GoDaddy DNS captured (Google Workspace MX + SPF/_spfm + 3 TXT
verifications; no DKIM/DMARC/CAA). Zone add + record mirror + Pages custom-domain
attach NOT completed: the fleet CF token lacks `Zone:Create` and the wrangler OAuth
token isn't scriptable for raw CF-API calls. Unblock via the CF dashboard OR a fleet
token with Zone:Create+DNS:Edit+Pages:Edit. Email preservation is a hard gate — every
record to mirror is in docs/DNS_CUTOVER.md.

## Phase 1 — Strip @base44/sdk + SDK shim/abstraction layer  ⏳ planned (portal/admin remainder)
Introduce a thin data-access abstraction (`src/api/client.js`) so pages stop calling
`base44.*` directly. Route all `entities.*` / `auth.*` / `UploadFile` through it,
behind the existing react-query hooks. Remove `@base44/vite-plugin` from
`vite.config.js`, delete `src/api/base44Client.js` + base44 bits of
`src/lib/app-params.js`, drop `@base44/sdk`/`@base44/vite-plugin` from package.json.
Map env `VITE_BASE44_*` → `VITE_*` brand/tenant vars. Exit: build clean with NO
`@base44`/`base44.com` references; app still renders (shim can point at a temporary
mock/stub until P3). Also cleans the "Base44 APP" `<title>`.

## Phase 2 — D1 schema + seed → `wl-dreamhome-db`  ⏳ planned
Derive the schema from the 14 entities (enums, defaults, FKs on `project_id`, JSON
columns for `Project.stage_notes` + `InvestmentTier.payment_methods`; `SiteSettings`
singleton `key='main'`). Create D1 `wl-dreamhome-db` on the fleet account (via
`cf-provision`/wrangler through `cfDeployEnv`). Seed from the in-repo record files +
Levi's full export (NOT an API scrape). Exit: schema applied remote, row counts match
the export.

## Phase 3 — Worker API `wl-dreamhome-api` (CRUD)  ⏳ planned
Create the Worker binding D1. Implement `/api/<entity>` CRUD for all 14 entities
(public-read where the SPA reads unauthenticated; auth-scoped + ownership-isolated
for portal/admin — 404-not-200 on cross-tenant, message unread-leak guard).
Point the P1 shim at these endpoints. Exit: every page's data loads from the Worker;
zero base44 runtime calls.

## Phase 4 — Auth (replace base44.auth + RoleGuard data source)  ⏳ planned
Cookie/JWT session (fleet pattern: PBKDF2-HMAC-SHA-256 + HS256 JWT) + `/api/auth/*`
(login, me, logout, and an invite/accept flow for clients). Keep `RoleGuard` +
the 4 roles (client/manager/admin/super_admin); swap `AuthContext` off base44.auth.
Exit: login/logout/role-gating work end-to-end on all three surfaces.

## Phase 5 — Files: UploadFile → R2  ⏳ planned
Create an R2 bucket; add a multipart upload endpoint on the Worker; repoint
`src/pages/portal/Documents.jsx` off `Core.UploadFile`. Migrate any existing
base44-CDN document/image URLs into R2. Exit: document upload + retrieval work from R2.

## Phase 6 — Stripe decision  ⏳ planned
Decide: drop the unused `@stripe/*` deps, OR wire real checkout for the portal
Billing page (invoices are display-only today). Exit: deps match reality — either
removed, or a working payment flow. (Levi decision — see PROJECT.md.)

## Phase 7 — Cutover + verify  ⏳ planned
Attach `dreamhome.design` to Pages (requires the zone in the fleet CF account —
Levi blocker). Full verification: all 21 routes, contact write, portal CRUD +
ownership isolation, document upload, auth/roles, zero `@base44`/`base44.com`
references, correct built bundle live (grep all JS chunks), no Mac-viewport clipping.
Then coordinate base44 teardown (app `6a0c98b9972c40dc9ebe5d05`) — AFTER verify AND
after base44 finishes pushing records. Exit: production on Cloudflare, base44 severed.

## Levi blockers (see PROJECT.md for detail)
- Custom domain `dreamhome.design` zone not in fleet CF account (GoDaddy NS cutover).
- Git-remote migration DEFERRED until base44 finishes exporting records.
- base44 teardown timing (after P7 + record push complete).
- Stripe decision (P6).
