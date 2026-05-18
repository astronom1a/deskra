const CACAT_SUFFIX  = { BUN: 'BC', DOR: 'DR' }
const STATUS_SUFFIX = { INDUSTRI: 'IN' }
const MUTU_NO_SUFFIX = new Set(['KBP'])

export function getMutuLabel(row) {
  const mutu   = (row.mutu   || '').trim()
  const cacat  = (row.cacat  || '').toUpperCase().trim()
  const status = (row.status || '').toUpperCase().trim()
  if (!mutu) return ''
  if (MUTU_NO_SUFFIX.has(mutu.toUpperCase())) return mutu
  return [mutu, STATUS_SUFFIX[status], CACAT_SUFFIX[cacat]].filter(Boolean).join(' ')
}

export function getPembeliName(val) {
  if (!val) return null
  const firstLine = String(val).split(/[\n\r]/)[0]
  const beforeComma = firstLine.split(',')[0]
  return beforeComma
    .replace(/\S+@\S+\.\S+/g, '')
    .replace(/\b(?:Jl\.?|Jalan|Alamat|Email|E-mail)\b.*/i, '')
    .replace(/\s+/g, ' ')
    .trim() || null
}

export function simplifyRange(val) {
  if (!val) return val
  const s = String(val).trim()
  const dashIdx = s.indexOf('-')
  if (dashIdx <= 0) return s
  const left = s.slice(0, dashIdx).trim()
  const right = s.slice(dashIdx + 1).trim()
  if (left && left === right) return left
  return s
}

export function displayDate(val) {
  if (!val) return null
  const m = String(val).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : val
}

const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des']

export function formatPeriode(val) {
  if (!val) return val
  const s = String(val).trim()
  if (s.length !== 4) return s
  const mm = parseInt(s.slice(0, 2), 10)
  const yy = s.slice(2)
  const label = BULAN[mm - 1]
  return label ? `${label} '${yy}` : s
}

export function formatDate(val) {
  if (!val) return null
  if (val instanceof Date) {
    if (isNaN(val)) return null
    return val.toISOString().slice(0, 10)
  }
  const s = String(val).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const num = Number(s)
  if (!isNaN(num) && num > 1) {
    const d = new Date(Math.round((num - 25569) * 86400 * 1000))
    if (!isNaN(d)) return d.toISOString().slice(0, 10)
  }
  return null
}

export function parseRowsWithMap(rawRows, colMap) {
  const noKaplingHeader = (colMap.no_kapling || 'No. Kapling').toLowerCase()
  const headerIdx = rawRows.findIndex(r =>
    Array.isArray(r) && r.some(c =>
      typeof c === 'string' && c.trim().toLowerCase() === noKaplingHeader
    )
  )
  if (headerIdx === -1) return { rows: [], headers: [] }

  const headerRow = rawRows[headerIdx].map(h => (h == null ? '' : String(h).trim()))
  const headers = headerRow.filter(Boolean)

  const idxMap = {}
  for (const [field, headerName] of Object.entries(colMap)) {
    if (!headerName) continue
    const idx = headerRow.findIndex(h => h.toLowerCase() === headerName.toLowerCase())
    if (idx !== -1) idxMap[field] = idx
  }

  const rows = rawRows
    .slice(headerIdx + 1)
    .filter(r => {
      if (idxMap.no_kapling == null) return false
      const v = r[idxMap.no_kapling]
      return v != null && String(v).trim() !== ''
    })
    .map(r => {
      const get = (f) => (idxMap[f] != null ? r[idxMap[f]] : null)
      const batang = Number(get('batang')) || 0
      const panjangRaw = String(get('panjang') ?? '').trim()
      const diamRaw    = String(get('diameter_tebal') ?? '').trim()
      return {
        no_kapling:     String(get('no_kapling') ?? '').trim(),
        tgl_kapling:    formatDate(get('tgl_kapling')),
        periode:        String(get('periode') ?? '').trim(),
        no_blok:        String(get('no_blok') ?? '').trim(),
        jenis:          String(get('jenis') ?? '').trim(),
        sortimen:       String(get('sortimen') ?? '').trim(),
        sort_untuk:     String(get('sort_untuk') ?? '').trim() || null,
        panjang:        batang <= 1 ? simplifyRange(panjangRaw) : panjangRaw,
        lebar:          String(get('lebar') ?? '').trim() || null,
        diameter_tebal: batang <= 1 ? simplifyRange(diamRaw) : diamRaw,
        status:         String(get('status') ?? '').trim(),
        mutu:           String(get('mutu') ?? '').trim(),
        cacat:          String(get('cacat') ?? '').trim(),
        asal_kayu:      String(get('asal_kayu') ?? '').trim() || null,
        sertifikasi:    String(get('sertifikasi') ?? '').trim(),
        batang,
        volume:         Number(get('volume')) || 0,
        dkhp:           String(get('dkhp') ?? '').trim() || null,
        skshhk:         String(get('skshhk') ?? '').trim() || null,
      }
    })

  return { rows, headers }
}

export function analyzeKapling(rows) {
  const nums = rows
    .map(r => (r.no_kapling || '').trim())
    .filter(n => /^\d+$/.test(n))
  if (!nums.length) return null

  const sorted = [...nums].sort((a, b) =>
    a.length !== b.length ? a.length - b.length : a < b ? -1 : a > b ? 1 : 0
  )

  const first = sorted[0]
  const last  = sorted[sorted.length - 1]

  let pl = 0
  while (pl < first.length && pl < last.length && first[pl] === last[pl]) pl++
  const shorten = n => n.slice(pl).replace(/^0+(\d)/, '$1')

  const suffixLen = first.length - pl
  const kapling1  = first.slice(0, pl) + '0'.repeat(suffixLen - 1) + '1'

  const big = sorted.map(n => BigInt(n))
  const k1  = BigInt(kapling1)
  const missing = []

  if (big[0] > k1) {
    missing.push({ from: kapling1, to: (big[0] - 1n).toString() })
  }
  for (let i = 1; i < big.length; i++) {
    const diff = big[i] - big[i - 1]
    if (diff > 1n) {
      missing.push({
        from: (big[i - 1] + 1n).toString(),
        to:   (big[i]     - 1n).toString(),
      })
    }
  }

  return { last, missing, shorten }
}
