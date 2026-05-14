import assert from 'node:assert/strict'
import test from 'node:test'

import { buildKaplingTenantKey, buildInvoiceKaplingUpdates, requireTpkId } from '../src/lib/tenantScope.js'

test('buildKaplingTenantKey keeps equal kapling numbers separate by TPK', () => {
  assert.equal(buildKaplingTenantKey('tpk-a', '001'), 'tpk-a::001')
  assert.equal(buildKaplingTenantKey('tpk-b', '001'), 'tpk-b::001')
  assert.notEqual(buildKaplingTenantKey('tpk-a', '001'), buildKaplingTenantKey('tpk-b', '001'))
})

test('buildInvoiceKaplingUpdates returns scoped updates without unrelated row fields', () => {
  const updates = buildInvoiceKaplingUpdates({
    tpkId: 'tpk-a',
    invoices: [
      {
        noInvois: 'INV-01',
        pembeli: 'CV Kayu',
        matched: [
          { id: 'row-1', tpk_id: 'tpk-a', no_kapling: '001', volume: 1.25 },
          { id: 'row-2', tpk_id: 'tpk-a', no_kapling: '002', volume: 2.5 },
        ],
      },
    ],
  })

  assert.deepEqual(updates, [
    { id: 'row-1', tpk_id: 'tpk-a', no_kapling: '001', no_invois: 'INV-01', pembeli: 'CV Kayu' },
    { id: 'row-2', tpk_id: 'tpk-a', no_kapling: '002', no_invois: 'INV-01', pembeli: 'CV Kayu' },
  ])
})

test('buildInvoiceKaplingUpdates rejects rows outside the active TPK', () => {
  assert.throws(
    () => buildInvoiceKaplingUpdates({
      tpkId: 'tpk-a',
      invoices: [
        {
          noInvois: 'INV-01',
          pembeli: 'CV Kayu',
          matched: [{ id: 'row-1', tpk_id: 'tpk-b', no_kapling: '001' }],
        },
      ],
    }),
    /TPK aktif/
  )
})

test('requireTpkId returns a trimmed TPK id and rejects missing values', () => {
  assert.equal(requireTpkId(' tpk-a '), 'tpk-a')
  assert.throws(() => requireTpkId(''), /Profil TPK/)
  assert.throws(() => requireTpkId(null), /Profil TPK/)
})
