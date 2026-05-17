import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { PageLoader, TableSkeleton } from '../src/components/LoadingState.js'

test('PageLoader renders accessible scanline loading state', () => {
  const html = renderToStaticMarkup(PageLoader({ label: 'memuat halaman...' }))

  assert.match(html, /role="status"/)
  assert.match(html, /aria-live="polite"/)
  assert.match(html, /memuat halaman\.\.\./)
  assert.match(html, /deskra-scanline/)
})

test('TableSkeleton renders requested row placeholders', () => {
  const html = renderToStaticMarkup(TableSkeleton({ rows: 4, columns: 3, label: 'memuat data...' }))

  assert.match(html, /role="status"/)
  assert.match(html, /memuat data\.\.\./)
  assert.equal((html.match(/deskra-skeleton-row/g) || []).length, 4)
  assert.equal((html.match(/deskra-skeleton-cell/g) || []).length, 12)
})

test('TableSkeleton uses universal animated loading text by default', () => {
  const html = renderToStaticMarkup(TableSkeleton())

  assert.match(html, /menyiapkan data/)
  assert.match(html, /deskra-loading-text/)
  assert.equal((html.match(/class="deskra-loading-dot"/g) || []).length, 3)
})
