#!/usr/bin/env node
'use strict'
/**
 * cf-wrangler.js — run wrangler for wl-dreamhome-api / wl-dreamhome-db against the
 * configured Cloudflare account without importing FleetManager/global_files.
 *
 * Project-local env is authoritative. The helper deliberately clears ambient
 * CF_API_TOKEN/global-key auth before invoking wrangler so a broad shell token does
 * not silently override the intended account.
 *
 *   node workers/api/cf-wrangler.js <...wrangler args>
 * e.g.
 *   node workers/api/cf-wrangler.js d1 create wl-dreamhome-db
 *   node workers/api/cf-wrangler.js d1 execute wl-dreamhome-db --remote --file=migrations/0001_public_content.sql
 *   node workers/api/cf-wrangler.js deploy
 *
 * Run from the worker dir (workers/api). The wrangler invoked is this dir's local
 * wrangler via npx.
 */
const path = require('path')
const fs = require('fs')
const { spawnSync } = require('child_process')

const ACCOUNT_ENV_NAMES = [
  'DREAMHOME_CF_ACCOUNT_ID',
  'WL_DREAMHOME_CF_ACCOUNT_ID',
  'CLOUDFLARE_ACCOUNT_ID',
  'CF_ACCOUNT_ID',
]
const TOKEN_ENV_NAMES = [
  'DREAMHOME_CF_API_TOKEN',
  'WL_DREAMHOME_CF_API_TOKEN',
  'CLOUDFLARE_API_TOKEN',
]

function parseEnvLine(line) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return null
  const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
  if (!match) return null
  let value = match[2].trim()
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1)
  }
  return [match[1], value]
}

function loadProjectEnv() {
  const roots = [
    path.resolve(__dirname, '../..'),
    __dirname,
  ]
  for (const root of roots) {
    for (const name of ['.env.local', '.env']) {
      const file = path.join(root, name)
      if (!fs.existsSync(file)) continue
      const raw = fs.readFileSync(file, 'utf8')
      for (const line of raw.split(/\r?\n/)) {
        const parsed = parseEnvLine(line)
        if (parsed && process.env[parsed[0]] == null) process.env[parsed[0]] = parsed[1]
      }
    }
  }
}

function firstEnv(names) {
  for (const name of names) {
    const value = process.env[name]
    if (value && value.trim()) return { name, value: value.trim() }
  }
  return null
}

function wranglerEnv({ accountId, token }) {
  const env = { ...process.env }
  env.CF_API_TOKEN = ''
  env.CLOUDFLARE_API_KEY = ''
  env.CLOUDFLARE_EMAIL = ''
  env.CF_API_KEY = ''
  env.CF_EMAIL = ''
  env.CLOUDFLARE_ACCOUNT_ID = accountId
  env.CF_ACCOUNT_ID = accountId
  env.CLOUDFLARE_API_TOKEN = token || ''
  return env
}

loadProjectEnv()

const account = firstEnv(ACCOUNT_ENV_NAMES)
if (!account) {
  console.error(`[cf-wrangler] missing account id; set one of: ${ACCOUNT_ENV_NAMES.join(', ')}`)
  process.exit(1)
}

const token = firstEnv(TOKEN_ENV_NAMES)
const env = wranglerEnv({ accountId: account.value, token: token && token.value })

const args = process.argv.slice(2)
console.error(`[cf-wrangler] account=${account.value} auth=${token ? `token:${token.name}` : 'oauth'} :: npx wrangler ${args.join(' ')}`)
const r = spawnSync('npx', ['wrangler', ...args], { cwd: __dirname, env, stdio: 'inherit' })
process.exit(r.status == null ? 1 : r.status)
