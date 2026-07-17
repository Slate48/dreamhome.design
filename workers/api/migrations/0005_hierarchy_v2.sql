-- 0005_hierarchy_v2.sql — Admin Hierarchy v2 (fixed 4 bands).
-- Spec: docs/superpowers/specs/2026-07-17-admin-hierarchy-v2-design.md
--
-- Data-only: adds the Member tier and relabels/re-caps the two client-owned tiers.
-- Tier ids are UNCHANGED so existing users.tier_id references stay valid; no user
-- rows move. The super tier (tier_superadmin, rank 0, is_system=1) is untouched.
-- Idempotent: INSERT OR IGNORE + UPDATE ... WHERE id, safe to re-run.

-- New: Member tier (rank 3) — the 7 content capabilities only (no settings, no users).
INSERT OR IGNORE INTO admin_tiers (id, name, rank, capabilities, is_system, created_date, updated_date) VALUES
  ('tier_member', 'Member', 3,
   '["portfolio","team","faqs","process","investment","testimonials","inquiries"]', 0,
   '2026-07-17T00:00:00.000Z', '2026-07-17T00:00:00.000Z');

-- Level 1 (was "Admin", rank 1) — relabel only; capabilities are already all 9.
UPDATE admin_tiers
  SET name = 'Level 1', updated_date = '2026-07-17T00:00:00.000Z'
  WHERE id = 'tier_admin';

-- Level 2 (was "Manager", rank 2) — relabel AND widen to all 9 capabilities.
UPDATE admin_tiers
  SET name = 'Level 2',
      capabilities = '["portfolio","team","faqs","process","investment","testimonials","inquiries","settings","users"]',
      updated_date = '2026-07-17T00:00:00.000Z'
  WHERE id = 'tier_manager';
