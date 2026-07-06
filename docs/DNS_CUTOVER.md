# DNS cutover — dreamhome.design → Cloudflare (fleet account)

> Captured 2026-07-06 from the AUTHORITATIVE GoDaddy nameservers
> (`ns59/ns60.domaincontrol.com`). EMAIL PRESERVATION IS A HARD GATE — the MX + SPF
> + TXT records below MUST exist in the CF zone BEFORE the nameserver switch, or
> Google Workspace mail for `@dreamhome.design` breaks.

## STATUS: staging BLOCKED on a credential-scope gap (Levi action needed)
The fleet CF API token (`CF_API_TOKEN`, id `efcea2a4…`) is DNS-edit-scoped and
**lacks `Zone:Create`** on the fleet account; the wrangler OAuth token refreshes
in-memory per call and is not scriptable for raw CF-API calls. So the zone-add + DNS
staging + Pages custom-domain attach could NOT be completed by automation this pass.

**Two ways to unblock (either works):**
- **A — dashboard (fastest):** do the zone add + record mirror + Pages domain attach
  in the CF dashboard on the fleet account (steps below), OR
- **B — token:** create a fleet-account API token with `Zone:Create`, `DNS:Edit`,
  `Pages:Edit`, drop it in `global_files/.env`, and the staging can be scripted.

Everything needed is captured below so this is a mechanical step.

## Current authoritative GoDaddy records (source of truth to mirror)

### MX (Google Workspace) — MIRROR EXACTLY (DNS-only / grey-cloud)
| Priority | Host |
|---|---|
| 1  | aspmx.l.google.com |
| 5  | alt1.aspmx.l.google.com |
| 5  | alt2.aspmx.l.google.com |
| 10 | alt3.aspmx.l.google.com |
| 10 | alt4.aspmx.l.google.com |

### TXT @ apex — MIRROR ALL
- `v=spf1 include:dc-aa8e722993._spfm.dreamhome.design ~all`   (SPF)
- `google-site-verification=48r1rrJr4ulCmaYRu3779PiQS4bYLS5MkyWprgOO1xs`
- `ca3-a49e86b6646f4dc49850133c97cc485e`
- `v=verifydomain MS=4534506`
- `""`  (an empty TXT record also exists at apex — harmless; mirror or drop, no effect)

### TXT @ `dc-aa8e722993._spfm.dreamhome.design` — MIRROR (SPF include target)
- `v=spf1 include:_spf.google.com ~all`
> The apex SPF includes this helper subdomain, so it MUST be recreated or the SPF
> include won't resolve after the NS move. (Acceptable alternative: flatten the apex
> SPF to `v=spf1 include:_spf.google.com ~all` and drop the `_spfm` record — but then
> verify SPF still resolves to the Google include.)

### DKIM / DMARC
- `google._domainkey` — **NOT PRESENT** (checked). No DKIM selector published.
- `selector1/2._domainkey` — not present. `_dmarc` — not present. `CAA` — none.
- Note for Levi: DKIM is not currently enabled in Google Workspace for this domain.
  If it gets enabled later, add the selector CF-side too.

### Records to DROP (do NOT mirror — replaced by Pages)
- `A @ 160.153.0.194` (GoDaddy parking)
- `www CNAME → dreamhome.design` (GoDaddy parking)
These are superseded by the Pages custom-domain records for apex + `www`.

## CF-side staging steps (dashboard, fleet account — Levi Elizaga / 37172187…)
1. **Add site** → `dreamhome.design` → plan Free. Note the two assigned Cloudflare
   nameservers (`*.ns.cloudflare.com`).
2. CF auto-scans the existing GoDaddy records on add — **audit the imported set
   against the tables above** and ADD anything the scan missed (especially all 5 MX,
   both SPF TXTs, and the 3 verification TXTs). All MX/TXT stay **DNS-only (grey
   cloud)** — never proxy them.
3. **Delete** the imported apex `A 160.153.0.194` and `www` parking CNAME if present.
4. Pages → `wl-dreamhome-site` → Custom domains → add `dreamhome.design` AND
   `www.dreamhome.design` (CF stages the CNAME/apex records; they activate after NS
   propagation).

## GoDaddy step (LEVI does this manually, only after CF records verified in place)
GoDaddy → `dreamhome.design` → DNS → Nameservers → change from
`ns59/ns60.domaincontrol.com` to the two Cloudflare nameservers from step 1.
- **Blocker to clear first:** if GoDaddy has domain **Forwarding/Parking** enabled on
  the apex, remove it — it can otherwise re-inject a parking record / block apex.
- Propagation is minutes-to-hours. Mail keeps flowing throughout because the MX
  records already exist on both sides.

## Verify after cutover
- `dig MX dreamhome.design` and `dig TXT dreamhome.design` → match the tables above.
- Send a test email to `sales@dreamhome.design`; confirm delivery.
- `https://dreamhome.design` + `https://www.dreamhome.design` → the migrated site.
