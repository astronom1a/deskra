import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/pages/RegisterKaplingTable.jsx', import.meta.url), 'utf8')

test('RegisterKaplingTable owns table rendering states and actions', () => {
  assert.match(source, /export default function RegisterKaplingTable/)
  assert.match(source, /<TableSkeleton rows=\{8\} columns=\{10\}/)
  assert.match(source, /belum ada data/)
  assert.match(source, /displayedRows\.map/)
  assert.match(source, /onToggleSort/)
  assert.match(source, /onOpenDkhpModal/)
  assert.match(source, /filteredVolume\.toFixed\(3\)/)
})
