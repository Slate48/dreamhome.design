// Real-D1 smoke test — applies migrations 0001..0005 to a fresh LOCAL SQLite (via
// wrangler --local through the fleet cf-wrangler wrapper) and runs the actual
// invite/deactivate/delete SQL. Catches schema/constraint drift the mock harness
// cannot (e.g. the NOT NULL password_hash bug that produced the invite-500).
//
// Run:  cd workers/api && node scripts/db-smoke.mjs
// Lives OUTSIDE test/ on purpose: `node --test test/` globs every *.{mjs,js} under a
// test/ directory (pattern **/test/**/*), so ANY name in test/ would join the default
// suite and drag wrangler + fleet OAuth into it. Keeping it in scripts/ makes it a
// standalone, run-on-demand check — the unit suite stays fast and wrangler-free.
// Requires local fleet OAuth (cf-wrangler resolves creds) but never touches --remote.

import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const API_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const DB = 'wl-dreamhome-db'
const STATE = mkdtempSync(join(tmpdir(), 'dreamhome-d1-smoke-'))
const MIGRATIONS = [
  '0001_public_content', '0002_users', '0003_admin_tiers',
  '0004_users_password_nullable', '0005_hierarchy_v2',
]

function wrangler(args) {
  const r = spawnSync('node', ['cf-wrangler.cjs', 'd1', 'execute', DB, '--local', '--persist-to', STATE, ...args],
    { cwd: API_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (r.status !== 0) {
    throw new Error(`wrangler d1 execute failed (exit ${r.status}):\n${r.stdout}\n${r.stderr}`)
  }
  return r.stdout
}

function query(sql) {
  const out = wrangler(['--command', sql])
  // wrangler prints a JSON array of result objects after its banner; grab it.
  const start = out.indexOf('[')
  const parsed = JSON.parse(out.slice(start))
  return parsed[0].results
}

function assert(cond, msg) { if (!cond) throw new Error(`ASSERT FAILED: ${msg}`) }

try {
  // 1. Apply every migration in order (each its own transaction).
  for (const m of MIGRATIONS) wrangler([`--file=migrations/${m}.sql`])

  // 2. The four fixed tiers exist with the expected ranks/names.
  const tiers = query('SELECT id, name, rank FROM admin_tiers ORDER BY rank;')
  assert(tiers.length === 4, `expected 4 tiers, got ${tiers.length}`)
  assert(tiers[0].id === 'tier_superadmin' && tiers[0].rank === 0, 'rank 0 super')
  assert(tiers[1].id === 'tier_admin' && tiers[1].name === 'Level 1', 'rank 1 Level 1')
  assert(tiers[2].id === 'tier_manager' && tiers[2].name === 'Level 2', 'rank 2 Level 2')
  assert(tiers[3].id === 'tier_member' && tiers[3].name === 'Member', 'rank 3 Member')

  // 3. THE REGRESSION GUARD: a pending invite inserts with password_hash = NULL.
  //    Pre-0004 this threw "NOT NULL constraint failed: users.password_hash".
  wrangler(['--command',
    "INSERT INTO users (id, email, password_hash, role, full_name, tier_id, is_active, invited_by, invite_token_hash, invite_expires, created_date, updated_date) " +
    "VALUES ('smoke_u', 'smoke@x.com', NULL, 'staff', 'Smoke', 'tier_manager', 0, 'smoke_inviter', 'deadbeef', '2099-01-01T00:00:00.000Z', '2026-07-17T00:00:00.000Z', '2026-07-17T00:00:00.000Z');"])
  const pending = query("SELECT id, is_active, (password_hash IS NULL) AS no_pw FROM users WHERE id = 'smoke_u';")
  assert(pending.length === 1 && pending[0].no_pw === 1 && pending[0].is_active === 0, 'pending invite row present with NULL password')

  // 4. Deactivate (is_active -> 0) then hard-delete succeed at the SQL level.
  wrangler(['--command', "UPDATE users SET is_active = 0 WHERE id = 'smoke_u';"])
  wrangler(['--command', "DELETE FROM users WHERE id = 'smoke_u';"])
  const gone = query("SELECT COUNT(*) AS n FROM users WHERE id = 'smoke_u';")
  assert(gone[0].n === 0, 'row deleted')

  console.log('SMOKE PASS — migrations 0001..0005 apply; NULL-password invite + deactivate + delete all succeed')
  process.exit(0)
} catch (e) {
  console.error('SMOKE FAIL —', e.message)
  process.exit(1)
} finally {
  rmSync(STATE, { recursive: true, force: true })
}
