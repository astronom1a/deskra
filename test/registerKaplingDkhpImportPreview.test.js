import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

test('RegisterKaplingDkhpImportPreview owns DKHP import preview workflow UI', () => {
  const source = readFileSync(new URL('../src/pages/RegisterKaplingDkhpImportPreview.jsx', import.meta.url), 'utf8')

  assert.match(source, /export default function RegisterKaplingDkhpImportPreview/)
  assert.match(source, /Import DKHP/)
  assert.match(source, /konflik/)
  assert.match(source, /lewati konflik/)
  assert.match(source, /onCancel/)
  assert.match(source, /onSave/)
})
