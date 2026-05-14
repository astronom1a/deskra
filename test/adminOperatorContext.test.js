import assert from 'node:assert/strict'
import test from 'node:test'

import { canUseOperatorRoutes, getAuthenticatedHomePath } from '../src/lib/adminOperatorContext.js'

test('canUseOperatorRoutes lets admins enter operator pages only with an active TPK', () => {
  assert.equal(canUseOperatorRoutes({ isAdmin: false, activeTpkId: null }), true)
  assert.equal(canUseOperatorRoutes({ isAdmin: true, activeTpkId: null }), false)
  assert.equal(canUseOperatorRoutes({ isAdmin: true, activeTpkId: ' tpk-a ' }), true)
})

test('getAuthenticatedHomePath keeps admins with active TPK in operator context', () => {
  assert.equal(getAuthenticatedHomePath({ isAdmin: true, activeTpkId: null }), '/admin')
  assert.equal(getAuthenticatedHomePath({ isAdmin: true, activeTpkId: 'tpk-a' }), '/dashboard')
  assert.equal(getAuthenticatedHomePath({ isAdmin: false, activeTpkId: null }), '/dashboard')
})
