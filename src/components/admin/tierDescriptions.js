// Plain-language descriptions for the fixed 4-band staff hierarchy, keyed by tier id.
// DISPLAY-ONLY — these carry no authorization meaning (the Worker enforces every
// capability). Copy is verbatim from the approved design spec (2026-07-17). A tier
// with no entry renders its name and no description (graceful fallback, never an error).
export const TIER_DESCRIPTIONS = {
  tier_admin:
    'Full administrator — complete access to all content, site settings, and team management. The top level of your team; can add and edit anyone at or below, and remove or deactivate Level 2s and Members.',
  tier_manager:
    'Administrator — the same full access as Level 1 (all content, settings, and team), one step down in the hierarchy. Can manage Members and peers, but can\'t remove a Level 1.',
  tier_member:
    'Content editor — can create and edit site content (portfolio, team, FAQs, process, investment, testimonials, inquiries), but can\'t change site settings or manage the team.',
  tier_superadmin: 'Platform owner — unrestricted access.',
};

export function tierDescription(tierId) {
  return TIER_DESCRIPTIONS[tierId] || '';
}
