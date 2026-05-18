import * as XLSX from 'xlsx'

const MUTU_COLS = [
  { code: 'AIII_IS',  label: 'AIII IS/UT-ST',    cat: 'KB',  col: 3  },
  { code: 'AIII_PD',  label: 'AIII P/D T/M',      cat: 'KB',  col: 4  },
  { code: 'AIII_LN',  label: 'AIII L/N',           cat: 'KB',  col: 5  },
  { code: 'AIII_KBP', label: 'AIII KBP',           cat: 'KB',  col: 6  },
  { code: 'CIII_IS',  label: 'CIII/CIV IS/UT-ST', cat: 'KB',  col: 7  },
  { code: 'CIII_PD',  label: 'CIII/CIV P/D/T/M',  cat: 'KB',  col: 8  },
  { code: 'JML_KB',   label: 'Jumlah KB',          cat: 'KB',  col: 9  },
  { code: 'AI_PD',    label: 'AI P/D/T',           cat: 'TBN', col: 10 },
  { code: 'AI_M',     label: 'AI M',               cat: 'TBN', col: 11 },
  { code: 'AI_KBP',   label: 'AI KBP',             cat: 'TBN', col: 12 },
  { code: 'AII_UT',   label: 'AII UT/ST',          cat: 'TBN', col: 13 },
  { code: 'AII_PD',   label: 'AII P/D/T',          cat: 'TBN', col: 14 },
  { code: 'AII_M',    label: 'AII M',              cat: 'TBN', col: 15 },
  { code: 'AII_KBP',  label: 'AII KBP',            cat: 'TBN', col: 16 },
  { code: 'CI_IS',    label: 'CI IS/UT-ST',        cat: 'TBN', col: 17 },
  { code: 'CI_PD',    label: 'CI P/D/T',           cat: 'TBN', col: 18 },
  { code: 'CI_M',     label: 'CI M/L',             cat: 'TBN', col: 19 },
  { code: 'CII',      label: 'CII',                cat: 'TBN', col: 20 },
  { code: 'JML_TBN',  label: 'Jumlah TBN',        cat: 'TBN', col: 21 },
]

const MONTH_MAP = {
  januari:1, februari:2, maret:3, april:4, mei:5, juni:6,
  juli:7, agustus:8, september:9, oktober:10, november:11, desember:12,
}

function numOrNull(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

function nextNonBlank(rows, fromIdx) {
  let j = fromIdx
  while (j < rows.length && (!rows[j] || rows[j].every(v => v === null))) j++
  return j
}

function dayToDate(dayNum, masa_pembayaran) {
  const m = masa_pembayaran.toLowerCase().match(/([a-z]+)\s+(\d{4})/)
  if (!m) return String(dayNum)
  const month = MONTH_MAP[m[1]] ?? 1
  const year  = Number(m[2]) % 100
  return `${String(dayNum).padStart(2,'0')}-${String(month).padStart(2,'0')}-${String(year).padStart(2,'0')}`
}

function parseHeader(rows) {
  const kph = String(rows[2]?.[1] || '').replace(/^:\s*/, '').trim()
  const masaRaw = String(rows[3]?.[18] || '')
  const masa_pembayaran = masaRaw.replace(/^Masa Pembayaran\s*:\s*/i, '').trim()
  const tglRaw  = String(rows[3]?.[24] || '')
  const tglStr  = tglRaw.replace(/^Tgl Cetak\s*:\s*/i, '').trim()
  const tglParts = tglStr.split('-')
  const tanggal_cetak = tglParts.length === 3
    ? `${tglParts[2]}-${tglParts[1]}-${tglParts[0]}`
    : null
  const masaMatch = masa_pembayaran.match(/^([IVXLC]+)\s*[-–]\s*\w+\s*(\d{4})/i)
  const periode = masaMatch ? `${masaMatch[1]}-${masaMatch[2]}` : masa_pembayaran
  const bkphRow = rows.find(r => r?.[0] && /^BKPH/i.test(String(r[0])))
  const bkph = bkphRow ? String(bkphRow[0]).trim() : ''
  return { kph, bkph, masa_pembayaran, periode, tanggal_cetak }
}

function parseSuratBukti(rows, masa_pembayaran) {
  const list = []
  let i = 10
  while (i < rows.length) {
    const btgRow = rows[i]
    if (!btgRow) { i++; continue }
    const col0 = btgRow[0]
    // stop at total row
    if (col0 && /^t[\s.]*o[\s.]*t[\s.]*a[\s.]*l/i.test(String(col0))) break
    // skip rows without a nomor_surat in col 2
    if (!col0 || !btgRow[2]) { i++; continue }
    const jenis       = String(col0).trim()
    const dayOrDate   = btgRow[1]
    const tanggal     = typeof dayOrDate === 'number'
      ? dayToDate(dayOrDate, masa_pembayaran)
      : String(dayOrDate || '').trim()
    const nomor_surat = String(btgRow[2]).trim()
    let j = i + 1
    while (j < rows.length && (!rows[j] || rows[j].every(v => v === null))) j++
    const m3Row = (j < rows.length && !rows[j]?.[0]) ? rows[j] : []
    const mutu = []
    for (const m of MUTU_COLS) {
      const btg = numOrNull(btgRow[m.col])
      const m3v = numOrNull(m3Row[m.col])
      if (btg !== null || m3v !== null) {
        mutu.push({ code: m.code, label: m.label, cat: m.cat, btg, m3: m3v })
      }
    }
    list.push({
      jenis,
      tanggal,
      nomor_surat,
      jumlah_total_btg: numOrNull(btgRow[22]),
      jumlah_total_m3:  numOrNull(m3Row[22]),
      mutu,
    })
    i = (m3Row.length ? j : i) + 1
  }
  return list
}

function parseSummary(rows) {
  const totalIdx = rows.findIndex(
    r => r?.[0] && /^t[\s.]*o[\s.]*t[\s.]*a[\s.]*l/i.test(String(r[0]))
  )
  if (totalIdx < 0) return { jumlah_pengurangan_btg: null, jumlah_pengurangan_m3: null }
  const btgRow = rows[totalIdx]
  const m3Idx  = nextNonBlank(rows, totalIdx + 1)
  return {
    penambahan_btg:         null,
    penambahan_m3:          null,
    sisa_lalu_btg:          null,
    sisa_lalu_m3:           null,
    jumlah_persediaan_btg:  null,
    jumlah_persediaan_m3:   null,
    jumlah_pengurangan_btg: numOrNull(btgRow[22]),
    jumlah_pengurangan_m3:  numOrNull(rows[m3Idx]?.[22]),
    sisa_sekarang_btg:      null,
    sisa_sekarang_m3:       null,
  }
}

export function parseDk310m(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target.result, { type: 'binary', raw: true })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null })
        const header        = parseHeader(rows)
        const suratBuktiList = parseSuratBukti(rows, header.masa_pembayaran)
        const summary       = parseSummary(rows)
        resolve({ periodData: { ...header, ...summary }, suratBuktiList })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Gagal membaca file'))
    reader.readAsBinaryString(file)
  })
}
