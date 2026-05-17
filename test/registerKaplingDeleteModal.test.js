import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

test('RegisterKaplingDeleteModal owns single and batch delete confirmation UI', () => {
  const source = readFileSync(new URL('../src/pages/RegisterKaplingDeleteModal.jsx', import.meta.url), 'utf8')

  assert.match(source, /export default function RegisterKaplingDeleteModal/)
  assert.match(source, /mode/)
  assert.match(source, /hapus kapling/)
  assert.match(source, /hapus data terpilih/)
  assert.match(source, /onCancel/)
  assert.match(source, /onConfirm/)
})
