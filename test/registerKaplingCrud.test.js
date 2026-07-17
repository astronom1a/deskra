import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildBatchEditPatch,
  buildEditPayload,
  getSelectedIdList,
  saveBatchEditRows,
  saveBatchDeleteRows,
  saveDeletedRow,
  saveEditedRow,
} from '../src/pages/register-kapling/utils/registerKaplingCrud.js'

test('buildEditPayload normalizes nullable fields and numeric values', () => {
  const payload = buildEditPayload({
    tgl_kapling: '',
    periode: '0526',
    no_blok: 'A',
    jenis: 'JATI',
    sortimen: 'AI',
    sort_untuk: '',
    panjang: '300',
    lebar: '',
    diameter_tebal: '40',
    status: 'LOKAL',
    mutu: 'P',
    cacat: 'NRM',
    asal_kayu: '',
    sertifikasi: 'FSC',
    batang: '2',
    volume: '1.25',
    no_invois: '',
    pembeli: '',
    dkhp: '',
    skshhk: '',
  })

  assert.deepEqual(payload, {
    tgl_kapling: null,
    periode: '0526',
    no_blok: 'A',
    jenis: 'JATI',
    sortimen: 'AI',
    sort_untuk: null,
    panjang: '300',
    lebar: null,
    diameter_tebal: '40',
    status: 'LOKAL',
    mutu: 'P',
    cacat: 'NRM',
    asal_kayu: null,
    sertifikasi: 'FSC',
    batang: 2,
    volume: 1.25,
    no_invois: null,
    pembeli: null,
    dkhp: null,
    skshhk: null,
  })
})

test('buildBatchEditPatch includes only filled fields', () => {
  assert.deepEqual(
    buildBatchEditPatch({ tgl_kapling: '', periode: '0526', no_blok: '', sertifikasi: 'FSC' }),
    { periode: '0526', sertifikasi: 'FSC' },
  )
})

test('getSelectedIdList converts selection set to array', () => {
  assert.deepEqual(getSelectedIdList(new Set(['a', 'b'])), ['a', 'b'])
})

function createSupabaseMock({ error = null } = {}) {
  const calls = []
  return {
    calls,
    from(table) {
      const query = {
        filters: [],
        delete() {
          this.action = 'delete'
          return this
        },
        insert(payload) {
          calls.push({ table, action: 'insert', payload })
          return Promise.resolve({ error })
        },
        update(payload) {
          this.action = 'update'
          this.payload = payload
          return this
        },
        eq(column, value) {
          this.filters.push({ column, value })
          if (this.filters.length === 2 && this.action === 'update') {
            calls.push({ table, action: 'update', payload: this.payload, filters: this.filters })
            return Promise.resolve({ error })
          }
          if (this.filters.length === 2 && this.action === 'delete') {
            calls.push({ table, action: 'delete', filters: this.filters })
            return Promise.resolve({ error })
          }
          return this
        },
        in(column, values) {
          calls.push({ table, action: this.action, payload: this.payload, filters: [...this.filters, { column, values }] })
          return Promise.resolve({ error })
        },
      }
      return query
    },
  }
}

test('saveEditedRow inserts new kapling and returns close result', async () => {
  const supabase = createSupabaseMock()
  const result = await saveEditedRow({
    row: { _new: true, no_kapling: ' 001 ', batang: 1, volume: 2 },
    supabase,
    tpkId: 'tpk-1',
  })

  assert.equal(supabase.calls[0].action, 'insert')
  assert.equal(supabase.calls[0].payload.no_kapling, '001')
  assert.equal(supabase.calls[0].payload.tpk_id, 'tpk-1')
  assert.deepEqual(result, {
    closeEditor: true,
    message: 'Kapling baru berhasil ditambahkan',
    refresh: true,
    type: 'success',
  })
})

test('saveEditedRow updates existing kapling by scoped id', async () => {
  const supabase = createSupabaseMock()
  const result = await saveEditedRow({
    row: { id: 9, no_kapling: '001', batang: 1, volume: 2 },
    supabase,
    tpkId: 'tpk-1',
  })

  assert.deepEqual(supabase.calls[0].filters, [
    { column: 'tpk_id', value: 'tpk-1' },
    { column: 'id', value: 9 },
  ])
  assert.deepEqual(result, {
    closeEditor: true,
    message: 'Data kapling berhasil diperbarui',
    refresh: true,
    type: 'success',
  })
})

test('saveBatchDeleteRows deletes selected ids and returns close result', async () => {
  const supabase = createSupabaseMock()
  const result = await saveBatchDeleteRows({
    selectedIds: new Set([1, 2]),
    supabase,
    tpkId: 'tpk-1',
  })

  assert.deepEqual(supabase.calls[0].filters, [
    { column: 'tpk_id', value: 'tpk-1' },
    { column: 'id', values: [1, 2] },
  ])
  assert.equal(result.message, '2 kapling berhasil dihapus')
})

test('saveBatchEditRows rejects empty patch before querying', async () => {
  const supabase = createSupabaseMock()
  const result = await saveBatchEditRows({
    data: { tgl_kapling: '', periode: '', no_blok: '', sertifikasi: '' },
    selectedIds: new Set([1]),
    supabase,
    tpkId: 'tpk-1',
  })

  assert.deepEqual(supabase.calls, [])
  assert.deepEqual(result, {
    closeEditor: false,
    message: 'Isi minimal satu field untuk diupdate.',
    refresh: false,
    resetData: false,
    type: 'error',
  })
})

test('saveDeletedRow deletes one row and names the kapling', async () => {
  const supabase = createSupabaseMock()
  const result = await saveDeletedRow({
    row: { id: 5, no_kapling: '001' },
    supabase,
    tpkId: 'tpk-1',
  })

  assert.equal(supabase.calls[0].action, 'delete')
  assert.equal(result.message, 'Kapling 001 berhasil dihapus')
})
