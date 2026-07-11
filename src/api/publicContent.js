/**
 * publicContent.js — data-access shim for the PUBLIC marketing site.
 *
 * Replaces `base44.entities.<E>` for the 7 public routes with our own Cloudflare
 * Worker (wl-dreamhome-api) over D1. Deliberately mirrors the subset of the base44
 * SDK the public pages use, so page code changes only its import + call target:
 *
 *   publicContent.<Entity>.list(sortField, limit)          -> GET /api/<Entity>?sort=..&limit=..
 *   publicContent.<Entity>.filter(where, sortField, limit) -> GET /api/<Entity>?<where>&sort=..&limit=..
 *   publicContent.ContactInquiry.create(obj)               -> POST /api/ContactInquiry
 *
 * Portal/admin routes now use src/api/adminEntities.js (staff-gated CRUD) and
 * src/lib/AuthContext.jsx (cookie session) instead of @base44/sdk — see those
 * files. This module still touches ONLY public content.
 */

// Worker base URL. A Worker Route now serves /api/* same-origin on
// dreamhome.design / www.dreamhome.design / portal.dreamhome.design, so the
// default is a relative path (same origin as wherever the SPA is served from —
// this also makes cookie-based admin/portal auth "just work", no CORS).
// Overridable at build time via VITE_API_BASE for local dev against the
// standalone workers.dev URL (see workers/api/wrangler.toml — workers_dev
// stays enabled for exactly this).
const API_BASE = (import.meta.env && import.meta.env.VITE_API_BASE) || ''

async function getList(entity, sort, limit, where) {
  const qs = new URLSearchParams()
  if (sort) qs.set('sort', sort)
  if (limit) qs.set('limit', String(limit))
  if (where && typeof where === 'object') {
    for (const [k, v] of Object.entries(where)) {
      if (v === undefined || v === null) continue
      qs.set(k, typeof v === 'boolean' ? String(v) : String(v))
    }
  }
  const url = `${API_BASE}/api/${entity}${qs.toString() ? `?${qs}` : ''}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${entity} fetch failed: ${res.status}`)
  return res.json()
}

function makeEntity(name) {
  return {
    // base44 signature: list(sortField, limit)
    list: (sort, limit) => getList(name, sort, limit, null),
    // base44 signature: filter(whereObj, sortField, limit)
    filter: (where, sort, limit) => getList(name, sort, limit, where),
  }
}

export const publicContent = {
  PortfolioItem: makeEntity('PortfolioItem'),
  TeamMember: makeEntity('TeamMember'),
  FAQItem: makeEntity('FAQItem'),
  ProcessStage: makeEntity('ProcessStage'),
  InvestmentTier: makeEntity('InvestmentTier'),
  Testimonial: makeEntity('Testimonial'),
  SiteSettings: makeEntity('SiteSettings'),
  ContactInquiry: {
    create: async (obj) => {
      const res = await fetch(`${API_BASE}/api/ContactInquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(obj),
      })
      if (!res.ok) throw new Error(`ContactInquiry create failed: ${res.status}`)
      return res.json()
    },
  },
}

export default publicContent
