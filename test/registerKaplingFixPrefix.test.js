import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildFixPrefixMap,
  buildFixPrefixUpdate,
  saveFixPrefixUpdates,
} from '../src/pages/register-kapling/utils/registerKaplingFixPrefix.js'

const invoicePrefixMap = {
  ECR: {},
  ECK: {},
  EKK: {},
}

test('buildFixPrefixMap matches unprefixed register invoices against DK310 prefixes', () => {
  const rows = [
    { no_invois: '001' },
    { no_invois: '001' },
    { no_invois: 'ECR001' },
    { no_invois: '999' },
    { no_invois: '' },
  ]
  const penguranganInvoices = ['ECR001', 'EKK999']

  const result = buildFixPrefixMap({ invoicePrefixMap, penguranganInvoices, rows })

  assert.deepEqual(result, {
    '001': { noInvois: '001', count: 2, prefix: 'ECR' },
    '999': { noInvois: '999', count: 1, prefix: 'EKK' },
  })
})

test('buildFixPrefixMap ignores DK310 entries with unknown prefixes', () => {
  const result = buildFixPrefixMap({
    invoicePrefixMap,
    penguranganInvoices: ['ABC001'],
    rows: [{ no_invois: '001' }],
  })

  assert.deepEqual(result, {})
})

test('buildFixPrefixUpdate joins prefix and base invoice number', () => {
  assert.deepEqual(
    buildFixPrefixUpdate({ noInvois: '001', prefix: 'ECR' }),
    { oldValue: '001', newValue: 'ECR001' },
  )
})

function createSupabaseMock({ errors = [] } = {}) {
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
            return Promise.resolve({ error: errors.shift() || null })
          }
          return this
        },
      }
      return query
    },
  }
}

test('saveFixPrefixUpdates updates selected invoice prefixes and reports success count', async () => {
  const supabase = createSupabaseMock()
  const result = await saveFixPrefixUpdates({
    fixPrefixMap: {
      '001': { noInvois: '001', prefix: 'ECR' },
      '002': { noInvois: '002', prefix: '' },
    },
    supabase,
    tpkId: 'tpk-1',
  })

  assert.deepEqual(supabase.calls[0], {
    table: 'tabel_register_kapling',
    payload: { no_invois: 'ECR001' },
    filters: [
      { column: 'tpk_id', value: 'tpk-1' },
      { column: 'no_invois', value: '001' },
    ],
  })
  assert.deepEqual(result, {
    closeModal: true,
    message: '1 nomor invois berhasil diperbaiki',
    refresh: true,
    type: 'success',
  })
})

test('saveFixPrefixUpdates rejects empty prefix selection before querying', async () => {
  const supabase = createSupabaseMock()
  const result = await saveFixPrefixUpdates({
    fixPrefixMap: { '001': { noInvois: '001', prefix: '' } },
    supabase,
    tpkId: 'tpk-1',
  })

  assert.deepEqual(supabase.calls, [])
  assert.deepEqual(result, {
    closeModal: false,
    message: 'Pilih prefix untuk minimal satu nomor invois.',
    refresh: false,
    type: 'error',
  })
})
