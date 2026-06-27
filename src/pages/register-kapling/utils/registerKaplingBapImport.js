import * as pdfjsLib from 'pdfjs-dist'
import { simplifyRange } from './registerKaplingUtils'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href

export async function parseBap(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    fullText += content.items.map(item => item.str).join(' ') + '\n'
  }

  // Nomor BAP dari header lampiran: "NOMOR : 1/ KSP/IV/2026 KPH : ..."
  const nomorMatch = fullText.match(/NOMOR\s*:\s*([\w/]+(?:\s*\/\s*[\w]+)*)\s+KPH/i)
  const noBap = nomorMatch ? nomorMatch[1].replace(/\s+/g, '') : null

  // Pembeli setelah titik dua "dikirim ke :"
  const pembeliMatch = fullText.match(/dikirim\s+ke\s*:\s*(.+?)(?=\s{2,}|\s*-\s+TPK|\s*\n|$)/i)
  const pembeli = pembeliMatch ? pembeliMatch[1].trim() : null

  // Parse baris tabel: 13-digit + JATI + sort + panjang + diameter + status + mutu + btg + m3
  const rowPattern = /(\d{13})\s+JATI\s+(\S+)\s+([\d.]+\s*-\s*[\d.]+)\s+([\d]+\s*-\s*[\d]+)\s+(LOKAL|INDUSTRI)\s+([TM])\s+(\d+)\s+([\d,]+)/g
  const kaplingData = []
  for (const m of fullText.matchAll(rowPattern)) {
    const batang = parseInt(m[7])
    const panjangRaw = m[3].replace(/\s+/g, '')
    const diamRaw    = m[4].replace(/\s+/g, '')
    kaplingData.push({
      no_kapling:     m[1],
      sortimen:       m[2],
      panjang:        batang <= 1 ? simplifyRange(panjangRaw) : panjangRaw,
      diameter_tebal: batang <= 1 ? simplifyRange(diamRaw)    : diamRaw,
      status:         m[5],
      mutu:           m[6],
      batang,
      volume:         parseFloat(m[8].replace(',', '.')),
    })
  }

  return { noBap, pembeli, kaplingData }
}

const BAP_SYNC_FIELDS = ['sortimen', 'panjang', 'diameter_tebal', 'status', 'mutu', 'batang', 'volume']

function getFieldsDiff(row, bap) {
  return BAP_SYNC_FIELDS.filter(f => {
    if (f === 'volume') return Math.abs(parseFloat(row[f] || 0) - bap[f]) > 0.0005
    if (f === 'batang') return (row[f] || 0) !== bap[f]
    return String(row[f] || '').trim() !== String(bap[f] || '').trim()
  })
}

export async function prepareBapImportPreview({ files, rows }) {
  const rowsByKapling = new Map(rows.map(r => [r.no_kapling, r]))
  const invoices = []
  const errors = []

  for (const file of files) {
    try {
      const { noBap, pembeli, kaplingData } = await parseBap(file)
      if (!noBap) { errors.push({ fileName: file.name, message: 'Nomor BAP tidak ditemukan.' }); continue }
      if (!kaplingData.length) { errors.push({ fileName: file.name, message: 'Data kapling tidak ditemukan di lampiran.' }); continue }

      const matched = []
      const unmatched = []
      for (const bap of kaplingData) {
        const row = rowsByKapling.get(bap.no_kapling)
        if (row) matched.push({ row, bap, diffs: getFieldsDiff(row, bap) })
        else unmatched.push(bap.no_kapling)
      }
      invoices.push({ noBap, pembeli, fileName: file.name, matched, unmatched })
    } catch (err) {
      errors.push({ fileName: file.name, message: err.message })
    }
  }

  if (!invoices.length) {
    return {
      error: errors.length ? 'Tidak ada PDF BAP yang bisa dibaca.' : 'Tidak ada data BAP ditemukan.',
      preview: null,
    }
  }

  return {
    error: null,
    preview: {
      invoices,
      errors,
      fileCount: files.length,
      totalMatched:   invoices.reduce((s, inv) => s + inv.matched.length, 0),
      totalUnmatched: invoices.reduce((s, inv) => s + inv.unmatched.length, 0),
      totalDiffs:     invoices.reduce((s, inv) => s + inv.matched.filter(m => m.diffs.length > 0).length, 0),
    },
  }
}

export async function saveBapImportPreview({ preview, supabase, tpkId }) {
  const updates = []
  for (const inv of preview.invoices) {
    for (const { row, bap } of inv.matched) {
      updates.push({
        id:             row.id,
        no_invois:      inv.noBap,
        pembeli:        inv.pembeli,
        sortimen:       bap.sortimen,
        panjang:        bap.panjang,
        diameter_tebal: bap.diameter_tebal,
        status:         bap.status,
        mutu:           bap.mutu,
        batang:         bap.batang,
        volume:         bap.volume,
      })
    }
  }

  const results = await Promise.all(updates.map(u => supabase
    .from('tabel_register_kapling')
    .update({
      no_invois:      u.no_invois,
      pembeli:        u.pembeli,
      sortimen:       u.sortimen,
      panjang:        u.panjang,
      diameter_tebal: u.diameter_tebal,
      status:         u.status,
      mutu:           u.mutu,
      batang:         u.batang,
      volume:         u.volume,
    })
    .eq('tpk_id', tpkId)
    .eq('id', u.id)
  ))

  const err = results.find(r => r.error)?.error
  if (err) return { closePreview: false, message: err.message, refresh: false, type: 'error' }

  return {
    closePreview: true,
    message: `${updates.length} kapling diperbarui & disinkron dari ${preview.invoices.length} BAP`,
    refresh:  true,
    type:     'success',
  }
}
