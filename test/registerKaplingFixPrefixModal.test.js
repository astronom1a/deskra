import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

test('RegisterKaplingFixPrefixModal owns invoice prefix repair UI', () => {
  const source = readFileSync(new URL('../src/pages/RegisterKaplingFixPrefixModal.jsx', import.meta.url), 'utf8')

  assert.match(source, /export default function RegisterKaplingFixPrefixModal/)
  assert.match(source, /perbaiki prefix invois/)
  assert.match(source, /DK310 Pengurangan/)
  assert.match(source, /No\. Invois/)
  assert.match(source, /onCancel/)
  assert.match(source, /onApply/)
})
