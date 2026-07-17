import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildRegisterKaplingMetrics,
  countMissingKaplings,
} from '../src/pages/register-kapling/utils/registerKaplingMetrics.js'

test('buildRegisterKaplingMetrics calculates totals, unsold, sortimen, and blok breakdown', () => {
  const rows = [
    { no_invois: '', no_blok: 'A', sortimen: 'AI', batang: 2, volume: 1.5 },
    { no_invois: 'INV-1', no_blok: 'A', sortimen: 'AI', batang: 3, volume: 2 },
    { no_invois: 'INV-2', no_blok: 'B', sortimen: 'AII', batang: 1, volume: 0.5 },
  ]

  const metrics = buildRegisterKaplingMetrics({
    penguranganInvoices: ['INV-1', 'INV-3', 'INV-3'],
    rows,
    sortimens: ['AI', 'AII'],
  })

  assert.equal(metrics.totalBatang, 6)
  assert.equal(metrics.totalVolume, 4)
  assert.equal(metrics.unsoldBatang, 2)
  assert.equal(metrics.unsoldVolume, 1.5)
  assert.deepEqual(metrics.missingInvoices, ['INV-3'])
  assert.deepEqual(metrics.sortBatang, { AI: 5, AII: 1 })
  assert.deepEqual(metrics.unsoldSortBatang, { AI: 2, AII: 0 })
  assert.deepEqual(metrics.soldSortBatang, { AI: 3, AII: 1 })
  assert.deepEqual(metrics.sortVolume, { AI: 3.5, AII: 0.5 })
  assert.deepEqual(metrics.unsoldSortVolume, { AI: 1.5, AII: 0 })
  assert.deepEqual(metrics.soldSortVolume, { AI: 2, AII: 0.5 })
  assert.deepEqual(metrics.blokBreakdown, [
    ['A', { batang: 5, volume: 3.5 }],
    ['B', { batang: 1, volume: 0.5 }],
  ])
})

test('buildRegisterKaplingMetrics uses dash label for rows without blok', () => {
  const metrics = buildRegisterKaplingMetrics({
    penguranganInvoices: [],
    rows: [{ no_blok: '', sortimen: 'AI', batang: 1, volume: 1 }],
    sortimens: ['AI'],
  })

  assert.deepEqual(metrics.blokBreakdown, [['—', { batang: 1, volume: 1 }]])
})

test('missingInvoices memakai semua baris, bukan hanya baris tahun terpilih', () => {
  const allRows = [
    { no_invois: '44312607121436', sortimen: 'AI', batang: 1, volume: 1 }, // kapling tahun lain
  ]
  const metrics = buildRegisterKaplingMetrics({
    allRows,
    penguranganInvoices: ['44312607121436'],
    rows: [], // year filter aktif, tidak ada baris di tahun itu
    selectedYear: 2025,
    sortimens: ['AI'],
  })

  // sudah terinput di kapling tahun lain → bukan invois terlewat
  assert.deepEqual(metrics.missingInvoices, [])
})

test('missingInvoices memfilter sisi DK310 berdasar tahun di nomor invois', () => {
  const metrics = buildRegisterKaplingMetrics({
    allRows: [],
    penguranganInvoices: ['44312607121436', '44312507121436', 'INV-NONPATTERN'],
    rows: [],
    selectedYear: 2025,
    sortimens: ['AI'],
  })

  // invois 2026 tersaring keluar; invois 2025 dan nomor non-pattern tetap tampil
  assert.deepEqual(metrics.missingInvoices, ['44312507121436', 'INV-NONPATTERN'])
})

test('countMissingKaplings sums missing kapling ranges', () => {
  assert.equal(countMissingKaplings(null), 0)
  assert.equal(countMissingKaplings({ missing: [{ from: '2', to: '2' }, { from: '5', to: '7' }] }), 4)
})
