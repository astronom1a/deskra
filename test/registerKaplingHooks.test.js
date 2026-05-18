import assert from 'node:assert/strict'
import test from 'node:test'
import {
  readStoredJson,
  writeStoredJson,
} from '../src/pages/useRegisterKaplingColumnSettings.js'
import {
  getNextRegisterKaplingSorts,
  getNextRegisterKaplingSelection,
} from '../src/pages/useRegisterKaplingTableControls.js'

function createStorage(initial = {}) {
  const store = { ...initial }
  return {
    getItem(key) {
      return Object.hasOwn(store, key) ? store[key] : null
    },
    setItem(key, value) {
      store[key] = value
    },
    store,
  }
}

test('readStoredJson returns parsed value or fallback when storage is empty or invalid', () => {
  assert.deepEqual(readStoredJson(createStorage({ a: '{"x":1}' }), 'a', {}), { x: 1 })
  assert.deepEqual(readStoredJson(createStorage({ a: '{bad' }), 'a', { ok: true }), { ok: true })
  assert.deepEqual(readStoredJson(createStorage(), 'missing', []), [])
})

test('writeStoredJson serializes values into storage', () => {
  const storage = createStorage()
  writeStoredJson(storage, 'a', { x: 1 })
  assert.equal(storage.store.a, '{"x":1}')
})

test('getNextRegisterKaplingSorts toggles first sort direction or starts ascending sort', () => {
  assert.deepEqual(getNextRegisterKaplingSorts([], 'no_kapling'), [{ key: 'no_kapling', dir: 'asc' }])
  assert.deepEqual(
    getNextRegisterKaplingSorts([{ key: 'no_kapling', dir: 'asc' }, { key: 'jenis', dir: 'desc' }], 'no_kapling'),
    [{ key: 'no_kapling', dir: 'desc' }, { key: 'jenis', dir: 'desc' }],
  )
})

test('getNextRegisterKaplingSelection toggles row and page selections', () => {
  assert.deepEqual([...getNextRegisterKaplingSelection({ selectedIds: new Set([1]), rowId: 1 })], [])
  assert.deepEqual([...getNextRegisterKaplingSelection({ selectedIds: new Set([1]), rowId: 2 })], [1, 2])
  assert.deepEqual([...getNextRegisterKaplingSelection({
    allSelected: false,
    displayedIds: [1, 2],
    selectedIds: new Set([3]),
  })], [3, 1, 2])
  assert.deepEqual([...getNextRegisterKaplingSelection({
    allSelected: true,
    displayedIds: [1, 2],
    selectedIds: new Set([1, 2, 3]),
  })], [3])
})
