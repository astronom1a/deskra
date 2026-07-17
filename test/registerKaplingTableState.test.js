import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildRegisterKaplingTableState,
  getRegisterKaplingDisplayVal,
  searchRegisterKaplingRows,
  sortRegisterKaplingRows,
} from '../src/pages/register-kapling/utils/registerKaplingTable.js'

const rows = [
  { id: 'a', no_kapling: '003', mutu: 'AI', status: 'INDUSTRI', cacat: 'BUN', volume: 2, batang: 1, panjang: '300 - 300', diameter_tebal: '40 - 40', pembeli: 'Sari, Jalan Mawar' },
  { id: 'b', no_kapling: '001', mutu: 'AII', status: '', cacat: '', volume: 10, batang: 2, panjang: '200 - 250', diameter_tebal: '30 - 35', pembeli: 'Budi\nEmail budi@example.com' },
  { id: 'c', no_kapling: '002', mutu: 'KBP', status: 'INDUSTRI', cacat: 'DOR', volume: 1.5, batang: 1, panjang: '250 - 250', diameter_tebal: '35 - 35', pembeli: '' },
]

test('getRegisterKaplingDisplayVal mirrors table display formatting', () => {
  assert.equal(getRegisterKaplingDisplayVal(rows[0], 'mutu_label'), 'AI IN BC')
  assert.equal(getRegisterKaplingDisplayVal(rows[0], 'volume'), '2.000')
  assert.equal(getRegisterKaplingDisplayVal(rows[0], 'panjang'), '300')
  assert.equal(getRegisterKaplingDisplayVal(rows[1], 'panjang'), '200 - 250')
  assert.equal(getRegisterKaplingDisplayVal(rows[0], 'pembeli'), 'Sari')
})

test('sortRegisterKaplingRows sorts text and numeric columns', () => {
  assert.deepEqual(
    sortRegisterKaplingRows(rows, [{ key: 'no_kapling', dir: 'asc' }]).map(r => r.id),
    ['b', 'c', 'a']
  )
  assert.deepEqual(
    sortRegisterKaplingRows(rows, [{ key: 'volume', dir: 'desc' }]).map(r => r.id),
    ['b', 'a', 'c']
  )
})

test('searchRegisterKaplingRows searches all columns or one selected column', () => {
  assert.deepEqual(searchRegisterKaplingRows(rows, { searchTerm: 'sari', searchCol: 'all' }).map(r => r.id), ['a'])
  assert.deepEqual(searchRegisterKaplingRows(rows, { searchTerm: '2.000', searchCol: 'volume' }).map(r => r.id), ['a'])
  assert.deepEqual(searchRegisterKaplingRows(rows, { searchTerm: 'sari', searchCol: 'no_kapling' }).map(r => r.id), [])
})

test('buildRegisterKaplingTableState returns sorted, searched, paginated, and selection state', () => {
  const state = buildRegisterKaplingTableState({
    rows,
    sorts: [{ key: 'no_kapling', dir: 'asc' }],
    searchTerm: '',
    searchCol: 'all',
    pageSize: 2,
    currentPage: 2,
    selectedIds: new Set(['a']),
  })

  assert.equal(state.totalPages, 2)
  assert.equal(state.safePage, 2)
  assert.deepEqual(state.displayedRows.map(r => r.id), ['a'])
  assert.deepEqual(state.displayedIds, ['a'])
  assert.equal(state.allSelected, true)
  assert.equal(state.someSelected, true)
})
