import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

test('RegisterKaplingSortPanel owns sort modal controls', () => {
  const source = readFileSync(new URL('../src/pages/RegisterKaplingSortPanel.jsx', import.meta.url), 'utf8')

  assert.match(source, /export default function RegisterKaplingSortPanel/)
  assert.match(source, /belum ada aturan pengurutan/)
  assert.match(source, /tambah kolom urutan/)
  assert.match(source, /onAddSort/)
  assert.match(source, /onApply/)
  assert.match(source, /onReset/)
})
