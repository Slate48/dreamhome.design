# Architecture — Dream Home Design

> Current (base44) vs target (Cloudflare) architecture. Keep current as the
> migration progresses (docs/ROADMAP.md). Field-level base44 detail: `src/DATABASE.md`.
> Last updated: 2026-07-06 (fleet onboarding, base44→CF Phase 0).

## Overview
A Vite/React SPA with three role-gated surfaces (public site, client portal, admin
CMS) over a single-page router. Today all data/auth/files go through the **base44**
hosted BaaS; the target moves every backend concern to the **48Labs fleet Cloudflare
account**.

## Frontend (unchanged by the migration)
- **React 18 + Vite 6**, Tailwind + shadcn/ui (Radix), `react-router-dom` v6.
- **Data layer:** `@tanstack/react-query` wrapping base44 SDK calls (P1 swaps the
  data source under react-query, not react-query itself).
- **Routing:** `src/App.jsx` — `PublicLayout` (public), `PortalLayout` +
  `RoleGuard(['client'])` (portal), `AdminLayout` + `RoleGuard(['manager','admin',
  'super_admin'])` (admin, `/admin/settings` further gated to admin/super_admin).
- **Auth context:** `src/lib/AuthContext.jsx` loads app public-settings + current
  user; `src/components/RoleGuard.jsx` enforces per-route roles.
- **Build:** `npm run build` → `dist/`. Requires `VITE_BASE44_APP_ID` until P1.

## Current backend — base44 (being cut)
- **Data:** `base44.entities.<Entity>` ORM over base44's hosted DB. 14 entities
  (see docs/FEATURES.md).
- **Auth:** `base44.auth.me/logout/redirectToLogin`; roles on the built-in `User`.
- **Files:** `base44.integrations.Core.UploadFile` (client document uploads only).
- **Config/build:** `@base44/vite-plugin`, `src/api/base44Client.js`,
  `src/lib/app-params.js`; app id `6a0c98b9972c40dc9ebe5d05`.
- **Records:** base44 now writes DB records directly into the repo
  (`Cinedex/dream-home-design`); a full export is also being provided by Levi. These
  are the D1 seed source (NOT an API scrape).

## Target backend — Cloudflare (fleet account)
- **Account:** 48Labs fleet (Levi Elizaga, `37172187c20bd1fcc38760c946161fb0`),
  `cfOwnership: fleet-shared`. All wrangler via `global_files/scripts/cf-provision.js`
  → `cfDeployEnv()` (clears ambient CF token, pins account, OAuth for fleet). Never
  bypass.
- **Pages (frontend):** `wl-dreamhome-site` → https://wl-dreamhome-site.pages.dev
  (live as of Phase 0; custom domain `dreamhome.design` pending zone add — see PROJECT.md).
- **Worker (API):** `wl-dreamhome-api` (planned P3) — `/api/<entity>` CRUD + `/api/auth/*`.
- **D1 (data):** `wl-dreamhome-db` (planned P2) — one table per entity, FKs on
  `project_id`, JSON columns for nested arrays (`Project.stage_notes`,
  `InvestmentTier.payment_methods`).
- **R2 (files):** document uploads + image assets (planned P5).
- **Auth:** cookie/JWT session (fleet pattern: PBKDF2-HMAC-SHA-256 + HS256 JWT, per
  the Slate48 template) replacing base44.auth; `RoleGuard` kept, data source swapped.
- **Email (candidate):** Resend for the Contact form / notifications (none today).

## Naming (white-label `wl-` convention)
Fleet-account resources for a white-label client are prefixed `wl-<endclient>-<...>`:
Pages `wl-dreamhome-site`, Worker `wl-dreamhome-api`, D1 `wl-dreamhome-db`. Codified
in `global_files/projects.json` → `categorySchema` (WHITE-LABEL NAMING STANDARD).

## Deploy flow (Phase 0, current)
**Frontend (Pages) is git-connected:** the `wl-dreamhome-site` Pages project builds
and deploys automatically on merge to `main` (and builds a preview per branch/PR).
A manual push also works and is faster than waiting on the git build:
`npm run build` → `dist/` → `cf-provision.js deploy dream-home-design
--pages wl-dreamhome-site --dir dist` (direct wrangler upload via OAuth) — but it is
not required. **The Worker `wl-dreamhome-api` is NOT git-triggered** — deploy it
manually via `workers/api/cf-wrangler.cjs deploy` (fleet OAuth). base44 backend calls
are dead at runtime post-deploy — expected until the migration wires the CF backend.

## Migration
Phased, in order — see docs/ROADMAP.md. Nothing moves on until the current phase is
green + deployed. Pattern reference: the fleet's Slate48 base44→CF migration
(per-entity Pages Functions/Worker over D1, cookie-session auth, R2 media, Resend).
