import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

test('RegisterKaplingEditModal owns add and edit form sections', () => {
  const source = readFileSync(new URL('../src/pages/RegisterKaplingEditModal.jsx', import.meta.url), 'utf8')

  assert.match(source, /export default function RegisterKaplingEditModal/)
  assert.match(source, /tambah kapling/)
  assert.match(source, /edit kapling/)
  assert.match(source, /Identitas/)
  assert.match(source, /Kualitas/)
  assert.match(source, /Dokumen/)
  assert.match(source, /onCancel/)
  assert.match(source, /onSave/)
  assert.match(source, /onChange/)
})
