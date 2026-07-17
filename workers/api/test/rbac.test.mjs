import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CAPABILITIES, ENTITY_CAPABILITY, canManage, capsSubsetOf, isValidCapabilitySet,
} from '../src/lib/rbac.js'

test('CAPABILITIES has the 9 canonical keys', () => {
  assert.deepEqual(CAPABILITIES, [
    'portfolio', 'team', 'faqs', 'process', 'investment', 'testimonials', 'inquiries', 'settings', 'users',
  ])
})

test('ENTITY_CAPABILITY maps every CMS entity', () => {
  assert.equal(ENTITY_CAPABILITY.PortfolioItem, 'portfolio')
  assert.equal(ENTITY_CAPABILITY.SiteSettings, 'settings')
  assert.equal(ENTITY_CAPABILITY.Testimonial, 'testimonials')
})

test('canManage: super (rank 0) manages anyone', () => {
  assert.equal(canManage(0, 5), true)
  assert.equal(canManage(0, 0), true)
})

test('canManage: only strictly-lower ranks', () => {
  assert.equal(canManage(2, 3), true)
  assert.equal(canManage(2, 2), false) // peer
  assert.equal(canManage(2, 1), false) // superior
  assert.equal(canManage(2, null), false)
})

test('capsSubsetOf: super bypasses', () => {
  assert.equal(capsSubsetOf(['settings'], [], 0), true)
})

test('capsSubsetOf: requested must be within actor caps', () => {
  assert.equal(capsSubsetOf(['portfolio'], ['portfolio', 'faqs'], 2), true)
  assert.equal(capsSubsetOf(['settings'], ['portfolio'], 2), false)
  assert.equal(capsSubsetOf('nope', ['portfolio'], 2), false)
})

test('isValidCapabilitySet: only known, unique keys', () => {
  assert.equal(isValidCapabilitySet(['portfolio', 'faqs']), true)
  assert.equal(isValidCapabilitySet([]), true)
  assert.equal(isValidCapabilitySet(['portfolio', 'portfolio']), false)
  assert.equal(isValidCapabilitySet(['bogus']), false)
  assert.equal(isValidCapabilitySet('portfolio'), false)
})
