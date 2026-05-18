export function buildFixPrefixMap({
  invoicePrefixMap,
  penguranganInvoices,
  rows,
}) {
  const dk310BaseMap = {}

  for (const nomorSurat of penguranganInvoices) {
    const prefix = String(nomorSurat).slice(0, 3).toUpperCase()
    if (!invoicePrefixMap[prefix]) continue
    const base = String(nomorSurat).slice(3)
    if (base) dk310BaseMap[base] = prefix
  }

  const matched = {}
  for (const row of rows) {
    if (!row.no_invois) continue
    const key = row.no_invois.trim()
    const existingPrefix = key.slice(0, 3).toUpperCase()
    if (invoicePrefixMap[existingPrefix]) continue
    if (!dk310BaseMap[key]) continue
    if (!matched[key]) matched[key] = { noInvois: key, count: 0, prefix: dk310BaseMap[key] }
    matched[key].count++
  }

  return matched
}

export function buildFixPrefixUpdate({ noInvois, prefix }) {
  return {
    oldValue: noInvois,
    newValue: prefix + noInvois,
  }
}

export async function saveFixPrefixUpdates({ fixPrefixMap, supabase, tpkId }) {
  const entries = Object.values(fixPrefixMap).filter(entry => entry.prefix)
  if (!entries.length) {
    return {
      closeModal: false,
      message: 'Pilih prefix untuk minimal satu nomor invois.',
      refresh: false,
      type: 'error',
    }
  }

  let ok = 0
  let fail = 0
  for (const { noInvois, prefix } of entries) {
    const { oldValue, newValue } = buildFixPrefixUpdate({ noInvois, prefix })
    const { error } = await supabase
      .from('tabel_register_kapling')
      .update({ no_invois: newValue })
      .eq('tpk_id', tpkId)
      .eq('no_invois', oldValue)
    error ? fail++ : ok++
  }

  if (fail) {
    return {
      closeModal: true,
      message: `${ok} berhasil, ${fail} gagal diupdate`,
      refresh: true,
      type: 'error',
    }
  }

  return {
    closeModal: true,
    message: `${ok} nomor invois berhasil diperbaiki`,
    refresh: true,
    type: 'success',
  }
}
