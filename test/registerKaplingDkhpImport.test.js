import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildDkhpImportSavePlan,
  prepareDkhpImportPreview,
  saveDkhpForRows,
  saveDkhpImportPreview,
  summarizeDkhpWorkbookRows,
} from '../src/pages/registerKaplingDkhpImport.js'

test('summarizeDkhpWorkbookRows extracts DKHP number, matched rows, conflicts, and AIII batang', () => {
  const rowsByKapling = new Map([
    ['2621302000001', { id: 1, no_kapling: '2621302000001', dkhp: '' }],
    ['2621302000002', { id: 2, no_kapling: '2621302000002', dkhp: '8' }],
  ])
  const rawRows = [
    [],
    [],
    [],
    [],
    [],
    [],
    ['DKHP 2631602.9'],
    [1, '2621302000001', 'A1', null, 'AIII', null, 300, 40, null, 0.25],
    [2, '2621302000002', 'A2', null, 'AIII', null, 310, 41, null, 0.27],
    [3, '2621302000999', 'A3', null, 'AIII', null, 320, 42, null, 0.29],
  ]

  const summary = summarizeDkhpWorkbookRows({ fileName: 'dkhp.xlsx', rawRows, rowsByKapling })

  assert.equal(summary.dkhpNo, '9')
  assert.equal(summary.fileName, 'dkhp.xlsx')
  assert.deepEqual(summary.matched.map(row => row.id), [1, 2])
  assert.deepEqual(summary.unmatched, ['2621302000999'])
  assert.deepEqual(summary.conflicts.map(row => row.id), [2])
  assert.equal(summary.aiiiBatang.length, 3)
  assert.deepEqual(summary.aiiiBatang[0], {
    no_kapling: '2621302000001',
    no_batang: 'A1',
    panjang: 300,
    diameter: 40,
    volume: 0.25,
  })
})

test('summarizeDkhpWorkbookRows returns readable errors for missing DKHP number or data rows', () => {
  assert.deepEqual(
    summarizeDkhpWorkbookRows({ fileName: 'bad.xlsx', rawRows: [], rowsByKapling: new Map() }),
    { error: { fileName: 'bad.xlsx', message: 'Nomor DKHP tidak ditemukan' } },
  )

  const rawRows = [[], [], [], [], [], [], ['DKHP 2631602.9']]
  assert.deepEqual(
    summarizeDkhpWorkbookRows({ fileName: 'empty.xlsx', rawRows, rowsByKapling: new Map() }),
    { error: { fileName: 'empty.xlsx', message: 'Tidak ada data kayu ditemukan' } },
  )
})

test('buildDkhpImportSavePlan skips conflicts and scopes AIII batang to updated kaplings', () => {
  const dkhp = {
    dkhpNo: '9',
    matched: [
      { id: 1, no_kapling: '2621302000001' },
      { id: 2, no_kapling: '2621302000002' },
    ],
    conflicts: [{ id: 2, no_kapling: '2621302000002' }],
    aiiiBatang: [
      { no_kapling: '2621302000001', no_batang: 'A1' },
      { no_kapling: '2621302000002', no_batang: 'A2' },
    ],
  }

  const plan = buildDkhpImportSavePlan({
    dkhp,
    skipConflicts: true,
    skshhkMap: { 9: 'SK-9' },
    tpkId: 'tpk-1',
  })

  assert.deepEqual(plan.targetIds, [1])
  assert.deepEqual(plan.patch, { dkhp: '9', skshhk: 'SK-9' })
  assert.deepEqual(plan.batangRows, [{ no_kapling: '2621302000001', no_batang: 'A1', tpk_id: 'tpk-1' }])
})

function createSupabaseMock({ skshhkRows = [], skshhkSingle = null, updateError = null } = {}) {
  const calls = []
  return {
    calls,
    from(table) {
      const query = {
        table,
        filters: [],
        select() {
          return this
        },
        update(payload) {
          this.action = 'update'
          this.payload = payload
          return this
        },
        upsert(payload, options) {
          calls.push({ table, action: 'upsert', payload, options })
          return Promise.resolve({ error: null })
        },
        eq(column, value) {
          this.filters.push({ column, value })
          return this
        },
        in(column, values) {
          if (this.action === 'update') {
            calls.push({ table, action: 'update', payload: this.payload, filters: [{ column, values }] })
            return Promise.resolve({ error: updateError })
          }
          return Promise.resolve({ data: skshhkRows, error: null })
        },
        maybeSingle() {
          return Promise.resolve({ data: skshhkSingle, error: null })
        },
      }
      return query
    },
  }
}

test('saveDkhpForRows updates non-conflicting rows with matching SKSHHK', async () => {
  const supabase = createSupabaseMock({ skshhkSingle: { no_skshhk: 'SK-9' } })
  const result = await saveDkhpForRows({
    dkhpInput: ' 9 ',
    conflicts: [{ id: 2 }],
    rows: [{ id: 1 }, { id: 2 }],
    skipConflicts: true,
    supabase,
    tpkId: 'tpk-1',
  })

  assert.deepEqual(supabase.calls[0], {
    table: 'tabel_register_kapling',
    action: 'update',
    payload: { dkhp: '9', skshhk: 'SK-9' },
    filters: [{ column: 'id', values: [1] }],
  })
  assert.deepEqual(result, {
    closeModal: true,
    message: 'DKHP 9 · SKSHHK SK-9 disimpan untuk 1 kapling',
    refresh: true,
    type: 'success',
  })
})

test('prepareDkhpImportPreview reads files into DKHP summaries and errors', async () => {
  const result = await prepareDkhpImportPreview({
    files: [{ name: 'ok.xlsx' }, { name: 'bad.xlsx' }],
    readWorkbookRows: async file => {
      if (file.name === 'bad.xlsx') throw new Error('broken')
      return [
        [], [], [], [], [], [], ['DKHP 2631602.9'],
        [1, '2621302000001', 'A1', null, 'AI', null, 300, 40, null, 0.25],
      ]
    },
    rows: [{ id: 1, no_kapling: '2621302000001', dkhp: '' }],
  })

  assert.equal(result.error, null)
  assert.equal(result.preview.dkhpList.length, 1)
  assert.deepEqual(result.preview.errors, [{ fileName: 'bad.xlsx', message: 'Gagal membaca Excel' }])
})

test('saveDkhpImportPreview saves register patches and AIII batang rows', async () => {
  const supabase = createSupabaseMock({ skshhkRows: [{ no_dkhp: '9', no_skshhk: 'SK-9' }] })
  const result = await saveDkhpImportPreview({
    preview: {
      dkhpList: [{
        dkhpNo: '9',
        matched: [{ id: 1, no_kapling: '2621302000001' }],
        conflicts: [],
        aiiiBatang: [{ no_kapling: '2621302000001', no_batang: 'A1' }],
      }],
    },
    skipConflicts: false,
    supabase,
    tpkId: 'tpk-1',
  })

  assert.equal(supabase.calls[0].action, 'update')
  assert.deepEqual(supabase.calls[0].payload, { dkhp: '9', skshhk: 'SK-9' })
  assert.equal(supabase.calls[1].action, 'upsert')
  assert.deepEqual(result, {
    closePreview: true,
    message: 'DKHP + SKSHHK tersimpan untuk 1 kapling · 1 batang AIII',
    refresh: true,
    type: 'success',
  })
})
