import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getEntity, dehydrate } from '../src/lib/entities.js'

// The admin Site Settings page uploads two logos: `logo_url` for light
// surfaces and `logo_url_on_dark` for the dark navbar/footer/portal sidebar.
// Both must be in the writable allowlist or dehydrate() silently drops them
// and the save appears to succeed while the value never reaches D1.
test('SiteSettings: both logo columns are writable', () => {
  const config = getEntity('SiteSettings')
  const out = dehydrate(config, {
    logo_url: 'https://cdn.example/logo.svg',
    logo_url_on_dark: 'https://cdn.example/logo-reversed.svg',
  })
  assert.equal(out.logo_url, 'https://cdn.example/logo.svg')
  assert.equal(out.logo_url_on_dark, 'https://cdn.example/logo-reversed.svg')
})

test('SiteSettings: columns outside the allowlist are dropped from writes', () => {
  const config = getEntity('SiteSettings')
  const out = dehydrate(config, { logo_url: 'https://cdn.example/logo.svg', id: 'spoofed', dropped_me: 1 })
  assert.deepEqual(Object.keys(out), ['logo_url'])
})
