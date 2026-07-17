import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/pages/register-kapling/components/RegisterKaplingToolbar.jsx', import.meta.url), 'utf8')

test('RegisterKaplingToolbar owns table controls', () => {
  assert.match(source, /export default function RegisterKaplingToolbar/)
  assert.match(source, /menampilkan/)
  assert.match(source, /Semua Kolom/)
  assert.match(source, /onOpenSortPanel/)
  assert.match(source, /onBatchEdit/)
  assert.match(source, /pageSizes\.map/)
})
