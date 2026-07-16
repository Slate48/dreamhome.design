# Portal entry + session UX — design

> Status: approved (decisions confirmed 2026-07-16). Target branch: `staging` →
> promote to `main` (live) via PR. Touches the shared Worker (`wl-dreamhome-api`),
> which deploys on merge to `main`.

## Problem

1. On `portal.dreamhome.design`, the root `/` shows the **marketing homepage** for
   logged-in staff (manager/admin/super_admin). The root redirect only handled
   anonymous → `/login` and client → `/portal`; authenticated staff fell through to
   `<Home />`. Most people open `portal.dreamhome.design/`, not `/admin`.
2. No **idle auto-logout** — an unattended session on a shared machine stays open.
3. No **"Remember me"** — every visit requires a fresh login even on a personal device.

## Decisions (confirmed)

- **Root & `/login` forwarding:** logged-in users always go to their dashboard
  (client → `/portal`, staff → `/admin`); anonymous → `/login`. Nobody logged-in ever
  sees the marketing home or a login form on the portal host.
- **Session model = "Remember me is a trusted-device signal":**
  - **Unchecked** (shared/public computer): session cookie (dies on browser close) **+**
    30-minute idle auto-logout.
  - **Checked** (my device): persistent cookie ~30 days, **no** idle auto-logout.
- **Idle timeout:** 30 minutes of no activity.
- **Idle logout is silent:** no countdown/warning — sign out and send to `/login`.

## Architecture

Single React bundle; the portal host is detected client-side
(`window.location.hostname === 'portal.dreamhome.design'`). Auth is the cookie/JWT
Worker (`wl-dreamhome-api`), one shared backend for both environments.

### Frontend

- **`src/App.jsx`** — portal-host root `/`:
  - authenticated → `<Navigate to={role === 'client' ? '/portal' : '/admin'} replace />`
  - anonymous → `<Navigate to="/login" replace />`
  - (non-portal host unchanged: renders `<Home />`.)
  - Mount the idle-logout hook inside `AuthenticatedApp` (inside Router + AuthProvider).
- **`src/pages/Login.jsx`**:
  - If already authenticated, redirect to the role dashboard (so `/login` never shows a
    form to a logged-in user). Guard against rendering the form until auth is resolved.
  - Add a **"Remember me"** checkbox (default **unchecked** — safe on shared machines).
  - POST `{ email, password, remember }` to `/api/auth/login`.
  - Prefill the email field from `localStorage` (`dreamhome_last_email`), written on a
    successful login, so returning is easy. Never store the password.
- **`src/lib/AuthContext.jsx`**:
  - Store a `persistent` boolean from `/api/auth/me` (drives whether idle-logout runs).
  - `logout(redirectTo = '/')` gains an optional redirect target; idle-logout calls
    `logout('/login')`, the manual Sign Out keeps `/`.
- **`src/lib/useIdleLogout.js`** (new): when `isAuthenticated && !persistent`, arm a
  30-minute timer reset by user activity (`mousemove`, `keydown`, `click`, `scroll`,
  `touchstart`, `visibilitychange`). On expiry: `logout('/login')` (silent). Disabled
  (timer cleared) when persistent or logged out. Listeners are passive + throttled so
  activity tracking is cheap.

### Worker (`workers/api`)

- **`src/lib/auth.js`**:
  - `buildSessionCookie(token, { persistent })` — `persistent: true` adds
    `Max-Age=<30d>`; otherwise omit `Max-Age`/`Expires` → a **session cookie**.
    Keep `HttpOnly; Secure; SameSite=Strict; Path=/`, host-only (no `Domain=`).
  - `signJwt(payload, secret, expiresInSeconds)` — call with 30d when remembered,
    else the existing 1-day default.
  - JWT payload carries `rmb: <bool>`.
  - `getSession` returns the user plus `persistent` (from the verified JWT's `rmb`),
    without trusting it for authz (role is still re-read from D1).
- **`src/index.js`**:
  - `/api/auth/login`: read `body.remember` (boolean); sign JWT with `rmb` + the right
    expiry; set persistent vs session cookie accordingly.
  - `/api/auth/me`: include `persistent` in the response.

### Constants

- `IDLE_TIMEOUT_MS = 30 * 60 * 1000`
- `REMEMBER_MAX_AGE_S = 30 * 24 * 60 * 60` (2592000)
- Unchecked JWT expiry = 1 day (unchanged default); the session cookie + client idle
  timer are the real bounds.

## Behavior matrix

| Host | Path | Auth state | Result |
|---|---|---|---|
| portal | `/` | anonymous | → `/login` (form) |
| portal | `/` | client | → `/portal` |
| portal | `/` | staff | → `/admin` |
| any | `/login` | anonymous | login form |
| any | `/login` | authenticated | → role dashboard |
| main site | `/` | any | `<Home />` (unchanged) |

| Remember me | Cookie | Idle auto-logout |
|---|---|---|
| unchecked | session (dies on browser close) | yes, 30 min → `/login` |
| checked | persistent ~30 days | no |

## Testing

- **Worker (local):** `cd workers/api && node cf-wrangler.cjs dev`; assert login with
  `remember:true` returns `Set-Cookie` with `Max-Age=2592000`, `remember:false` returns
  no `Max-Age` (session cookie), and `/api/auth/me` returns `persistent` accordingly.
- **Frontend build:** `npm run build` clean (no base44, byte parity not required here).
- **Dev (`dev.dreamhome.design`, not hostname-gated):** `/login` forwards a logged-in
  user to their dashboard. Idle timer logic verified by code + a short manual check.
- **Live (after merge):** portal-host root forwarding + remember-me cookie lifetime
  verified on `portal.dreamhome.design` (hostname-gated; not previewable on dev). The
  Worker cookie change only takes effect live once merged to `main` (Worker deploy).

## Out of scope (future)

- Super-admin "add admins / add the client" + client "invite admins" (separate spec).
- Full portal data migration off base44 (Project/Document/Selection/Message/Invoice).
- Server-side session revocation list (idle logout is client-driven + cookie expiry).
