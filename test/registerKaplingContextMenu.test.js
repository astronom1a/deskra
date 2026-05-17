import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

test('RegisterKaplingContextMenu owns row and batch context actions', () => {
  const source = readFileSync(new URL('../src/pages/RegisterKaplingContextMenu.jsx', import.meta.url), 'utf8')

  assert.match(source, /export default function RegisterKaplingContextMenu/)
  assert.match(source, /onEdit/)
  assert.match(source, /onDelete/)
  assert.match(source, /onMouseDown/)
  assert.match(source, /kapling terpilih/)
  assert.match(source, /hapus/)
})
