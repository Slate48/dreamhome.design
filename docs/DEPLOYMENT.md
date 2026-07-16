# Deployment pipeline — Dream Home Design

Staged deploy with a **manual approval gate before production**. This doc is the
source of truth for how a change reaches `dreamhome.design`.

## TL;DR

```
                 ┌─────────────────────────── base44 pushes here (fixed, can't repoint)
                 │
  edits ─────►  main  ──build──►  dev.dreamhome.design      (STAGING — auto, ungated)
                 │
                 │   open PR  main → production
                 ▼
   review + MERGE THE PR  (this is the approval gate)
                 │
                 ▼
             production ──build──►  dreamhome.design         (LIVE — gated)
                                    portal.dreamhome.design
                                    www.dreamhome.design
```

- Push/merge to **`main`** → auto-deploys **staging** (`dev.dreamhome.design`). No gate.
- To go live: open a PR **`main` → `production`**, review, **merge it**. Merging is
  the approval. Only `production` is served on the live custom domains.
- `production` is **branch-protected** (ruleset `protect-production`): no direct
  pushes, changes land only via PR.

## Why the topology is "inverted" (main = staging, not prod)

Normally `main` would be production. Here it is **staging**, on purpose:

> **base44 is hard-wired to push to `main` and cannot be repointed.** base44 is the
> design/UI tool the client uses; every save pushes to `main`. If `main` were live,
> every base44 save would ship straight to `dreamhome.design` with no review.

So we quarantine base44's fixed target (`main`) to **staging**, and introduce a
separate protected **`production`** branch as the release branch. base44 keeps
working exactly as before (it still pushes `main`); its changes now land on
`dev.dreamhome.design` and reach live only when someone merges a promotion PR.

Consequence worth remembering: the Pages project literally *named* `-dev`
(`wl-dreamhome-site-dev`) builds `main` and the plainly-named project
(`wl-dreamhome-site`) builds `production`. The **branch → domain** mapping below is
what's real; project names are historical.

## Environments

| | Branch | Pages project | Domain(s) | Gate |
|---|---|---|---|---|
| **Staging** | `main` | `wl-dreamhome-site-dev` | `dev.dreamhome.design` | none — auto on push |
| **Live** | `production` | `wl-dreamhome-site` | `dreamhome.design`, `portal.dreamhome.design`, `www.dreamhome.design` | PR into `production` must be merged |

Both are full-fidelity: public marketing site **+ client portal + admin CMS**, real
login. They are the same bundle built from different branches.

## Shared backend — read this before testing on staging

There is **one** backend, shared by both environments:

- Worker `wl-dreamhome-api`, D1 `wl-dreamhome-db`, R2 `wl-dreamhome-media`.
- The Worker routes `dreamhome.design/api/*` **and** `*.dreamhome.design/api/*`, so
  the wildcard already serves `dev.dreamhome.design/api/*` — staging auth/data work
  with no extra config.

What this means:

- **Staging reads and writes the same live database.** Creating/deleting records on
  `dev.dreamhome.design` affects real data. Treat staging data as production data.
- The session cookie is **host-only** (no `Domain=`), so logging in on
  `dev.dreamhome.design` does **not** clobber a `dreamhome.design` session, and vice
  versa. Sessions are isolated per hostname even though the data is shared.
- Staging is a faithful preview of **frontend** changes. It is **not** an isolated
  sandbox for backend changes — see next section.

## Backend / Worker changes are gated too

The Worker deploy is driven by `.github/workflows/deploy-worker.yml`, which triggers
on push to **`production`** (paths `workers/api/**`) — **not** `main`. Rationale:
the Worker is shared, so its deploy is tied to the same `production` gate as the site.

- base44 never touches `workers/api/**`, so base44's `main` pushes never deploy the Worker.
- Backend work (Claude's domain) flows: feature branch → `main` (staging, **no** Worker
  deploy) → promotion PR → `production` (Worker deploys live on merge).
- Because staging runs against the shared live Worker, staging will run the
  *currently-deployed* (i.e. `production`) Worker, not un-promoted `main` Worker code.
  **Test Worker changes locally** before promoting:
  `cd workers/api && node cf-wrangler.cjs dev`.
- D1 schema/seed is **not** auto-migrated by CI (would duplicate seeded content).
  Apply deliberately from a workstation:
  `cd workers/api && node cf-wrangler.cjs d1 execute wl-dreamhome-db --remote --file=migrations/<file>.sql`.

## How to ship a change (runbook)

**A client/base44 design change** — nothing to do. base44 pushes `main`; it appears
on `dev.dreamhome.design` within a couple minutes. Review it there.

**Promote staging to live:**
1. Confirm `dev.dreamhome.design` looks right.
2. Open a PR **base `production` ← compare `main`** (GitHub → New pull request; set base
   to `production`). Or: `gh pr create --base production --head main --title "Promote: <what>"`.
3. Review the diff (this is everything going live, incl. any base44 changes on `main`).
4. **Merge the PR.** `wl-dreamhome-site` builds `production` → live in ~1–2 min.
5. Verify `https://dreamhome.design`.

**A backend/Worker change (Claude):** land it on `main` via PR first (staging build
proves the frontend still builds), test the Worker locally, then include it in the
next `main → production` promotion PR. Merging promotes both site and Worker.

## Guardrails in place

- **Ruleset `protect-production`** (id 19066025) — `production` requires a PR; no
  direct pushes / force-pushes / deletion. (GitHub rulesets are free because the repo
  is public; see confidentiality note below.)
- **`main` is unprotected** — deliberately, so base44 can keep pushing.
- Live custom domains are attached **only** to the `production` project, so a `main`
  build can never appear on `dreamhome.design` even by accident.

## Cloudflare mechanics (for maintainers)

- Both projects deploy via Cloudflare's **native git integration** (Pages → Settings →
  Builds), each pinned to its `production_branch` (`production` / `main` respectively).
- All CF/wrangler operations go through the fleet credential wrapper
  (`cfDeployEnv()` / `cf-credentials.js`, fleet account `37172187c20bd1fcc38760c946161fb0`),
  never ambient tokens. The provisioning/verify scripts used for this setup live in the
  session scratchpad (read-only inspect + one-shot reconfig helpers); they use
  `resolveCfCreds(null)` and never print the token.
- `dev.dreamhome.design` is a proxied CNAME → `wl-dreamhome-site-dev.pages.dev` in the
  `dreamhome.design` zone.

## Confidentiality note (accepted trade-off)

The repo was made **public** to get free branch protection (rulesets are plan-gated on
private repos). This is at odds with CLAUDE.md's confidentiality guidance
(white-label engagement). The client accepted staying public. Keep the agency/end-client
identity out of any newly added public-facing content regardless.

## Current status

- ✅ Two Pages projects wired; branch→domain mapping verified.
- ✅ `production` branch created from live `main` (dfa1d41); protected by `protect-production`.
- ✅ Live (`dreamhome.design`, `portal.*`, `www.*`) served from `production` — build `fd6b2d6c` green.
- ✅ Staging (`dev.dreamhome.design`) served from `main` — build `2f88abc6` green.
- ✅ Worker deploy workflow retargeted `main` → `production`.
- ⏳ First promotion PR `main → production` brings these docs + the workflow fix onto
  `production` and exercises the gate for the first time.
