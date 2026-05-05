import { useEffect, useRef, useState } from 'react'
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle, Loader2, FileText, Pencil, Trash2, Settings, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import * as XLSX from 'xlsx'
import * as pdfjsLib from 'pdfjs-dist'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthProvider'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href

const FIELD_DEFS = [
  { key: 'no_kapling',     label: 'No. Kapling',  required: true },
  { key: 'no_blok',        label: 'No./Nama Blok' },
  { key: 'tgl_kapling',    label: 'Tgl. Kapling' },
  { key: 'periode',        label: 'Periode' },
  { key: 'jenis',          label: 'Jenis' },
  { key: 'sortimen',       label: 'Sortimen' },
  { key: 'panjang',        label: 'Panjang' },
  { key: 'diameter_tebal', label: 'Dia/Tebal' },
  { key: 'status',         label: 'Status' },
  { key: 'mutu',           label: 'Mutu' },
  { key: 'cacat',          label: 'Cacat' },
  { key: 'sertifikasi',    label: 'Sertifikasi' },
  { key: 'batang',         label: 'Batang', num: true },
  { key: 'volume',         label: 'Volume (M³)', num: true },
  { key: 'dkhp',           label: 'DKHP' },
  { key: 'skshhk',         label: 'SKSHHK' },
]

const DEFAULT_COL_MAP = {
  no_kapling:     'No. Kapling',
  no_blok:        'Nama Blok',
  tgl_kapling:    'Tgl. Kapling',
  periode:        'Periode',
  jenis:          'Jenis',
  sortimen:       'Sortimen',
  panjang:        'Panjang',
  diameter_tebal: 'Dia/Tebal',
  status:         'Status',
  mutu:           'Mutu',
  cacat:          'Cacat',
  sertifikasi:    'Sertifikasi',
  batang:         'Batang',
  volume:         'Volume',
  dkhp:           'DKHP',
  skshhk:         'SKSHHK',
}

const COLS = [
  { key: 'no_kapling',     label: 'No. Kapling',  w: 'w-[128px]' },
  { key: 'no_blok',        label: 'Blok',          w: 'w-[80px]'  },
  { key: 'tgl_kapling',    label: 'Tgl. Kapling', w: 'w-[88px]'  },
  { key: 'periode',        label: 'Periode',       w: 'w-[54px]'  },
  { key: 'jenis',          label: 'Jenis',         w: 'w-[54px]'  },
  { key: 'sortimen',       label: 'Sortimen',      w: 'w-[62px]'  },
  { key: 'panjang',        label: 'Panjang',       w: 'w-[90px]'  },
  { key: 'diameter_tebal', label: 'Dia/Tebal',     w: 'w-[72px]'  },
  { key: 'mutu_label',     label: 'Mutu',          w: 'w-[72px]'  },
  { key: 'sertifikasi',    label: 'Sert.',         w: 'w-[54px]'  },
  { key: 'batang',         label: 'Btg',           w: 'w-[44px]',  num: true },
  { key: 'volume',         label: 'M³',            w: 'w-[64px]',  num: true },
  { key: 'no_invois',      label: 'Invois',        w: 'w-[130px]' },
  { key: 'pembeli',        label: 'Pembeli',       w: 'w-[140px]' },
  { key: 'dkhp',           label: 'DKHP',          w: 'w-[110px]' },
  { key: 'skshhk',         label: 'SKSHHK',        w: 'w-[130px]' },
]

const CACAT_SUFFIX  = { BUN: 'BC', DOR: 'DR' }
const STATUS_SUFFIX = { INDUSTRI: 'IN' }

function getMutuLabel(row) {
  const mutu   = (row.mutu   || '').trim()
  const cacat  = (row.cacat  || '').toUpperCase().trim()
  const status = (row.status || '').toUpperCase().trim()
  return [mutu, CACAT_SUFFIX[cacat], STATUS_SUFFIX[status]].filter(Boolean).join(' ')
}

function getPembeliName(val) {
  if (!val) return null
  const firstLine = String(val).split(/[\n\r]/)[0]
  const beforeComma = firstLine.split(',')[0]
  return beforeComma
    .replace(/\S+@\S+\.\S+/g, '')
    .replace(/\b(?:Jl\.?|Jalan|Alamat|Email|E-mail)\b.*/i, '')
    .replace(/\s+/g, ' ')
    .trim() || null
}

