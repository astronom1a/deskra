import { useEffect, useRef, useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import {
  Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle, Loader2, Download,
  Plus, Pencil, Trash2, ScrollText, Search, ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getNamaTpk } from '../lib/useAccount'
import { useAuth } from '../lib/AuthProvider'

const MONTH_FULL_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const MONTH_SHORT_ID = ['JAN','FEB','MAR','APR','MEI','JUN','JUL','AGS','SEP','OKT','NOV','DES']

function fmtMDYY(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return iso || ''
  return `${+m[2]}/${+m[3]}/${m[1].slice(-2)}`
}

function tpkAbbr(nama) {
  return (nama || '').replace(/[^A-Za-z]/g,'').slice(0,3).toUpperCase() || 'TPK'
}

const COL_MAP = {
  no_dkhp:       'DKHP',
  tanggal:       'TANGGAL',
  no_skshhk:     'SKSHHK',
  klas:          'KLAS',
  jenis:         'JENIS',
  ai_bt:         'AI BT',
  ai_m3:         'AI M3',
  aii_bt:        'AII BT',
  aii_m3:        'AII M3',
  aiii_bt:       'AIII BT',
  aiii_m3:       'AIII M3',
  jml_bt:        'JML BT',
  jml_m3:        'JML M3',
  nopol:         'NOPOL',
  pemohon_sopir: 'PEMOHON / SOPIR',
  tujuan:        'TUJUAN',
  kota_tujuan:   'KOTA TUJUAN',
  pembeli:       'PEMBELI',
}

const COLS = [
  { key: 'no_dkhp',       label: 'DKHP',       w: 'w-[60px]'  },
  { key: 'tanggal',       label: 'Tanggal',    w: 'w-[90px]'  },
  { key: 'no_skshhk',     label: 'SKSHHK',     w: 'w-[100px]' },
  { key: 'klas',          label: 'Klas',       w: 'w-[60px]'  },
  { key: 'jenis',         label: 'Jenis',      w: 'w-[80px]'  },
  { key: 'ai_bt',         label: 'AI Btg',     w: 'w-[60px]', num: true, int: true },
  { key: 'ai_m3',         label: 'AI M³',      w: 'w-[70px]', num: true },
  { key: 'aii_bt',        label: 'AII Btg',    w: 'w-[60px]', num: true, int: true },
  { key: 'aii_m3',        label: 'AII M³',     w: 'w-[70px]', num: true },
  { key: 'aiii_bt',       label: 'AIII Btg',   w: 'w-[60px]', num: true, int: true },
  { key: 'aiii_m3',       label: 'AIII M³',    w: 'w-[70px]', num: true },
  { key: 'jml_bt',        label: 'Σ Btg',      w: 'w-[60px]', num: true, int: true, total: true },
  { key: 'jml_m3',        label: 'Σ M³',       w: 'w-[80px]', num: true, total: true },
  { key: 'nopol',         label: 'Nopol',      w: 'w-[90px]'  },
  { key: 'pemohon_sopir', label: 'Pemohon / Sopir', w: 'w-[160px]' },
  { key: 'tujuan',        label: 'Tujuan',     w: 'w-[280px]' },
  { key: 'kota_tujuan',   label: 'Kota Tujuan', w: 'w-[120px]' },
  { key: 'pembeli',       label: 'Pembeli',    w: 'w-[160px]' },
]

const KLAS_OPTIONS = ['JATI', 'RIMBA']
const JENIS_BY_KLAS = {
  JATI: ['JATI'],
  RIMBA: ['MAHONI', 'KEDAWUNG'],
}

const NUMERIC_FIELDS = ['ai_bt','ai_m3','aii_bt','aii_m3','aiii_bt','aiii_m3','jml_bt','jml_m3']
const INT_FIELDS = ['ai_bt','aii_bt','aiii_bt','jml_bt']

function parseExcelDate(val) {
  if (val == null || val === '') return null
  if (val instanceof Date && !isNaN(val)) return val.toISOString().slice(0,10)
  const s = String(val).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // File referensi: m/d/yy → 1/3/26 = 3 Jan 2026
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (m) {
    let [, a, b, y] = m
    a = +a; b = +b; y = +y
    if (y < 100) y += 2000
    if (a >= 1 && a <= 12 && b >= 1 && b <= 31) {
      return `${y}-${String(a).padStart(2,'0')}-${String(b).padStart(2,'0')}`
    }
  }
  const num = Number(s)
  if (!isNaN(num) && num > 1) {
    const d = new Date(Math.round((num - 25569) * 86400 * 1000))
    if (!isNaN(d)) return d.toISOString().slice(0,10)
  }
  return null
}

function displayDate(iso) {
  if (!iso) return null
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

function num(v, isInt = false) {
  if (v == null || v === '') return 0
  const n = Number(String(v).replace(/[^\d.,-]/g,'').replace(',','.'))
  if (isNaN(n)) return 0
  return isInt ? Math.round(n) : n
}

function parseRows(rawRows) {
  const headerIdx = rawRows.findIndex(r =>
    Array.isArray(r) && r.some(c => typeof c === 'string' && c.trim().toUpperCase() === 'SKSHHK')
  )
  if (headerIdx === -1) return []
  const headerRow = rawRows[headerIdx].map(h => (h == null ? '' : String(h).trim()))
  const idxMap = {}
  for (const [field, headerName] of Object.entries(COL_MAP)) {
    const idx = headerRow.findIndex(h => h.toLowerCase() === headerName.toLowerCase())
    if (idx !== -1) idxMap[field] = idx
  }
  return rawRows.slice(headerIdx + 1)
    .filter(r => idxMap.no_skshhk != null && r[idxMap.no_skshhk] != null && String(r[idxMap.no_skshhk]).trim() !== '')
    .map(r => {
      const get = (f) => idxMap[f] != null ? r[idxMap[f]] : null
      const row = {
        no_dkhp:       String(get('no_dkhp') ?? '').trim() || null,
        tanggal:       parseExcelDate(get('tanggal')),
        no_skshhk:     String(get('no_skshhk') ?? '').trim(),
        klas:          String(get('klas') ?? '').trim() || null,
        jenis:         String(get('jenis') ?? '').trim() || null,
        nopol:         String(get('nopol') ?? '').trim() || null,
        pemohon_sopir: String(get('pemohon_sopir') ?? '').trim() || null,
        tujuan:        String(get('tujuan') ?? '').trim() || null,
        kota_tujuan:   String(get('kota_tujuan') ?? '').trim() || null,
        pembeli:       String(get('pembeli') ?? '').trim() || null,
      }
      for (const f of NUMERIC_FIELDS) row[f] = num(get(f), INT_FIELDS.includes(f))
      return row
    })
}

const EMPTY_FORM = {
  no_dkhp: '', tanggal: '', no_skshhk: '', klas: '', jenis: '',
  ai_bt: 0, ai_m3: 0, aii_bt: 0, aii_m3: 0, aiii_bt: 0, aiii_m3: 0,
  jml_bt: 0, jml_m3: 0,
  nopol: '', pemohon_sopir: '', tujuan: '', kota_tujuan: '', pembeli: '',
}

export default function DkhpSkshhk() {
  const { profile } = useAuth()
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [sort, setSort]       = useState({ key: 'no_dkhp', dir: 'asc' })
  const [preview, setPreview] = useState(null)
  const [importing, setImporting] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [saving, setSaving]   = useState(false)
  const [deleteRow, setDeleteRow] = useState(null)
  const [deleting, setDeleting]   = useState(false)
  const [toast, setToast]         = useState(null)
  const [exportMonth, setExportMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })
  const [exporting, setExporting] = useState(false)
  const fileRef = useRef(null)

  const showToast = (msg, kind = 'success') => {
    setToast({ msg, kind })
    setTimeout(() => setToast(null), 3000)
  }

  async function fetchData() {
    setLoading(true)
    const { data, error } = await supabase
      .from('tabel_dkhp_skshhk')
      .select('*')
      .order('no_dkhp', { ascending: true })
      .order('tanggal', { ascending: true })
      .limit(2000)
    if (error) showToast(error.message, 'error')
    else setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { fetchData() }, [])

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: 'binary', cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: null })
      const parsed = parseRows(raw)
      if (!parsed.length) {
        showToast('Tidak ada data SKSHHK terbaca dari file ini.', 'error')
        return
      }
      const existing = new Set(rows.map(r => r.no_skshhk))
      const newCount  = parsed.filter(r => !existing.has(r.no_skshhk)).length
      const skipCount = parsed.length - newCount
      setPreview({ rows: parsed, fileName: file.name, newCount, skipCount })
    }
    reader.readAsBinaryString(file)
  }

  async function handleImport() {
    if (!preview) return
    setImporting(true)
    const existing = new Set(rows.map(r => r.no_skshhk))
    const dedup = Object.values(
      preview.rows
        .filter(r => !existing.has(r.no_skshhk))
        .reduce((acc, r) => { acc[r.no_skshhk] = r; return acc }, {})
    )
    if (!dedup.length) {
      setImporting(false)
      showToast('Semua SKSHHK sudah ada di database.', 'error')
      setPreview(null)
      return
    }
    const tpk_id = profile?.tpk_id
    const { error } = await supabase.from('tabel_dkhp_skshhk').insert(dedup.map(r => ({ ...r, tpk_id })))
    setImporting(false)
    if (error) { showToast(error.message, 'error'); return }
    showToast(`${dedup.length} SKSHHK baru berhasil diimport`)
    setPreview(null)
    fetchData()
  }

  function openAdd()      { setEditRow({ ...EMPTY_FORM, _new: true }) }
  function openEdit(row)  { setEditRow({ ...row }) }

  async function handleSave() {
    if (!editRow) return
    if (!editRow.no_skshhk?.trim()) { showToast('Nomor SKSHHK wajib diisi.', 'error'); return }
    setSaving(true)
    const payload = { ...editRow }
    delete payload._new
    delete payload.id
    delete payload.created_at
    payload.tanggal = payload.tanggal || null
    for (const f of NUMERIC_FIELDS) payload[f] = num(payload[f], INT_FIELDS.includes(f))
    payload.jml_bt = payload.ai_bt + payload.aii_bt + payload.aiii_bt
    payload.jml_m3 = +(payload.ai_m3 + payload.aii_m3 + payload.aiii_m3).toFixed(3)
    let error
    if (editRow._new) {
      payload.tpk_id = profile?.tpk_id
      ;({ error } = await supabase.from('tabel_dkhp_skshhk').insert(payload))
    } else {
      ({ error } = await supabase.from('tabel_dkhp_skshhk').update(payload).eq('id', editRow.id))
    }
    setSaving(false)
    if (error) { showToast(error.message, 'error'); return }
    showToast(editRow._new ? 'SKSHHK ditambahkan' : 'SKSHHK diperbarui')
    setEditRow(null)
    fetchData()
  }

  async function handleDelete() {
    if (!deleteRow) return
    setDeleting(true)
    const { error } = await supabase.from('tabel_dkhp_skshhk').delete().eq('id', deleteRow.id)
    setDeleting(false)
    if (error) { showToast(error.message, 'error'); return }
    showToast(`SKSHHK ${deleteRow.no_skshhk} dihapus`)
    setDeleteRow(null)
    fetchData()
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r =>
      [r.no_dkhp, r.no_skshhk, r.klas, r.jenis, r.nopol, r.pemohon_sopir, r.kota_tujuan, r.pembeli, r.tujuan]
        .some(v => v && String(v).toLowerCase().includes(q))
    )
  }, [rows, search])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    const { key, dir } = sort
    arr.sort((a, b) => {
      const va = a[key] ?? ''
      const vb = b[key] ?? ''
      if (typeof va === 'number' && typeof vb === 'number') return dir === 'asc' ? va - vb : vb - va
      return dir === 'asc'
        ? String(va).localeCompare(String(vb), 'id', { numeric: true })
        : String(vb).localeCompare(String(va), 'id', { numeric: true })
    })
    return arr
  }, [filtered, sort])

  function toggleSort(key) {
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

  const totals = useMemo(() => sorted.reduce((acc, r) => {
    acc.jml_bt += Number(r.jml_bt) || 0
    acc.jml_m3 += Number(r.jml_m3) || 0
    return acc
  }, { jml_bt: 0, jml_m3: 0 }), [sorted])

  // ── Export Arus Kayu (Lampiran 6) ──────────────────────────────────────
  async function handleExport() {
    if (!exportMonth) return
    const [yStr, mStr] = exportMonth.split('-')
    const y = +yStr, m = +mStr
    setExporting(true)
    try {
      const monthRows = rows.filter(r => {
        if (!r.tanggal) return false
        const mt = String(r.tanggal).match(/^(\d{4})-(\d{2})-(\d{2})$/)
        if (!mt) return false
        return +mt[1] === y && +mt[2] === m
      }).sort((a, b) => {
        const an = +a.no_dkhp || 0, bn = +b.no_dkhp || 0
        if (an !== bn) return an - bn
        return String(a.tanggal).localeCompare(String(b.tanggal))
      })
      if (!monthRows.length) {
        showToast(`Tidak ada data SKSHHK pada ${MONTH_FULL_ID[m-1]} ${y}.`, 'error')
        setExporting(false)
        return
      }

      const { data: pejabatList } = await supabase.from('tabel_pejabat').select('*').eq('aktif', true)
      const has = (p, needle) => (p.jabatan || '').toLowerCase().includes(needle)
      const penerbit = (pejabatList || []).find(p => has(p, 'penerbit')) || {}
      const kepala   = (pejabatList || []).find(p => has(p, 'kepala tpk')) || {}

      const tpkName  = getNamaTpk()
      const tpkUpper = tpkName.toUpperCase()
      const tpkCode  = tpkAbbr(tpkName)
      const monthLabel = MONTH_FULL_ID[m - 1]
      const monthShort = MONTH_SHORT_ID[m - 1]
      const yy = String(y).slice(-2)
      const lastDay = new Date(y, m, 0).getDate()
      const dateLine = `${tpkName},  ${lastDay} ${monthLabel} ${y}`

      const dash = (v, decimals) => {
        const n = Number(v) || 0
        if (!n) return ' - '
        return decimals != null ? n.toFixed(decimals) : String(n)
      }

      const aoa = []
      // Header
      aoa.push([null,'LAPORAN BULANAN PENERBITAN SURAT KETERANGAN SAH HASIL HUTAN KAYU (SKSHHK)',null,null,null,null,null,null,null,null,null,null,null,null,null,'Lampiran : 6'])
      aoa.push([null,'DIVISI REGIONAL',null,':  JAWA TIMUR'])
      aoa.push([null,'KPH',null,':  BANYUWANGI UTARA',null,null,null,null,null,null,null,null,' BULAN : ', monthLabel])
      aoa.push([null,'TPK',null,`:  ${tpkUpper}`,null,null,null,null,null,null,null,null,' TAHUN : ', String(y)])
      aoa.push([])
      // Column header rows
      const HDR1_R = aoa.length
      aoa.push(['KETERANGAN SURAT BUKTI PENGIRIMAN',null,null,null,null,'KETERANGAN  JUMLAH FISIK  PENERIMAAN',null,null,null,null,null,null,null,null,null,'KETERANGAN  STATUS  PENERIMAAN'])
      const HDR2_R = aoa.length
      aoa.push(['NO','TGL PENERBITAN','KAYU BULAT/ OLAHAN',null,null,'TUJUAN KIRIM',null,'LOG AIII',null,' LOG AII ',null,' LOG AI ',null,'JUMLAH',null,'SKSHH DI TUJUAN'])
      const HDR3_R = aoa.length
      aoa.push([null,'SKSHHK','NO SKSHHK','DKHP','JENIS KAYU','INDUSTRI','TPK',' BTG ',' M3 ',' BTG ',' M3 ',' BTG ',' M3 ','BTG','M3','BELUM DIMATIKAN','DIMATIKAN TGL'])
      aoa.push(['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17'])

      // Data rows
      const totals = { ai_bt:0, ai_m3:0, aii_bt:0, aii_m3:0, aiii_bt:0, aiii_m3:0, jml_bt:0, jml_m3:0 }
      monthRows.forEach((r, i) => {
        aoa.push([
          String(i + 1),
          fmtMDYY(r.tanggal),
          r.no_skshhk || '',
          r.no_dkhp || '',
          r.klas || '',
          r.tujuan || '',
          tpkCode,
          dash(r.aiii_bt),
          dash(r.aiii_m3, 3),
          dash(r.aii_bt),
          dash(r.aii_m3, 3),
          dash(r.ai_bt),
          dash(r.ai_m3, 3),
          (Number(r.jml_bt) || 0).toString(),
          (Number(r.jml_m3) || 0).toFixed(3),
          '',
          '',
        ])
        totals.ai_bt   += Number(r.ai_bt)   || 0
        totals.ai_m3   += Number(r.ai_m3)   || 0
        totals.aii_bt  += Number(r.aii_bt)  || 0
        totals.aii_m3  += Number(r.aii_m3)  || 0
        totals.aiii_bt += Number(r.aiii_bt) || 0
        totals.aiii_m3 += Number(r.aiii_m3) || 0
        totals.jml_bt  += Number(r.jml_bt)  || 0
        totals.jml_m3  += Number(r.jml_m3)  || 0
      })

      aoa.push([])
      const TOTAL_R = aoa.length
      aoa.push([
        'TOTAL', null, null, null, null, null, null,
        totals.aiii_bt.toLocaleString('en-US'),
        totals.aiii_m3.toFixed(3),
        totals.aii_bt.toLocaleString('en-US'),
        totals.aii_m3.toFixed(3),
        totals.ai_bt.toLocaleString('en-US'),
        totals.ai_m3.toFixed(3),
        totals.jml_bt.toLocaleString('en-US'),
        totals.jml_m3.toFixed(3),
      ])
      aoa.push([])

      // Signature block
      const sigCol = (label, idxL, idxR) => {
        const r = new Array(17).fill(null)
        if (idxL != null) r[idxL] = label
        return r
      }
      const dateRow = new Array(17).fill(null); dateRow[14] = dateLine
      aoa.push(dateRow)
      const titleRow = new Array(17).fill(null); titleRow[8] = 'Pejabat Penerbit'; titleRow[14] = `Kepala ${tpkName}`
      aoa.push(titleRow)
      aoa.push([]); aoa.push([])  // ttd space
      const nameRow = new Array(17).fill(null)
      nameRow[8] = (penerbit.nama || '').toUpperCase()
      nameRow[14] = (kepala.nama || '').toUpperCase()
      aoa.push(nameRow)
      const idRow = new Array(17).fill(null)
      idRow[8] = penerbit.npk ? `NO.REG. ${penerbit.npk}` : ''
      idRow[14] = kepala.npk ? `NPK.${kepala.npk}` : ''
      aoa.push(idRow)

      const ws = XLSX.utils.aoa_to_sheet(aoa)
      ws['!merges'] = [
        { s: { r: HDR1_R, c: 0 },  e: { r: HDR1_R, c: 4 } },
        { s: { r: HDR1_R, c: 5 },  e: { r: HDR1_R, c: 14 } },
        { s: { r: HDR1_R, c: 15 }, e: { r: HDR1_R, c: 16 } },
        { s: { r: HDR2_R, c: 0 },  e: { r: HDR3_R, c: 0 } },
        { s: { r: HDR2_R, c: 2 },  e: { r: HDR2_R, c: 4 } },
        { s: { r: HDR2_R, c: 5 },  e: { r: HDR2_R, c: 6 } },
        { s: { r: HDR2_R, c: 7 },  e: { r: HDR2_R, c: 8 } },
        { s: { r: HDR2_R, c: 9 },  e: { r: HDR2_R, c: 10 } },
        { s: { r: HDR2_R, c: 11 }, e: { r: HDR2_R, c: 12 } },
        { s: { r: HDR2_R, c: 13 }, e: { r: HDR2_R, c: 14 } },
        { s: { r: HDR2_R, c: 15 }, e: { r: HDR2_R, c: 16 } },
        { s: { r: TOTAL_R, c: 0 }, e: { r: TOTAL_R, c: 6 } },
      ]
      ws['!cols'] = [
        { wch: 4 }, { wch: 11 }, { wch: 11 }, { wch: 6 }, { wch: 8 },
        { wch: 50 }, { wch: 5 }, { wch: 6 }, { wch: 7 }, { wch: 6 }, { wch: 7 },
        { wch: 6 }, { wch: 7 }, { wch: 6 }, { wch: 8 }, { wch: 14 }, { wch: 12 },
      ]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'lamp 6.')
      const filename = `${m}. ARUS KAYU ${monthShort} ${yy}.xlsx`
      XLSX.writeFile(wb, filename)
      showToast(`Berhasil mengunduh ${filename}`)
    } catch (err) {
      showToast('Gagal export: ' + (err?.message || err), 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <ScrollText size={22} className="text-primary-600 dark:text-primary-300"/>
            DKHP SKSHHK
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Register dokumen pengangkutan hasil hutan kayu.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <input
              type="month"
              value={exportMonth}
              onChange={e => setExportMonth(e.target.value)}
              className="bg-transparent text-sm text-gray-700 dark:text-gray-200 px-1 py-1 focus:outline-none [color-scheme:light] dark:[color-scheme:dark]"
            />
            <button
              onClick={handleExport}
              disabled={exporting || !exportMonth}
              className="flex items-center gap-1.5 px-2.5 py-1 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-60"
              title="Download Arus Kayu (Lampiran 6) untuk bulan terpilih"
            >
              {exporting ? <Loader2 size={13} className="animate-spin"/> : <Download size={13}/>}
              Arus Kayu
            </button>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
            <Plus size={14}/> Tambah
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            <Upload size={14}/> Import Excel
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"/>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari SKSHHK, DKHP, jenis, nopol, pembeli…"
            className="pl-9 pr-3 py-2 w-80 max-w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {sorted.length} dari {rows.length} dokumen · Σ {totals.jml_bt.toLocaleString('id')} batang · {totals.jml_m3.toFixed(3)} m³
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
            <Loader2 size={16} className="animate-spin mr-2"/> Memuat…
          </div>
        ) : !sorted.length ? (
          <div className="p-10 text-center text-sm text-gray-400 dark:text-gray-500">
            Belum ada data. Klik <span className="font-semibold">Import Excel</span> atau <span className="font-semibold">Tambah</span> untuk mulai.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                <tr>
                  {COLS.map(c => (
                    <th
                      key={c.key}
                      onClick={() => toggleSort(c.key)}
                      className={`px-2 py-2.5 font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700 ${c.num ? 'text-right' : 'text-left'} ${c.w}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {c.label}
                        {sort.key === c.key
                          ? sort.dir === 'asc' ? <ChevronUp size={11} className="text-primary-500"/> : <ChevronDown size={11} className="text-primary-500"/>
                          : <ChevronsUpDown size={11} className="text-gray-300 dark:text-gray-600"/>
                        }
                      </span>
                    </th>
                  ))}
                  <th className="px-2 py-2.5 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {sorted.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 group">
                    {COLS.map(c => {
                      const v = row[c.key]
                      let content
                      if (c.key === 'tanggal') content = displayDate(v)
                      else if (c.num) {
                        const n = Number(v) || 0
                        if (!n) content = <span className="text-gray-300 dark:text-gray-600">—</span>
                        else content = c.int ? n.toLocaleString('id') : n.toFixed(3)
                      } else {
                        content = v
                      }
                      const isTujuan = c.key === 'tujuan'
                      return (
                        <td
                          key={c.key}
                          title={isTujuan && v ? v : undefined}
                          className={`px-2 py-2 ${isTujuan ? 'truncate max-w-[280px]' : 'whitespace-nowrap'} ${c.num ? 'text-right font-mono' : 'text-gray-700 dark:text-gray-200'} ${c.total ? 'font-semibold text-gray-800 dark:text-gray-100' : ''}`}
                        >
                          {content || (!c.num && <span className="text-gray-300 dark:text-gray-600">—</span>)}
                        </td>
                      )
                    })}
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(row)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600">
                          <Pencil size={13}/>
                        </button>
                        <button onClick={() => setDeleteRow(row)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 dark:text-gray-500 hover:text-red-600">
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <tr className="font-semibold text-gray-700 dark:text-gray-200">
                  <td className="px-2 py-2" colSpan={11}>TOTAL</td>
                  <td className="px-2 py-2 text-right font-mono">{totals.jml_bt.toLocaleString('id')}</td>
                  <td className="px-2 py-2 text-right font-mono">{totals.jml_m3.toFixed(3)}</td>
                  <td className="px-2 py-2" colSpan={6}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white text-sm shadow-lg flex items-center gap-2 z-50 ${
          toast.kind === 'error' ? 'bg-red-600' : 'bg-emerald-600'
        }`}>
          {toast.kind === 'error' ? <AlertCircle size={14}/> : <CheckCircle2 size={14}/>}
          {toast.msg}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary-50 dark:bg-primary-900/20 p-2 rounded-lg">
                  <FileSpreadsheet size={18} className="text-primary-600 dark:text-primary-300"/>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Konfirmasi Import</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-[280px]">{preview.fileName}</p>
                </div>
              </div>
              <button onClick={() => setPreview(null)} disabled={importing}><X size={16} className="text-gray-400 hover:text-gray-600"/></button>
            </div>
            <div className="space-y-2 text-sm mb-5">
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Total terbaca</span><span className="font-semibold text-gray-800 dark:text-gray-100">{preview.rows.length}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Akan diimport</span><span className="font-semibold text-emerald-600">{preview.newCount}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Sudah ada (skip)</span><span className="font-semibold text-gray-500">{preview.skipCount}</span></div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setPreview(null)} disabled={importing} className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">Batal</button>
              <button onClick={handleImport} disabled={importing || !preview.newCount} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60">
                {importing && <Loader2 size={13} className="animate-spin"/>}
                {importing ? 'Mengimport…' : `Import ${preview.newCount} data`}
              </button>
            </div>
          </div>
        </div>
      )}

      {editRow && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="bg-primary-50 dark:bg-primary-900/20 p-2 rounded-lg">
                  <Pencil size={16} className="text-primary-600 dark:text-primary-300"/>
                </div>
                <p className="font-semibold text-gray-800 dark:text-gray-100">{editRow._new ? 'Tambah SKSHHK' : 'Edit SKSHHK'}</p>
              </div>
              <button onClick={() => setEditRow(null)} disabled={saving}><X size={16} className="text-gray-400 hover:text-gray-600"/></button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {(() => {
                const klasNorm = (editRow.klas || '').toUpperCase()
                const jenisOptions = JENIS_BY_KLAS[klasNorm] || []
                const inputCls = 'w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60'
                const computedBt = num(editRow.ai_bt, true) + num(editRow.aii_bt, true) + num(editRow.aiii_bt, true)
                const computedM3 = +(num(editRow.ai_m3) + num(editRow.aii_m3) + num(editRow.aiii_m3)).toFixed(3)
                const fields = [
                  { label: 'No. DKHP',      key: 'no_dkhp' },
                  { label: 'Tanggal',       key: 'tanggal',   type: 'date' },
                  { label: 'No. SKSHHK *',  key: 'no_skshhk' },
                  { label: 'Klas',          key: 'klas',      kind: 'klas' },
                  { label: 'Jenis',         key: 'jenis',     kind: 'jenis' },
                  { label: 'Nopol',         key: 'nopol' },
                  { label: 'AI Btg',        key: 'ai_bt',     type: 'number' },
                  { label: 'AI M³',         key: 'ai_m3',     type: 'number' },
                  { label: 'AII Btg',       key: 'aii_bt',    type: 'number' },
                  { label: 'AII M³',        key: 'aii_m3',    type: 'number' },
                  { label: 'AIII Btg',      key: 'aiii_bt',   type: 'number' },
                  { label: 'AIII M³',       key: 'aiii_m3',   type: 'number' },
                  { label: 'Jml Btg (auto)', key: 'jml_bt', kind: 'computed', display: computedBt.toLocaleString('id') },
                  { label: 'Jml M³ (auto)',  key: 'jml_m3', kind: 'computed', display: computedM3.toFixed(3) },
                  { label: 'Kota Tujuan',   key: 'kota_tujuan' },
                ]
                return fields.map(f => (
                  <div key={f.key}>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{f.label}</label>
                    {f.kind === 'klas' ? (
                      <select
                        value={editRow.klas ?? ''}
                        onChange={e => {
                          const next = e.target.value
                          setEditRow(p => {
                            const allowed = JENIS_BY_KLAS[next] || []
                            const keepJenis = allowed.includes((p.jenis || '').toUpperCase())
                            return {
                              ...p,
                              klas: next,
                              jenis: keepJenis ? p.jenis : (allowed.length === 1 ? allowed[0] : ''),
                            }
                          })
                        }}
                        className={inputCls}
                      >
                        <option value="">— pilih klas —</option>
                        {KLAS_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    ) : f.kind === 'computed' ? (
                      <input
                        type="text"
                        value={f.display}
                        readOnly
                        tabIndex={-1}
                        className={`${inputCls} bg-gray-50 dark:bg-gray-800 text-right font-mono cursor-not-allowed`}
                      />
                    ) : f.kind === 'jenis' ? (
                      <select
                        value={editRow.jenis ?? ''}
                        onChange={e => setEditRow(p => ({ ...p, jenis: e.target.value }))}
                        disabled={!klasNorm}
                        className={inputCls}
                      >
                        <option value="">{klasNorm ? '— pilih jenis —' : 'Pilih klas dulu'}</option>
                        {jenisOptions.map(j => <option key={j} value={j}>{j}</option>)}
                      </select>
                    ) : (
                      <input
                        type={f.type || 'text'}
                        value={editRow[f.key] ?? ''}
                        onChange={e => setEditRow(p => ({ ...p, [f.key]: e.target.value }))}
                        step={f.type === 'number' ? 'any' : undefined}
                        className={inputCls}
                      />
                    )}
                  </div>
                ))
              })()}
            </div>
            {[
              { label: 'Pemohon / Sopir', key: 'pemohon_sopir' },
              { label: 'Pembeli',         key: 'pembeli' },
              { label: 'Tujuan (alamat lengkap)', key: 'tujuan', multiline: true },
            ].map(f => (
              <div key={f.key} className="mb-3">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{f.label}</label>
                {f.multiline ? (
                  <textarea
                    rows={2}
                    value={editRow[f.key] ?? ''}
                    onChange={e => setEditRow(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <input
                    type="text"
                    value={editRow[f.key] ?? ''}
                    onChange={e => setEditRow(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                )}
              </div>
            ))}
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setEditRow(null)} disabled={saving} className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">Batal</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60">
                {saving && <Loader2 size={13} className="animate-spin"/>}
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteRow && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                <Trash2 size={18} className="text-red-500"/>
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Hapus SKSHHK</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono">{deleteRow.no_skshhk}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">Data akan dihapus permanen.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteRow(null)} disabled={deleting} className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">Batal</button>
              <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60">
                {deleting && <Loader2 size={13} className="animate-spin"/>}
                {deleting ? 'Menghapus…' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
