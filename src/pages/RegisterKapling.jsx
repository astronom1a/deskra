import { useEffect, useMemo, useRef, useState } from 'react'
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle, Loader2, FileText, Pencil, Trash2, Settings, ChevronUp, ChevronDown, ChevronsUpDown, SlidersHorizontal, ChevronLeft, ChevronRight, Search, Plus, Tag, FileBarChart2 } from 'lucide-react'
import Toast, { useToast } from '../components/Toast'
import * as XLSX from 'xlsx'
import * as pdfjsLib from 'pdfjs-dist'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthProvider'
import { buildInvoiceKaplingUpdates } from '../lib/tenantScope'
import { getEffectiveTpkId } from '../lib/effectiveTpk'
import { getTpkScopedStorageKey } from '../lib/tpkScopedStorage'
import ThemedSelect from '../components/ThemedSelect'
import TpkRequiredState from '../components/TpkRequiredState'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href

const FIELD_DEFS = [
  { key: 'no_kapling',     label: 'No. Kapling',    required: true },
  { key: 'tgl_kapling',    label: 'Tgl Kapling' },
  { key: 'periode',        label: 'Periode' },
  { key: 'no_blok',        label: 'No Blok' },
  { key: 'jenis',          label: 'Jenis Kayu' },
  { key: 'sortimen',       label: 'Sortimen' },
  { key: 'sort_untuk',     label: 'Sort. Untuk' },
  { key: 'panjang',        label: 'Panjang' },
  { key: 'lebar',          label: 'Lebar' },
  { key: 'diameter_tebal', label: 'Diameter/<br>Tebal' },
  { key: 'status',         label: 'Status' },
  { key: 'mutu',           label: 'Mutu' },
  { key: 'cacat',          label: 'Cacat Kayu' },
  { key: 'asal_kayu',      label: 'Asal Kayu' },
  { key: 'sertifikasi',    label: 'Sert.' },
  { key: 'batang',         label: 'Jumlah', num: true },
  { key: 'volume',         label: 'Volume (M³)', num: true },
  { key: 'dkhp',           label: 'DKHP' },
  { key: 'skshhk',         label: 'SKSHHK' },
]

const DEFAULT_COL_MAP = {
  no_kapling:     'No. Kapling',
  tgl_kapling:    'Tgl Kapling',
  periode:        'Periode',
  no_blok:        'No Blok',
  jenis:          'Jenis Kayu',
  sortimen:       'Sortimen',
  sort_untuk:     'Sort. Untuk',
  panjang:        'Panjang',
  lebar:          'Lebar',
  diameter_tebal: 'Diameter/<br>Tebal',
  status:         'Status',
  mutu:           'Mutu',
  cacat:          'Cacat Kayu',
  asal_kayu:      'Asal Kayu',
  sertifikasi:    'Sert.',
  batang:         'Jumlah',
  volume:         'Volume',
  dkhp:           'DKHP',
  skshhk:         'SKSHHK',
}

const COL_MAP_STORAGE_KEY = 'deskra_kapling_col_map'
const EXCEL_HEADERS_STORAGE_KEY = 'deskra_kapling_excel_headers'

const COLS = [
  { key: 'no_kapling',     label: 'No. Kapling',   w: 'w-[128px]' },
  { key: 'tgl_kapling',    label: 'Tgl Kapling',   w: 'w-[88px]'  },
  { key: 'periode',        label: 'Periode',        w: 'w-[54px]'  },
  { key: 'no_blok',        label: 'No Blok',        w: 'w-[80px]'  },
  { key: 'jenis',          label: 'Jenis Kayu',     w: 'w-[70px]'  },
  { key: 'sortimen',       label: 'Sortimen',       w: 'w-[62px]'  },
  { key: 'panjang',        label: 'Panjang',        w: 'w-[72px]'  },
  { key: 'diameter_tebal', label: 'Dia/Tebal',      w: 'w-[72px]'  },
  { key: 'mutu_label',     label: 'Mutu',           w: 'w-[72px]'  },
  { key: 'sertifikasi',    label: 'Sert.',          w: 'w-[54px]'  },
  { key: 'batang',         label: 'Jumlah',         w: 'w-[50px]',  num: true },
  { key: 'volume',         label: 'Volume',         w: 'w-[64px]',  num: true },
  { key: 'no_invois',      label: 'Invois',         w: 'w-[130px]' },
  { key: 'pembeli',        label: 'Pembeli',        w: 'w-[140px]' },
  { key: 'dkhp',           label: 'DKHP',           w: 'w-[110px]' },
  { key: 'skshhk',         label: 'SKSHHK',         w: 'w-[130px]' },
]

const CACAT_SUFFIX  = { BUN: 'BC', DOR: 'DR' }
const STATUS_SUFFIX = { INDUSTRI: 'IN' }
const MUTU_NO_SUFFIX = new Set(['KBP'])

