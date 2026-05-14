import assert from 'node:assert/strict'
import { test } from 'node:test'

import { getEffectiveTpkId, getTpkName, getTpkNameUpper } from '../src/lib/effectiveTpk.js'

test('getEffectiveTpkId prefers admin active TPK over profile TPK', () => {
  assert.equal(getEffectiveTpkId({
    activeTpkId: 'admin-tpk',
    profile: { tpk_id: 'operator-tpk' },
  }), 'admin-tpk')
})

test('getEffectiveTpkId falls back to profile TPK and trims values', () => {
  assert.equal(getEffectiveTpkId({
    activeTpkId: '   ',
    profile: { tpk_id: ' operator-tpk ' },
  }), 'operator-tpk')
})

test('getTpkName reads joined TPK data from a period before using fallback', () => {
  const periode = { tabel_tpk: { namatpk: 'TPK Cluring' } }

  assert.equal(getTpkName(periode, 'TPK Wongsorejo'), 'TPK Cluring')
  assert.equal(getTpkNameUpper(periode, 'TPK Wongsorejo'), 'TPK CLURING')
})
