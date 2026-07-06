#!/usr/bin/env node
'use strict'
/**
 * cf-wrangler.js — run wrangler for wl-dreamhome-api / wl-dreamhome-db against the
 * 48Labs FLEET account, ALWAYS through the fleet credential isolation (cfDeployEnv).
 *
 * We must not bypass cfDeployEnv() (it blanks the ambient CF token + pins the
 * account). cf-provision.js only covers Pages create/deploy; D1 + Worker deploy need
 * raw wrangler, so this helper reuses the SAME resolver from global_files.
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
const { spawnSync } = require('child_process')

const GLOBAL = path.join(require('os').homedir(), 'Sites/global_files/scripts/cf-credentials.js')
const { resolveCfCreds, cfDeployEnv, loadProject } = require(GLOBAL)

const project = loadProject('dream-home-design')
if (!project) { console.error('project dream-home-design not in projects.json'); process.exit(1) }
const creds = resolveCfCreds(project)
if (!creds.ok) { console.error('cred resolve failed:', creds.error); process.exit(1) }
if (creds.source !== 'fleet') { console.error('expected fleet account, got', creds.source); process.exit(1) }

const env = cfDeployEnv(creds)
const args = process.argv.slice(2)
console.error(`[cf-wrangler] account=${creds.accountId} auth=${creds.deployAuth} :: npx wrangler ${args.join(' ')}`)
const r = spawnSync('npx', ['wrangler', ...args], { cwd: __dirname, env, stdio: 'inherit' })
process.exit(r.status == null ? 1 : r.status)
