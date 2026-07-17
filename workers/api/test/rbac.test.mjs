import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CAPABILITIES, ENTITY_CAPABILITY, canManage, canDelete, capsSubsetOf, isValidCapabilitySet,
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

test('canManage: own level or below (create/edit/reinvite)', () => {
  assert.equal(canManage(2, 3), true)  // below
  assert.equal(canManage(2, 2), true)  // peer — now allowed
  assert.equal(canManage(1, 1), true)  // peer at Level 1
  assert.equal(canManage(2, 1), false) // superior — never
  assert.equal(canManage(2, null), false)
  assert.equal(canManage(2, undefined), false)
  assert.equal(canManage(2, 1.5), false) // non-integer guard
})

test('canDelete: strictly below only (delete/deactivate)', () => {
  assert.equal(canDelete(0, 0), true)  // super bypasses everything
  assert.equal(canDelete(0, 2), true)
  assert.equal(canDelete(2, 3), true)  // below
  assert.equal(canDelete(2, 2), false) // peer — never delete a peer
  assert.equal(canDelete(1, 1), false) // peer at Level 1
  assert.equal(canDelete(2, 1), false) // superior
  assert.equal(canDelete(2, null), false)
  assert.equal(canDelete(2, 1.5), false) // non-integer guard
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
