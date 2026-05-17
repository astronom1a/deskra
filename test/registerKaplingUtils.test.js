import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_COL_MAP } from '../src/pages/registerKaplingConstants.js'
import {
  analyzeKapling,
  getMutuLabel,
  parseRowsWithMap,
  simplifyRange,
} from '../src/pages/registerKaplingUtils.js'

test('getMutuLabel combines mutu with status and defect suffixes', () => {
  assert.equal(getMutuLabel({ mutu: 'AI', status: 'INDUSTRI', cacat: 'BUN' }), 'AI IN BC')
  assert.equal(getMutuLabel({ mutu: 'KBP', status: 'INDUSTRI', cacat: 'BUN' }), 'KBP')
})

test('simplifyRange collapses equal ranges only', () => {
  assert.equal(simplifyRange('300 - 300'), '300')
  assert.equal(simplifyRange('300 - 320'), '300 - 320')
})

test('parseRowsWithMap maps Excel rows into register kapling records', () => {
  const rawRows = [
    ['ignored'],
    ['No. Kapling', 'Tgl Kapling', 'Jumlah', 'Volume', 'Panjang', 'Diameter/<br>Tebal'],
    [' 0001 ', '2026-05-17', 1, 1.25, '300 - 300', '40 - 40'],
  ]

  const { rows, headers } = parseRowsWithMap(rawRows, DEFAULT_COL_MAP)

  assert.deepEqual(headers, ['No. Kapling', 'Tgl Kapling', 'Jumlah', 'Volume', 'Panjang', 'Diameter/<br>Tebal'])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].no_kapling, '0001')
  assert.equal(rows[0].tgl_kapling, '2026-05-17')
  assert.equal(rows[0].batang, 1)
  assert.equal(rows[0].volume, 1.25)
  assert.equal(rows[0].panjang, '300')
  assert.equal(rows[0].diameter_tebal, '40')
})

test('analyzeKapling detects missing numeric sequence ranges', () => {
  const info = analyzeKapling([
    { no_kapling: '0001' },
    { no_kapling: '0003' },
    { no_kapling: '0004' },
  ])

  assert.equal(info.last, '0004')
  assert.deepEqual(info.missing, [{ from: '2', to: '2' }])
  assert.equal(info.shorten('0004'), '4')
})
