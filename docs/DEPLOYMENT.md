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

- **Nothing reaches production except a merge into `main`.** `main` is branch-protected
  (direct pushes blocked — see below).
- **`dev` is the staging branch.** Push to it freely; it redeploys `dev.dreamhome.design`.
- **The approval gate is the PR merge.** Reviewing the live dev site, then merging the
  `dev → main` PR, is the act of approving a release.

## Environments

| | Staging (`dev`) | Production (`main`) |
|---|---|---|
| Frontend | Cloudflare Pages preview of the `dev` branch | Cloudflare Pages production |
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

## Branch protection (the gate)

`main` is protected via GitHub branch protection:

- **Require a pull request before merging** (direct pushes to `main` are blocked).
- Required approving reviews: **0** — the repo owner merges their own PR; the merge is
  the approval. (Raise to 1 if a second reviewer is ever added.)
- `enforce_admins`: **off** — an admin can still push directly in a real emergency.
  Flip on for a hard gate.

To tighten later (require a review, enforce for admins):
```
gh api -X PUT repos/Slate48/dreamhome.design/branches/main/protection \
  -f 'required_pull_request_reviews[required_approving_review_count]=1' \
  -F enforce_admins=true -F required_status_checks=null -F restrictions=null
```

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

## One-time setup still required (Cloudflare dashboard / base44)

These need fleet-CF-account dashboard access or a token with `DNS:Edit` + `Pages:Edit`,
so they are **manual** (see the checklist handed off separately):

1. **Attach `dev.dreamhome.design` to the `dev` branch preview.** Add a proxied DNS
   `CNAME` in the `dreamhome.design` zone: `dev` → `dev.wl-dreamhome-site.pages.dev`
   (the Pages branch alias for `dev`).
2. **Set the Pages *preview* build env var** `VITE_BASE44_APP_ID=6a0c98b9972c40dc9ebe5d05`
   (Pages → Settings → Environment variables → *Preview*). The build fails without it
   until the base44 vite-plugin is removed (roadmap P1). Production already has it.
3. **Confirm the Pages production branch is `main`** and preview builds are enabled for
   `dev` (Pages → Settings → Builds & deployments).
4. **Repoint base44** to `dev` (above).

## Future (deferred)

- **Isolated dev backend** — a `wl-dreamhome-api-dev` Worker env + separate D1/R2 so
  staging content edits never touch production. Only needed if dev is used for data
  changes, not just design review.
