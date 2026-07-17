import { parseInvois } from '../../register-invois/utils/parseInvois.js'

function sumBatang(rows) {
  return rows.reduce((sum, row) => sum + (row.batang || 0), 0)
}

function sumVolume(rows) {
  return rows.reduce((sum, row) => sum + Number(row.volume || 0), 0)
}

function sumBySortimen(rows, sortimens, valueFn) {
  return Object.fromEntries(sortimens.map(sortimen => {
    const filtered = rows.filter(row => (row.sortimen || '').trim().toUpperCase() === sortimen)
    return [sortimen, valueFn(filtered)]
  }))
}

function buildBlokBreakdown(rows) {
  const map = {}
  rows.forEach(row => {
    const key = row.no_blok || '—'
    if (!map[key]) map[key] = { batang: 0, volume: 0 }
    map[key].batang += row.batang || 0
    map[key].volume += Number(row.volume || 0)
  })
  return Object.entries(map).sort((a, b) => b[1].volume - a[1].volume)
}

export function countMissingKaplings(kaplingInfo) {
  return kaplingInfo
    ? kaplingInfo.missing.reduce((sum, missing) => sum + Number(BigInt(missing.to) - BigInt(missing.from) + 1n), 0)
    : 0
}

export function buildRegisterKaplingMetrics({
  allRows,
  penguranganInvoices,
  rows,
  selectedYear = null,
  skippedInvoices = [],
  sortimens,
}) {
  // Set "sudah terinput" dari SEMUA baris — invois yang terinput di kapling
  // tahun lain bukan invois terlewat. Filter tahun diterapkan ke sisi DK310
  // lewat tanggal yang terkandung di nomor invois; nomor yang tidak
  // mengikuti pattern tetap ditampilkan agar tidak luput dicek.
  const registered = new Set((allRows ?? rows).map(row => row.no_invois).filter(Boolean))
  // Invois dari periode sebelum aplikasi dipakai (kapling-nya memang tidak
  // pernah diinput) ditandai manual "tidak berlaku" agar tidak selamanya
  // kehitung terlewat — lihat tabel_dk310_invois_skip.
  const skipped = new Set(skippedInvoices.map(s => s.no_invois))
  const scopedInvoices = selectedYear
    ? penguranganInvoices.filter(invoice => {
        const parsed = parseInvois(invoice)
        return !parsed || Number(parsed.tanggal.slice(0, 4)) === selectedYear
      })
    : penguranganInvoices
  const missingInvoices = scopedInvoices.length
    ? [...new Set(scopedInvoices.filter(invoice => !registered.has(invoice) && !skipped.has(invoice)))]
    : []
  const unsoldRows = rows.filter(row => !row.no_invois)
  const totalBatang = sumBatang(rows)
  const totalVolume = sumVolume(rows)
  const unsoldBatang = sumBatang(unsoldRows)
  const unsoldVolume = sumVolume(unsoldRows)
  const sortBatang = sumBySortimen(rows, sortimens, sumBatang)
  const sortVolume = sumBySortimen(rows, sortimens, sumVolume)
  const unsoldSortBatang = sumBySortimen(unsoldRows, sortimens, sumBatang)
  const unsoldSortVolume = sumBySortimen(unsoldRows, sortimens, sumVolume)
  const soldSortBatang = Object.fromEntries(sortimens.map(sortimen => [sortimen, sortBatang[sortimen] - unsoldSortBatang[sortimen]]))
  const soldSortVolume = Object.fromEntries(sortimens.map(sortimen => [sortimen, sortVolume[sortimen] - unsoldSortVolume[sortimen]]))

  // Pihak III: sudah ada invois/pembeli tapi belum ada skshhk
  const pihak3Rows = rows.filter(r => r.no_invois && !r.skshhk)
  const pihak3Batang = sumBatang(pihak3Rows)
  const pihak3Volume = sumVolume(pihak3Rows)
  const pihak3SortBatang = sumBySortimen(pihak3Rows, sortimens, sumBatang)
  const pihak3SortVolume = sumBySortimen(pihak3Rows, sortimens, sumVolume)

  return {
    blokBreakdown: buildBlokBreakdown(rows),
    missingInvoices,
    pihak3Batang,
    pihak3Rows,
    pihak3SortBatang,
    pihak3SortVolume,
    pihak3Volume,
    soldSortBatang,
    soldSortVolume,
    sortBatang,
    sortVolume,
    totalBatang,
    totalVolume,
    unsoldBatang,
    unsoldSortBatang,
    unsoldSortVolume,
    unsoldVolume,
  }
}
