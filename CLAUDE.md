> Global rules: CLAUDE.global.md — read it first, this file extends it.
> Whole-project overview: PROJECT.md — read before working on this repo.

# CLAUDE.md — Dream Home Design (white-label)

## What this is
Marketing site + client portal + admin CMS for a custom-cabinetry / home-design
studio, live at **dreamhome.design**. Built originally on **base44** (a
Vite/React SPA against base44's hosted BaaS). It is being migrated **off base44
onto 100% Cloudflare** (D1 + Workers + our own auth + R2). base44 is a fleet-wide
HARD-CUT dependency — never reintroduce `@base44/sdk`, `@base44/vite-plugin`,
base44 webhooks, or base44 `functions/`.

## Tenancy (confidential — do not broadcast)
This is a **white-label** engagement (`category: client-whitelabel` in the fleet
registry). Delivered under an agency's brand for their end-client. The identifying
label is **"Dream Home Design — EchoHouse Films (WL)"** and lives ONLY in this repo
and PROJECT.md — the fleet dashboard `display`/`/state` broadcast carries only a
non-identifying stack blurb and never the agency name. Keep it that way.

## Stack
- **Frontend:** React 18 + Vite 6 + Tailwind + shadcn/ui (Radix), react-router-dom v6,
  @tanstack/react-query, framer-motion. No TypeScript source (jsconfig only).
- **Build:** `npm run build` → `dist/` (Vite). Requires `VITE_BASE44_APP_ID` at build
  time until Phase 1 strips the base44 plugin (see docs/ROADMAP.md).
- **Backend (current):** base44 hosted BaaS — DEAD once migrated. **Target:** Cloudflare
  Pages (frontend) + Workers (API) + D1 (data) + R2 (files) + our auth.

## Deploy target (fleet Cloudflare account)
Deploys to the **48Labs fleet Cloudflare account** (`cfOwnership: fleet-shared` — no
dedicated account yet). Resources use the white-label `wl-` prefix:
- **Pages:** `wl-dreamhome-site` → https://wl-dreamhome-site.pages.dev
- **Worker (planned):** `wl-dreamhome-api`
- **D1 (planned):** `wl-dreamhome-db`
- **Custom domain:** https://dreamhome.design (NOT yet attached — zone not in the
  fleet CF account; see PROJECT.md "Levi blockers").

**All Cloudflare/wrangler calls go through `cfDeployEnv()` / `scripts/cf-provision.js`
in global_files — never bypass it** (it blanks the ambient CF token and pins the
account). Fleet-account deploys run via wrangler OAuth (`info@48labs.studio`).

## Migration discipline
- This is a **phased** base44→CF migration. Do NOT rip out the backend ad hoc —
  follow docs/ROADMAP.md phases in order; nothing moves on until the current phase
  is green + deployed. Reference the fleet's Slate48 base44→CF migration pattern.
- The base44 data for the 14 entities must be **exported** before P2/P3 cutover
  (Levi blocker — see PROJECT.md).

## Docs (STANDARD layout — no FleetManager root-doc exception)
`docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, `docs/FEATURES.md`. The full data model
also lives in the pre-existing `src/DATABASE.md` (base44-era reference — keep until
D1 schema supersedes it).

## Git
External remote: `Cinedex/dream-home-design` (Levi's Cinedex GitHub org — NOT an
EchoHouse/client-owned remote; migration TBD, see PROJECT.md). Branch naming:
`claude/<desc>` · `codex/<desc>`. Worktrees go under `.worktrees/` (gitignored),
never sibling folders. Not in `~/Sites/pnpm-workspace.yaml` (client repos version
independently). Do NOT merge onboarding work to the default branch without Levi's ok.

## Session start
1. Read this file 2. Read CLAUDE.global.md 3. Read PROJECT.md 4. Read docs/ROADMAP.md
(migration phases) 5. Read docs/ARCHITECTURE.md + docs/FEATURES.md if touching code.
