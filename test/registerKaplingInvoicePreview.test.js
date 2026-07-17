import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

test('RegisterKaplingInvoicePreview owns invoice PDF preview workflow UI', () => {
  const source = readFileSync(new URL('../src/pages/register-kapling/modals/RegisterKaplingInvoicePreview.jsx', import.meta.url), 'utf8')

  assert.match(source, /export default function RegisterKaplingInvoicePreview/)
  assert.match(source, /invois siap diproses/)
  assert.match(source, /kapling ditemukan/)
  assert.match(source, /file yang dilewati/)
  assert.match(source, /duplicateKaplings/)
  assert.match(source, /onCancel/)
  assert.match(source, /onSave/)
})
