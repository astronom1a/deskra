export function summarizeDkhpWorkbookRows({
  fileName,
  rawRows,
  rowsByKapling,
}) {
  const dkhpCell = String(rawRows[6]?.[0] ?? '')
  const dkhpMatch = dkhpCell.match(/2631602[.\s]*(\d+)/)
  if (!dkhpMatch) {
    return { error: { fileName, message: 'Nomor DKHP tidak ditemukan' } }
  }

  const dkhpNo = String(parseInt(dkhpMatch[1], 10))
  const dataRows = rawRows.filter(row => Number.isFinite(row?.[0]) && /^2621302\d{6}$/.test(String(row?.[1] ?? '').trim()))
  if (!dataRows.length) {
    return { error: { fileName, message: 'Tidak ada data kayu ditemukan' } }
  }

  const sorts = new Set(dataRows.map(row => String(row[4] ?? '').trim().toUpperCase()))
  const isAIII = sorts.has('AIII')
  const kaplingNums = [...new Set(dataRows.map(row => String(row[1] ?? '').trim()).filter(Boolean))]
  const matched = kaplingNums.map(noKapling => rowsByKapling.get(noKapling)).filter(Boolean)
  const unmatched = kaplingNums.filter(noKapling => !rowsByKapling.has(noKapling))
  const conflicts = matched.filter(row => row.dkhp && String(row.dkhp) !== dkhpNo)
  const aiiiBatang = []

  if (isAIII) {
    for (const row of dataRows) {
      const noKapling = String(row[1] ?? '').trim()
      const noBatang = String(row[2] ?? '').trim()
      const panjang = parseFloat(row[6])
      const diameter = parseInt(row[7], 10)
      const volume = parseFloat(row[9])
      if (!noKapling || !noBatang) continue
      aiiiBatang.push({ no_kapling: noKapling, no_batang: noBatang, panjang, diameter, volume })
    }
  }

  return { dkhpNo, matched, unmatched, conflicts, aiiiBatang, fileName }
}

export function buildDkhpImportSavePlan({
  dkhp,
  skipConflicts,
  skshhkMap,
  tpkId,
}) {
  const conflictIds = new Set(dkhp.conflicts.map(row => row.id))
  const targets = skipConflicts ? dkhp.matched.filter(row => !conflictIds.has(row.id)) : dkhp.matched
  const patch = { dkhp: dkhp.dkhpNo, ...(skshhkMap[dkhp.dkhpNo] ? { skshhk: skshhkMap[dkhp.dkhpNo] } : {}) }
  const validKaplings = new Set(targets.map(row => row.no_kapling))
  const batangRows = (dkhp.aiiiBatang || [])
    .filter(batang => validKaplings.has(batang.no_kapling))
    .map(batang => ({ ...batang, tpk_id: tpkId }))

  return {
    batangRows,
    patch,
    targetIds: targets.map(row => row.id),
  }
}

export async function saveDkhpForRows({
  dkhpInput,
  conflicts,
  rows,
  skipConflicts,
  supabase,
  tpkId,
}) {
  const dkhpNo = dkhpInput.trim()
  const conflictIds = new Set(conflicts.map(row => row.id))
  const targets = skipConflicts ? rows.filter(row => !conflictIds.has(row.id)) : rows
  if (!targets.length) {
    return {
      closeModal: true,
      message: null,
      refresh: false,
      type: 'success',
    }
  }

  const { data: dkhpRecord } = await supabase
    .from('tabel_dkhp_skshhk')
    .select('no_skshhk')
    .eq('tpk_id', tpkId)
    .eq('no_dkhp', dkhpNo)
    .maybeSingle()

  const patch = { dkhp: dkhpNo, ...(dkhpRecord?.no_skshhk ? { skshhk: dkhpRecord.no_skshhk } : {}) }
  const { error } = await supabase
    .from('tabel_register_kapling')
    .update(patch)
    .in('id', targets.map(row => row.id))

  if (error) {
    return {
      closeModal: false,
      message: 'Gagal menyimpan DKHP',
      refresh: false,
      type: 'error',
    }
  }

  return {
    closeModal: true,
    message: `DKHP ${dkhpNo}${dkhpRecord?.no_skshhk ? ` · SKSHHK ${dkhpRecord.no_skshhk}` : ''} disimpan untuk ${targets.length} kapling`,
    refresh: true,
    type: 'success',
  }
}

export async function prepareDkhpImportPreview({
  files,
  readWorkbookRows,
  rows,
}) {
  const rowsByKapling = new Map(rows.map(row => [row.no_kapling, row]))
  const dkhpList = []
  const errors = []

  for (const file of files) {
    try {
      const result = summarizeDkhpWorkbookRows({
        fileName: file.name,
        rawRows: await readWorkbookRows(file),
        rowsByKapling,
      })
      if (result.error) {
        errors.push(result.error)
        continue
      }
      dkhpList.push(result)
    } catch {
      errors.push({ fileName: file.name, message: 'Gagal membaca Excel' })
    }
  }

  if (!dkhpList.length) {
    return {
      error: 'Tidak ada file Excel DKHP yang bisa dibaca',
      preview: null,
    }
  }

  return {
    error: null,
    preview: { dkhpList, errors },
  }
}

export async function saveDkhpImportPreview({
  preview,
  skipConflicts,
  supabase,
  tpkId,
}) {
  const uniqueDkhpNos = [...new Set(preview.dkhpList.map(dkhp => dkhp.dkhpNo))]
  const { data: skshhkRows } = await supabase
    .from('tabel_dkhp_skshhk')
    .select('no_dkhp, no_skshhk')
    .eq('tpk_id', tpkId)
    .in('no_dkhp', uniqueDkhpNos)
  const skshhkMap = Object.fromEntries((skshhkRows || []).map(row => [row.no_dkhp, row.no_skshhk]))

  let totalUpdated = 0
  let totalBatang = 0
  for (const dkhp of preview.dkhpList) {
    const plan = buildDkhpImportSavePlan({ dkhp, skipConflicts, skshhkMap, tpkId })
    if (plan.targetIds.length) {
      await supabase.from('tabel_register_kapling').update(plan.patch).in('id', plan.targetIds)
      totalUpdated += plan.targetIds.length
    }
    if (plan.batangRows.length) {
      await supabase.from('tabel_batang_aiii').upsert(plan.batangRows, {
        onConflict: 'no_kapling,no_batang',
        ignoreDuplicates: true,
      })
      totalBatang += plan.batangRows.length
    }
  }

  return {
    closePreview: true,
    message: `DKHP + SKSHHK tersimpan untuk ${totalUpdated} kapling${totalBatang ? ` · ${totalBatang} batang AIII` : ''}`,
    refresh: true,
    type: 'success',
  }
}
