export function buildEditPayload(row) {
  return {
    tgl_kapling: row.tgl_kapling || null,
    periode: row.periode,
    no_blok: row.no_blok,
    jenis: row.jenis,
    sortimen: row.sortimen,
    sort_untuk: row.sort_untuk || null,
    panjang: row.panjang,
    lebar: row.lebar || null,
    diameter_tebal: row.diameter_tebal,
    status: row.status,
    mutu: row.mutu,
    cacat: row.cacat,
    asal_kayu: row.asal_kayu || null,
    sertifikasi: row.sertifikasi,
    batang: Number(row.batang) || 0,
    volume: Number(row.volume) || 0,
    no_invois: row.no_invois || null,
    pembeli: row.pembeli || null,
    dkhp: row.dkhp || null,
    skshhk: row.skshhk || null,
  }
}

export function buildBatchEditPatch(data) {
  const patch = {}
  if (data.tgl_kapling) patch.tgl_kapling = data.tgl_kapling
  if (data.periode) patch.periode = data.periode
  if (data.no_blok) patch.no_blok = data.no_blok
  if (data.sertifikasi) patch.sertifikasi = data.sertifikasi
  return patch
}

export function getSelectedIdList(selectedIds) {
  return [...selectedIds]
}

export async function saveEditedRow({ row, supabase, tpkId }) {
  const payload = buildEditPayload(row)
  let error
  if (row._new) {
    payload.no_kapling = row.no_kapling.trim()
    payload.tpk_id = tpkId
    ;({ error } = await supabase.from('tabel_register_kapling').insert(payload))
  } else {
    ;({ error } = await supabase
      .from('tabel_register_kapling')
      .update(payload)
      .eq('tpk_id', tpkId)
      .eq('id', row.id)
    )
  }

  if (error) return actionError(error.message)
  return {
    closeEditor: true,
    message: row._new ? 'Kapling baru berhasil ditambahkan' : 'Data kapling berhasil diperbarui',
    refresh: true,
    type: 'success',
  }
}

export async function saveBatchDeleteRows({ selectedIds, supabase, tpkId }) {
  const ids = getSelectedIdList(selectedIds)
  const { error } = await supabase
    .from('tabel_register_kapling')
    .delete()
    .eq('tpk_id', tpkId)
    .in('id', ids)

  if (error) return actionError(error.message)
  return {
    closeEditor: true,
    message: `${ids.length} kapling berhasil dihapus`,
    refresh: true,
    type: 'success',
  }
}

export async function saveBatchEditRows({ data, selectedIds, supabase, tpkId }) {
  const patch = buildBatchEditPatch(data)
  if (Object.keys(patch).length === 0) {
    return {
      closeEditor: false,
      message: 'Isi minimal satu field untuk diupdate.',
      refresh: false,
      resetData: false,
      type: 'error',
    }
  }

  const ids = getSelectedIdList(selectedIds)
  const { error } = await supabase
    .from('tabel_register_kapling')
    .update(patch)
    .eq('tpk_id', tpkId)
    .in('id', ids)

  if (error) return { ...actionError(error.message), closeEditor: false, resetData: false }
  return {
    closeEditor: true,
    message: `${ids.length} kapling berhasil diupdate`,
    refresh: true,
    resetData: true,
    type: 'success',
  }
}

export async function saveDeletedRow({ row, supabase, tpkId }) {
  const { error } = await supabase
    .from('tabel_register_kapling')
    .delete()
    .eq('tpk_id', tpkId)
    .eq('id', row.id)

  if (error) return actionError(error.message)
  return {
    closeEditor: true,
    message: `Kapling ${row.no_kapling} berhasil dihapus`,
    refresh: true,
    type: 'success',
  }
}

function actionError(message) {
  return {
    closeEditor: false,
    message,
    refresh: false,
    type: 'error',
  }
}
