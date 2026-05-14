import assert from 'node:assert/strict'
import test from 'node:test'

import { getTpkScopedStorageKey } from '../src/lib/tpkScopedStorage.js'

test('getTpkScopedStorageKey isolates a base key by TPK id', () => {
  assert.equal(
    getTpkScopedStorageKey('deskra_kapling_col_map', ' tpk-a '),
    'deskra_kapling_col_map:tpk-a'
  )
  assert.equal(
    getTpkScopedStorageKey('deskra_kapling_col_map', 'tpk-b'),
    'deskra_kapling_col_map:tpk-b'
  )
})

test('getTpkScopedStorageKey keeps a global fallback when TPK id is missing', () => {
  assert.equal(getTpkScopedStorageKey('deskra_kapling_col_map', ''), 'deskra_kapling_col_map')
  assert.equal(getTpkScopedStorageKey('deskra_kapling_col_map', null), 'deskra_kapling_col_map')
})
