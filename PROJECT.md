# Dream Home Design — EchoHouse Films (WL) — project overview

> The source of truth for what this project IS. Read before working on it. Keep
> current: if purpose, scope, stack, or migration phase changes, update this file
> in the same change (alongside docs/ROADMAP.md).

## What it is
A three-surface web product for a custom home-design / cabinetry studio, live at
**https://dreamhome.design**:
1. **Public marketing site** — home, about, process, portfolio, FAQ, investment, contact.
2. **Client portal** (`/portal/*`, role `client`) — per-project dashboard, documents,
   material selections, messages, billing/invoices, help.
3. **Admin CMS** (`/admin/*`, roles `manager`/`admin`/`super_admin`) — manages
   portfolio, team, FAQs, process stages, investment tiers, testimonials, and site settings.

Originally built on **base44** (hosted BaaS: auth + database + file storage + hosting).

## Tenancy
White-label engagement — `category: client-whitelabel`.
- **Slate 48** (Levi's company) → **EchoHouse Films** (agency, work delivered under
  their brand) → **Dream Home Design** (end-client, dreamhome.design).
- Registry slugs: agency `echohouse`, end-client `dreamhome`, project `site`.
- On-disk: `~/Sites/clients/whitelabel/echohouse/dreamhome/site`.
- **Confidentiality:** the agency/end-client identity stays in-repo only. The fleet
  dashboard broadcasts only a non-identifying stack blurb + `kind: client-whitelabel`.

## Why it exists now / current focus
Migrating the whole app **off base44 onto 100% Cloudflare**. base44 is a fleet-wide
hard-cut dependency (a server-side sync agent was burning credits; all webhooks/crons
severed). Phase 0 (done) stood up the CF Pages deploy target + the phased migration
plan. Phases 1–7 (see docs/ROADMAP.md) do the actual rip-out — NOT yet executed;
awaiting Levi's approval of the plan.

## Stack
React 18 + Vite 6 + Tailwind + shadcn/ui (Radix primitives), react-router-dom v6,
@tanstack/react-query, framer-motion. No TypeScript source. Extra libs present:
react-pageflip + pdfjs-dist (flipbook), react-leaflet (maps), recharts, jspdf,
three, @hello-pangea/dnd. **@stripe/react-stripe-js + @stripe/stripe-js are in
package.json but UNUSED in source** — dead scaffolding, decision deferred to P6.

## Backend: current vs target
| | Current (base44) | Target (Cloudflare) |
|---|---|---|
| Data | `base44.entities.<E>` (14 entities) | D1 `wl-dreamhome-db` + `/api` Worker |
| Auth | `base44.auth.me/logout/redirectToLogin` + roles | our auth (cookie/JWT) + RoleGuard |
| Files | `base44.integrations.Core.UploadFile` (Documents) | R2 |
| Host | base44 hosting | CF Pages `wl-dreamhome-site` |

## Deploy (fleet CF account, `wl-` prefix)
- **Account:** 48Labs fleet (Levi Elizaga, `37172187c20bd1fcc38760c946161fb0`),
  `cfOwnership: fleet-shared`. All wrangler via `cfDeployEnv()`/`cf-provision.js` (OAuth).
- **Pages:** `wl-dreamhome-site` → https://wl-dreamhome-site.pages.dev (live, Phase 0).
  Build clean; base44 backend calls dead at runtime (expected for Phase 0).
- **Worker/D1/R2:** `wl-dreamhome-api` / `wl-dreamhome-db` / (R2 TBD) — NOT created
  yet (later migration phases).
- **base44 removed from build (2026-07-16):** base44 was disconnected from the repo;
  `@base44/vite-plugin` dropped from `vite.config.js` + `package.json`, and the `@`→src
  alias it injected moved into `vite.config.js`. No `VITE_BASE44_APP_ID` needed — the
  build has zero base44 dependency and its output is byte-identical to the pre-strip build.
- **Deploy pipeline (gated) — see docs/DEPLOYMENT.md.** Staged, with a manual approval
  gate before live. **Conventional** topology (`main` = live) since 2026-07-16, once
  base44 was disconnected and no longer forced pushes onto `main`: `staging` =
  **staging** → `dev.dreamhome.design` (auto, ungated, project `wl-dreamhome-site-dev`);
  protected `main` = **live** → `dreamhome.design` + `portal.*` + `www.*` (project
  `wl-dreamhome-site`). Going live = merge a PR `staging → main` (ruleset `protect-main`).
  Backend is shared (one Worker/D1/R2); the Worker deploy workflow is gated on `main` too.
  The old `production` branch + `protect-production` ruleset were retired in the flip.

## Levi blockers (Phase 0 output — action needed)
1. ✅ **RESOLVED (2026-07-16): Custom domain `dreamhome.design` is attached to the
   fleet CF account and serving.** The zone was added to the fleet account and the
   Pages project `wl-dreamhome-site` now serves `dreamhome.design` (+ `www` and
   `portal.*`); the Worker API routes resolve on the custom-domain zone. (Historical:
   the zone was previously registered at GoDaddy with `ns59/ns60.domaincontrol.com`
   and had to be moved onto Cloudflare nameservers before the Pages custom domain
   could be added.)
2. **Git-remote migration is DEFERRED (not now).** Repo sits at
   `Slate48/dreamhome.design` (Levi's Slate48 GitHub org). base44 is currently
   pushing DATABASE RECORDS directly into this repo, so the remote must STAY as-is
   until the export/record-sync is complete — moving it now would break base44's push
   target. Revisit the remote (keep on Slate48 vs move to an EchoHouse/client-owned
   repo vs client handoff) only after base44 finishes exporting records.
3. **base44 backend teardown timing.** Decide when to pause/delete base44 app
   `6a0c98b9972c40dc9ebe5d05` — must be AFTER the CF cutover verifies (P7) AND after
   base44 finishes pushing records into the repo, else the live site's backend goes
   dark / records are lost.
4. **Stripe decision (P6).** `@stripe/*` deps are present but unused. Drop them, or
   wire real checkout for the portal Billing page? (Currently invoices are display-only.)

_Data export is NOT a blocker: base44 writes records into the repo directly and Levi
will provide a full DB export; the P2/P3 D1 seed sources from those (see docs/FEATURES.md
"Data source for the D1 seed") — no base44 API scrape planned._

## Key paths & links
- Repo: `Slate48/dreamhome.design` · on-disk `~/Sites/clients/whitelabel/echohouse/dreamhome/site`
- Live (Phase 0): https://wl-dreamhome-site.pages.dev · Target domain: https://dreamhome.design
- Data model: `docs/FEATURES.md` (inventory) + `src/DATABASE.md` (base44-era detail)
- Migration plan: `docs/ROADMAP.md` · Architecture: `docs/ARCHITECTURE.md`

_Last reviewed: 2026-07-06 (fleet onboarding + base44→CF Phase 0)._
