import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

test('RegisterKaplingBatchEditModal owns batch edit form controls', () => {
  const source = readFileSync(new URL('../src/pages/register-kapling/modals/RegisterKaplingBatchEditModal.jsx', import.meta.url), 'utf8')

  assert.match(source, /export default function RegisterKaplingBatchEditModal/)
  assert.match(source, /edit massal/)
  assert.match(source, /tgl_kapling/)
  assert.match(source, /sertifikasi/)
  assert.match(source, /onCancel/)
  assert.match(source, /onSubmit/)
  assert.match(source, /onChange/)
})
