# Deployment pipeline — Dream Home Design

Staged deploy with a **manual approval gate before production**. This doc is the
source of truth for how a change reaches `dreamhome.design`.

## TL;DR

```
  edits ─────►  staging  ──build──►  dev.dreamhome.design      (STAGING — auto, ungated)
                   │
                   │   open PR  staging → main
                   ▼
   review + MERGE THE PR  (this is the approval gate)
                   │
                   ▼
                 main  ──build──►  dreamhome.design            (LIVE — gated)
              (protected)         portal.dreamhome.design
                                  www.dreamhome.design
```

- Push/merge to **`staging`** → auto-deploys **staging** (`dev.dreamhome.design`). No gate.
- To go live: open a PR **`staging` → `main`**, review, **merge it**. Merging is the
  approval. Only `main` is served on the live custom domains.
- `main` is **branch-protected** (ruleset `protect-main`): no direct pushes; changes
  land only via a merged PR.

## Topology: conventional (`main` = live)

`main` is production, the way most repos work. This became possible on **2026-07-16**
when **base44 was disconnected from the repo**. Previously base44 was hard-wired to
push `main` on every design save, which would have shipped straight to live with no
review — so the pipeline was temporarily *inverted* (`main` = staging, a separate
`production` branch = live) to quarantine those pushes. With base44 gone, that
constraint is gone, and the pipeline was flipped back to the conventional layout for a
clean client handoff. The old `production` branch and the `protect-production` ruleset
were retired as part of the flip.

Project-name note: `wl-dreamhome-site` (the plainly-named project) builds `main` →
live, and `wl-dreamhome-site-dev` builds `staging` → `dev.dreamhome.design`. Names and
roles line up again. The **branch → domain** mapping in the table below is what's real.

## Environments

| | Branch | Pages project | Domain(s) | Gate |
|---|---|---|---|---|
| **Staging** | `staging` | `wl-dreamhome-site-dev` | `dev.dreamhome.design` | none — auto on push |
| **Live** | `main` | `wl-dreamhome-site` | `dreamhome.design`, `portal.dreamhome.design`, `www.dreamhome.design` | PR into `main` must be merged |

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
on push to **`main`** (paths `workers/api/**`). Rationale: the Worker is shared, so its
deploy rides the same `main` gate as the site — it deploys when a promotion PR merges.

- Backend work (Claude's domain) flows: feature branch → `staging` (preview build, **no**
  Worker deploy) → promotion PR → `main` (Worker deploys live on merge).
- Because staging runs against the shared live Worker, staging will run the
  *currently-deployed* (i.e. `main`) Worker, not un-promoted `staging` Worker code.
  **Test Worker changes locally** before promoting:
  `cd workers/api && node cf-wrangler.cjs dev`.
- D1 schema/seed is **not** auto-migrated by CI (would duplicate seeded content).
  Apply deliberately from a workstation:
  `cd workers/api && node cf-wrangler.cjs d1 execute wl-dreamhome-db --remote --file=migrations/<file>.sql`.

## How to ship a change (runbook)

**Any change** starts on `staging` (directly or via a feature-branch PR into `staging`).
It appears on `dev.dreamhome.design` within a couple minutes. Review it there.

**Promote staging to live:**
1. Confirm `dev.dreamhome.design` looks right.
2. Open a PR **base `main` ← compare `staging`** (GitHub → New pull request; set base
   to `main`). Or: `gh pr create --base main --head staging --title "Promote: <what>"`.
3. Review the diff (this is everything going live).
4. **Merge the PR.** `wl-dreamhome-site` builds `main` → live in ~1–2 min.
5. Verify `https://dreamhome.design`.

**A backend/Worker change (Claude):** land it on `staging` via PR first (preview build
proves the frontend still builds), test the Worker locally, then include it in the next
`staging → main` promotion PR. Merging promotes both site and Worker.

## Guardrails in place

- **Ruleset `protect-main`** (id 19066025) — `main` requires a PR; no direct pushes /
  force-pushes / deletion. (GitHub rulesets are free because the repo is public; see
  confidentiality note below.)
- **`staging` is unprotected** — deliberately, so preview builds are frictionless.
- Live custom domains are attached **only** to the `wl-dreamhome-site` (`main`) project,
  so a `staging` build can never appear on `dreamhome.design` even by accident.

## Cloudflare mechanics (for maintainers)

- Both projects deploy via Cloudflare's **native git integration** (Pages → Settings →
  Builds), each pinned to its `production_branch` (`main` / `staging` respectively).
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

- ✅ Conventional topology live as of **2026-07-16** (`main` = live, `staging` = preview).
- ✅ `wl-dreamhome-site` builds `main` → `dreamhome.design`, `portal.*`, `www.*` (base44-free bundle).
- ✅ `wl-dreamhome-site-dev` builds `staging` → `dev.dreamhome.design`.
- ✅ `main` protected by ruleset `protect-main` (moved from the retired `production` branch).
- ✅ Old `production` branch + `protect-production` retired; obsolete promotion PR closed.
- ✅ Worker deploy workflow triggers on `main`.
