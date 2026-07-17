-- 0003_admin_tiers.sql — staff RBAC: ranked tiers + per-tier capabilities and
-- tokenized copy-link invites.
-- Spec: docs/superpowers/specs/2026-07-16-admin-role-hierarchy-design.md

CREATE TABLE IF NOT EXISTS admin_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rank INTEGER NOT NULL UNIQUE,             -- 0 = super admin (reserved); lower = more power
  capabilities TEXT NOT NULL DEFAULT '[]',  -- JSON array of capability keys
  is_system INTEGER NOT NULL DEFAULT 0,     -- 1 = locked (super admin tier)
  created_date TEXT NOT NULL,
  updated_date TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_tiers_rank ON admin_tiers(rank);

-- users additions (SQLite ADD COLUMN allows a constant default on NOT NULL)
ALTER TABLE users ADD COLUMN tier_id TEXT;
ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN invited_by TEXT;
ALTER TABLE users ADD COLUMN invite_token_hash TEXT;
ALTER TABLE users ADD COLUMN invite_expires TEXT;
CREATE INDEX IF NOT EXISTS idx_users_invite_token ON users(invite_token_hash);

-- seed tiers
INSERT OR IGNORE INTO admin_tiers (id, name, rank, capabilities, is_system, created_date, updated_date) VALUES
  ('tier_superadmin', 'Super Admin', 0,
   '["portfolio","team","faqs","process","investment","testimonials","inquiries","settings","users"]', 1,
   '2026-07-16T00:00:00.000Z', '2026-07-16T00:00:00.000Z'),
  ('tier_admin', 'Admin', 1,
   '["portfolio","team","faqs","process","investment","testimonials","inquiries","settings","users"]', 0,
   '2026-07-16T00:00:00.000Z', '2026-07-16T00:00:00.000Z'),
  ('tier_manager', 'Manager', 2,
   '["portfolio","team","faqs","process","investment","testimonials","inquiries"]', 0,
   '2026-07-16T00:00:00.000Z', '2026-07-16T00:00:00.000Z');

-- backfill existing accounts onto tiers; narrow role to client|staff
UPDATE users SET tier_id = 'tier_superadmin', role = 'staff' WHERE role = 'super_admin';
UPDATE users SET tier_id = 'tier_admin',      role = 'staff' WHERE role = 'admin';
UPDATE users SET tier_id = 'tier_manager',    role = 'staff' WHERE role = 'manager';
-- clients: role stays 'client', tier_id stays NULL
