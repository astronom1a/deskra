import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_COL_MAP, FIELD_DEFS } from '../src/pages/register-kapling/utils/registerKaplingConstants.js'
import {
  buildExcelImportInsertRows,
  buildExcelImportPreview,
  buildExcelImportUpdatePatch,
  prepareExcelImportPreview,
  saveExcelImportPreview,
} from '../src/pages/register-kapling/utils/registerKaplingExcelImport.js'

test('buildExcelImportPreview separates new rows, skipped rows, and empty-field updates', () => {
  const parsedRows = [
    { no_kapling: '001', jenis: 'JATI', dkhp: '9' },
    { no_kapling: '002', jenis: 'MAHONI', dkhp: '' },
    { no_kapling: '003', jenis: 'JATI', dkhp: '11' },
  ]
  const currentRows = [
    { no_kapling: '001', jenis: '', dkhp: null },
    { no_kapling: '002', jenis: 'MAHONI', dkhp: '10' },
  ]

  const preview = buildExcelImportPreview({
    currentRows,
    fieldDefs: FIELD_DEFS,
    fileName: 'register.xlsx',
    parsedRows,
  })

  assert.equal(preview.fileName, 'register.xlsx')
  assert.equal(preview.newCount, 1)
  assert.equal(preview.skipCount, 1)
  assert.equal(preview.updateRows.length, 1)
  assert.equal(preview.updateRows[0].row.no_kapling, '001')
  assert.deepEqual(preview.updateRows[0].fields.map(field => field.key), ['jenis', 'dkhp'])
})

test('buildExcelImportInsertRows deduplicates by kapling number and scopes rows to TPK', () => {
  const previewRows = [
    { no_kapling: '001', jenis: 'JATI' },
    { no_kapling: '002', jenis: 'MAHONI' },
    { no_kapling: '002', jenis: 'JATI' },
  ]

  const rows = buildExcelImportInsertRows({
    currentRows: [{ no_kapling: '001' }],
    fileName: 'register.xlsx',
    previewRows,
    tpkId: 'tpk-1',
  })

  assert.deepEqual(rows, [
    { no_kapling: '002', jenis: 'JATI', file_name: 'register.xlsx', tpk_id: 'tpk-1' },
  ])
})

test('buildExcelImportUpdatePatch maps candidate fields to Supabase patch payload', () => {
  const patch = buildExcelImportUpdatePatch([
    { key: 'jenis', newVal: 'JATI' },
    { key: 'dkhp', newVal: '9' },
  ])

  assert.deepEqual(patch, { jenis: 'JATI', dkhp: '9' })
})

test('prepareExcelImportPreview parses raw rows and returns preview plus detected headers', () => {
  const result = prepareExcelImportPreview({
    colMap: DEFAULT_COL_MAP,
    currentRows: [],
    fieldDefs: FIELD_DEFS,
    fileName: 'register.xlsx',
    rawRows: [
      ['No. Kapling', 'Jenis Kayu'],
      ['001', 'JATI'],
    ],
  })

  assert.equal(result.error, null)
  assert.deepEqual(result.headers, ['No. Kapling', 'Jenis Kayu'])
  assert.equal(result.preview.fileName, 'register.xlsx')
  assert.equal(result.preview.rows[0].no_kapling, '001')
  assert.equal(result.preview.rows[0].jenis, 'JATI')
})

test('prepareExcelImportPreview returns readable error when no row can be parsed', () => {
  const result = prepareExcelImportPreview({
    colMap: { no_kapling: 'No. Kapling' },
    currentRows: [],
    fieldDefs: FIELD_DEFS,
    fileName: 'empty.xlsx',
    rawRows: [['No. Kapling'], ['']],
  })

  assert.deepEqual(result, {
    error: 'Tidak ada data yang bisa dibaca. Cek pengaturan header kolom.',
    headers: ['No. Kapling'],
    preview: null,
  })
})

function createSupabaseMock({ insertError = null, updateErrors = [] } = {}) {
  const calls = []
  return {
    calls,
    from(table) {
      const query = {
        table,
        action: null,
        payload: null,
        filters: [],
        insert(payload) {
          calls.push({ table, action: 'insert', payload })
          return Promise.resolve({ error: insertError })
        },
        update(payload) {
          this.action = 'update'
          this.payload = payload
          return this
        },
        eq(column, value) {
          this.filters.push({ column, value })
          if (this.filters.length === 2) {
            const error = updateErrors.shift() || null
            calls.push({ table, action: this.action, payload: this.payload, filters: this.filters })
            return Promise.resolve({ error })
          }
          return this
        },
      }
      return query
    },
  }
}

test('saveExcelImportPreview inserts new rows and returns success result', async () => {
  const supabase = createSupabaseMock()
  const result = await saveExcelImportPreview({
    currentRows: [{ no_kapling: '001' }],
    preview: {
      fileName: 'register.xlsx',
      mode: 'insert',
      rows: [{ no_kapling: '001' }, { no_kapling: '002', jenis: 'JATI' }],
    },
    supabase,
    tpkId: 'tpk-1',
  })

  assert.deepEqual(supabase.calls[0], {
    table: 'tabel_register_kapling',
    action: 'insert',
    payload: [{ no_kapling: '002', jenis: 'JATI', file_name: 'register.xlsx', tpk_id: 'tpk-1' }],
  })
  assert.deepEqual(result, {
    closePreview: true,
    message: '1 kapling baru berhasil diimport',
    refresh: true,
    type: 'success',
  })
})

test('saveExcelImportPreview updates empty fields and reports partial failures', async () => {
  const supabase = createSupabaseMock({ updateErrors: [null, new Error('gagal')] })
  const result = await saveExcelImportPreview({
    currentRows: [],
    preview: {
      mode: 'update',
      updateRows: [
        { row: { no_kapling: '001' }, fields: [{ key: 'jenis', newVal: 'JATI' }] },
        { row: { no_kapling: '002' }, fields: [{ key: 'dkhp', newVal: '9' }] },
      ],
    },
    supabase,
    tpkId: 'tpk-1',
  })

  assert.deepEqual(supabase.calls.map(call => call.payload), [{ jenis: 'JATI' }, { dkhp: '9' }])
  assert.deepEqual(result, {
    closePreview: false,
    message: '1 berhasil, 1 gagal diupdate',
    refresh: false,
    type: 'error',
  })
})
