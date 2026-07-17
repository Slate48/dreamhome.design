-- 0004_users_password_nullable.sql — allow NULL password_hash for pending invites.
--
-- 0002 declared `password_hash TEXT NOT NULL`, but the copy-link invite flow added
-- in 0003 creates a user row with NO password (password_hash = NULL); the invitee
-- sets their password later via POST /api/auth/invite/:token. Inserting NULL into a
-- NOT NULL column made POST /api/admin/users throw
--   NOT NULL constraint failed: users.password_hash
-- which surfaced to the admin UI as "Invite failed — Request failed (500)".
--
-- SQLite cannot drop a NOT NULL constraint via ALTER TABLE, so rebuild `users` with
-- password_hash nullable. No table FK-references users, so no PRAGMA foreign_keys
-- dance is needed. The rest of the code already treats NULL password_hash as the
-- "pending" state (has_password = password_hash IS NOT NULL) and login's
-- verifyPassword() safely rejects a NULL hash, so this is purely a constraint relax.

CREATE TABLE users_new (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,                       -- nullable: NULL = pending invite (no password yet)
  role TEXT NOT NULL DEFAULT 'client',
  full_name TEXT,
  created_date TEXT NOT NULL,
  updated_date TEXT NOT NULL,
  tier_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  invited_by TEXT,
  invite_token_hash TEXT,
  invite_expires TEXT
);

INSERT INTO users_new (id, email, password_hash, role, full_name, created_date, updated_date,
                       tier_id, is_active, invited_by, invite_token_hash, invite_expires)
  SELECT id, email, password_hash, role, full_name, created_date, updated_date,
         tier_id, is_active, invited_by, invite_token_hash, invite_expires
  FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_invite_token ON users(invite_token_hash);
