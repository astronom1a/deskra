// Nama pembeli hasil import PDF bisa tercemar seluruh teks invois (Email,
// KTP, NPWP, Alamat, detail transaksi). Fungsi ini memotong pada penanda
// pertama sehingga hanya nama yang tersisa.
const MARKER_PATTERN = /\s+(?:EMAIL|TYPE\s+PEMBELI|NO\s+KTP|NPWP|ALAMAT|DETAIL\s+TRANSAKSI)\s*:[\s\S]*$/i

export function cleanPembeliName(raw) {
  if (!raw) return ''
  return String(raw).replace(MARKER_PATTERN, '').trim()
}
