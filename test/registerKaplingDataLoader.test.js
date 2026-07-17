import assert from 'node:assert/strict'
import test from 'node:test'
import {
  fetchPenguranganInvoices,
  fetchRegisterKaplingRows,
} from '../src/pages/register-kapling/utils/registerKaplingDataLoader.js'

function createSupabaseMock(handlers) {
  return {
    from(table) {
      const query = {
        _table: table,
        _filters: [],
        _order: null,
        _range: null,
        select(columns) {
          this._columns = columns
          return this
        },
        eq(column, value) {
          this._filters.push({ column, value })
          return this
        },
        in(column, values) {
          this._filters.push({ column, values })
          return handlers[table](this)
        },
        order(column, options) {
          this._order = { column, options }
          return this
        },
        range(from, to) {
          this._range = { from, to }
          return handlers[table](this)
        },
        then(resolve, reject) {
          return Promise.resolve(handlers[table](this)).then(resolve, reject)
        },
      }
      return query
    },
  }
}

test('fetchRegisterKaplingRows loads all pages ordered by kapling number', async () => {
  const ranges = []
  const supabase = createSupabaseMock({
    tabel_register_kapling(query) {
      ranges.push(query._range)
      assert.deepEqual(query._filters, [{ column: 'tpk_id', value: 'tpk-1' }])
      assert.equal(query._order.column, 'no_kapling')
      if (query._range.from === 0) return { data: [{ id: 1 }, { id: 2 }], error: null }
      return { data: [{ id: 3 }], error: null }
    },
  })

  const rows = await fetchRegisterKaplingRows({ pageSize: 2, supabase, tpkId: 'tpk-1' })

  assert.deepEqual(rows, [{ id: 1 }, { id: 2 }, { id: 3 }])
  assert.deepEqual(ranges, [{ from: 0, to: 1 }, { from: 2, to: 3 }])
})

test('fetchPenguranganInvoices returns filtered invoice numbers for pengurangan periods', async () => {
  const supabase = createSupabaseMock({
    tabel_dk310_periods() {
      return { data: [{ id: 'p1' }, { id: 'p2' }], error: null }
    },
    tabel_dk310_surat_bukti(query) {
      assert.deepEqual(query._filters, [{ column: 'period_id', values: ['p1', 'p2'] }])
      return { data: [{ nomor_surat: 'INV-1' }, { nomor_surat: '' }, { nomor_surat: 'INV-2' }], error: null }
    },
  })

  const invoices = await fetchPenguranganInvoices({ supabase, tpkId: 'tpk-1' })

  assert.deepEqual(invoices, ['INV-1', 'INV-2'])
})
