-- 0002_users.sql — portal/admin auth users for wl-dreamhome-api.
-- Roles: client|manager|admin|super_admin (matches the frontend's
-- RoleGuard.jsx hierarchy: client-only "/portal", manager/admin/super_admin
-- "/admin", admin/super_admin-only "/admin/settings").

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client', full_name TEXT,
  created_date TEXT NOT NULL, updated_date TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