function getMutuLabel(row) {
  const mutu   = (row.mutu   || '').trim()
  const cacat  = (row.cacat  || '').toUpperCase().trim()
  const status = (row.status || '').toUpperCase().trim()
  if (!mutu) return ''
  if (MUTU_NO_SUFFIX.has(mutu.toUpperCase())) return mutu
  return [mutu, STATUS_SUFFIX[status], CACAT_SUFFIX[cacat]].filter(Boolean).join(' ')
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

function simplifyRange(val) {
  if (!val) return val
  const s = String(val).trim()
  const dashIdx = s.indexOf('-')
  if (dashIdx <= 0) return s
  const left = s.slice(0, dashIdx).trim()
  const right = s.slice(dashIdx + 1).trim()
  if (left && left === right) return left
  return s
}

function displayDate(val) {
  if (!val) return null
  const m = String(val).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : val
}

const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des']
function formatPeriode(val) {
  if (!val) return val
  const s = String(val).trim()
  if (s.length !== 4) return s
  const mm = parseInt(s.slice(0, 2), 10)
  const yy = s.slice(2)
  const label = BULAN[mm - 1]
  return label ? `${label} '${yy}` : s
}

const INVOIS_PREFIX_MAP = {
  ECR: { bg: 'rgba(0,180,255,0.1)',   color: 'rgba(0,180,255,0.95)',  border: 'rgba(0,180,255,0.28)',  desc: 'Retail' },
  ECK: { bg: 'rgba(0,255,136,0.08)',  color: '#00ff88',               border: 'rgba(0,255,136,0.22)',  desc: 'DK318'  },
  EKK: { bg: 'rgba(170,80,255,0.1)',  color: 'rgba(170,80,255,0.9)',  border: 'rgba(170,80,255,0.28)', desc: 'Khusus' },
}

function InvoisBadge({ val }) {
  if (!val) return <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>
  const prefix = String(val).trim().slice(0, 3).toUpperCase()
  const pfx = INVOIS_PREFIX_MAP[prefix]
  if (pfx) {
    return (
      <span title={pfx.desc} style={{ ...RK_BADGE_BASE, background: pfx.bg, color: pfx.color, border: `1px solid ${pfx.border}`, fontSize: 11 }}>
        {val}
      </span>
    )
  }
  return <span style={{ color: 'rgba(255,255,255,0.75)', fontFamily: 'monospace', fontSize: 11 }}>{val}</span>
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

function analyzeKapling(rows) {
  const nums = rows
    .map(r => (r.no_kapling || '').trim())
    .filter(n => /^\d+$/.test(n))
  if (!nums.length) return null

  const sorted = [...nums].sort((a, b) =>
    a.length !== b.length ? a.length - b.length : a < b ? -1 : a > b ? 1 : 0
  )

  const first = sorted[0]
  const last  = sorted[sorted.length - 1]

  // common prefix between first & last for compact display
  let pl = 0
  while (pl < first.length && pl < last.length && first[pl] === last[pl]) pl++
  const shorten = n => n.slice(pl).replace(/^0+(\d)/, '$1')

  // kapling #1 = same prefix + same total length, suffix = 1
  const suffixLen = first.length - pl
  const kapling1  = first.slice(0, pl) + '0'.repeat(suffixLen - 1) + '1'

  // gap detection via BigInt, start sequence from kapling #1
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

const JENIS_STYLE = {
  JATI:     { background: 'rgba(0,255,136,0.12)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.25)' },
  MAHONI:   { background: 'rgba(255,107,107,0.12)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.25)' },
  KEDAWUNG: { background: 'rgba(255,107,107,0.12)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.25)' },
}
const RK_BADGE_BASE = { display: 'inline-block', padding: '2px 6px', borderRadius: 3, fontSize: 10, fontWeight: 600, fontFamily: 'monospace' }
const RK_BADGE_DEF  = { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }

function JenisKayuBadge({ val }) {
  if (!val) return <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>
  return <span style={{ ...RK_BADGE_BASE, ...(JENIS_STYLE[val.toUpperCase()] || RK_BADGE_DEF) }}>{val}</span>
}

function SertBadge({ val }) {
  if (!val || val === '-') return <span style={{ color: 'rgba(255,255,255,0.2)' }}>-</span>
  const isFsc = val.toUpperCase() === 'FSC'
  const style = isFsc
    ? { background: 'rgba(0,255,136,0.12)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.25)' }
    : { background: 'rgba(255,170,0,0.12)', color: '#ffaa00', border: '1px solid rgba(255,170,0,0.25)' }
  return <span style={{ ...RK_BADGE_BASE, ...style }}>{val}</span>
}

export default function RegisterKapling() {
  const { profile, activeTpkId } = useAuth()
  const tpkId = getEffectiveTpkId({ activeTpkId, profile })
  const colMapStorageKey = getTpkScopedStorageKey(COL_MAP_STORAGE_KEY, tpkId)
  const excelHeadersStorageKey = getTpkScopedStorageKey(EXCEL_HEADERS_STORAGE_KEY, tpkId)
  const [rows, setRows]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [importing, setImporting]   = useState(false)
  const [preview, setPreview]       = useState(null)
  const [invoisPreview, setInvoisPreview] = useState(null)
  const [invoisSaving, setInvoisSaving]   = useState(false)
  const [editRow, setEditRow]       = useState(null)
  const [editSaving, setEditSaving] = useState(false)
  const [deleteRow, setDeleteRow]             = useState(null)
  const [deleting, setDeleting]               = useState(false)
  const [selectedIds, setSelectedIds]         = useState(new Set())
  const [showBatchDelete, setShowBatchDelete] = useState(false)
  const [batchDeleting, setBatchDeleting]     = useState(false)
  const [showBatchEdit, setShowBatchEdit]     = useState(false)
  const [batchEditData, setBatchEditData]     = useState({ tgl_kapling: '', periode: '', no_blok: '', sertifikasi: '' })
  const [batchEditSaving, setBatchEditSaving] = useState(false)
  const { toast, showToast } = useToast(3500)
  const [contextMenu, setContextMenu]         = useState(null)

  const [colMap, setColMap] = useState(() => {
    try { return JSON.parse(localStorage.getItem(colMapStorageKey)) || DEFAULT_COL_MAP }
    catch { return DEFAULT_COL_MAP }
  })
  const [excelHeaders, setExcelHeaders] = useState(() => {
    try { return JSON.parse(localStorage.getItem(excelHeadersStorageKey)) || [] }
    catch { return [] }
  })
  const [showSettings, setShowSettings] = useState(false)
  const [draftMap, setDraftMap]         = useState(DEFAULT_COL_MAP)
  const [pageSize, setPageSize]         = useState(50)
  const [currentPage, setCurrentPage]   = useState(1)
  const [sorts, setSorts]               = useState([])
  const [showSortPanel, setShowSortPanel] = useState(false)
  const [draftSorts, setDraftSorts]     = useState([])
  const [searchTerm, setSearchTerm]     = useState('')
  const [searchCol, setSearchCol]       = useState('all')
  const [showColDropdown, setShowColDropdown] = useState(false)
  const [realtimeStatus, setRealtimeStatus] = useState('connecting')
  const [penguranganInvoices, setPenguranganInvoices] = useState([])
  const [showFixPrefix, setShowFixPrefix]   = useState(false)
  const [fixPrefixMap, setFixPrefixMap]     = useState({})
  const [fixPrefixSaving, setFixPrefixSaving] = useState(false)

  const [showDkhpModal, setShowDkhpModal]   = useState(false)
  const [dkhpModalRows, setDkhpModalRows]   = useState([])
  const [dkhpInput, setDkhpInput]           = useState('')
  const [dkhpConflicts, setDkhpConflicts]   = useState([])
  const [dkhpStep, setDkhpStep]             = useState('input')
  const [dkhpSaving, setDkhpSaving]         = useState(false)
  const [dkhpImportPreview, setDkhpImportPreview] = useState(null)
  const [dkhpImportSaving, setDkhpImportSaving]   = useState(false)

  const fileRef         = useRef()
  const invoisRef       = useRef()
  const dkhpImportRef   = useRef()
  const selectAllRef    = useRef()
  const colDropdownRef  = useRef()

  useEffect(() => {
    try { setColMap(JSON.parse(localStorage.getItem(colMapStorageKey)) || DEFAULT_COL_MAP) }
    catch { setColMap(DEFAULT_COL_MAP) }
    try { setExcelHeaders(JSON.parse(localStorage.getItem(excelHeadersStorageKey)) || []) }
    catch { setExcelHeaders([]) }
  }, [colMapStorageKey, excelHeadersStorageKey])

  useEffect(() => {
    if (!tpkId) {
      setRows([])
      setSelectedIds(new Set())
      setLoading(false)
      setRealtimeStatus('disconnected')
      return
    }

    fetchData()

    const channel = supabase
      .channel(`register_kapling_rt:${tpkId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tabel_register_kapling',
        filter: `tpk_id=eq.${tpkId}`,
      }, () => {
        fetchData()
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('connected')
        else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') setRealtimeStatus('disconnected')
        else setRealtimeStatus('connecting')
      })

    return () => { supabase.removeChannel(channel) }
  }, [tpkId])

  async function fetchData() {
    if (!tpkId) return
    setLoading(true)
    const PAGE = 500
    const all = []
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from('tabel_register_kapling')
        .select('id,tpk_id,no_kapling,tgl_kapling,periode,no_blok,jenis,sortimen,sort_untuk,panjang,lebar,diameter_tebal,status,mutu,cacat,asal_kayu,sertifikasi,batang,volume,no_invois,pembeli,dkhp,skshhk,file_name')
        .eq('tpk_id', tpkId)
        .order('no_kapling', { ascending: true })
        .range(from, from + PAGE - 1)
      if (error) { showToast(error.message, 'error'); break }
      if (!data || data.length === 0) break
      all.push(...data)
      if (data.length < PAGE) break
    }
    setRows(all)
    setSelectedIds(new Set())

    const { data: pgPeriods } = await supabase
      .from('tabel_dk310_periods')
      .select('id')
      .eq('tpk_id', tpkId)
      .eq('jenis', 'pengurangan')
    if (pgPeriods && pgPeriods.length > 0) {
      const { data: sbRows } = await supabase
        .from('tabel_dk310_surat_bukti')
        .select('nomor_surat')
        .in('period_id', pgPeriods.map(p => p.id))
      setPenguranganInvoices((sbRows || []).map(r => r.nomor_surat).filter(Boolean))
    } else {
      setPenguranganInvoices([])
    }

    setLoading(false)
  }

  useEffect(() => {
    if (!contextMenu) return
    function dismiss(e) {
      if (e.type === 'keydown' && e.key !== 'Escape') return
      setContextMenu(null)
    }
    document.addEventListener('mousedown', dismiss)
    document.addEventListener('keydown', dismiss)
    return () => {
      document.removeEventListener('mousedown', dismiss)
      document.removeEventListener('keydown', dismiss)
    }
  }, [contextMenu])

  function saveColMap(newMap) {
    setColMap(newMap)
    localStorage.setItem(colMapStorageKey, JSON.stringify(newMap))
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
        localStorage.setItem(excelHeadersStorageKey, JSON.stringify(headers))
      }

      if (!parsed.length) {
        showToast('Tidak ada data yang bisa dibaca. Cek pengaturan header kolom.', 'error')
        return
      }

      const existingKeys  = new Set(rows.map(r => r.no_kapling))
      const existingByKey = Object.fromEntries(rows.map(r => [r.no_kapling, r]))

      const newRows = parsed.filter(r => !existingKeys.has(r.no_kapling))

      // update candidates: existing kaplings with at least one empty field
      const updateRows = []
      for (const excelRow of parsed) {
        if (!existingKeys.has(excelRow.no_kapling)) continue
        const dbRow = existingByKey[excelRow.no_kapling]
        const fields = []
        for (const f of FIELD_DEFS) {
          if (f.key === 'no_kapling') continue
          const dbVal    = dbRow[f.key]
          const excelVal = excelRow[f.key]
          const dbEmpty  = dbVal === null || dbVal === undefined || dbVal === ''
          const hasVal   = excelVal !== null && excelVal !== undefined && excelVal !== ''
          if (dbEmpty && hasVal) fields.push({ key: f.key, label: f.label, newVal: excelVal })
        }
        if (fields.length) updateRows.push({ row: excelRow, fields })
      }

      setPreview({
        rows:       parsed,
        fileName:   file.name,
        newCount:   newRows.length,
        skipCount:  parsed.length - newRows.length - updateRows.length,
        updateRows,
        mode:       'insert',
      })
    }
    reader.readAsBinaryString(file)
  }

  async function handleImport() {
    if (!preview) return
    setImporting(true)
    if (!tpkId) {
      setImporting(false)
      showToast('Profil pengguna tidak ditemukan. Coba login ulang.', 'error')
      return
    }

    if (preview.mode === 'insert') {
      const existingKeys = new Set(rows.map(r => r.no_kapling))
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
      const { error } = await supabase.from('tabel_register_kapling').insert(newRows)
      setImporting(false)
      if (error) { showToast(error.message, 'error'); return }
      showToast(`${newRows.length} kapling baru berhasil diimport`)
    } else {
      // update empty fields mode
      const { updateRows } = preview
      let ok = 0, fail = 0
      for (const { row, fields } of updateRows) {
        const patch = Object.fromEntries(fields.map(f => [f.key, f.newVal]))
        const { error } = await supabase
          .from('tabel_register_kapling')
          .update(patch)
          .eq('tpk_id', tpkId)
          .eq('no_kapling', row.no_kapling)
        error ? fail++ : ok++
      }
      setImporting(false)
      if (fail) { showToast(`${ok} berhasil, ${fail} gagal diupdate`, 'error'); return }
      showToast(`${ok} kapling berhasil diupdate`)
    }

    setPreview(null)
    fetchData()
  }

  // ── Edit / Add row ────────────────────────────────────────────────────────
  async function handleEditSave() {
    if (!editRow) return
    if (!editRow.no_kapling?.trim()) { showToast('No. Kapling wajib diisi.', 'error'); return }
    if (!tpkId) { showToast('Profil TPK tidak ditemukan. Coba login ulang.', 'error'); return }
    setEditSaving(true)
    const payload = {
      tgl_kapling:    editRow.tgl_kapling || null,
      periode:        editRow.periode,
      no_blok:        editRow.no_blok,
      jenis:          editRow.jenis,
      sortimen:       editRow.sortimen,
      sort_untuk:     editRow.sort_untuk || null,
      panjang:        editRow.panjang,
      lebar:          editRow.lebar || null,
      diameter_tebal: editRow.diameter_tebal,
      status:         editRow.status,
      mutu:           editRow.mutu,
      cacat:          editRow.cacat,
      asal_kayu:      editRow.asal_kayu || null,
      sertifikasi:    editRow.sertifikasi,
      batang:         Number(editRow.batang) || 0,
      volume:         Number(editRow.volume) || 0,
      no_invois:      editRow.no_invois || null,
      pembeli:        editRow.pembeli || null,
      dkhp:           editRow.dkhp || null,
      skshhk:         editRow.skshhk || null,
    }
    let error
    if (editRow._new) {
      payload.no_kapling = editRow.no_kapling.trim()
      payload.tpk_id     = tpkId
      ;({ error } = await supabase.from('tabel_register_kapling').insert(payload))
    } else {
      ;({ error } = await supabase
        .from('tabel_register_kapling')
        .update(payload)
        .eq('tpk_id', tpkId)
        .eq('id', editRow.id)
      )
    }
    setEditSaving(false)
    if (error) { showToast(error.message, 'error'); return }
    showToast(editRow._new ? 'Kapling baru berhasil ditambahkan' : 'Data kapling berhasil diperbarui')
    setEditRow(null)
    fetchData()
  }

  // ── Batch delete ─────────────────────────────────────────────────────────
  async function handleBatchDelete() {
    if (!tpkId) { showToast('Profil TPK tidak ditemukan. Coba login ulang.', 'error'); return }
    setBatchDeleting(true)
    const ids = [...selectedIds]
    const { error } = await supabase
      .from('tabel_register_kapling')
      .delete()
      .eq('tpk_id', tpkId)
      .in('id', ids)
    setBatchDeleting(false)
    if (error) { showToast(error.message, 'error'); return }
    showToast(`${ids.length} kapling berhasil dihapus`)
    setShowBatchDelete(false)
    fetchData()
  }

  // ── Batch edit ───────────────────────────────────────────────────────────
  async function handleBatchEdit() {
    if (!tpkId) { showToast('Profil TPK tidak ditemukan. Coba login ulang.', 'error'); return }
    const patch = {}
    if (batchEditData.tgl_kapling) patch.tgl_kapling = batchEditData.tgl_kapling
    if (batchEditData.periode)     patch.periode      = batchEditData.periode
    if (batchEditData.no_blok)     patch.no_blok      = batchEditData.no_blok
    if (batchEditData.sertifikasi) patch.sertifikasi  = batchEditData.sertifikasi
    if (Object.keys(patch).length === 0) {
      showToast('Isi minimal satu field untuk diupdate.', 'error')
      return
    }
    setBatchEditSaving(true)
    const ids = [...selectedIds]
    const { error } = await supabase
      .from('tabel_register_kapling')
      .update(patch)
      .eq('tpk_id', tpkId)
      .in('id', ids)
    setBatchEditSaving(false)
    if (error) { showToast(error.message, 'error'); return }
    showToast(`${ids.length} kapling berhasil diupdate`)
    setShowBatchEdit(false)
    setBatchEditData({ tgl_kapling: '', periode: '', no_blok: '', sertifikasi: '' })
    fetchData()
  }

  // ── Delete row ────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteRow) return
    if (!tpkId) { showToast('Profil TPK tidak ditemukan. Coba login ulang.', 'error'); return }
    setDeleting(true)
    const { error } = await supabase
      .from('tabel_register_kapling')
      .delete()
      .eq('tpk_id', tpkId)
      .eq('id', deleteRow.id)
    setDeleting(false)
    if (error) { showToast(error.message, 'error'); return }
    showToast(`Kapling ${deleteRow.no_kapling} berhasil dihapus`)
    setDeleteRow(null)
    fetchData()
  }

  // ── PDF invoice input ─────────────────────────────────────────────────────
  async function handleInvoisFileChange(e) {
    const files = [...(e.target.files || [])]
    if (!files.length) return
    e.target.value = ''
    const rowsByKapling = new Map(rows.map(r => [r.no_kapling, r]))
    const invoices = []
    const errors = []

    try {
      for (const file of files) {
        try {
          const { noInvois, pembeli, kaplingList } = await parsePdfInvoice(file)
          if (!noInvois) {
            errors.push({ fileName: file.name, message: 'Nomor invois tidak ditemukan.' })
            continue
          }
          const matched   = kaplingList.map(k => rowsByKapling.get(k)).filter(Boolean)
          const unmatched = kaplingList.filter(k => !rowsByKapling.has(k))
          invoices.push({ noInvois, pembeli, matched, unmatched, fileName: file.name })
        } catch (err) {
          errors.push({ fileName: file.name, message: err.message })
        }
      }

      if (!invoices.length) {
        showToast(errors.length ? 'Tidak ada PDF invois yang bisa dibaca.' : 'Tidak ada data invois ditemukan.', 'error')
        return
      }

      const seenKaplings = new Map()
      const duplicateKaplings = []
      for (const invoice of invoices) {
        for (const row of invoice.matched) {
          if (seenKaplings.has(row.no_kapling)) duplicateKaplings.push(row.no_kapling)
          seenKaplings.set(row.no_kapling, invoice.noInvois)
        }
      }

      setInvoisPreview({
        invoices,
        errors,
        duplicateKaplings: [...new Set(duplicateKaplings)],
        fileCount: files.length,
        totalMatched: invoices.reduce((s, inv) => s + inv.matched.length, 0),
        totalUnmatched: invoices.reduce((s, inv) => s + inv.unmatched.length, 0),
      })
    } catch (err) {
      showToast('Gagal membaca PDF invois: ' + err.message, 'error')
    }
  }

  async function handleInvoisSave() {
    if (!invoisPreview?.totalMatched) return
    if (!tpkId) { showToast('Profil TPK tidak ditemukan. Coba login ulang.', 'error'); return }
    setInvoisSaving(true)
    let updates
    try {
      updates = buildInvoiceKaplingUpdates({ tpkId, invoices: invoisPreview.invoices })
    } catch (err) {
      setInvoisSaving(false)
      showToast(err.message, 'error')
      return
    }
    const results = await Promise.all(updates.map(update => supabase
      .from('tabel_register_kapling')
      .update({ no_invois: update.no_invois, pembeli: update.pembeli })
      .eq('tpk_id', tpkId)
      .eq('id', update.id)
    ))
    const error = results.find(res => res.error)?.error
    setInvoisSaving(false)
    if (error) { showToast(error.message, 'error'); return }
    showToast(`${updates.length} kapling diperbarui dari ${invoisPreview.invoices.length} invois`)
    setInvoisPreview(null)
    fetchData()
  }

  function handleOpenDkhpModal(targetRows) {
    setDkhpModalRows(targetRows)
    setDkhpInput('')
    setDkhpConflicts([])
    setDkhpStep('input')
    setShowDkhpModal(true)
  }

  function handleCheckDkhp() {
    const val = dkhpInput.trim()
    if (!val) return
    const conflicts = dkhpModalRows.filter(r => r.dkhp && String(r.dkhp).trim() !== val)
    if (conflicts.length > 0) {
      setDkhpConflicts(conflicts)
      setDkhpStep('confirm-conflicts')
    } else {
      handleSaveDkhp(false)
    }
  }

  async function handleSaveDkhp(skipConflicts) {
    const val = dkhpInput.trim()
    const conflictIds = new Set(dkhpConflicts.map(r => r.id))
    const targets = skipConflicts
      ? dkhpModalRows.filter(r => !conflictIds.has(r.id))
      : dkhpModalRows
    if (!targets.length) { setShowDkhpModal(false); return }
    setDkhpSaving(true)
    const { data: dkhpRec } = await supabase
      .from('tabel_dkhp_skshhk')
      .select('no_skshhk')
      .eq('tpk_id', tpkId)
      .eq('no_dkhp', val)
      .maybeSingle()
    const patch = { dkhp: val, ...(dkhpRec?.no_skshhk ? { skshhk: dkhpRec.no_skshhk } : {}) }
    const { error } = await supabase
      .from('tabel_register_kapling')
      .update(patch)
      .in('id', targets.map(r => r.id))
    setDkhpSaving(false)
    if (error) { toast('Gagal menyimpan DKHP', 'error'); return }
    toast(`DKHP ${val}${dkhpRec?.no_skshhk ? ` · SKSHHK ${dkhpRec.no_skshhk}` : ''} disimpan untuk ${targets.length} kapling`, 'success')
    setShowDkhpModal(false)
    fetchData()
  }

  async function handleDkhpImportFiles(e) {
    const files = [...(e.target.files || [])]
    if (!files.length) return
    e.target.value = ''
    const rowsByKapling = new Map(rows.map(r => [r.no_kapling, r]))
    const dkhpList = []
    const errors = []

    const normRange = (val) => {
      if (!val && val !== 0) return ''
      if (val instanceof Date) return `${val.getMonth() + 1}-${val.getDate()}`
      return String(val).replace(/\//g, '-')
    }

    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })

        const dkhpCell = String(raw[6]?.[0] ?? '')
        const dkhpMatch = dkhpCell.match(/2631602[.\s]*(\d+)/)
        if (!dkhpMatch) {
          errors.push({ fileName: file.name, message: 'Nomor DKHP tidak ditemukan' })
          continue
        }
        const dkhpNo = String(parseInt(dkhpMatch[1], 10))

        const dataRows = raw.filter(row => Number.isFinite(row?.[0]) && /^2621302\d{6}$/.test(String(row?.[1] ?? '').trim()))
        if (!dataRows.length) {
          errors.push({ fileName: file.name, message: 'Tidak ada data kayu ditemukan' })
          continue
        }

        const sorts = new Set(dataRows.map(r => String(r[4] ?? '').trim().toUpperCase()))
        const isAIII = sorts.has('AIII')

        const kaplingNums = [...new Set(dataRows.map(r => String(r[1] ?? '').trim()).filter(Boolean))]
        const matched = kaplingNums.map(k => rowsByKapling.get(k)).filter(Boolean)
        const unmatched = kaplingNums.filter(k => !rowsByKapling.has(k))
        const conflicts = matched.filter(r => r.dkhp && String(r.dkhp) !== dkhpNo)

        const aiiiBatang = []
        if (isAIII) {
          for (const row of dataRows) {
            const noKapling = String(row[1] ?? '').trim()
            const noBatang  = String(row[2] ?? '').trim()
            const panjang   = parseFloat(row[6])
            const diameter  = parseInt(row[7], 10)
            const volume    = parseFloat(row[9])
            if (!noKapling || !noBatang) continue
            aiiiBatang.push({ no_kapling: noKapling, no_batang: noBatang, panjang, diameter, volume })
          }
        }

        dkhpList.push({ dkhpNo, matched, unmatched, conflicts, aiiiBatang, fileName: file.name })
      } catch {
        errors.push({ fileName: file.name, message: 'Gagal membaca Excel' })
      }
    }

    if (!dkhpList.length) { toast('Tidak ada file Excel DKHP yang bisa dibaca', 'error'); return }
    setDkhpImportPreview({ dkhpList, errors })
  }

  async function handleDkhpImportSave(skipConflicts) {
    setDkhpImportSaving(true)
    const uniqueDkhpNos = [...new Set(dkhpImportPreview.dkhpList.map(d => d.dkhpNo))]
    const { data: skshhkRows } = await supabase
      .from('tabel_dkhp_skshhk')
      .select('no_dkhp, no_skshhk')
      .eq('tpk_id', tpkId)
      .in('no_dkhp', uniqueDkhpNos)
    const skshhkMap = Object.fromEntries((skshhkRows || []).map(r => [r.no_dkhp, r.no_skshhk]))
    let totalUpdated = 0
    let totalBatang = 0
    for (const dkhp of dkhpImportPreview.dkhpList) {
      const conflictIds = new Set(dkhp.conflicts.map(r => r.id))
      const targets = skipConflicts ? dkhp.matched.filter(r => !conflictIds.has(r.id)) : dkhp.matched
      if (targets.length) {
        const patch = { dkhp: dkhp.dkhpNo, ...(skshhkMap[dkhp.dkhpNo] ? { skshhk: skshhkMap[dkhp.dkhpNo] } : {}) }
        await supabase.from('tabel_register_kapling').update(patch).in('id', targets.map(r => r.id))
        totalUpdated += targets.length
      }
      if (dkhp.aiiiBatang?.length) {
        const validKaplings = new Set(targets.map(r => r.no_kapling))
        const batangRows = dkhp.aiiiBatang
          .filter(b => validKaplings.has(b.no_kapling))
          .map(b => ({ ...b, tpk_id: tpkId }))
        if (batangRows.length) {
          await supabase.from('tabel_batang_aiii').upsert(batangRows, { onConflict: 'no_kapling,no_batang', ignoreDuplicates: true })
          totalBatang += batangRows.length
        }
      }
    }
    setDkhpImportSaving(false)
    toast(`DKHP + SKSHHK tersimpan untuk ${totalUpdated} kapling${totalBatang ? ` · ${totalBatang} batang AIII` : ''}`, 'success')
    setDkhpImportPreview(null)
    fetchData()
  }

  function handleOpenFixPrefix() {
    // Bangun lookup: base nomor (tanpa prefix) → prefix dari dk310 pengurangan
    const dk310BaseMap = {}
    for (const nomSurat of penguranganInvoices) {
      const sPrefix = String(nomSurat).slice(0, 3).toUpperCase()
      if (!INVOIS_PREFIX_MAP[sPrefix]) continue
      const base = String(nomSurat).slice(3)
      if (base) dk310BaseMap[base] = sPrefix
    }

    // Hanya kumpulkan no_invois yang: (1) belum berprefiks, (2) ada cocokkannya di dk310
    const matched = {}
    for (const r of rows) {
      if (!r.no_invois) continue
      const key = r.no_invois.trim()
      const existingPrefix = key.slice(0, 3).toUpperCase()
      if (INVOIS_PREFIX_MAP[existingPrefix]) continue   // sudah punya prefix
      if (!dk310BaseMap[key]) continue                  // tidak ada di dk310
      if (!matched[key]) matched[key] = { noInvois: key, count: 0, prefix: dk310BaseMap[key] }
      matched[key].count++
    }

    setFixPrefixMap(matched)
    setShowFixPrefix(true)
  }

  async function handleApplyFixPrefix() {
    if (!tpkId) { showToast('Profil TPK tidak ditemukan.', 'error'); return }
    const entries = Object.values(fixPrefixMap).filter(e => e.prefix)
    if (!entries.length) { showToast('Pilih prefix untuk minimal satu nomor invois.', 'error'); return }
    setFixPrefixSaving(true)
    let ok = 0, fail = 0
    for (const { noInvois, prefix } of entries) {
      const newVal = prefix + noInvois
      const { error } = await supabase
        .from('tabel_register_kapling')
        .update({ no_invois: newVal })
        .eq('tpk_id', tpkId)
        .eq('no_invois', noInvois)
      error ? fail++ : ok++
    }
    setFixPrefixSaving(false)
    if (fail) { showToast(`${ok} berhasil, ${fail} gagal diupdate`, 'error') }
    else { showToast(`${ok} nomor invois berhasil diperbaiki`) }
    setShowFixPrefix(false)
    fetchData()
  }

  const kaplingInfo = useMemo(() => analyzeKapling(rows), [rows])

  const totalMissingCount = useMemo(() =>
    kaplingInfo
      ? kaplingInfo.missing.reduce((s, m) => s + Number(BigInt(m.to) - BigInt(m.from) + 1n), 0)
      : 0
  , [kaplingInfo])

  const missingInvoices = useMemo(() => {
    if (!penguranganInvoices.length) return []
    const registered = new Set(rows.map(r => r.no_invois).filter(Boolean))
    return [...new Set(penguranganInvoices.filter(inv => !registered.has(inv)))]
  }, [penguranganInvoices, rows])

  const SORTIMENS = ['AI', 'AII', 'AIII']

  const totalBatang = rows.reduce((s, r) => s + (r.batang || 0), 0)
  const totalVolume = rows.reduce((s, r) => s + Number(r.volume || 0), 0)

  const unsoldRows = rows.filter(r => !r.no_invois)
  const unsoldBatang = unsoldRows.reduce((s, r) => s + (r.batang || 0), 0)
  const unsoldVolume = unsoldRows.reduce((s, r) => s + Number(r.volume || 0), 0)
  const unsoldSortBatang = Object.fromEntries(SORTIMENS.map(m => [m, unsoldRows.filter(r => (r.sortimen || '').trim().toUpperCase() === m).reduce((s, r) => s + (r.batang || 0), 0)]))
  const unsoldSortVolume = Object.fromEntries(SORTIMENS.map(m => [m, unsoldRows.filter(r => (r.sortimen || '').trim().toUpperCase() === m).reduce((s, r) => s + Number(r.volume || 0), 0)]))

  function toggleSort(key) {
    setSorts(prev => {
      if (prev[0]?.key === key) {
        const newDir = prev[0].dir === 'asc' ? 'desc' : 'asc'
        return [{ key, dir: newDir }, ...prev.slice(1)]
      }
      return [{ key, dir: 'asc' }]
    })
    setCurrentPage(1)
  }

  function getSortVal(row, key) {
    if (key === 'mutu_label') return getMutuLabel(row).toLowerCase()
    if (key === 'tgl_kapling') return row.tgl_kapling || ''
    const col = COLS.find(c => c.key === key)
    if (col?.num) return Number(row[key]) || 0
    return String(row[key] ?? '').toLowerCase()
  }

  const sortedRows = sorts.length > 0
    ? [...rows].sort((a, b) => {
        for (const s of sorts) {
          const av = getSortVal(a, s.key)
          const bv = getSortVal(b, s.key)
          const col = COLS.find(c => c.key === s.key)
          const cmp = col?.num ? av - bv : av < bv ? -1 : av > bv ? 1 : 0
          if (cmp !== 0) return s.dir === 'asc' ? cmp : -cmp
        }
        return 0
      })
    : rows

  function getDisplayVal(row, key) {
    if (key === 'mutu_label') return getMutuLabel(row)
    if (key === 'tgl_kapling') return displayDate(row.tgl_kapling) || ''
    if (key === 'pembeli') return getPembeliName(row.pembeli) || ''
    if (key === 'volume') return Number(row.volume).toFixed(3)
    if ((key === 'panjang' || key === 'diameter_tebal') && Number(row.batang) <= 1)
      return simplifyRange(String(row[key] ?? ''))
    return String(row[key] ?? '')
  }

  const searchedRows = searchTerm.trim()
    ? sortedRows.filter(row => {
        const q = searchTerm.trim().toLowerCase()
        if (searchCol === 'all')
          return COLS.some(c => getDisplayVal(row, c.key).toLowerCase().includes(q))
        return getDisplayVal(row, searchCol).toLowerCase().includes(q)
      })
    : sortedRows

  const filteredBatang = searchedRows.reduce((s, r) => s + (r.batang || 0), 0)
  const filteredVolume = searchedRows.reduce((s, r) => s + Number(r.volume || 0), 0)

  const totalPages   = pageSize === 0 ? 1 : Math.ceil(searchedRows.length / pageSize)
  const safePage     = Math.min(currentPage, totalPages || 1)
  const displayedRows = pageSize === 0
    ? searchedRows
    : searchedRows.slice((safePage - 1) * pageSize, safePage * pageSize)

  const displayedIds = displayedRows.map(r => r.id)
  const allSelected  = displayedIds.length > 0 && displayedIds.every(id => selectedIds.has(id))
  const someSelected = displayedIds.some(id => selectedIds.has(id))

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected && !allSelected
  }, [someSelected, allSelected])

  useEffect(() => { setCurrentPage(1) }, [searchTerm, searchCol])

  useEffect(() => {
    if (!showColDropdown) return
    function onClickOutside(e) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(e.target)) setShowColDropdown(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [showColDropdown])

  function toggleSelectRow(id) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function toggleSelectAll() {
    setSelectedIds(prev => {
      const n = new Set(prev)
      if (allSelected) displayedIds.forEach(id => n.delete(id))
      else displayedIds.forEach(id => n.add(id))
      return n
    })
  }

  const PAGE_SIZES = [
    { label: '10',    value: 10 },
    { label: '20',    value: 20 },
    { label: '50',    value: 50 },
    { label: '100',   value: 100 },
    { label: '500',   value: 500 },
    { label: '1.000', value: 1000 },
    { label: 'Semua', value: 0 },
  ]

  const sortBatang = Object.fromEntries(SORTIMENS.map(m => [m, rows.filter(r => (r.sortimen || '').trim().toUpperCase() === m).reduce((s, r) => s + (r.batang || 0), 0)]))
  const sortVolume = Object.fromEntries(SORTIMENS.map(m => [m, rows.filter(r => (r.sortimen || '').trim().toUpperCase() === m).reduce((s, r) => s + Number(r.volume || 0), 0)]))

  if (!tpkId) return <TpkRequiredState />

  return (
    <div style={{ padding: 24, height: '100vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0a0a0a', color: '#f0f0f0' }}>
      <style>{`
        .rk-input { background: rgba(255,255,255,0.03) !important; border: 1px solid rgba(255,255,255,0.1) !important; color: #f0f0f0 !important; border-radius: 3px; outline: none; font-family: monospace; font-size: 12px; color-scheme: dark; }
        .rk-input:focus { border-color: rgba(0,255,136,0.5) !important; box-shadow: 0 0 0 2px rgba(0,255,136,0.07); }
        .rk-input option { background: #111; color: #f0f0f0; font-family: monospace; }
        .rk-input option:hover,
        .rk-input option:focus,
        .rk-input option:checked {
          background: linear-gradient(0deg, rgba(0,255,136,0.18), rgba(0,255,136,0.18)), #111;
          color: #00ff88;
        }
        .rk-input::placeholder { color: rgba(255,255,255,0.2) !important; }
        .rk-input[type=number] { -moz-appearance: textfield; appearance: textfield; }
        .rk-input[type=number]::-webkit-inner-spin-button, .rk-input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .rk-row:hover td { background: rgba(255,255,255,0.025) !important; }
        .rk-row-sel td { background: rgba(0,255,136,0.05) !important; }
        .rk-th:hover { background: rgba(255,255,255,0.04) !important; }
        .rk-cb {
          appearance: none;
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          margin: 0;
          display: inline-grid;
          place-content: center;
          border-radius: 3px;
          border: 1px solid rgba(255,255,255,0.16);
          background: rgba(255,255,255,0.035);
          box-shadow: inset 0 0 0 1px rgba(0,0,0,0.18);
          vertical-align: middle;
          transition: background .16s ease, border-color .16s ease, box-shadow .16s ease, transform .16s ease;
        }
        .rk-cb::after {
          content: '';
          width: 7px;
          height: 4px;
          border-left: 2px solid #06130d;
          border-bottom: 2px solid #06130d;
          transform: rotate(-45deg) scale(0);
          transform-origin: center;
          margin-top: -1px;
          transition: transform .14s ease;
        }
        .rk-cb:hover {
          border-color: rgba(0,255,136,0.42);
          background: rgba(0,255,136,0.08);
          box-shadow: 0 0 0 2px rgba(0,255,136,0.06);
        }
        .rk-cb:checked {
          border-color: rgba(0,255,136,0.95);
          background: #00ff88;
          box-shadow: 0 0 12px rgba(0,255,136,0.28);
        }
        .rk-cb:checked::after {
          transform: rotate(-45deg) scale(1);
        }
        .rk-cb:indeterminate {
          border-color: rgba(0,255,136,0.85);
          background: rgba(0,255,136,0.16);
          box-shadow: 0 0 12px rgba(0,255,136,0.18);
        }
        .rk-cb:indeterminate::after {
          width: 8px;
          height: 2px;
          border: 0;
          border-radius: 999px;
          background: #00ff88;
          margin-top: 0;
          transform: scale(1);
        }
        .rk-cb:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px rgba(0,255,136,0.16), 0 0 12px rgba(0,255,136,0.24);
        }
        .rk-row:hover .rk-actions { opacity: 1 !important; }
      `}</style>

      <Toast toast={toast} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace' }}>Register Kapling</h1>
            <span style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 3, fontSize: 10, fontFamily: 'monospace', fontWeight: 600,
              background: realtimeStatus === 'connected' ? 'rgba(0,255,136,0.08)' : realtimeStatus === 'disconnected' ? 'rgba(255,107,107,0.08)' : 'rgba(255,170,0,0.08)',
              border: realtimeStatus === 'connected' ? '1px solid rgba(0,255,136,0.2)' : realtimeStatus === 'disconnected' ? '1px solid rgba(255,107,107,0.2)' : '1px solid rgba(255,170,0,0.2)',
              color: realtimeStatus === 'connected' ? '#00ff88' : realtimeStatus === 'disconnected' ? '#ff6b6b' : '#ffaa00',
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: realtimeStatus === 'connected' ? '#00ff88' : realtimeStatus === 'disconnected' ? '#ff6b6b' : '#ffaa00' }}/>
              {realtimeStatus === 'connected' ? 'live' : realtimeStatus === 'disconnected' ? 'offline' : 'connecting'}
            </span>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3, fontFamily: 'monospace' }}>data register kapling dari file dp kapling (.xlsx)</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => dkhpImportRef.current?.click()} title="Import DKHP dari Excel"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7px 9px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,255,136,0.07)'; e.currentTarget.style.color = '#00ff88'; e.currentTarget.style.borderColor = 'rgba(0,255,136,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
          ><FileBarChart2 size={14}/></button>
          <button onClick={() => { setDraftMap({ ...colMap }); setShowSettings(true) }} title="Pengaturan header kolom"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', fontSize: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#f0f0f0' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
          ><Settings size={14}/></button>
          <button onClick={() => setEditRow({ _new: true, no_kapling: '', tgl_kapling: '', periode: '', no_blok: '', jenis: '', sortimen: '', sort_untuk: '', panjang: '', lebar: '', diameter_tebal: '', status: '', mutu: '', cacat: '', asal_kayu: '', sertifikasi: '', batang: 0, volume: 0, no_invois: '', pembeli: '', dkhp: '', skshhk: '' })}
            title="Tambah Kapling"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7px 9px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, color: 'rgba(255,255,255,0.65)', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#f0f0f0' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}
          ><Plus size={14}/></button>
          <button onClick={() => invoisRef.current?.click()}
            title="Input invois"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7px 9px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, color: 'rgba(255,255,255,0.65)', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#f0f0f0' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}
          ><FileText size={14}/></button>
          {(() => {
            const needFix = new Set(rows.filter(r => r.no_invois && !INVOIS_PREFIX_MAP[String(r.no_invois).trim().slice(0, 3).toUpperCase()]).map(r => String(r.no_invois).trim())).size
            if (!needFix) return null
            return (
              <button onClick={handleOpenFixPrefix} title="FIX INVOIS (ECR / ECK / EKK)"
                style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7px 9px', background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.25)', borderRadius: 3, color: '#ffaa00', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,170,0,0.18)'; e.currentTarget.style.borderColor = 'rgba(255,170,0,0.45)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,170,0,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,170,0,0.25)' }}
              >
                <Tag size={14}/>
                <span style={{
                  position: 'absolute', top: -6, right: -6,
                  minWidth: 16, height: 16, borderRadius: 8,
                  background: '#ffaa00', color: '#0a0a0a',
                  fontSize: 10, fontWeight: 700, fontFamily: 'monospace',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px', lineHeight: 1,
                }}>{needFix}</span>
              </button>
            )
          })()}
          <button onClick={() => fileRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: 12, background: '#00ff88', color: '#0a0a0a', borderRadius: 3, border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 700 }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          ><Upload size={14}/> import excel</button>
        </div>
        <input ref={fileRef}   type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange}/>
        <input ref={invoisRef} type="file" accept=".pdf" multiple className="hidden" onChange={handleInvoisFileChange}/>
        <input ref={dkhpImportRef} type="file" accept=".xlsx" multiple className="hidden" onChange={handleDkhpImportFiles}/>
      </div>

      {/* Summary cards */}
      {rows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>

          {/* Card 1: Total Kapling */}
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, padding: '16px 20px', display: 'flex', gap: 16 }}>
            <div style={{ flexShrink: 0 }}>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 3, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>total kapling</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace' }}>{rows.length.toLocaleString('id')}</p>
              {kaplingInfo && (
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 6, fontFamily: 'monospace' }}>
                  terakhir: <span style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>{kaplingInfo.shorten(kaplingInfo.last)}</span>
                </p>
              )}
            </div>
            {kaplingInfo?.missing.length > 0 && (
              <div style={{ flex: 1, minWidth: 0, borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: 16 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: '#ffaa00', marginBottom: 6, fontFamily: 'monospace' }}>
                  missing <span style={{ fontWeight: 700 }}>{totalMissingCount.toLocaleString('id')}</span>
                  <span style={{ opacity: 0.6 }}> ({kaplingInfo.missing.length} gap)</span>
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, maxHeight: 60, overflowY: 'auto' }}>
                  {kaplingInfo.missing.map((m, i) => (
                    <span key={i} style={{ fontSize: 10, fontFamily: 'monospace', background: 'rgba(255,170,0,0.08)', color: '#ffaa00', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 2, padding: '1px 5px', whiteSpace: 'nowrap' }}>
                      {m.from === m.to ? kaplingInfo.shorten(m.from) : `${kaplingInfo.shorten(m.from)}–${kaplingInfo.shorten(m.to)}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Invois Terlewat (dari DK310 Pengurangan) */}
          <div style={{
            background: missingInvoices.length > 0 ? 'rgba(255,107,107,0.04)' : 'rgba(0,255,136,0.03)',
            border: `1px solid ${missingInvoices.length > 0 ? 'rgba(255,107,107,0.18)' : 'rgba(0,255,136,0.12)'}`,
            borderRadius: 3, padding: '16px 20px',
          }}>
            <p style={{ fontSize: 10, color: missingInvoices.length > 0 ? 'rgba(255,107,107,0.7)' : 'rgba(0,255,136,0.5)', marginBottom: 4, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              invois terlewat
            </p>
            {penguranganInvoices.length === 0 ? (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', marginTop: 6 }}>belum ada data dk310</p>
            ) : missingInvoices.length === 0 ? (
              <>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#00ff88', fontFamily: 'monospace', lineHeight: 1 }}>0</p>
                <p style={{ fontSize: 10, color: 'rgba(0,255,136,0.5)', marginTop: 5, fontFamily: 'monospace' }}>semua invois terisi</p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#ff6b6b', fontFamily: 'monospace', lineHeight: 1, marginBottom: 8 }}>
                  {missingInvoices.length}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 72, overflowY: 'auto' }}>
                  {missingInvoices.map(inv => {
                    const prefix = String(inv).slice(0, 3).toUpperCase()
                    const pfx = INVOIS_PREFIX_MAP[prefix]
                    return (
                      <div key={inv} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        {pfx && (
                          <span style={{ ...RK_BADGE_BASE, background: pfx.bg, color: pfx.color, border: `1px solid ${pfx.border}`, fontSize: 9 }}>
                            {prefix}
                          </span>
                        )}
                        <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inv}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Card 3: Total Batang + Volume (gabungan) */}
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 3, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>total batang</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace', lineHeight: 1 }}>{totalBatang.toLocaleString('id')}</p>
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                {SORTIMENS.map(m => (
                  <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{m}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace' }}>{sortBatang[m].toLocaleString('id')}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
              <p style={{ fontSize: 10, color: 'rgba(55,145,101,0.65)', marginBottom: 3, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>total volume</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: '#379165', fontFamily: 'monospace', lineHeight: 1 }}>
                {totalVolume.toFixed(3)} <span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(55,145,101,0.5)' }}>m³</span>
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                {SORTIMENS.map(m => (
                  <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(55,145,101,0.5)', fontFamily: 'monospace' }}>{m}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(55,145,101,0.8)', fontFamily: 'monospace' }}>{sortVolume[m].toFixed(3)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 4: Sisa Persediaan */}
          <div style={{ background: 'rgba(255,170,0,0.04)', border: '1px solid rgba(255,170,0,0.15)', borderRadius: 3, padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ flexShrink: 0 }}>
              <p style={{ fontSize: 10, color: 'rgba(255,170,0,0.55)', marginBottom: 3, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>sisa persediaan</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#ffaa00', fontFamily: 'monospace', lineHeight: 1 }}>
                {unsoldVolume.toFixed(3)} <span style={{ fontSize: 11, color: 'rgba(255,170,0,0.55)', fontWeight: 600 }}>m³</span>
              </p>
              <p style={{ fontSize: 10, color: 'rgba(255,170,0,0.5)', fontFamily: 'monospace', marginTop: 4 }}>{unsoldBatang.toLocaleString('id')} batang</p>
            </div>
            <div style={{ flex: 1, borderLeft: '1px solid rgba(255,170,0,0.12)', paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {SORTIMENS.map(m => (
                <div key={m} style={{ display: 'grid', gridTemplateColumns: '26px minmax(74px, 1fr) 1px minmax(58px, 0.8fr)', alignItems: 'center', columnGap: 9 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,170,0,0.4)', fontFamily: 'monospace' }}>{m}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,170,0,0.7)', fontFamily: 'monospace', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {unsoldSortVolume[m].toFixed(3)} <span style={{ fontSize: 9, color: 'rgba(255,170,0,0.45)' }}>m³</span>
                  </span>
                  <span style={{ height: 12, background: 'rgba(255,170,0,0.2)' }} />
                  <span style={{ fontSize: 10, color: 'rgba(255,170,0,0.5)', fontFamily: 'monospace', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {unsoldSortBatang[m].toLocaleString('id')} btg
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Settings modal */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, width: '100%', maxWidth: 480, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <p style={{ fontWeight: 600, color: '#f0f0f0', fontFamily: 'monospace', fontSize: 13 }}>pengaturan header kolom</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3, fontFamily: 'monospace' }}>sesuaikan nama header kolom sesuai file excel</p>
              </div>
              <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}><X size={14}/></button>
            </div>
            {excelHeaders.length > 0 && <datalist id="excel-headers-list">{excelHeaders.map(h => <option key={h} value={h}/>)}</datalist>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
              {FIELD_DEFS.map(f => (
                <div key={f.key} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'center' }}>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace', fontWeight: 500 }}>
                    {f.label}{f.required && <span style={{ color: '#ff6b6b', marginLeft: 2 }}>*</span>}
                  </label>
                  <input list="excel-headers-list" value={draftMap[f.key] || ''} onChange={e => setDraftMap(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder="nama header di excel..." className="rk-input" style={{ padding: '5px 8px', width: '100%', boxSizing: 'border-box' }}/>
                </div>
              ))}
            </div>
            {excelHeaders.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, padding: '8px 12px', marginBottom: 16 }}>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 3, fontFamily: 'monospace' }}>header terdeteksi:</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace', lineHeight: 1.6 }}>{excelHeaders.join(', ')}</p>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <button onClick={() => setDraftMap({ ...DEFAULT_COL_MAP })} style={{ padding: '7px 12px', fontSize: 11, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace' }}>reset default</button>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setShowSettings(false)} style={{ padding: '7px 14px', fontSize: 11, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace' }}>batal</button>
                <button onClick={() => { saveColMap(draftMap); setShowSettings(false); showToast('Pengaturan disimpan') }} style={{ padding: '7px 14px', fontSize: 11, borderRadius: 3, background: '#00ff88', color: '#0a0a0a', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 700 }}>simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Excel import preview modal */}
      {preview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 24px 16px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ padding: 8, background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 3 }}>
                  <FileSpreadsheet size={16} style={{ color: '#00ff88' }}/>
                </div>
                <div>
                  <p style={{ fontWeight: 600, color: '#f0f0f0', fontSize: 13, fontFamily: 'monospace' }}>{preview.fileName}</p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2, fontFamily: 'monospace' }}>{preview.rows.length} baris ditemukan</p>
                </div>
              </div>
              <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}><X size={14}/></button>
            </div>
            <div style={{ padding: '0 24px', flexShrink: 0 }}>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 3, padding: 3, marginBottom: 16 }}>
                {[{ key: 'insert', label: 'Tambah Baru', count: preview.newCount }, { key: 'update', label: 'Update Kosong', count: preview.updateRows.length }].map(tab => (
                  <button key={tab.key} onClick={() => setPreview(p => ({ ...p, mode: tab.key }))} style={{ flex: 1, padding: '6px 0', fontSize: 11, borderRadius: 2, fontFamily: 'monospace', cursor: 'pointer', border: 'none', background: preview.mode === tab.key ? 'rgba(255,255,255,0.08)' : 'transparent', color: preview.mode === tab.key ? '#f0f0f0' : 'rgba(255,255,255,0.38)', fontWeight: preview.mode === tab.key ? 600 : 400 }}>
                    {tab.label} <span style={{ marginLeft: 4, padding: '1px 5px', borderRadius: 99, fontSize: 9, fontWeight: 700, background: preview.mode === tab.key ? '#00ff88' : 'rgba(255,255,255,0.08)', color: preview.mode === tab.key ? '#0a0a0a' : 'rgba(255,255,255,0.4)' }}>{tab.count}</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ padding: '0 24px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
              {preview.mode === 'insert' ? (
                <>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                    <div style={{ flex: 1, background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 3, padding: '12px 16px' }}>
                      <p style={{ fontSize: 10, color: '#00ff88', marginBottom: 3, fontFamily: 'monospace' }}>kapling baru</p>
                      <p style={{ fontSize: 20, fontWeight: 700, color: '#00ff88', fontFamily: 'monospace' }}>{preview.newCount}</p>
                    </div>
                    {(preview.skipCount > 0 || preview.updateRows.length > 0) && (
                      <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, padding: '12px 16px' }}>
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3, fontFamily: 'monospace' }}>sudah ada</p>
                        <p style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{preview.skipCount + preview.updateRows.length}</p>
                      </div>
                    )}
                  </div>
                  <div style={{ background: preview.newCount === 0 ? 'rgba(255,170,0,0.06)' : 'rgba(0,180,255,0.06)', border: `1px solid ${preview.newCount === 0 ? 'rgba(255,170,0,0.2)' : 'rgba(0,180,255,0.2)'}`, borderRadius: 3, padding: '10px 14px', marginBottom: 14, fontSize: 11, fontFamily: 'monospace', color: preview.newCount === 0 ? '#ffaa00' : 'rgba(100,200,255,0.9)' }}>
                    {preview.newCount === 0 ? 'semua kapling dalam file ini sudah ada di database.' : 'hanya kapling baru yang akan ditambahkan. data yang sudah ada tidak akan diubah.'}
                  </div>
                </>
              ) : (
                <>
                  {preview.updateRows.length === 0 ? (
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, padding: '10px 14px', marginBottom: 14, fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)' }}>
                      tidak ada kapling dengan kolom kosong yang bisa diisi.
                    </div>
                  ) : (
                    <>
                      <div style={{ background: 'rgba(0,180,255,0.06)', border: '1px solid rgba(0,180,255,0.2)', borderRadius: 3, padding: '10px 14px', marginBottom: 10, fontSize: 11, fontFamily: 'monospace', color: 'rgba(100,200,255,0.9)' }}>
                        hanya kolom yang kosong di database yang akan diisi.
                      </div>
                      <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', marginBottom: 14 }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 12px', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace' }}>
                          <span>no. kapling</span><span>kolom yang akan diisi</span>
                        </div>
                        <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                          {preview.updateRows.map(({ row, fields }) => (
                            <div key={row.no_kapling} style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                              <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.65)', flexShrink: 0 }}>{row.no_kapling}</span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'flex-end' }}>
                                {fields.slice(0, 4).map(f => (
                                  <span key={f.key} style={{ fontSize: 9, background: 'rgba(0,180,255,0.08)', color: 'rgba(100,200,255,0.8)', border: '1px solid rgba(0,180,255,0.2)', borderRadius: 2, padding: '1px 5px', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{f.label}</span>
                                ))}
                                {fields.length > 4 && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>+{fields.length - 4}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', padding: '14px 24px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
              <button onClick={() => setPreview(null)} style={{ padding: '7px 14px', fontSize: 11, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace' }}>batal</button>
              {preview.mode === 'insert' ? (
                <button onClick={handleImport} disabled={importing || preview.newCount === 0} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 11, borderRadius: 3, background: (importing || !preview.newCount) ? 'rgba(0,255,136,0.15)' : '#00ff88', color: (importing || !preview.newCount) ? 'rgba(0,255,136,0.4)' : '#0a0a0a', border: 'none', cursor: (importing || !preview.newCount) ? 'not-allowed' : 'pointer', fontFamily: 'monospace', fontWeight: 700 }}>
                  {importing && <Loader2 size={11} className="animate-spin"/>}
                  {importing ? 'menyimpan…' : `tambah ${preview.newCount} kapling`}
                </button>
              ) : (
                <button onClick={handleImport} disabled={importing || preview.updateRows.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 11, borderRadius: 3, background: (importing || !preview.updateRows.length) ? 'rgba(0,180,255,0.15)' : 'rgba(0,180,255,0.9)', color: '#fff', border: 'none', cursor: (importing || !preview.updateRows.length) ? 'not-allowed' : 'pointer', fontFamily: 'monospace', fontWeight: 700 }}>
                  {importing && <Loader2 size={11} className="animate-spin"/>}
                  {importing ? 'mengupdate…' : `update ${preview.updateRows.length} kapling`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invoice PDF preview modal */}
      {invoisPreview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', maxHeight: '90vh', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ padding: 8, background: 'rgba(0,180,255,0.08)', border: '1px solid rgba(0,180,255,0.15)', borderRadius: 3 }}>
                  <FileText size={16} style={{ color: 'rgba(0,180,255,0.9)' }}/>
                </div>
                <div>
                  <p style={{ fontWeight: 600, color: '#f0f0f0', fontSize: 13, fontFamily: 'monospace' }}>{invoisPreview.invoices.length} invois siap diproses</p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2, fontFamily: 'monospace' }}>{invoisPreview.fileCount} file dipilih</p>
                </div>
              </div>
              <button onClick={() => setInvoisPreview(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}><X size={14}/></button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 3, padding: '12px 16px' }}>
                  <p style={{ fontSize: 10, color: '#00ff88', marginBottom: 3, fontFamily: 'monospace' }}>kapling ditemukan</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#00ff88', fontFamily: 'monospace' }}>{invoisPreview.totalMatched}</p>
                </div>
                {invoisPreview.totalUnmatched > 0 && (
                  <div style={{ flex: 1, background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.15)', borderRadius: 3, padding: '12px 16px' }}>
                    <p style={{ fontSize: 10, color: '#ffaa00', marginBottom: 3, fontFamily: 'monospace' }}>tidak ada di register</p>
                    <p style={{ fontSize: 20, fontWeight: 700, color: '#ffaa00', fontFamily: 'monospace' }}>{invoisPreview.totalUnmatched}</p>
                  </div>
                )}
                {invoisPreview.errors.length > 0 && (
                  <div style={{ flex: 1, background: 'rgba(255,107,107,0.06)', border: '1px solid rgba(255,107,107,0.15)', borderRadius: 3, padding: '12px 16px' }}>
                    <p style={{ fontSize: 10, color: '#ff6b6b', marginBottom: 3, fontFamily: 'monospace' }}>file gagal</p>
                    <p style={{ fontSize: 20, fontWeight: 700, color: '#ff6b6b', fontFamily: 'monospace' }}>{invoisPreview.errors.length}</p>
                  </div>
                )}
              </div>

              {invoisPreview.duplicateKaplings.length > 0 && (
                <div style={{ background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 3, padding: '10px 14px', fontSize: 11, fontFamily: 'monospace', color: '#ffaa00' }}>
                  {invoisPreview.duplicateKaplings.length} kapling muncul di lebih dari satu invois. Data terakhir dari urutan file yang dipilih akan dipakai.
                </div>
              )}

              {invoisPreview.invoices.map(invoice => (
                <div key={`${invoice.fileName}-${invoice.noInvois}`} style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ background: 'rgba(255,255,255,0.035)', padding: '9px 12px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', marginBottom: 3, fontFamily: 'monospace' }}>{invoice.fileName}</p>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace', overflowWrap: 'anywhere' }}>{invoice.noInvois}</p>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 3, fontFamily: 'monospace', overflowWrap: 'anywhere' }}>{invoice.pembeli || '-'}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ fontSize: 10, background: 'rgba(0,255,136,0.08)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 2, padding: '2px 6px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{invoice.matched.length} cocok</span>
                      {invoice.unmatched.length > 0 && <span style={{ fontSize: 10, background: 'rgba(255,170,0,0.08)', color: '#ffaa00', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 2, padding: '2px 6px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{invoice.unmatched.length} belum ada</span>}
                    </div>
                  </div>
                  {invoice.matched.length > 0 && (
                    <div>
                      {invoice.matched.slice(0, 20).map(r => (
                        <div key={`${invoice.noInvois}-${r.no_kapling}`} style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                          <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.65)' }}>{r.no_kapling}</span>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{r.jenis} · {r.sortimen}</span>
                        </div>
                      ))}
                      {invoice.matched.length > 20 && (
                        <div style={{ padding: '6px 12px', borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
                          +{invoice.matched.length - 20} kapling lainnya
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {invoisPreview.errors.length > 0 && (
                <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ background: 'rgba(255,107,107,0.06)', padding: '6px 12px', fontSize: 10, fontWeight: 600, color: '#ff6b6b', fontFamily: 'monospace' }}>file yang dilewati</div>
                  <div>
                    {invoisPreview.errors.map(err => (
                      <div key={err.fileName} style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.65)', overflowWrap: 'anywhere' }}>{err.fileName}</span>
                        <span style={{ fontSize: 10, color: 'rgba(255,107,107,0.85)', fontFamily: 'monospace', textAlign: 'right' }}>{err.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {invoisPreview.totalMatched === 0 && (
                <div style={{ background: 'rgba(255,107,107,0.06)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 3, padding: '10px 14px', fontSize: 11, fontFamily: 'monospace', color: '#ff6b6b' }}>
                  Tidak ada nomor kapling dalam invois yang cocok dengan data register. Pastikan data Excel sudah diimport terlebih dahulu.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexShrink: 0, paddingTop: 2 }}>
              <button onClick={() => setInvoisPreview(null)} style={{ padding: '7px 14px', fontSize: 11, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace' }}>batal</button>
              {invoisPreview.totalMatched > 0 && (
                <button onClick={handleInvoisSave} disabled={invoisSaving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 11, borderRadius: 3, background: invoisSaving ? 'rgba(0,255,136,0.15)' : '#00ff88', color: invoisSaving ? 'rgba(0,255,136,0.4)' : '#0a0a0a', border: 'none', cursor: invoisSaving ? 'not-allowed' : 'pointer', fontFamily: 'monospace', fontWeight: 700 }}>
                  {invoisSaving && <Loader2 size={11} className="animate-spin"/>}
                  {invoisSaving ? 'menyimpan...' : `simpan (${invoisPreview.totalMatched} kapling)`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fix Prefix Invois modal */}
      {showFixPrefix && (() => {
        const entries = Object.values(fixPrefixMap)
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 24px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                <div>
                  <p style={{ fontWeight: 600, color: '#f0f0f0', fontFamily: 'monospace', fontSize: 13 }}>perbaiki prefix invois</p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3, fontFamily: 'monospace' }}>
                    dicocokkan dari DK310 Pengurangan · {entries.length} nomor invois akan diperbarui
                  </p>
                </div>
                <button onClick={() => setShowFixPrefix(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}><X size={14}/></button>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: '8px 24px' }}>
                {entries.length === 0 ? (
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', padding: '24px 0', textAlign: 'center' }}>
                    tidak ada nomor invois yang bisa dicocokkan dengan DK310 Pengurangan.
                  </p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        <th style={{ padding: '6px 0', textAlign: 'left', fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>No. Invois (lama)</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', width: 36 }}>Kpl</th>
                        <th style={{ padding: '6px 0', textAlign: 'right', fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Menjadi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map(({ noInvois, count, prefix }) => {
                        const v = INVOIS_PREFIX_MAP[prefix]
                        return (
                          <tr key={noInvois} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '8px 0', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{noInvois}</td>
                            <td style={{ padding: '8px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{count}</td>
                            <td style={{ padding: '8px 0', textAlign: 'right' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ ...RK_BADGE_BASE, background: v.bg, color: v.color, border: `1px solid ${v.border}` }}>{prefix}</span>
                                <span style={{ color: 'rgba(255,255,255,0.75)' }}>{noInvois}</span>
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                <button onClick={() => setShowFixPrefix(false)} style={{ padding: '7px 14px', fontSize: 11, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace' }}>batal</button>
                <button onClick={handleApplyFixPrefix} disabled={fixPrefixSaving || entries.length === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 11, borderRadius: 3, fontFamily: 'monospace', fontWeight: 700, border: 'none', cursor: (fixPrefixSaving || !entries.length) ? 'not-allowed' : 'pointer', background: (fixPrefixSaving || !entries.length) ? 'rgba(255,170,0,0.15)' : 'rgba(255,170,0,0.9)', color: (fixPrefixSaving || !entries.length) ? 'rgba(255,170,0,0.4)' : '#0a0a0a' }}
                >
                  {fixPrefixSaving && <Loader2 size={11} className="animate-spin"/>}
                  {fixPrefixSaving ? 'menyimpan...' : `terapkan ${entries.length} invois`}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Edit modal */}
      {editRow && (() => {
        const iStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, padding: '6px 10px', color: '#f0f0f0', fontFamily: 'monospace', fontSize: 12, width: '100%', boxSizing: 'border-box', outline: 'none' }
        const selectStyle = { ...iStyle, backgroundColor: '#101a14', borderColor: 'rgba(0,255,136,0.28)', colorScheme: 'dark' }
        const handleNumberKey = (e, key) => {
          if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
          e.preventDefault()
          const isVolume = key === 'volume'
          const step = isVolume ? 0.001 : 1
          const current = Number(editRow[key]) || 0
          const next = Math.max(0, current + (e.key === 'ArrowUp' ? step : -step))
          setEditRow(prev => ({ ...prev, [key]: isVolume ? next.toFixed(3) : String(Math.round(next)) }))
        }
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, width: '100%', maxWidth: 640, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                <div>
                  <p style={{ fontWeight: 600, color: '#f0f0f0', fontFamily: 'monospace', fontSize: 13 }}>{editRow._new ? 'tambah kapling' : 'edit kapling'}</p>
                  {!editRow._new && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3, fontFamily: 'monospace' }}>{editRow.no_kapling}</p>}
                </div>
                <button onClick={() => setEditRow(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}><X size={14}/></button>
              </div>

              <div style={{ overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 10, fontFamily: 'monospace' }}>Identitas</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    {[
                      ...(editRow._new ? [{ label: 'No. Kapling', key: 'no_kapling', span: 3 }] : []),
                      { label: 'Tgl Kapling', key: 'tgl_kapling', type: 'date', span: 1 },
                      { label: 'Periode',     key: 'periode',     span: 1 },
                      { label: 'No Blok',     key: 'no_blok',     span: 1 },
                    ].map(f => (
                      <div key={f.key} style={f.span === 3 ? { gridColumn: '1 / -1' } : f.span === 2 ? { gridColumn: 'span 2' } : {}}>
                        <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4, fontFamily: 'monospace' }}>{f.label}</label>
                        <input type={f.type || 'text'} value={editRow[f.key] ?? ''} onChange={e => setEditRow(prev => ({ ...prev, [f.key]: e.target.value }))} className="rk-input" style={{ ...iStyle }} step={f.type === 'number' ? 'any' : undefined}/>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 10, fontFamily: 'monospace' }}>Kayu</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    {[
                      { label: 'Jenis Kayu',  key: 'jenis' },
                      { label: 'Sortimen',    key: 'sortimen' },
                      { label: 'Sort. Untuk', key: 'sort_untuk' },
                      { label: 'Asal Kayu',   key: 'asal_kayu' },
                      { label: 'Panjang',     key: 'panjang' },
                      { label: 'Lebar',       key: 'lebar' },
                      { label: 'Dia/Tebal',   key: 'diameter_tebal' },
                      { label: 'Jumlah',      key: 'batang',  type: 'number' },
                      { label: 'Volume (M³)', key: 'volume',  type: 'number' },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4, fontFamily: 'monospace' }}>{f.label}</label>
                        <input
                          type={f.type || 'text'}
                          value={editRow[f.key] ?? ''}
                          onChange={e => setEditRow(prev => ({ ...prev, [f.key]: e.target.value }))}
                          onKeyDown={f.type === 'number' ? e => handleNumberKey(e, f.key) : undefined}
                          className="rk-input"
                          style={{ ...iStyle }}
                          step={f.type === 'number' ? (f.key === 'volume' ? '0.001' : '1') : undefined}
                          min={f.type === 'number' ? '0' : undefined}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 10, fontFamily: 'monospace' }}>Kualitas</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    {[
                      { label: 'Status',      key: 'status',      opts: ['LOKAL', 'INDUSTRI'] },
                      { label: 'Mutu',        key: 'mutu',         opts: ['P', 'D', 'T', 'M', 'L', 'KBP'] },
                      { label: 'Cacat',       key: 'cacat',        opts: [{ v: 'NRM', l: 'NRM' }, { v: 'BUN', l: 'BUN (BC)' }, { v: 'DOR', l: 'DOR (DR)' }] },
                      { label: 'Sertifikasi', key: 'sertifikasi',  opts: ['FSC', 'NFSC'] },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4, fontFamily: 'monospace' }}>{f.label}</label>
                        <ThemedSelect
                          value={editRow[f.key] ?? ''}
                          onChange={next => setEditRow(prev => ({ ...prev, [f.key]: next }))}
                          options={[{ value: '', label: '— Pilih —' }, ...f.opts.map(o => typeof o === 'string' ? o : { value: o.v, label: o.l })]}
                          style={selectStyle}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 10, fontFamily: 'monospace' }}>Dokumen</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    {[
                      { label: 'No. Invois', key: 'no_invois', span: 2 },
                      { label: 'DKHP',       key: 'dkhp',    alignEnd: true },
                      { label: 'Pembeli',    key: 'pembeli', span: 2 },
                      { label: 'SKSHHK',     key: 'skshhk',  alignEnd: true },
                    ].map(f => (
                      <div key={f.key} style={{ ...(f.span === 2 ? { gridColumn: 'span 2' } : {}), ...(f.alignEnd ? { alignSelf: 'end' } : {}) }}>
                        <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4, fontFamily: 'monospace' }}>
                          {f.label}
                          {f.key === 'no_invois' && (
                            <span style={{ marginLeft: 8, display: 'inline-flex', gap: 4 }}>
                              {Object.entries(INVOIS_PREFIX_MAP).map(([k, v]) => (
                                <span key={k} title={v.desc} style={{ ...RK_BADGE_BASE, background: v.bg, color: v.color, border: `1px solid ${v.border}`, fontSize: 9 }}>{k}</span>
                              ))}
                            </span>
                          )}
                        </label>
                        <input type="text" value={editRow[f.key] ?? ''} onChange={e => setEditRow(prev => ({ ...prev, [f.key]: e.target.value }))} className="rk-input" style={{ ...iStyle }}/>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                <button onClick={() => setEditRow(null)} style={{ padding: '7px 14px', fontSize: 11, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace' }}>batal</button>
                <button onClick={handleEditSave} disabled={editSaving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 11, borderRadius: 3, background: editSaving ? 'rgba(0,255,136,0.15)' : '#00ff88', color: editSaving ? 'rgba(0,255,136,0.4)' : '#0a0a0a', border: 'none', cursor: editSaving ? 'not-allowed' : 'pointer', fontFamily: 'monospace', fontWeight: 700 }}>
                  {editSaving && <Loader2 size={11} className="animate-spin"/>}
                  {editSaving ? 'menyimpan...' : editRow._new ? 'tambah' : 'simpan'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Delete confirm modal */}
      {deleteRow && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, width: '100%', maxWidth: 360, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 8, background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 3 }}>
                <Trash2 size={16} style={{ color: '#ff6b6b' }}/>
              </div>
              <div>
                <p style={{ fontWeight: 600, color: '#f0f0f0', fontSize: 13, fontFamily: 'monospace' }}>hapus kapling</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2, fontFamily: 'monospace' }}>{deleteRow.no_kapling}</p>
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 20, fontFamily: 'monospace', lineHeight: 1.5 }}>
              Data kapling ini akan dihapus permanen dan tidak dapat dikembalikan.
            </p>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteRow(null)} style={{ padding: '7px 14px', fontSize: 11, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace' }}>batal</button>
              <button onClick={handleDelete} disabled={deleting} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 11, borderRadius: 3, background: '#ff6b6b', color: '#0a0a0a', border: 'none', cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'monospace', fontWeight: 700, opacity: deleting ? 0.6 : 1 }}>
                {deleting && <Loader2 size={11} className="animate-spin"/>}
                {deleting ? 'menghapus...' : 'hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch delete confirm modal */}
      {showBatchDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, width: '100%', maxWidth: 360, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 8, background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 3 }}>
                <Trash2 size={16} style={{ color: '#ff6b6b' }}/>
              </div>
              <div>
                <p style={{ fontWeight: 600, color: '#f0f0f0', fontSize: 13, fontFamily: 'monospace' }}>hapus data terpilih</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2, fontFamily: 'monospace' }}>{selectedIds.size} kapling dipilih</p>
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 20, fontFamily: 'monospace', lineHeight: 1.5 }}>
              Semua kapling yang dipilih akan dihapus permanen dan tidak dapat dikembalikan.
            </p>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowBatchDelete(false)} style={{ padding: '7px 14px', fontSize: 11, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace' }}>batal</button>
              <button onClick={handleBatchDelete} disabled={batchDeleting} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 11, borderRadius: 3, background: '#ff6b6b', color: '#0a0a0a', border: 'none', cursor: batchDeleting ? 'not-allowed' : 'pointer', fontFamily: 'monospace', fontWeight: 700, opacity: batchDeleting ? 0.6 : 1 }}>
                {batchDeleting && <Loader2 size={11} className="animate-spin"/>}
                {batchDeleting ? 'menghapus...' : `hapus ${selectedIds.size} kapling`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch edit modal */}
      {showBatchEdit && (() => {
        const iStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, padding: '6px 10px', color: '#f0f0f0', fontFamily: 'monospace', fontSize: 12, width: '100%', boxSizing: 'border-box', outline: 'none' }
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, width: '100%', maxWidth: 380, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ padding: 8, background: 'rgba(0,180,255,0.08)', border: '1px solid rgba(0,180,255,0.15)', borderRadius: 3 }}>
                    <Pencil size={14} style={{ color: 'rgba(0,180,255,0.9)' }}/>
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, color: '#f0f0f0', fontSize: 13, fontFamily: 'monospace' }}>edit massal</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2, fontFamily: 'monospace' }}>{selectedIds.size} kapling terpilih · isi field yang ingin diubah</p>
                  </div>
                </div>
                <button onClick={() => setShowBatchEdit(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}><X size={14}/></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Tgl Kapling', key: 'tgl_kapling', type: 'date' },
                  { label: 'Periode',     key: 'periode',     placeholder: 'Kosongkan untuk tidak diubah' },
                  { label: 'No Blok',     key: 'no_blok',     placeholder: 'Kosongkan untuk tidak diubah' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4, fontFamily: 'monospace' }}>{f.label}</label>
                    <input type={f.type || 'text'} value={batchEditData[f.key]} onChange={e => setBatchEditData(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder} className="rk-input" style={{ ...iStyle }}/>
                  </div>
                ))}
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4, fontFamily: 'monospace' }}>Sertifikasi</label>
                  <ThemedSelect
                    value={batchEditData.sertifikasi}
                    onChange={next => setBatchEditData(prev => ({ ...prev, sertifikasi: next }))}
                    options={[
                      { value: '', label: '— Tidak diubah —' },
                      'FSC',
                      'NFSC',
                    ]}
                    style={iStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowBatchEdit(false)} style={{ padding: '7px 14px', fontSize: 11, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace' }}>batal</button>
                <button onClick={handleBatchEdit} disabled={batchEditSaving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 11, borderRadius: 3, background: batchEditSaving ? 'rgba(0,180,255,0.15)' : 'rgba(0,180,255,0.9)', color: '#fff', border: 'none', cursor: batchEditSaving ? 'not-allowed' : 'pointer', fontFamily: 'monospace', fontWeight: 700, opacity: batchEditSaving ? 0.7 : 1 }}>
                  {batchEditSaving && <Loader2 size={11} className="animate-spin"/>}
                  {batchEditSaving ? 'menyimpan...' : `update ${selectedIds.size} kapling`}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Sort panel modal */}
      {showSortPanel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, width: '100%', maxWidth: 440, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <p style={{ fontWeight: 600, color: '#f0f0f0', fontFamily: 'monospace', fontSize: 13 }}>urutan data</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3, fontFamily: 'monospace' }}>atur prioritas kolom dan arah pengurutan</p>
              </div>
              <button onClick={() => setShowSortPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}><X size={14}/></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {draftSorts.length === 0 && (
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '12px 0', fontFamily: 'monospace' }}>belum ada aturan pengurutan</p>
              )}
              {draftSorts.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', width: 16, textAlign: 'center', fontFamily: 'monospace' }}>{i + 1}</span>
                  <ThemedSelect
                    value={s.key}
                    onChange={next => setDraftSorts(prev => prev.map((x, j) => j === i ? { ...x, key: next } : x))}
                    options={COLS.map(c => ({ value: c.key, label: c.label }))}
                    style={{ flex: 1, minHeight: 29, padding: '5px 8px', fontSize: 11 }}
                  />
                  <button onClick={() => setDraftSorts(prev => prev.map((x, j) => j === i ? { ...x, dir: x.dir === 'asc' ? 'desc' : 'asc' } : x))} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', fontSize: 11, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', minWidth: 60, justifyContent: 'center', fontFamily: 'monospace' }}>
                    {s.dir === 'asc' ? <><ChevronUp size={11}/> A–Z</> : <><ChevronDown size={11}/> Z–A</>}
                  </button>
                  <button onClick={() => setDraftSorts(prev => prev.filter((_, j) => j !== i))} style={{ padding: 6, borderRadius: 3, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ff6b6b'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                  ><X size={12}/></button>
                </div>
              ))}
            </div>

            {draftSorts.length < COLS.length && (
              <button onClick={() => { const used = new Set(draftSorts.map(s => s.key)); const next = COLS.find(c => !used.has(c.key))?.key || COLS[0].key; setDraftSorts(prev => [...prev, { key: next, dir: 'asc' }]) }}
                style={{ width: '100%', padding: '7px 0', marginBottom: 16, fontSize: 11, border: '1px dashed rgba(255,255,255,0.12)', borderRadius: 3, background: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontFamily: 'monospace' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,255,136,0.35)'; e.currentTarget.style.color = '#00ff88' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
              >+ tambah kolom urutan</button>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <button onClick={() => { setDraftSorts([]); setSorts([]); setCurrentPage(1); setShowSortPanel(false) }} style={{ padding: '7px 12px', fontSize: 11, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace' }}>reset</button>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setShowSortPanel(false)} style={{ padding: '7px 14px', fontSize: 11, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace' }}>batal</button>
                <button onClick={() => { setSorts(draftSorts); setCurrentPage(1); setShowSortPanel(false) }} style={{ padding: '7px 14px', fontSize: 11, borderRadius: 3, background: '#00ff88', color: '#0a0a0a', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 700 }}>terapkan</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table toolbar */}
      {rows.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
              menampilkan{' '}
              <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.65)' }}>{displayedRows.length.toLocaleString('id')}</span>
              {' '}dari{' '}
              <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.65)' }}>{searchedRows.length.toLocaleString('id')}</span>
              {searchTerm.trim() && <span style={{ color: 'rgba(255,255,255,0.25)' }}>{' '}(total {rows.length.toLocaleString('id')})</span>}
              {' '}kapling
            </p>
            {selectedIds.size > 0 && (
              <>
                <button onClick={() => { setBatchEditData({ tgl_kapling: '', periode: '', no_blok: '', sertifikasi: '' }); setShowBatchEdit(true) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', fontSize: 11, background: 'rgba(0,180,255,0.08)', border: '1px solid rgba(0,180,255,0.2)', borderRadius: 3, color: 'rgba(0,180,255,0.9)', cursor: 'pointer', fontFamily: 'monospace' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,180,255,0.14)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,180,255,0.08)'}
                ><Pencil size={11}/> edit {selectedIds.size} terpilih</button>
                <button onClick={() => setShowBatchDelete(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', fontSize: 11, background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 3, color: '#ff6b6b', cursor: 'pointer', fontFamily: 'monospace' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,107,107,0.14)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,107,107,0.08)'}
                ><Trash2 size={11}/> hapus {selectedIds.size} terpilih</button>
              </>
            )}
            {pageSize > 0 && totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                  style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px', fontSize: 11, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', cursor: safePage === 1 ? 'not-allowed' : 'pointer', opacity: safePage === 1 ? 0.4 : 1, fontFamily: 'monospace' }}
                ><ChevronLeft size={10}/> prev</button>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', padding: '0 6px', fontFamily: 'monospace' }}>{safePage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                  style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px', fontSize: 11, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', cursor: safePage === totalPages ? 'not-allowed' : 'pointer', opacity: safePage === totalPages ? 0.4 : 1, fontFamily: 'monospace' }}
                >next <ChevronRight size={10}/></button>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div ref={colDropdownRef} style={{ position: 'relative' }}>
                <button onClick={() => setShowColDropdown(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, height: 28, padding: '0 8px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${showColDropdown ? 'rgba(0,255,136,0.5)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 3, color: searchCol === 'all' ? 'rgba(255,255,255,0.4)' : '#00ff88', fontFamily: 'monospace', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', outline: 'none', boxShadow: showColDropdown ? '0 0 0 2px rgba(0,255,136,0.07)' : 'none' }}
                >
                  {searchCol === 'all' ? 'Semua Kolom' : (COLS.find(c => c.key === searchCol)?.label || searchCol)}
                  <ChevronDown size={10} style={{ opacity: 0.4, flexShrink: 0 }}/>
                </button>
                {showColDropdown && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200, background: '#111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 3, overflow: 'hidden', minWidth: '100%', boxShadow: '0 8px 24px rgba(0,0,0,0.7)' }}>
                    {[{ key: 'all', label: 'Semua Kolom' }, ...COLS].map(c => {
                      const active = searchCol === c.key
                      return (
                        <div key={c.key}
                          onClick={() => { setSearchCol(c.key); setShowColDropdown(false) }}
                          onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                          onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                          style={{ padding: '6px 12px', fontSize: 11, fontFamily: 'monospace', cursor: 'pointer', whiteSpace: 'nowrap', color: active ? '#00ff88' : 'rgba(255,255,255,0.65)', background: active ? 'rgba(0,255,136,0.08)' : 'transparent', borderLeft: `2px solid ${active ? '#00ff88' : 'transparent'}` }}
                        >{c.label}</div>
                      )
                    })}
                  </div>
                )}
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={11} style={{ position: 'absolute', left: 7, color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }}/>
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="cari..." className="rk-input" style={{ height: 28, paddingLeft: 22, paddingRight: searchTerm ? 22 : 8, width: 140, fontSize: 11 }}/>
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 0 }}><X size={10}/></button>
                )}
              </div>
            </div>
            <button onClick={() => { setDraftSorts([...sorts]); setShowSortPanel(true) }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', fontSize: 11, borderRadius: 3, border: sorts.length > 0 ? '1px solid rgba(0,255,136,0.3)' : '1px solid rgba(255,255,255,0.1)', background: sorts.length > 0 ? 'rgba(0,255,136,0.08)' : 'rgba(255,255,255,0.04)', color: sorts.length > 0 ? '#00ff88' : 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace' }}
            >
              <SlidersHorizontal size={11}/>
              urutan
              {sorts.length > 0 && <span style={{ background: '#00ff88', color: '#0a0a0a', borderRadius: 99, width: 15, height: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>{sorts.length}</span>}
            </button>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>tampilkan:</span>
            <div style={{ display: 'flex', gap: 3 }}>
              {PAGE_SIZES.map(p => (
                <button key={p.value} onClick={() => { setPageSize(p.value); setCurrentPage(1) }}
                  style={{ padding: '3px 8px', fontSize: 11, borderRadius: 3, fontWeight: 600, fontFamily: 'monospace', cursor: 'pointer', border: pageSize === p.value ? 'none' : '1px solid rgba(255,255,255,0.08)', background: pageSize === p.value ? '#00ff88' : 'rgba(255,255,255,0.04)', color: pageSize === p.value ? '#0a0a0a' : 'rgba(255,255,255,0.4)' }}
                >{p.label}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12, fontFamily: 'monospace' }}>memuat...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <FileSpreadsheet size={36} style={{ color: 'rgba(255,255,255,0.1)', marginBottom: 12 }}/>
            <p style={{ fontWeight: 600, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: 13 }}>belum ada data</p>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 4, fontFamily: 'monospace' }}>klik <span style={{ color: '#00ff88' }}>import excel</span> untuk mengimpor file DP Kapling</p>
          </div>
        ) : (
          <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', scrollbarGutter: 'stable both-edges' }}>
            <table style={{ fontSize: 12, width: 'max-content', minWidth: '100%' }}>
              <thead style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <tr>
                  <th style={{ padding: '8px 8px', position: 'sticky', left: 0, background: 'rgba(13,13,13,0.98)', zIndex: 10, width: 32 }}>
                    <input ref={selectAllRef} type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="rk-cb" style={{ cursor: 'pointer' }}/>
                  </th>
                  <th style={{ padding: '8px 8px', textAlign: 'left', fontWeight: 600, color: 'rgba(255,255,255,0.3)', width: 32, fontFamily: 'monospace', fontSize: 11 }}>No</th>
                  {COLS.map(c => (
                    <th key={c.key} onClick={() => toggleSort(c.key)} className="rk-th"
                      style={{ padding: '8px 8px', fontWeight: 600, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', textAlign: c.num ? 'right' : 'left', fontFamily: 'monospace', fontSize: 11 }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        {c.label}
                        {(() => {
                          const idx = sorts.findIndex(s => s.key === c.key)
                          if (idx === -1) return <ChevronsUpDown size={10} style={{ color: 'rgba(255,255,255,0.15)' }}/>
                          const s = sorts[idx]
                          return (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                              {sorts.length > 1 && <span style={{ fontSize: 9, fontWeight: 700, color: '#00ff88' }}>{idx + 1}</span>}
                              {s.dir === 'asc' ? <ChevronUp size={10} style={{ color: '#00ff88' }}/> : <ChevronDown size={10} style={{ color: '#00ff88' }}/>}
                            </span>
                          )
                        })()}
                      </span>
                    </th>
                  ))}
                  <th style={{ padding: '8px 8px', width: 48 }}></th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((row, i) => (
                  <tr key={row.id} className={`rk-row${selectedIds.has(row.id) ? ' rk-row-sel' : ''}`}
                    style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                    onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, row }) }}
                  >
                    <td style={{ padding: '6px 8px', position: 'sticky', left: 0, zIndex: 10, background: selectedIds.has(row.id) ? 'rgba(0,255,136,0.05)' : '#0a0a0a' }}>
                      <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleSelectRow(row.id)} className="rk-cb" style={{ cursor: 'pointer' }}/>
                    </td>
                    <td style={{ padding: '6px 8px', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>{(safePage - 1) * (pageSize || 0) + i + 1}</td>
                    {COLS.map(c => (
                      <td key={c.key} style={{ padding: '6px 8px', whiteSpace: 'nowrap', textAlign: c.num ? 'right' : 'left', fontFamily: c.num ? 'monospace' : 'inherit', color: c.num ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.75)' }}>
                        {c.key === 'sertifikasi'
                          ? <SertBadge val={row.sertifikasi}/>
                          : c.key === 'jenis'
                            ? <JenisKayuBadge val={row.jenis}/>
                          : c.key === 'volume'
                            ? Number(row.volume).toFixed(3)
                            : c.key === 'mutu_label'
                              ? getMutuLabel(row)
                              : c.key === 'tgl_kapling'
                                ? (displayDate(row.tgl_kapling) ?? <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>)
                                : c.key === 'pembeli'
                                  ? (getPembeliName(row.pembeli) ?? <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>)
                                  : c.key === 'no_invois'
                                    ? <InvoisBadge val={row.no_invois}/>
                                    : c.key === 'periode'
                                      ? (row.periode ? <span>{row.periode}</span> : <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>)
                                      : (row[c.key] ?? <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>)
                        }
                      </td>
                    ))}
                    <td style={{ padding: '6px 8px' }}>
                      <div className="rk-actions" style={{ display: 'flex', alignItems: 'center', gap: 3, opacity: 0, transition: 'opacity 0.15s' }}>
                        <button onClick={() => handleOpenDkhpModal([row])} title="Input DKHP"
                          style={{ padding: 4, borderRadius: 3, background: 'none', border: 'none', cursor: 'pointer', color: row.dkhp ? '#00ff88' : 'rgba(255,255,255,0.3)' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#00ff88'; e.currentTarget.style.background = 'rgba(0,255,136,0.07)' }}
                          onMouseLeave={e => { e.currentTarget.style.color = row.dkhp ? '#00ff88' : 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'none' }}
                        ><FileBarChart2 size={12}/></button>
                        <button onClick={() => setEditRow({ ...row })}
                          style={{ padding: 4, borderRadius: 3, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#f0f0f0'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'none' }}
                        ><Pencil size={12}/></button>
                        <button onClick={() => setDeleteRow(row)}
                          style={{ padding: 4, borderRadius: 3, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#ff6b6b'; e.currentTarget.style.background = 'rgba(255,107,107,0.08)' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'none' }}
                        ><Trash2 size={12}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot style={{ borderTop: '2px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                <tr style={{ fontWeight: 700, color: 'rgba(255,255,255,0.65)', fontFamily: 'monospace' }}>
                  <td style={{ padding: '7px 8px', position: 'sticky', left: 0, background: 'rgba(13,13,13,0.98)', zIndex: 10 }} colSpan={12}>TOTAL</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right' }}>{filteredBatang.toLocaleString('id')}</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right' }}>{filteredVolume.toFixed(3)}</td>
                  <td colSpan={5}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (() => {
        const isBatch = selectedIds.size > 1 && selectedIds.has(contextMenu.row.id)
        return (
          <div
            style={{ position: 'fixed', zIndex: 50, background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.6)', padding: '4px 0', minWidth: 160, top: contextMenu.y, left: contextMenu.x }}
            onMouseDown={e => e.stopPropagation()}
          >
            {isBatch && (
              <div style={{ padding: '6px 16px', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'monospace' }}>
                {selectedIds.size} kapling terpilih
              </div>
            )}
            <button
              onClick={() => {
                if (isBatch) { setBatchEditData({ tgl_kapling: '', periode: '', no_blok: '', sertifikasi: '' }); setShowBatchEdit(true) }
                else { setEditRow({ ...contextMenu.row }) }
                setContextMenu(null)
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '7px 16px', fontSize: 12, color: 'rgba(255,255,255,0.65)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'monospace' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <Pencil size={12} style={{ color: 'rgba(255,255,255,0.3)' }}/>
              {isBatch ? `edit ${selectedIds.size} terpilih` : 'edit'}
            </button>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '3px 0' }}/>
            <button
              onClick={() => {
                if (isBatch) { setShowBatchDelete(true) }
                else { setDeleteRow(contextMenu.row) }
                setContextMenu(null)
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '7px 16px', fontSize: 12, color: '#ff6b6b', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'monospace' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,107,107,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <Trash2 size={12}/>
              {isBatch ? `hapus ${selectedIds.size} terpilih` : 'hapus'}
            </button>
          </div>
        )
      })()}

      {/* DKHP Import Preview */}
      {dkhpImportPreview && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => !dkhpImportSaving && setDkhpImportPreview(null)}>
          <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: 24, width: 500, maxHeight: '80vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f0f0f0', fontSize: 13 }}>
                <FileBarChart2 size={13} style={{ display: 'inline', marginRight: 8, color: '#00ff88' }}/>
                Import DKHP — {dkhpImportPreview.dkhpList.length} file
              </span>
              <button onClick={() => setDkhpImportPreview(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={14}/></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {dkhpImportPreview.dkhpList.map((d, i) => (
                <div key={i} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: d.conflicts.length ? 8 : 0 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{d.fileName}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#00ff88' }}>DKHP {d.dkhpNo}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{d.matched.length} kapling</span>
                      {d.unmatched.length > 0 && <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{d.unmatched.length} tidak cocok</span>}
                    </div>
                  </div>
                  {d.conflicts.length > 0 && (
                    <div style={{ padding: '6px 8px', background: 'rgba(255,170,0,0.07)', borderRadius: 3, border: '1px solid rgba(255,170,0,0.18)' }}>
                      <p style={{ fontFamily: 'monospace', fontSize: 10, color: '#ffaa00', marginBottom: 4 }}>{d.conflicts.length} konflik:</p>
                      {d.conflicts.map(r => (
                        <div key={r.id} style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.5)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{r.no_kapling}</span>
                          <span style={{ color: '#ffaa00' }}>DKHP {r.dkhp} → {d.dkhpNo}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {dkhpImportPreview.errors.map((err, i) => (
                <div key={i} style={{ padding: '8px 12px', background: 'rgba(255,107,107,0.05)', border: '1px solid rgba(255,107,107,0.15)', borderRadius: 4, fontFamily: 'monospace', fontSize: 11, color: '#ff6b6b' }}>
                  {err.fileName} — {err.message}
                </div>
              ))}
            </div>

            {(() => {
              const totalConflicts = dkhpImportPreview.dkhpList.reduce((s, d) => s + d.conflicts.length, 0)
              const totalMatched   = dkhpImportPreview.dkhpList.reduce((s, d) => s + d.matched.length, 0)
              return (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button onClick={() => setDkhpImportPreview(null)}
                    style={{ padding: '7px 14px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }}>
                    batal
                  </button>
                  {totalConflicts > 0 && (
                    <button onClick={() => handleDkhpImportSave(true)} disabled={dkhpImportSaving}
                      style={{ padding: '7px 14px', background: 'rgba(255,170,0,0.1)', border: '1px solid rgba(255,170,0,0.25)', borderRadius: 3, color: '#ffaa00', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }}>
                      lewati konflik ({totalConflicts})
                    </button>
                  )}
                  <button onClick={() => handleDkhpImportSave(false)} disabled={dkhpImportSaving}
                    style={{ padding: '7px 14px', background: '#00ff88', border: 'none', borderRadius: 3, color: '#0a0a0a', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {dkhpImportSaving ? <Loader2 size={12} className="animate-spin"/> : null}
                    simpan {totalMatched - (dkhpImportSaving ? 0 : 0)} kapling
                  </button>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* DKHP Modal */}
      {showDkhpModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => !dkhpSaving && setShowDkhpModal(false)}>
          <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: 24, width: 440, maxHeight: '80vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f0f0f0', fontSize: 13 }}>
                <FileBarChart2 size={13} style={{ display: 'inline', marginRight: 8, color: '#00ff88' }}/>
                Input DKHP
              </span>
              <button onClick={() => setShowDkhpModal(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={14}/></button>
            </div>

            {/* Kapling list */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                {dkhpModalRows.length} kapling dipilih
              </p>
              <div style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
                {dkhpModalRows.map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 3, fontFamily: 'monospace', fontSize: 11 }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>{r.no_kapling}</span>
                    {r.dkhp && (
                      <span style={{ fontSize: 10, color: r.dkhp !== dkhpInput.trim() && dkhpInput.trim() ? '#ffaa00' : '#00ff88' }}>
                        DKHP {r.dkhp}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {dkhpStep === 'input' && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: 6 }}>No. DKHP</label>
                  <input
                    autoFocus
                    value={dkhpInput}
                    onChange={e => setDkhpInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCheckDkhp()}
                    placeholder="contoh: 9 atau 12"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 3, padding: '8px 10px', color: '#f0f0f0', fontFamily: 'monospace', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button onClick={() => setShowDkhpModal(false)}
                    style={{ padding: '7px 14px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }}>
                    batal
                  </button>
                  <button onClick={handleCheckDkhp} disabled={!dkhpInput.trim()}
                    style={{ padding: '7px 14px', background: dkhpInput.trim() ? '#00ff88' : 'rgba(0,255,136,0.2)', border: 'none', borderRadius: 3, color: '#0a0a0a', cursor: dkhpInput.trim() ? 'pointer' : 'default', fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>
                    simpan
                  </button>
                </div>
              </>
            )}

            {dkhpStep === 'confirm-conflicts' && (
              <>
                <div style={{ marginBottom: 16, padding: '10px 12px', background: 'rgba(255,170,0,0.07)', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 4 }}>
                  <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#ffaa00', marginBottom: 8, fontWeight: 700 }}>
                    {dkhpConflicts.length} kapling sudah memiliki DKHP berbeda:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {dkhpConflicts.map(r => (
                      <div key={r.id} style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.6)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{r.no_kapling}</span>
                        <span style={{ color: '#ffaa00' }}>DKHP {r.dkhp} → {dkhpInput.trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button onClick={() => setShowDkhpModal(false)}
                    style={{ padding: '7px 14px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }}>
                    batal
                  </button>
                  <button onClick={() => handleSaveDkhp(true)} disabled={dkhpSaving}
                    style={{ padding: '7px 14px', background: 'rgba(255,170,0,0.12)', border: '1px solid rgba(255,170,0,0.3)', borderRadius: 3, color: '#ffaa00', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }}>
                    lewati yang konflik
                  </button>
                  <button onClick={() => handleSaveDkhp(false)} disabled={dkhpSaving}
                    style={{ padding: '7px 14px', background: '#00ff88', border: 'none', borderRadius: 3, color: '#0a0a0a', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>
                    {dkhpSaving ? <Loader2 size={12} className="animate-spin"/> : 'update semua'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