function displayDate(val) {
  if (!val) return null
  const m = String(val).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : val
}

function formatDate(val) {
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

function parseRowsWithMap(rawRows, colMap) {
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
      return {
        no_kapling:     String(get('no_kapling') ?? '').trim(),
        no_blok:        String(get('no_blok') ?? '').trim(),
        tgl_kapling:    formatDate(get('tgl_kapling')),
        periode:        String(get('periode') ?? '').trim(),
        jenis:          String(get('jenis') ?? '').trim(),
        sortimen:       String(get('sortimen') ?? '').trim(),
        panjang:        String(get('panjang') ?? '').trim(),
        diameter_tebal: String(get('diameter_tebal') ?? '').trim(),
        status:         String(get('status') ?? '').trim(),
        mutu:           String(get('mutu') ?? '').trim(),
        cacat:          String(get('cacat') ?? '').trim(),
        sertifikasi:    String(get('sertifikasi') ?? '').trim(),
        batang:         Number(get('batang')) || 0,
        volume:         Number(get('volume')) || 0,
        dkhp:           String(get('dkhp') ?? '').trim() || null,
        skshhk:         String(get('skshhk') ?? '').trim() || null,
      }
    })

  return { rows, headers }
}

async function parsePdfInvoice(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    fullText += content.items.map(item => item.str).join(' ') + '\n'
  }

  const invoiceMatch = fullText.match(/NO INVOICE\s*:\s*(\S+)/i)
  const noInvois = invoiceMatch ? invoiceMatch[1].trim() : null

  const pembeliMatch = fullText.match(/(?:Sudah|Telah)\s+Terima\s+Dari\s*:\s*([^\n]+)/i)
  const pembeli = pembeliMatch
    ? pembeliMatch[1].replace(/\s+/g, ' ').replace(/Recived from.*/i, '').trim()
    : null

  const kaplingMatches = [...fullText.matchAll(/\b(\d{13})\b/g)]
  const kaplingList = [...new Set(kaplingMatches.map(m => m[1]))]

  return { noInvois, pembeli, kaplingList }
}

