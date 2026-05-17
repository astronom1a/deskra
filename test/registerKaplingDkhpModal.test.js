import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

test('RegisterKaplingDkhpModal owns DKHP input and conflict confirmation UI', () => {
  const source = readFileSync(new URL('../src/pages/RegisterKaplingDkhpModal.jsx', import.meta.url), 'utf8')

  assert.match(source, /export default function RegisterKaplingDkhpModal/)
  assert.match(source, /Input DKHP/)
  assert.match(source, /No\. DKHP/)
  assert.match(source, /confirm-conflicts/)
  assert.match(source, /lewati yang konflik/)
  assert.match(source, /onCheck/)
  assert.match(source, /onSave/)
})
