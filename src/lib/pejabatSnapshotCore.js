function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function hasJabatan(pejabat, patterns) {
  const jabatan = normalizeText(pejabat?.jabatan)
  return patterns.some(pattern => jabatan.includes(pattern))
}

function serializePejabat(pejabat) {
  if (!pejabat) return null
  return {
    id: pejabat.id ?? null,
    nama: pejabat.nama ?? '',
    npk: pejabat.npk ?? '',
    jabatan: pejabat.jabatan ?? '',
    tpk_id: pejabat.tpk_id ?? null,
  }
}

function firstByJabatan(pejabatList, patterns, rejectPatterns = []) {
  return pejabatList.find(pejabat => (
    hasJabatan(pejabat, patterns) && !hasJabatan(pejabat, rejectPatterns)
  ))
}

export function selectPejabatRoles(pejabatList = []) {
  const list = Array.isArray(pejabatList) ? pejabatList : []
  const penggunaAnggaran = firstByJabatan(list, ['administratur utama'], ['wakil', 'waka'])
  const wakaAdministratur = firstByJabatan(list, ['wakil administratur', 'waka administratur'])
  const kepalaTpk = firstByJabatan(list, ['kepala tpk', 'bendahara pengeluaran'])
  const tuTpk = firstByJabatan(list, ['tu tpk', 'sp tpk'])

  return {
    pengguna_anggaran: serializePejabat(penggunaAnggaran),
    waka_administratur: serializePejabat(wakaAdministratur),
    wakil_adm: serializePejabat(wakaAdministratur),
    bendahara_umum: serializePejabat(firstByJabatan(list, ['bendahara umum'])),
    bendahara_pengeluaran: serializePejabat(kepalaTpk),
    kepala_tpk: serializePejabat(kepalaTpk),
    pelaksana: serializePejabat(firstByJabatan(list, ['pelaksana'])),
    tu_tpk: serializePejabat(tuTpk),
  }
}

export function createPejabatSnapshot(pejabatList = [], capturedAt = new Date().toISOString()) {
  return {
    version: 1,
    captured_at: capturedAt,
    roles: selectPejabatRoles(pejabatList),
  }
}

export function getPejabatRolesFromSnapshot(snapshot) {
  return snapshot?.roles || {}
}
