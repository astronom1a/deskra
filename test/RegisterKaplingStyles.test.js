import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/pages/register-kapling/components/RegisterKaplingStyles.jsx', import.meta.url), 'utf8')

test('RegisterKaplingStyles owns register kapling global class styles', () => {
  assert.match(source, /export default function RegisterKaplingStyles/)
  assert.match(source, /\.rk-input/)
  assert.match(source, /\.rk-cb:checked/)
  assert.match(source, /\.rk-cb:indeterminate/)
  assert.match(source, /\.rk-row:hover \.rk-actions/)
})
