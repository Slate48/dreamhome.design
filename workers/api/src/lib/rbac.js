// Pure, dependency-free authorization rules for the staff role hierarchy.
// Kept side-effect-free so it is trivially unit-testable (see test/rbac.test.mjs).

// The 9 capability keys — 1:1 with the admin sidebar sections.
export const CAPABILITIES = [
  'portfolio', 'team', 'faqs', 'process', 'investment', 'testimonials', 'inquiries', 'settings', 'users',
]

// CMS entity (D1 table / API path) -> capability required to write it.
// ContactInquiry is gated by 'inquiries' on GET and has no generic CRUD, so it is not here.
export const ENTITY_CAPABILITY = {
  PortfolioItem: 'portfolio',
  TeamMember: 'team',
  FAQItem: 'faqs',
  ProcessStage: 'process',
  InvestmentTier: 'investment',
  Testimonial: 'testimonials',
  SiteSettings: 'settings',
}

// rank 0 (super admin) manages everyone; otherwise only strictly-lower ranks
// (higher rank number = lower privilege). Peers and superiors are off-limits.
export function canManage(actorRank, targetRank) {
  if (actorRank === 0) return true
  return Number.isInteger(targetRank) && targetRank > actorRank
}

// You may only grant capabilities you hold (super admin bypasses).
export function capsSubsetOf(requested, actorCaps, actorRank) {
  if (actorRank === 0) return true
  if (!Array.isArray(requested)) return false
  return requested.every((c) => actorCaps.includes(c))
}

// A tier's capability list must be an array of known, non-duplicate keys.
export function isValidCapabilitySet(caps) {
  if (!Array.isArray(caps)) return false
  const seen = new Set()
  for (const c of caps) {
    if (!CAPABILITIES.includes(c)) return false
    if (seen.has(c)) return false
    seen.add(c)
  }
  return true
}
