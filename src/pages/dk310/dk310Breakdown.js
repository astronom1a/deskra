// Meringkas daftar surat bukti pengurangan per jenis kayu + rincian mutu (KB/TBN).
export function buildBreakdown(sbList) {
  const jenisMap = {}
  let totalBtg = 0, totalM3 = 0
  for (const sb of sbList) {
    const j = sb.jenis || 'Lainnya'
    if (!jenisMap[j]) jenisMap[j] = { btg: 0, m3: 0, mutu: {} }
    jenisMap[j].btg += sb.jumlah_total_btg || 0
    jenisMap[j].m3  += sb.jumlah_total_m3  || 0
    totalBtg += sb.jumlah_total_btg || 0
    totalM3  += sb.jumlah_total_m3  || 0
    for (const m of sb.tabel_dk310_surat_bukti_mutu || []) {
      if (!jenisMap[j].mutu[m.mutu_code]) {
        jenisMap[j].mutu[m.mutu_code] = { code: m.mutu_code, label: m.mutu_label, cat: m.kategori, btg: 0, m3: 0 }
      }
      jenisMap[j].mutu[m.mutu_code].btg += m.btg || 0
      jenisMap[j].mutu[m.mutu_code].m3  += m.m3  || 0
    }
  }
  return {
    totalBtg, totalM3,
    jenisList: Object.entries(jenisMap).map(([jenis, val]) => ({
      jenis, btg: val.btg, m3: val.m3, sortimen: Object.values(val.mutu),
    })),
  }
}