function SertBadge({ val }) {
  if (!val || val === '-') return <span className="text-gray-400 dark:text-gray-500">-</span>
  const isFsc = val.toUpperCase() === 'FSC'
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
      isFsc ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
    }`}>{val}</span>
  )
}

export default function RegisterKapling() {
  const { profile } = useAuth()
  const [rows, setRows]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [importing, setImporting]   = useState(false)
  const [preview, setPreview]       = useState(null)
  const [invoisPreview, setInvoisPreview] = useState(null)
  const [invoisSaving, setInvoisSaving]   = useState(false)
  const [editRow, setEditRow]       = useState(null)
  const [editSaving, setEditSaving] = useState(false)
  const [deleteRow, setDeleteRow]   = useState(null)
  const [deleting, setDeleting]     = useState(false)
  const [toast, setToast]           = useState(null)

  const [colMap, setColMap] = useState(() => {
    try { return JSON.parse(localStorage.getItem('deskra_kapling_col_map')) || DEFAULT_COL_MAP }
    catch { return DEFAULT_COL_MAP }
  })
  const [excelHeaders, setExcelHeaders] = useState(() => {
    try { return JSON.parse(localStorage.getItem('deskra_kapling_excel_headers')) || [] }
    catch { return [] }
  })
  const [showSettings, setShowSettings] = useState(false)
  const [draftMap, setDraftMap]         = useState(DEFAULT_COL_MAP)
  const [pageSize, setPageSize]         = useState(50)
  const [sort, setSort]                 = useState({ key: null, dir: 'asc' })
  const [realtimeStatus, setRealtimeStatus] = useState('connecting')

  const fileRef   = useRef()
  const invoisRef = useRef()

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel('register_kapling_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tabel_register_kapling' }, () => {
        fetchData()
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('connected')
        else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') setRealtimeStatus('disconnected')
        else setRealtimeStatus('connecting')
      })

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchData() {
    setLoading(true)
    const PAGE = 1000
    const all = []
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from('tabel_register_kapling')
        .select('*')
        .order('no_kapling', { ascending: true })
        .range(from, from + PAGE - 1)
      if (error) { showToast(error.message, 'error'); break }
      if (!data || data.length === 0) break
      all.push(...data)
      if (data.length < PAGE) break
    }
    setRows(all)
    setLoading(false)
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function saveColMap(newMap) {
    setColMap(newMap)
    localStorage.setItem('deskra_kapling_col_map', JSON.stringify(newMap))
  }

  // ── Excel import ──────────────────────────────────────────────────────────
  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = evt => {
      const wb = XLSX.read(evt.target.result, { type: 'binary', cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
      const { rows: parsed, headers } = parseRowsWithMap(raw, colMap)

      if (headers.length) {
        setExcelHeaders(headers)
        localStorage.setItem('deskra_kapling_excel_headers', JSON.stringify(headers))
      }

      if (!parsed.length) {
        showToast('Tidak ada data yang bisa dibaca. Cek pengaturan header kolom.', 'error')
        return
      }

      const existingKeys = new Set(rows.map(r => r.no_kapling))
      const newCount  = parsed.filter(r => !existingKeys.has(r.no_kapling)).length
      const skipCount = parsed.length - newCount
      setPreview({ rows: parsed, fileName: file.name, newCount, skipCount })
    }
    reader.readAsBinaryString(file)
  }

  async function handleImport() {
    if (!preview) return
    setImporting(true)
    const existingKeys = new Set(rows.map(r => r.no_kapling))
    const tpkId = profile?.tpk_id
    if (!tpkId) {
      setImporting(false)
      showToast('Profil pengguna tidak ditemukan. Coba login ulang.', 'error')
      return
    }
    const newRows = Object.values(
      preview.rows
        .filter(r => !existingKeys.has(r.no_kapling))
        .reduce((acc, r) => {
          acc[r.no_kapling] = { ...r, file_name: preview.fileName, tpk_id: tpkId }
          return acc
        }, {})
    )
    if (!newRows.length) {
      setImporting(false)
      showToast('Semua kapling sudah ada di database.', 'error')
      setPreview(null)
      return
    }
    const { error } = await supabase
      .from('tabel_register_kapling')
      .insert(newRows)
    setImporting(false)
    if (error) { showToast(error.message, 'error'); return }
    showToast(`${newRows.length} kapling baru berhasil diimport`)
    setPreview(null)
    fetchData()
  }

  // ── Edit row ──────────────────────────────────────────────────────────────
  async function handleEditSave() {
    if (!editRow) return
    setEditSaving(true)
    const { error } = await supabase
      .from('tabel_register_kapling')
      .update({
        no_blok:        editRow.no_blok,
        tgl_kapling:    editRow.tgl_kapling || null,
        periode:        editRow.periode,
        jenis:          editRow.jenis,
        sortimen:       editRow.sortimen,
        panjang:        editRow.panjang,
        diameter_tebal: editRow.diameter_tebal,
        mutu:           editRow.mutu,
        cacat:          editRow.cacat,
        status:         editRow.status,
        sertifikasi:    editRow.sertifikasi,
        batang:         Number(editRow.batang) || 0,
        volume:         Number(editRow.volume) || 0,
        no_invois:      editRow.no_invois,
        pembeli:        editRow.pembeli,
        dkhp:           editRow.dkhp || null,
        skshhk:         editRow.skshhk || null,
      })
      .eq('no_kapling', editRow.no_kapling)
    setEditSaving(false)
    if (error) { showToast(error.message, 'error'); return }
    showToast('Data kapling berhasil diperbarui')
    setEditRow(null)
    fetchData()
  }

  // ── Delete row ────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteRow) return
    setDeleting(true)
    const { error } = await supabase
      .from('tabel_register_kapling')
      .delete()
      .eq('no_kapling', deleteRow.no_kapling)
    setDeleting(false)
    if (error) { showToast(error.message, 'error'); return }
    showToast(`Kapling ${deleteRow.no_kapling} berhasil dihapus`)
    setDeleteRow(null)
    fetchData()
  }

  // ── PDF invoice input ─────────────────────────────────────────────────────
  async function handleInvoisFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    try {
      const { noInvois, pembeli, kaplingList } = await parsePdfInvoice(file)
      if (!noInvois) {
        showToast('Nomor invois tidak ditemukan dalam PDF ini.', 'error')
        return
      }
      const matched   = rows.filter(r => kaplingList.includes(r.no_kapling))
      const unmatched = kaplingList.filter(k => !rows.some(r => r.no_kapling === k))
      setInvoisPreview({ noInvois, pembeli, matched, unmatched, fileName: file.name })
    } catch (err) {
      showToast('Gagal membaca PDF: ' + err.message, 'error')
    }
  }

  async function handleInvoisSave() {
    if (!invoisPreview?.matched.length) return
    setInvoisSaving(true)
    const { error } = await supabase
      .from('tabel_register_kapling')
      .upsert(
        invoisPreview.matched.map(r => ({
          ...r,
          no_invois: invoisPreview.noInvois,
          pembeli:   invoisPreview.pembeli,
        })),
        { onConflict: 'no_kapling' }
      )
    setInvoisSaving(false)
    if (error) { showToast(error.message, 'error'); return }
    showToast(`${invoisPreview.matched.length} kapling diperbarui dengan invois ${invoisPreview.noInvois}`)
    setInvoisPreview(null)
    fetchData()
  }

  const totalBatang = rows.reduce((s, r) => s + (r.batang || 0), 0)
  const totalVolume = rows.reduce((s, r) => s + Number(r.volume || 0), 0)

  function toggleSort(key) {
    setSort(prev => prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: 'asc' }
    )
  }

  function getSortVal(row, key) {
    if (key === 'mutu_label') return getMutuLabel(row).toLowerCase()
    if (key === 'tgl_kapling') return row.tgl_kapling || ''
    const col = COLS.find(c => c.key === key)
    if (col?.num) return Number(row[key]) || 0
    return String(row[key] ?? '').toLowerCase()
  }

  const sortedRows = sort.key
    ? [...rows].sort((a, b) => {
        const av = getSortVal(a, sort.key)
        const bv = getSortVal(b, sort.key)
        const col = COLS.find(c => c.key === sort.key)
        const cmp = col?.num ? av - bv : av < bv ? -1 : av > bv ? 1 : 0
        return sort.dir === 'asc' ? cmp : -cmp
      })
    : rows

  const displayedRows = pageSize === 0 ? sortedRows : sortedRows.slice(0, pageSize)

  const PAGE_SIZES = [
    { label: '50',    value: 50 },
    { label: '500',   value: 500 },
    { label: '1.000', value: 1000 },
    { label: '5.000', value: 5000 },
    { label: 'Semua', value: 0 },
  ]

  const SORTIMENS = ['AI', 'AII', 'AIII']
  const sortBatang = Object.fromEntries(SORTIMENS.map(m => [m, rows.filter(r => (r.sortimen || '').trim().toUpperCase() === m).reduce((s, r) => s + (r.batang || 0), 0)]))
  const sortVolume = Object.fromEntries(SORTIMENS.map(m => [m, rows.filter(r => (r.sortimen || '').trim().toUpperCase() === m).reduce((s, r) => s + Number(r.volume || 0), 0)]))

  return (
    <div className="p-6 max-w-full mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm text-white ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-primary-600'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={15}/> : <CheckCircle2 size={15}/>}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Register Kapling</h1>
            <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              realtimeStatus === 'connected'    ? 'bg-green-50 text-green-600' :
              realtimeStatus === 'disconnected' ? 'bg-red-50 text-red-500'    :
                                                  'bg-yellow-50 text-yellow-600'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                realtimeStatus === 'connected'    ? 'bg-green-500 animate-pulse' :
                realtimeStatus === 'disconnected' ? 'bg-red-400'                 :
                                                    'bg-yellow-400 animate-pulse'
              }`}/>
              {realtimeStatus === 'connected' ? 'Live' : realtimeStatus === 'disconnected' ? 'Offline' : 'Connecting'}
            </span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Data register kapling dari file DP Kapling (.xlsx)</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setDraftMap({ ...colMap }); setShowSettings(true) }}
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            title="Pengaturan header kolom"
          >
            <Settings size={15}/>
          </button>
          <button
            onClick={() => invoisRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <FileText size={15}/> Input Invois
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Upload size={15}/> Import Excel
          </button>
        </div>
        <input ref={fileRef}   type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange}/>
        <input ref={invoisRef} type="file" accept=".pdf"       className="hidden" onChange={handleInvoisFileChange}/>
      </div>

      {/* Summary cards */}
      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-4">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Total Kapling</p>
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{rows.length.toLocaleString('id')}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-4">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Total Batang</p>
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{totalBatang.toLocaleString('id')}</p>
            <div className="flex gap-3 mt-2">
              {SORTIMENS.map(m => (
                <div key={m} className="flex items-center gap-1">
                  <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500">{m}</span>
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{sortBatang[m].toLocaleString('id')}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-4">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Total Volume (M³)</p>
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{totalVolume.toFixed(3)}</p>
            <div className="flex gap-3 mt-2">
              {SORTIMENS.map(m => (
                <div key={m} className="flex items-center gap-1">
                  <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500">{m}</span>
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{sortVolume[m].toFixed(3)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100">Pengaturan Header Kolom</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Sesuaikan nama header kolom sesuai file Excel</p>
              </div>
              <button onClick={() => setShowSettings(false)}><X size={16} className="text-gray-400 dark:text-gray-500 hover:text-gray-600"/></button>
            </div>

            {excelHeaders.length > 0 && (
              <datalist id="excel-headers-list">
                {excelHeaders.map(h => <option key={h} value={h}/>)}
              </datalist>
            )}

            <div className="space-y-2 mb-5">
              {FIELD_DEFS.map(f => (
                <div key={f.key} className="grid grid-cols-2 gap-3 items-center">
                  <label className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                    {f.label}
                    {f.required && <span className="text-red-400 ml-0.5">*</span>}
                  </label>
                  <input
                    list="excel-headers-list"
                    value={draftMap[f.key] || ''}
                    onChange={e => setDraftMap(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder="Nama header di Excel..."
                    className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              ))}
            </div>

            {excelHeaders.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-700 rounded-lg px-3 py-2 mb-4">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Header terdeteksi dari file terakhir:</p>
                <p className="text-xs text-gray-600 dark:text-gray-200 font-mono leading-relaxed">{excelHeaders.join(', ')}</p>
              </div>
            )}

            <div className="flex gap-2 justify-between">
              <button
                onClick={() => setDraftMap({ ...DEFAULT_COL_MAP })}
                className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Reset ke default
              </button>
              <div className="flex gap-2">
                <button onClick={() => setShowSettings(false)} className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">Batal</button>
                <button
                  onClick={() => { saveColMap(draftMap); setShowSettings(false); showToast('Pengaturan disimpan') }}
                  className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Excel import preview modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary-50 p-2 rounded-lg">
                  <FileSpreadsheet size={20} className="text-primary-600"/>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{preview.fileName}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{preview.rows.length} baris ditemukan</p>
                </div>
              </div>
              <button onClick={() => setPreview(null)}><X size={16} className="text-gray-400 dark:text-gray-500 hover:text-gray-600"/></button>
            </div>

            <div className="flex gap-3 mb-4">
              <div className="flex-1 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <p className="text-xs text-green-600 mb-0.5">Kapling baru</p>
                <p className="text-xl font-bold text-green-700">{preview.newCount}</p>
              </div>
              {preview.skipCount > 0 && (
                <div className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Sudah ada (dilewati)</p>
                  <p className="text-xl font-bold text-gray-500 dark:text-gray-400">{preview.skipCount}</p>
                </div>
              )}
            </div>

            {preview.newCount === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-xs text-amber-700">
                Semua kapling dalam file ini sudah ada di database.
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-4 text-xs text-blue-700">
                Hanya kapling baru yang akan ditambahkan. Data yang sudah ada tidak akan diubah.
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button onClick={() => setPreview(null)} className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">Batal</button>
              <button
                onClick={handleImport}
                disabled={importing || preview.newCount === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60"
              >
                {importing && <Loader2 size={13} className="animate-spin"/>}
                {importing ? 'Menyimpan...' : `Tambah ${preview.newCount} Kapling`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice PDF preview modal */}
      {invoisPreview && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col p-6">
            <div className="flex items-start justify-between mb-5 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2 rounded-lg">
                  <FileText size={20} className="text-blue-600"/>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{invoisPreview.fileName}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Data invois berhasil dibaca</p>
                </div>
              </div>
              <button onClick={() => setInvoisPreview(null)}><X size={16} className="text-gray-400 dark:text-gray-500 hover:text-gray-600"/></button>
            </div>

            <div className="space-y-3 mb-5 overflow-y-auto flex-1 min-h-0">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl px-4 py-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">No. Invois</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100 font-mono">{invoisPreview.noInvois}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Pembeli</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{invoisPreview.pembeli || '-'}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <p className="text-xs text-green-600 mb-0.5">Kapling ditemukan</p>
                  <p className="text-xl font-bold text-green-700">{invoisPreview.matched.length}</p>
                </div>
                {invoisPreview.unmatched.length > 0 && (
                  <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <p className="text-xs text-amber-600 mb-0.5">Tidak ada di register</p>
                    <p className="text-xl font-bold text-amber-700">{invoisPreview.unmatched.length}</p>
                  </div>
                )}
              </div>

              {invoisPreview.matched.length > 0 && (
                <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-900 px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Kapling yang akan diperbarui</div>
                  <div className="divide-y divide-gray-50">
                    {invoisPreview.matched.map(r => (
                      <div key={r.no_kapling} className="px-3 py-1.5 flex items-center justify-between text-xs">
                        <span className="font-mono text-gray-700 dark:text-gray-200">{r.no_kapling}</span>
                        <span className="text-gray-400 dark:text-gray-500">{r.jenis} · {r.sortimen}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {invoisPreview.matched.length === 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-600">
                  Tidak ada nomor kapling dalam invois ini yang cocok dengan data register. Pastikan data Excel sudah diimport terlebih dahulu.
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end flex-shrink-0 pt-2">
              <button onClick={() => setInvoisPreview(null)} className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">Batal</button>
              {invoisPreview.matched.length > 0 && (
                <button onClick={handleInvoisSave} disabled={invoisSaving} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60">
                  {invoisSaving && <Loader2 size={13} className="animate-spin"/>}
                  {invoisSaving ? 'Menyimpan...' : `Simpan (${invoisPreview.matched.length} kapling)`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editRow && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100">Edit Kapling</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono">{editRow.no_kapling}</p>
              </div>
              <button onClick={() => setEditRow(null)}><X size={16} className="text-gray-400 dark:text-gray-500 hover:text-gray-600"/></button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: 'No./Nama Blok',  key: 'no_blok' },
                { label: 'Tgl. Kapling',   key: 'tgl_kapling',    type: 'date' },
                { label: 'Periode',        key: 'periode' },
                { label: 'Jenis',          key: 'jenis' },
                { label: 'Sortimen',       key: 'sortimen' },
                { label: 'Panjang',        key: 'panjang' },
                { label: 'Dia/Tebal',      key: 'diameter_tebal' },
                { label: 'Mutu',           key: 'mutu' },
                { label: 'Cacat',          key: 'cacat' },
                { label: 'Status',         key: 'status' },
                { label: 'Sertifikasi',    key: 'sertifikasi' },
                { label: 'Batang',         key: 'batang',         type: 'number' },
                { label: 'Volume (M³)',    key: 'volume',         type: 'number' },
                { label: 'DKHP',           key: 'dkhp' },
                { label: 'SKSHHK',         key: 'skshhk' },
                { label: 'No. Invois',     key: 'no_invois' },
                { label: 'Pembeli',        key: 'pembeli' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{f.label}</label>
                  <input
                    type={f.type || 'text'}
                    value={editRow[f.key] ?? ''}
                    onChange={e => setEditRow(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    step={f.type === 'number' ? 'any' : undefined}
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditRow(null)} className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">Batal</button>
              <button onClick={handleEditSave} disabled={editSaving} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60">
                {editSaving && <Loader2 size={13} className="animate-spin"/>}
                {editSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteRow && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-50 p-2 rounded-lg">
                <Trash2 size={18} className="text-red-500"/>
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Hapus Kapling</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono">{deleteRow.no_kapling}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
              Data kapling ini akan dihapus permanen dan tidak dapat dikembalikan.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteRow(null)} className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">Batal</button>
              <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-60">
                {deleting && <Loader2 size={13} className="animate-spin"/>}
                {deleting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table toolbar */}
      {rows.length > 0 && (
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Menampilkan <span className="font-semibold text-gray-600 dark:text-gray-300">{displayedRows.length.toLocaleString('id')}</span> dari <span className="font-semibold text-gray-600 dark:text-gray-300">{rows.length.toLocaleString('id')}</span> kapling
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 dark:text-gray-500">Tampilkan:</span>
            <div className="flex gap-1">
              {PAGE_SIZES.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPageSize(p.value)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                    pageSize === p.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">Memuat...</div>
        ) : rows.length === 0 ? (
          <div className="p-14 flex flex-col items-center justify-center text-center">
            <FileSpreadsheet size={38} className="text-gray-200 mb-3"/>
            <p className="font-medium text-gray-500 dark:text-gray-400">Belum ada data</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Klik <span className="font-medium text-primary-600">Import Excel</span> untuk mengimpor file DP Kapling</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="text-xs">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="px-2 py-2.5 text-left font-semibold text-gray-500 dark:text-gray-400 sticky left-0 bg-gray-50 dark:bg-gray-900 z-10 w-8">No</th>
                  {COLS.map(c => (
                    <th
                      key={c.key}
                      onClick={() => toggleSort(c.key)}
                      className={`px-2 py-2.5 font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${c.num ? 'text-right' : 'text-left'} ${c.w}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {c.label}
                        {sort.key === c.key
                          ? sort.dir === 'asc'
                            ? <ChevronUp size={11} className="text-primary-500"/>
                            : <ChevronDown size={11} className="text-primary-500"/>
                          : <ChevronsUpDown size={11} className="text-gray-300 dark:text-gray-600"/>
                        }
                      </span>
                    </th>
                  ))}
                  <th className="px-2 py-2.5 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayedRows.map((row, i) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                    <td className="px-2 py-2 text-gray-400 dark:text-gray-500 sticky left-0 bg-white dark:bg-gray-800 z-10">{i + 1}</td>
                    {COLS.map(c => (
                      <td key={c.key} className={`px-2 py-2 whitespace-nowrap ${c.num ? 'text-right font-mono' : 'text-gray-700 dark:text-gray-200'}`}>
                        {c.key === 'sertifikasi'
                          ? <SertBadge val={row.sertifikasi}/>
                          : c.key === 'volume'
                            ? Number(row.volume).toFixed(3)
                            : c.key === 'mutu_label'
                              ? getMutuLabel(row)
                              : c.key === 'tgl_kapling'
                                ? (displayDate(row.tgl_kapling) ?? <span className="text-gray-300 dark:text-gray-600">—</span>)
                                : c.key === 'pembeli'
                                  ? (getPembeliName(row.pembeli) ?? <span className="text-gray-300 dark:text-gray-600">—</span>)
                                  : (row[c.key] ?? <span className="text-gray-300 dark:text-gray-600">—</span>)
                        }
                      </td>
                    ))}
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditRow({ ...row })}
                          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600"
                        >
                          <Pencil size={13}/>
                        </button>
                        <button
                          onClick={() => setDeleteRow(row)}
                          className="p-1 rounded hover:bg-red-100 text-gray-400 dark:text-gray-500 hover:text-red-500"
                        >
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <tr className="font-semibold text-gray-700 dark:text-gray-200">
                  <td className="px-2 py-2 sticky left-0 bg-gray-50 dark:bg-gray-900 z-10" colSpan={11}>TOTAL</td>
                  <td className="px-2 py-2 text-right font-mono">{totalBatang.toLocaleString('id')}</td>
                  <td className="px-2 py-2 text-right font-mono">{totalVolume.toFixed(3)}</td>
                  <td className="px-2 py-2"></td>
                  <td className="px-2 py-2"></td>
                  <td className="px-2 py-2"></td>
                  <td className="px-2 py-2"></td>
                  <td className="px-2 py-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
