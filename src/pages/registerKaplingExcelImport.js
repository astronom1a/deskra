import { parseRowsWithMap } from './registerKaplingUtils.js'

const EMPTY_EXCEL_IMPORT_MESSAGE = 'Tidak ada data yang bisa dibaca. Cek pengaturan header kolom.'

export function buildExcelImportPreview({
  currentRows,
  fieldDefs,
  fileName,
  parsedRows,
}) {
  const existingKeys = new Set(currentRows.map(row => row.no_kapling))
  const existingByKey = Object.fromEntries(currentRows.map(row => [row.no_kapling, row]))
  const newRows = parsedRows.filter(row => !existingKeys.has(row.no_kapling))
  const updateRows = []

  for (const excelRow of parsedRows) {
    if (!existingKeys.has(excelRow.no_kapling)) continue
    const dbRow = existingByKey[excelRow.no_kapling]
    const fields = []

    for (const field of fieldDefs) {
      if (field.key === 'no_kapling') continue
      const dbVal = dbRow[field.key]
      const excelVal = excelRow[field.key]
      const dbEmpty = dbVal === null || dbVal === undefined || dbVal === ''
      const hasVal = excelVal !== null && excelVal !== undefined && excelVal !== ''
      if (dbEmpty && hasVal) fields.push({ key: field.key, label: field.label, newVal: excelVal })
    }

    if (fields.length) updateRows.push({ row: excelRow, fields })
  }

  return {
    rows: parsedRows,
    fileName,
    newCount: newRows.length,
    skipCount: parsedRows.length - newRows.length - updateRows.length,
    updateRows,
    mode: 'insert',
  }
}

export function buildExcelImportInsertRows({
  currentRows,
  fileName,
  previewRows,
  tpkId,
}) {
  const existingKeys = new Set(currentRows.map(row => row.no_kapling))
  return Object.values(
    previewRows
      .filter(row => !existingKeys.has(row.no_kapling))
      .reduce((acc, row) => {
        acc[row.no_kapling] = { ...row, file_name: fileName, tpk_id: tpkId }
        return acc
      }, {})
  )
}

export function buildExcelImportUpdatePatch(fields) {
  return Object.fromEntries(fields.map(field => [field.key, field.newVal]))
}

export function prepareExcelImportPreview({
  colMap,
  currentRows,
  fieldDefs,
  fileName,
  rawRows,
}) {
  const { rows: parsedRows, headers } = parseRowsWithMap(rawRows, colMap)

  if (!parsedRows.length) {
    return {
      error: EMPTY_EXCEL_IMPORT_MESSAGE,
      headers,
      preview: null,
    }
  }

  return {
    error: null,
    headers,
    preview: buildExcelImportPreview({
      currentRows,
      fieldDefs,
      fileName,
      parsedRows,
    }),
  }
}

export async function saveExcelImportPreview({
  currentRows,
  preview,
  supabase,
  tpkId,
}) {
  if (preview.mode === 'insert') {
    const newRows = buildExcelImportInsertRows({
      currentRows,
      fileName: preview.fileName,
      previewRows: preview.rows,
      tpkId,
    })

    if (!newRows.length) {
      return {
        closePreview: true,
        message: 'Semua kapling sudah ada di database.',
        refresh: false,
        type: 'error',
      }
    }

    const { error } = await supabase.from('tabel_register_kapling').insert(newRows)
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
      message: `${newRows.length} kapling baru berhasil diimport`,
      refresh: true,
      type: 'success',
    }
  }

  let ok = 0
  let fail = 0
  for (const { row, fields } of preview.updateRows) {
    const patch = buildExcelImportUpdatePatch(fields)
    const { error } = await supabase
      .from('tabel_register_kapling')
      .update(patch)
      .eq('tpk_id', tpkId)
      .eq('no_kapling', row.no_kapling)
    error ? fail++ : ok++
  }

  if (fail) {
    return {
      closePreview: false,
      message: `${ok} berhasil, ${fail} gagal diupdate`,
      refresh: false,
      type: 'error',
    }
  }

  return {
    closePreview: true,
    message: `${ok} kapling berhasil diupdate`,
    refresh: true,
    type: 'success',
  }
}
