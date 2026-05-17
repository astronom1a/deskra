import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildInvoiceImportPreview,
  prepareInvoiceImportPreview,
  saveInvoiceImportPreview,
  summarizeInvoiceParseResult,
} from '../src/pages/registerKaplingInvoiceImport.js'

test('summarizeInvoiceParseResult matches invoice kaplings against register rows', () => {
  const rowsByKapling = new Map([
    ['001', { id: 1, no_kapling: '001', jenis: 'JATI', sortimen: 'AI' }],
  ])

  const invoice = summarizeInvoiceParseResult({
    fileName: 'invoice.pdf',
    parseResult: { noInvois: 'ECR-001', pembeli: 'PT Kayu', kaplingList: ['001', '999'] },
    rowsByKapling,
  })

  assert.equal(invoice.noInvois, 'ECR-001')
  assert.equal(invoice.fileName, 'invoice.pdf')
  assert.equal(invoice.matched.length, 1)
  assert.deepEqual(invoice.unmatched, ['999'])
})

test('summarizeInvoiceParseResult reports missing invoice number as an error', () => {
  const result = summarizeInvoiceParseResult({
    fileName: 'broken.pdf',
    parseResult: { noInvois: null, pembeli: null, kaplingList: [] },
    rowsByKapling: new Map(),
  })

  assert.deepEqual(result, { error: { fileName: 'broken.pdf', message: 'Nomor invois tidak ditemukan.' } })
})

test('buildInvoiceImportPreview calculates totals and duplicate matched kaplings', () => {
  const invoices = [
    { noInvois: 'ECR-001', matched: [{ no_kapling: '001' }], unmatched: [], fileName: 'a.pdf' },
    { noInvois: 'ECR-002', matched: [{ no_kapling: '001' }, { no_kapling: '002' }], unmatched: ['999'], fileName: 'b.pdf' },
  ]

  const preview = buildInvoiceImportPreview({
    errors: [{ fileName: 'bad.pdf', message: 'gagal' }],
    fileCount: 3,
    invoices,
  })

  assert.deepEqual(preview.duplicateKaplings, ['001'])
  assert.equal(preview.totalMatched, 3)
  assert.equal(preview.totalUnmatched, 1)
  assert.equal(preview.fileCount, 3)
})

test('prepareInvoiceImportPreview parses files into preview and keeps per-file errors', async () => {
  const files = [{ name: 'a.pdf' }, { name: 'bad.pdf' }]
  const result = await prepareInvoiceImportPreview({
    files,
    parseInvoice: async file => {
      if (file.name === 'bad.pdf') throw new Error('rusak')
      return { noInvois: 'ECR-001', pembeli: 'PT Kayu', kaplingList: ['001', '999'] }
    },
    rows: [{ id: 1, no_kapling: '001' }],
  })

  assert.equal(result.error, null)
  assert.equal(result.preview.fileCount, 2)
  assert.equal(result.preview.invoices.length, 1)
  assert.deepEqual(result.preview.errors, [{ fileName: 'bad.pdf', message: 'rusak' }])
  assert.equal(result.preview.totalMatched, 1)
  assert.equal(result.preview.totalUnmatched, 1)
})

test('prepareInvoiceImportPreview returns readable error when all files fail', async () => {
  const result = await prepareInvoiceImportPreview({
    files: [{ name: 'bad.pdf' }],
    parseInvoice: async () => {
      throw new Error('rusak')
    },
    rows: [],
  })

  assert.deepEqual(result, {
    error: 'Tidak ada PDF invois yang bisa dibaca.',
    preview: null,
  })
})

function createSupabaseMock({ updateError = null } = {}) {
  const calls = []
  return {
    calls,
    from(table) {
      const query = {
        filters: [],
        update(payload) {
          this.payload = payload
          return this
        },
        eq(column, value) {
          this.filters.push({ column, value })
          if (this.filters.length === 2) {
            calls.push({ table, payload: this.payload, filters: this.filters })
            return Promise.resolve({ error: updateError })
          }
          return this
        },
      }
      return query
    },
  }
}

test('saveInvoiceImportPreview updates matched kaplings and returns success result', async () => {
  const supabase = createSupabaseMock()
  const result = await saveInvoiceImportPreview({
    preview: {
      invoices: [
        {
          noInvois: 'ECR-001',
          pembeli: 'PT Kayu',
          matched: [
            { id: 1, tpk_id: 'tpk-1', no_kapling: '001' },
            { id: 2, tpk_id: 'tpk-1', no_kapling: '002' },
          ],
        },
      ],
    },
    supabase,
    tpkId: 'tpk-1',
  })

  assert.deepEqual(supabase.calls.map(call => call.payload), [
    { no_invois: 'ECR-001', pembeli: 'PT Kayu' },
    { no_invois: 'ECR-001', pembeli: 'PT Kayu' },
  ])
  assert.deepEqual(result, {
    closePreview: true,
    message: '2 kapling diperbarui dari 1 invois',
    refresh: true,
    type: 'success',
  })
})

test('saveInvoiceImportPreview returns scoped validation errors', async () => {
  const result = await saveInvoiceImportPreview({
    preview: {
      invoices: [
        {
          noInvois: 'ECR-001',
          pembeli: 'PT Kayu',
          matched: [{ id: 1, tpk_id: 'tpk-lain', no_kapling: '001' }],
        },
      ],
    },
    supabase: createSupabaseMock(),
    tpkId: 'tpk-1',
  })

  assert.equal(result.closePreview, false)
  assert.equal(result.refresh, false)
  assert.equal(result.type, 'error')
  assert.match(result.message, /tidak sesuai dengan TPK aktif/)
})
