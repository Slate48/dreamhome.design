# DNS cutover — dreamhome.design → Cloudflare (fleet account)

> Target = a CURATED CLEAN zone (Levi's full authoritative GoDaddy zone, minus stale
> cruft), NOT a 1:1 import. The domain was previously a Webflow site behind
> Cloudflare-for-SaaS; those records are stale and must NOT be carried over.
> EMAIL PRESERVATION IS A HARD GATE — the MX + SPF must exist in the CF zone BEFORE
> the nameserver switch or Google Workspace mail for `@dreamhome.design` breaks.

## STATUS: staging BLOCKED on a credential-scope gap (Levi action needed)
Re-verified 2026-07-06: the fleet CF API token (`CF_API_TOKEN`, id `efcea2a4…`) is
DNS-edit-scoped and **lacks `Zone:Create`** (POST /zones → 403
`com.cloudflare.api.account.zone.create`). The wrangler OAuth token refreshes
in-memory per call and its on-disk value is expired (verify → 401), so raw CF-API
calls can't be scripted with it. Zone-add + DNS build + Pages custom-domain attach
could NOT be completed by automation.

**Unblock either way:**
- **A — dashboard (fastest):** build the zone + records + Pages domains in the CF
  dashboard on the fleet account, using the CLEAN TARGET below verbatim.
- **B — token:** create a fleet-account API token with `Zone:Create` + `DNS:Edit` +
  `Pages:Edit`, put it in `global_files/.env`, and the build can be scripted from
  this exact set.

## CLEAN TARGET — the CF zone must contain EXACTLY these records (nothing else)

### MX @ apex — Google Workspace (DNS-only / grey cloud)
| Priority | Host |
|---|---|
| 1  | aspmx.l.google.com |
| 5  | alt1.aspmx.l.google.com |
| 5  | alt2.aspmx.l.google.com |
| 10 | alt3.aspmx.l.google.com |
| 10 | alt4.aspmx.l.google.com |

### TXT @ apex (3 records)
- **SPF — FLATTENED:** `v=spf1 include:_spf.google.com ~all`
  (Drop the GoDaddy `dc-aa8e722993._spfm` indirection; do NOT create that helper
  subdomain. Equivalence VERIFIED 2026-07-06: `_spf.google.com` resolves to
  `v=spf1 ip4:74.125.0.0/16 ip4:209.85.128.0/17 ip6:2001:4860:4864::/56 … ~all`
  — a single-lookup Google record, so the flattened SPF evaluates to the same Google
  mail sources.)
- `google-site-verification=48r1rrJr4ulCmaYRu3779PiQS4bYLS5MkyWprgOO1xs`
- `ca3-a49e86b6646f4dc49850133c97cc485e`  (unidentified verification; KEEP, low risk)

### CNAME — Google Workspace verification (DNS-only)
- `40418124`  → `google.com`
- `40418295`  → `google.com`
- `45808324`  → `google.com`

### apex + www — Cloudflare Pages custom domains (proxied / orange cloud)
- `dreamhome.design`      → Pages `wl-dreamhome-site`
- `www.dreamhome.design`  → Pages `wl-dreamhome-site`
(These replace the old parking `A` and `www→apex` CNAME. Added via Pages →
`wl-dreamhome-site` → Custom domains; CF creates the underlying records + issues the
cert. They activate once NS propagates.)

## DROP — do NOT create (dead once off GoDaddy NS)
GoDaddy operational cruft:
- `A @ 160.153.0.194` (GoDaddy parking)
- `CNAME www → dreamhome.design` (old parking)
- `CNAME pay → paylinks.commerce.godaddy.com`
- `CNAME _domainconnect → _domainconnect.gd.domaincontrol.com`
- empty `TXT @`
- `NS` / `SOA` (Cloudflare auto-manages)

Stale prior-hosting (Webflow + Cloudflare-for-SaaS) — must NOT carry over:
- `TXT _webflow` = `one-time-verification=5634dbd9-ceb6-420c-bc68-abb4d0ce88cd`
- `TXT _cf-custom-hostname.www` = `dbf711cf-b786-46c7-8c87-615bb031e896`
- `TXT _acme-challenge.www` = `7vF4LlRYdUlOIV7qbJV5_VZjcnauDfjVW7KmMlWYejk`
- `TXT @ v=verifydomain MS=4534506` (stale Microsoft 365 verify — Levi is on Google)

### DKIM / DMARC (not present — informational)
No `google._domainkey`, `selector1/2._domainkey`, `_dmarc`, or `CAA`. If Workspace
DKIM is enabled later, add the selector CNAME/TXT CF-side too.

## Build steps (dashboard, fleet account — Levi Elizaga / 37172187…)
1. **Add site** → `dreamhome.design` → plan Free. Note the two assigned Cloudflare
   nameservers (`*.ns.cloudflare.com`).
2. CF auto-scans GoDaddy on add — **reconcile the import to the CLEAN TARGET**: keep
   only the records above, DELETE everything on the DROP list. Add any CLEAN-TARGET
   record the scan missed. MX/TXT/verification CNAMEs stay **DNS-only (grey cloud)**;
   never proxy them.
3. Pages → `wl-dreamhome-site` → Custom domains → add `dreamhome.design` AND
   `www.dreamhome.design`.
4. Confirm the final zone == the CLEAN TARGET exactly (5 MX + flattened SPF +
   google-site-verification + ca3 + 3 google CNAMEs + apex/www Pages records) and
   nothing else.

## GoDaddy step (LEVI, manual — only AFTER the CF zone matches the CLEAN TARGET)
GoDaddy → `dreamhome.design` → DNS → Nameservers → change from
`ns59/ns60.domaincontrol.com` to the two Cloudflare nameservers from step 1.
- **Clear first:** remove any GoDaddy domain **Forwarding/Parking** on the apex (the
  current `A 160.153.0.194` + `www→apex` indicate parking) or it can re-inject a
  parking record / block apex activation.
- Propagation is minutes-to-hours; mail keeps flowing (MX exist on both sides).

## Verify after cutover
- `dig MX dreamhome.design` → the 5 Google MX. `dig TXT dreamhome.design` → flattened
  SPF + the 2 kept verifications, and NONE of the dropped stale TXTs.
- Send a test email to `sales@dreamhome.design`; confirm delivery.
- `https://dreamhome.design` + `https://www.dreamhome.design` → the migrated site.
