# Deployment — Dream Home Design

> How code reaches production. Two-stage, gated pipeline: everything lands on a
> **staging** environment first, and only a reviewed **Pull Request merge** promotes
> it to the live site. Last updated: 2026-07-16.

## TL;DR

```
feature / base44 work ──► push to  dev  ──► auto-deploy ──► https://dev.dreamhome.design   (review here)
                                                                    │
                                                         open PR:  dev → main
                                                                    │   review the live dev site
                                                                    ▼
                                                          click "Merge"   ← this IS the approval
                                                                    │
                                                         push to  main  ──► auto-deploy ──► https://dreamhome.design (LIVE)
```

- **Nothing reaches production except a merge into `main`.** Cloudflare deploys prod only
  from `main`, and a GitHub ruleset blocks direct pushes to `main` (see below).
- **`dev` is the staging branch.** Push to it freely; it redeploys `dev.dreamhome.design`.
- **The approval gate is the PR merge.** Reviewing the live dev site, then merging the
  `dev → main` PR, is the act of approving a release.

## Architecture — two Pages projects

Cloudflare Pages custom domains only ever serve a project's **production** deployment —
there is no per-branch custom domain. So staging is a **second Pages project** whose
production branch is `dev`:

| Pages project | Production branch | Custom domain(s) |
|---|---|---|
| `wl-dreamhome-site` | `main` | dreamhome.design, www, portal |
| `wl-dreamhome-site-dev` | `dev` | dev.dreamhome.design |

Both are git-connected to `Slate48/dreamhome.design` and share the one backend Worker
(`wl-dreamhome-api`), so `dev.dreamhome.design/api/*` hits the same D1/R2 as production
(the `*.dreamhome.design/api/*` Worker route already covers the dev host). The prod
project still builds `dev` as an anonymous *preview* too (`preview_deployment_setting:
all`) — harmless `*.pages.dev` noise; the named `dev.dreamhome.design` comes from the dev
project.

## Environments

| | Staging (`dev`) | Production (`main`) |
|---|---|---|
| Frontend | Pages project `wl-dreamhome-site-dev` (prod branch `dev`) | Pages project `wl-dreamhome-site` (prod branch `main`) |
| URL | https://dev.dreamhome.design | https://dreamhome.design (+ `www`, `portal`) |
| Backend (Worker/D1/R2) | **shared with production** — `wl-dreamhome-api` + `wl-dreamhome-db` + `wl-dreamhome-media` | same |
| Auth session | host-only cookie on `dev.dreamhome.design` (independent of prod — see below) | host-only cookie on the live hosts |

### Shared-backend consequences (accepted trade-off)

Staging and production talk to the **same** Worker, D1 database, and R2 bucket
(no isolated dev data was requested). Therefore:

- **Frontend/UI changes** are previewed faithfully on `dev.dreamhome.design` before release.
- **Backend code changes** (`workers/api/**`) are **not** previewed on dev — the dev
  frontend runs against the *current production* Worker. Backend changes deploy at merge
  to `main` (via the GitHub Action). Test Worker changes locally with `wrangler dev`
  before merging.
- **Admin CMS edits made on dev mutate real production content**, and uploads on dev go
  to the production R2 bucket. Use dev for reviewing *appearance/layout*, not for
  throwaway content edits. (If this becomes a problem, stand up an isolated dev
  Worker/D1/R2 — deferred; see "Future" below.)

### Session isolation

The session cookie is `HttpOnly; Secure; SameSite=Strict; Path=/` with **no `Domain`
attribute** (host-only — see [workers/api/src/lib/auth.js](../workers/api/src/lib/auth.js)).
A login on `dev.dreamhome.design` is therefore scoped to that host and does not
clobber a `dreamhome.design` / `portal.dreamhome.design` session (and vice-versa).
The Worker route `*.dreamhome.design/api/*` already covers `dev.dreamhome.design`, so
login/portal/admin work on dev with no backend change.

## The approval gate — two layers

1. **Deploy wiring (the real gate, active now):** Cloudflare Pages deploys **production
   only from `main`**. Nothing pushed to `dev` can reach `dreamhome.design`; only a merge
   into `main` does. This holds regardless of GitHub plan and is the mechanism that makes
   "review on dev, then approve to prod" work.
2. **Direct-push protection (ACTIVE):** a GitHub **ruleset** `protect-main` (id
   `19066025`, enforcement `active`) requires a pull request to merge into `main` and
   blocks direct pushes, branch deletion, and force-pushes. Required approvals: **0**
   (the owner self-merges; the merge is the approval). This became available once the repo
   was made public. To tighten (require a reviewer, once a second maintainer exists), bump
   `required_approving_review_count` to `1` via `gh api -X PUT repos/Slate48/dreamhome.design/rulesets/19066025`.

> **Confidentiality note:** the repo is currently **public**, which is what unlocked the
> ruleset. This exposes the white-label tenancy details in `CLAUDE.md`/`PROJECT.md` and
> the infra IDs — a deliberate trade accepted on 2026-07-16. Revisit if the client
> relationship needs to stay private (then: private repo + GitHub Pro/Team for the same
> ruleset).

## The Worker (backend) deploy

`wl-dreamhome-api` deploys via GitHub Actions **only on push to `main`** touching
`workers/api/**` (see [.github/workflows/deploy-worker.yml](../.github/workflows/deploy-worker.yml)).
Pushes to `dev` do **not** deploy the Worker — this is intentional and is why dev shares
the production backend. D1 schema/seed changes are still applied manually from a
workstation (never auto-migrated).

## base44 (design tool) — point it at `dev`, never `main`

base44's visual editor commits generated code to the connected GitHub repo. To keep it
away from production:

1. In base44's dashboard, set its GitHub connection's target branch to **`dev`** (or
   disconnect it from `main` entirely).
2. base44 changes then arrive on `dev` → preview on `dev.dreamhome.design`.
3. They only go live when someone opens and merges a `dev → main` PR — at which point
   any base44-reintroduced `@base44/sdk` / dead-backend calls must be stripped during
   review (the backend is 100% Cloudflare now; base44's SDK is a hard-cut dependency —
   see [../CLAUDE.md](../CLAUDE.md)).

## Setup status

Done (2026-07-16, via the fleet CF token + `gh`):
- ✅ `dev` branch created and pushed.
- ✅ GitHub ruleset `protect-main` active (PR required to merge `main`).
- ✅ Pages project `wl-dreamhome-site-dev` created (git-connected, prod branch `dev`,
  build env `VITE_BASE44_APP_ID` + `NODE_VERSION` set).
- ✅ Custom domain `dev.dreamhome.design` added to the dev project (cert provisions
  automatically; allow a few minutes for `active`).

Remaining:
1. **First dev build** — a git-connected project builds on the next push to its branch;
   the push that added this doc triggers it. Confirm a green deployment at
   `dev.dreamhome.design`.
2. **Repoint base44** to the `dev` branch (or disconnect from `main`) — base44 dashboard,
   only you can do this. This is what actually keeps base44 out of production.

## Future (deferred)

- **Isolated dev backend** — a `wl-dreamhome-api-dev` Worker env + separate D1/R2 so
  staging content edits never touch production. Only needed if dev is used for data
  changes, not just design review.
