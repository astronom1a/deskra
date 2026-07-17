import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

test('RegisterKaplingExcelImportPreview owns Excel import preview workflow UI', () => {
  const source = readFileSync(new URL('../src/pages/register-kapling/modals/RegisterKaplingExcelImportPreview.jsx', import.meta.url), 'utf8')

  assert.match(source, /export default function RegisterKaplingExcelImportPreview/)
  assert.match(source, /Tambah Baru/)
  assert.match(source, /Update Kosong/)
  assert.match(source, /kapling baru/)
  assert.match(source, /kolom yang akan diisi/)
  assert.match(source, /onModeChange/)
  assert.match(source, /onConfirm/)
})
