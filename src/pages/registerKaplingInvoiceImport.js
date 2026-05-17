import { buildInvoiceKaplingUpdates } from '../lib/tenantScope.js'

export function summarizeInvoiceParseResult({
  fileName,
  parseResult,
  rowsByKapling,
}) {
  const { noInvois, pembeli, kaplingList } = parseResult
  if (!noInvois) {
    return { error: { fileName, message: 'Nomor invois tidak ditemukan.' } }
  }

  return {
    noInvois,
    pembeli,
    matched: kaplingList.map(noKapling => rowsByKapling.get(noKapling)).filter(Boolean),
    unmatched: kaplingList.filter(noKapling => !rowsByKapling.has(noKapling)),
    fileName,
  }
}

export function buildInvoiceImportPreview({
  errors,
  fileCount,
  invoices,
}) {
  const seenKaplings = new Map()
  const duplicateKaplings = []

  for (const invoice of invoices) {
    for (const row of invoice.matched) {
      if (seenKaplings.has(row.no_kapling)) duplicateKaplings.push(row.no_kapling)
      seenKaplings.set(row.no_kapling, invoice.noInvois)
    }
  }

  return {
    invoices,
    errors,
    duplicateKaplings: [...new Set(duplicateKaplings)],
    fileCount,
    totalMatched: invoices.reduce((sum, invoice) => sum + invoice.matched.length, 0),
    totalUnmatched: invoices.reduce((sum, invoice) => sum + invoice.unmatched.length, 0),
  }
}

export async function prepareInvoiceImportPreview({
  files,
  parseInvoice,
  rows,
}) {
  const rowsByKapling = new Map(rows.map(row => [row.no_kapling, row]))
  const invoices = []
  const errors = []

  for (const file of files) {
    try {
      const result = summarizeInvoiceParseResult({
        fileName: file.name,
        parseResult: await parseInvoice(file),
        rowsByKapling,
      })
      if (result.error) {
        errors.push(result.error)
        continue
      }
      invoices.push(result)
    } catch (error) {
      errors.push({ fileName: file.name, message: error.message })
    }
  }

  if (!invoices.length) {
    return {
      error: errors.length ? 'Tidak ada PDF invois yang bisa dibaca.' : 'Tidak ada data invois ditemukan.',
      preview: null,
    }
  }

  return {
    error: null,
    preview: buildInvoiceImportPreview({
      invoices,
      errors,
      fileCount: files.length,
    }),
  }
}

export async function saveInvoiceImportPreview({
  preview,
  supabase,
  tpkId,
}) {
  let updates
  try {
    updates = buildInvoiceKaplingUpdates({ tpkId, invoices: preview.invoices })
  } catch (error) {
    return {
      closePreview: false,
      message: error.message,
      refresh: false,
      type: 'error',
    }
  }

  const results = await Promise.all(updates.map(update => supabase
    .from('tabel_register_kapling')
    .update({ no_invois: update.no_invois, pembeli: update.pembeli })
    .eq('tpk_id', tpkId)
    .eq('id', update.id)
  ))
  const error = results.find(result => result.error)?.error
  if (error) {
    return {
      closePreview: false,
      message: error.message,
      refresh: false,
      type: 'error',
    }
  }

  return {
    closePreview: true,
    message: `${updates.length} kapling diperbarui dari ${preview.invoices.length} invois`,
    refresh: true,
    type: 'success',
  }
}
