import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

test('RegisterKaplingSettingsModal owns Excel header mapping controls', () => {
  const source = readFileSync(new URL('../src/pages/RegisterKaplingSettingsModal.jsx', import.meta.url), 'utf8')

  assert.match(source, /export default function RegisterKaplingSettingsModal/)
  assert.match(source, /pengaturan header kolom/)
  assert.match(source, /header terdeteksi/)
  assert.match(source, /fieldDefs/)
  assert.match(source, /onChangeField/)
  assert.match(source, /onResetDefault/)
  assert.match(source, /onSave/)
})
