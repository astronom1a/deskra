import * as XLSX from 'xlsx'

export function exportRegisterKaplingToExcel({ rows, tpkName }) {
  const today = new Date().toISOString().slice(0, 10)
  const safeName = (tpkName || 'tpk').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const fileName = `register-kapling-${safeName}-${today}.xlsx`

  const data = rows.map((r, i) => ({
    'No': i + 1,
    'No. Kapling': r.no_kapling || '',
    'Tgl. Kapling': r.tgl_kapling || '',
    'Periode': r.periode || '',
    'No. Blok': r.no_blok || '',
    'Jenis': r.jenis || '',
    'Sortimen': r.sortimen || '',
    'Sort. Untuk': r.sort_untuk || '',
    'Panjang': r.panjang || '',
    'Lebar': r.lebar || '',
    'Diameter/Tebal': r.diameter_tebal || '',
    'Status': r.status || '',
    'Mutu': r.mutu || '',
    'Cacat': r.cacat || '',
    'Asal Kayu': r.asal_kayu || '',
    'Sertifikasi': r.sertifikasi || '',
    'Batang': r.batang || 0,
    'Volume': r.volume || 0,
    'No. Invois': r.no_invois || '',
    'Pembeli': r.pembeli || '',
    'DKHP': r.dkhp || '',
    'SKSHHK': r.skshhk || '',
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Register Kapling')
  XLSX.writeFile(wb, fileName)
}
