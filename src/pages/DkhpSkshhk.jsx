import { useEffect, useRef, useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import Toast, { useToast } from '../components/Toast'
import {
  Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle, Loader2, Download,
  Plus, Pencil, Trash2, ScrollText, Search, ChevronUp, ChevronDown, ChevronsUpDown,
  SlidersHorizontal, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthProvider'
import { requireTpkId } from '../lib/tenantScope'
import { getEffectiveTpkId } from '../lib/effectiveTpk'
import ThemedSelect from '../components/ThemedSelect'
import TpkRequiredState from '../components/TpkRequiredState'

const MONTH_FULL_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const MONTH_SHORT_ID = ['JAN','FEB','MAR','APR','MEI','JUN','JUL','AGS','SEP','OKT','NOV','DES']

function fmtDDMMYYYY(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return iso || ''
  return `${m[3]}/${m[2]}/${m[1]}`
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
  tanggal_dimatikan: 'TANGGAL DIMATIKAN',
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
  { key: 'tanggal_dimatikan', label: 'Dimatikan', w: 'w-[120px]' },
]

const KLAS_STYLE = {
  JATI:  { background: 'rgba(0,255,136,0.12)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.25)' },
  RIMBA: { background: 'rgba(255,170,0,0.12)', color: '#ffaa00', border: '1px solid rgba(255,170,0,0.25)' },
}
const BADGE_DEF = { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }
const BADGE_BASE = { display: 'inline-block', padding: '2px 6px', borderRadius: 3, fontSize: 10, fontWeight: 600, fontFamily: 'monospace' }

function KlasBadge({ val }) {
  if (!val) return <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>
  return <span style={{ ...BADGE_BASE, ...(KLAS_STYLE[val.toUpperCase()] || BADGE_DEF) }}>{val}</span>
}

function JenisBadge({ val, klas }) {
  if (!val) return <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>
  return <span style={{ ...BADGE_BASE, ...(KLAS_STYLE[(klas || '').toUpperCase()] || BADGE_DEF) }}>{val}</span>
}

const KLAS_OPTIONS = ['JATI', 'RIMBA']
const JENIS_BY_KLAS = {
  JATI: ['JATI'],
  RIMBA: ['MAHONI', 'KEDAWUNG'],
}

const NUMERIC_FIELDS = ['ai_bt','ai_m3','aii_bt','aii_m3','aiii_bt','aiii_m3','jml_bt','jml_m3']
const INT_FIELDS = ['ai_bt','aii_bt','aiii_bt','jml_bt']

function dkhpNumber(val) {
  const n = Number(String(val ?? '').replace(/\D/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

function withDkhpGaps(items, enabled) {
  if (!enabled || !items.length) return items
  const byNo = new Map()
  const passthrough = []
  for (const row of items) {
    const n = dkhpNumber(row.no_dkhp)
    if (!n) {
      passthrough.push(row)
      continue
    }
    if (!byNo.has(n)) byNo.set(n, [])
    byNo.get(n).push(row)
  }
  if (byNo.size < 2) return items

  const nums = [...byNo.keys()].sort((a, b) => a - b)
  const out = []
  for (let n = nums[0]; n <= nums[nums.length - 1]; n++) {
    if (byNo.has(n)) out.push(...byNo.get(n))
    else out.push({ id: `missing-dkhp-${n}`, no_dkhp: String(n), _missingDkhp: true })
  }
  return [...out, ...passthrough]
}

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

function dateYear(val) {
  const m = String(val || '').match(/^(\d{4})-/)
  return m ? Number(m[1]) : null
}

function normalizeDateInput(val, fallbackYear = new Date().getFullYear()) {
  if (val == null || String(val).trim() === '') return null
  const s = String(val).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  const m = s.replace(/[.\-\s]+/g, '/').match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/)
  if (!m) return null

  let [, d, mo, y] = m
  d = Number(d)
  mo = Number(mo)
  y = y ? Number(y) : Number(fallbackYear)
  if (y < 100) y += 2000
  const date = new Date(y, mo - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function displayMonth(ym) {
  const m = String(ym || '').match(/^(\d{4})-(\d{2})$/)
  return m ? `${m[2]}/${m[1]}` : ym || ''
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
  if (idxMap.tanggal_dimatikan == null) {
    const idx = headerRow.findIndex(h => {
      const norm = h.toLowerCase()
      return norm.includes('dimatikan') && !norm.includes('belum')
    })
    if (idx !== -1) idxMap.tanggal_dimatikan = idx
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
        tanggal_dimatikan: parseExcelDate(get('tanggal_dimatikan')),
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
  tanggal_dimatikan: '',
}

export default function DkhpSkshhk() {
  const { profile, activeTpkId } = useAuth()
  const tpkId = getEffectiveTpkId({ activeTpkId, profile })
  const [tpkName, setTpkName]     = useState('TPK Wongsorejo')
  const [rows, setRows]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [search, setSearch]   = useState('')
  const [searchCol, setSearchCol] = useState('all')
  const [tanggalFilter, setTanggalFilter] = useState('all')
  const [skshhkFilter, setSkshhkFilter] = useState('all')
  const [showColDropdown, setShowColDropdown] = useState(false)
  const [sorts, setSorts]     = useState([{ key: 'no_dkhp', dir: 'asc' }])
  const [showSortPanel, setShowSortPanel] = useState(false)
  const [draftSorts, setDraftSorts]       = useState([])
  const [pageSize, setPageSize]           = useState(50)
  const [currentPage, setCurrentPage]     = useState(1)
  const [preview, setPreview] = useState(null)
  const [importing, setImporting] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [saving, setSaving]   = useState(false)
  const [deleteRow, setDeleteRow]   = useState(null)
  const [deleting, setDeleting]     = useState(false)
  const { toast, showToast } = useToast(3000)
  const [contextMenu, setContextMenu] = useState(null)
  const [exportMonth, setExportMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })
  const [exporting, setExporting] = useState(false)
  const fileRef        = useRef(null)
  const colDropdownRef = useRef(null)

  useEffect(() => {
    if (!tpkId) return
    supabase
      .from('tabel_tpk')
      .select('namatpk')
      .eq('id', tpkId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.namatpk) setTpkName(data.namatpk)
      })
  }, [tpkId])

  async function fetchData() {
    if (!tpkId) {
      setRows([])
      setLoading(false)
      return
    }

    setLoading(true)
    const PAGE = 1000
    const all = []
    let error = null
    for (let from = 0; ; from += PAGE) {
      const { data, error: pageError } = await supabase
        .from('tabel_dkhp_skshhk')
        .select('*')
        .eq('tpk_id', tpkId)
        .order('no_dkhp', { ascending: true })
        .order('tanggal', { ascending: true })
        .range(from, from + PAGE - 1)
      if (pageError) { error = pageError; break }
      if (!data || data.length === 0) break
      all.push(...data)
      if (data.length < PAGE) break
    }
    if (error) showToast(error.message, 'error')
    else { setRows(all) }
    setLoading(false)
  }
  useEffect(() => { fetchData() }, [tpkId])

  const exportMonthOptions = useMemo(() => {
    const months = [...new Set(
      rows
        .map(r => String(r.tanggal || '').slice(0, 7))
        .filter(v => /^\d{4}-\d{2}$/.test(v))
    )].sort((a, b) => b.localeCompare(a))

    return months.map(value => ({ value, label: displayMonth(value) }))
  }, [rows])

  useEffect(() => {
    if (!exportMonthOptions.length) return
    if (!exportMonthOptions.some(opt => opt.value === exportMonth)) {
      setExportMonth(exportMonthOptions[0].value)
    }
  }, [exportMonth, exportMonthOptions])

  const tanggalFilterOptions = useMemo(() => {
    const months = [...new Set(
      rows
        .map(r => String(r.tanggal || '').slice(0, 7))
        .filter(v => /^\d{4}-\d{2}$/.test(v))
    )].sort((a, b) => b.localeCompare(a))

    return [
      { value: 'all', label: 'Semua Tanggal' },
      { value: 'null', label: 'Tanggal Kosong' },
      ...months.map(value => ({ value, label: displayMonth(value) })),
    ]
  }, [rows])

  const skshhkFilterOptions = [
    { value: 'all', label: 'Semua SKSHHK' },
    { value: 'null', label: 'SKSHHK Kosong' },
  ]

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
      const bySkshhk = parsed.reduce((acc, r) => {
        const key = String(r.no_skshhk || '').trim()
        if (!key) return acc
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {})
      const duplicates = Object.entries(bySkshhk).filter(([, count]) => count > 1)
      if (duplicates.length) {
        showToast(`No. SKSHHK duplikat: ${duplicates.slice(0, 3).map(([no]) => no).join(', ')}${duplicates.length > 3 ? '…' : ''}`, 'error')
        setPreview(null)
        return
      }
      const existing = new Set(rows.map(r => String(r.no_skshhk || '').trim()).filter(Boolean))
      const newCount  = parsed.filter(r => !existing.has(String(r.no_skshhk || '').trim())).length
      const skipCount = parsed.length - newCount
      setPreview({ rows: parsed, fileName: file.name, newCount, skipCount })
    }
    reader.readAsBinaryString(file)
  }

  async function handleImport() {
    if (!preview) return
    setImporting(true)
    let scopedTpkId
    try {
      scopedTpkId = requireTpkId(tpkId)
    } catch (err) {
      setImporting(false)
      showToast(err.message, 'error')
      return
    }
    const existing = new Set(rows.map(r => String(r.no_skshhk || '').trim()).filter(Boolean))
    const dedup = Object.values(
      preview.rows
        .filter(r => !existing.has(String(r.no_skshhk || '').trim()))
        .reduce((acc, r) => { acc[String(r.no_skshhk || '').trim()] = r; return acc }, {})
    )
    if (!dedup.length) {
      setImporting(false)
      showToast('Semua SKSHHK sudah ada di database.', 'error')
      setPreview(null)
      return
    }
    const { error } = await supabase.from('tabel_dkhp_skshhk').insert(dedup.map(r => ({ ...r, tpk_id: scopedTpkId })))
    setImporting(false)
    if (error) { showToast(error.message, 'error'); return }
    showToast(`${dedup.length} SKSHHK baru berhasil diimport`)
    setPreview(null)
    setLastUpdated(new Date())
    fetchData()
  }

  function openAdd()      { setEditRow({ ...EMPTY_FORM, _new: true, _dateYear: new Date().getFullYear() }) }
  function openEdit(row)  { setEditRow({ ...row, _dateYear: dateYear(row.tanggal) || dateYear(row.tanggal_dimatikan) || new Date().getFullYear() }) }

  async function handleSave() {
    if (!editRow) return
    if (!editRow.no_skshhk?.trim()) { showToast('Nomor SKSHHK wajib diisi.', 'error'); return }
    let scopedTpkId
    try {
      scopedTpkId = requireTpkId(tpkId)
    } catch (err) {
      showToast(err.message, 'error')
      return
    }
    const payload = { ...editRow }
    delete payload._new
    const fallbackYear = payload._dateYear || dateYear(payload.tanggal) || dateYear(payload.tanggal_dimatikan) || new Date().getFullYear()
    delete payload._dateYear
    delete payload.id
    delete payload.created_at
    const tanggal = normalizeDateInput(payload.tanggal, fallbackYear)
    const tanggalDimatikan = normalizeDateInput(payload.tanggal_dimatikan, fallbackYear)
    if (payload.tanggal && !tanggal) { showToast('Format tanggal tidak valid. Gunakan dd/mm/yyyy atau dd/mm.', 'error'); return }
    if (payload.tanggal_dimatikan && !tanggalDimatikan) { showToast('Format tanggal dimatikan tidak valid. Gunakan dd/mm/yyyy atau dd/mm.', 'error'); return }
    setSaving(true)
    payload.tanggal = tanggal
    payload.tanggal_dimatikan = tanggalDimatikan
    for (const f of NUMERIC_FIELDS) payload[f] = num(payload[f], INT_FIELDS.includes(f))
    payload.jml_bt = payload.ai_bt + payload.aii_bt + payload.aiii_bt
    payload.jml_m3 = +(payload.ai_m3 + payload.aii_m3 + payload.aiii_m3).toFixed(3)
    let error
    if (editRow._new) {
      payload.tpk_id = scopedTpkId
      ;({ error } = await supabase.from('tabel_dkhp_skshhk').insert(payload))
    } else {
      ({ error } = await supabase
        .from('tabel_dkhp_skshhk')
        .update(payload)
        .eq('tpk_id', scopedTpkId)
        .eq('id', editRow.id)
      )
    }
    setSaving(false)
    if (error) { showToast(error.message, 'error'); return }
    showToast(editRow._new ? 'SKSHHK ditambahkan' : 'SKSHHK diperbarui')
    setEditRow(null)
    setLastUpdated(new Date())
    fetchData()
  }

  async function handleDelete() {
    if (!deleteRow) return
    let scopedTpkId
    try {
      scopedTpkId = requireTpkId(tpkId)
    } catch (err) {
      showToast(err.message, 'error')
      return
    }
    setDeleting(true)
    const { error } = await supabase
      .from('tabel_dkhp_skshhk')
      .delete()
      .eq('tpk_id', scopedTpkId)
      .eq('id', deleteRow.id)
    setDeleting(false)
    if (error) { showToast(error.message, 'error'); return }
    showToast(`SKSHHK ${deleteRow.no_skshhk} dihapus`)
    setDeleteRow(null)
    setLastUpdated(new Date())
    fetchData()
  }

  const baseFiltered = useMemo(() => rows.filter(r => {
    const tanggal = String(r.tanggal || '')
    const skshhk = String(r.no_skshhk || '').trim()
    const passTanggal = tanggalFilter === 'all'
      ? true
      : tanggalFilter === 'null'
        ? !tanggal
        : tanggal.slice(0, 7) === tanggalFilter
    const passSkshhk = skshhkFilter === 'all'
      ? true
      : !skshhk
    return passTanggal && passSkshhk
  }), [rows, tanggalFilter, skshhkFilter])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return baseFiltered
    if (searchCol === 'all') {
      return baseFiltered.filter(r =>
        [r.no_dkhp, r.no_skshhk, r.klas, r.jenis, r.nopol, r.pemohon_sopir, r.kota_tujuan, r.pembeli, r.tujuan, displayDate(r.tanggal_dimatikan)]
          .some(v => v && String(v).toLowerCase().includes(q))
      )
    }
    return baseFiltered.filter(r => {
      let v = r[searchCol]
      if (searchCol === 'tanggal' || searchCol === 'tanggal_dimatikan') v = displayDate(v) || ''
      return String(v ?? '').toLowerCase().includes(q)
    })
  }, [baseFiltered, search, searchCol])

  const sorted = useMemo(() => {
    if (!sorts.length) return filtered
    return [...filtered].sort((a, b) => {
      for (const s of sorts) {
        const va = a[s.key] ?? ''
        const vb = b[s.key] ?? ''
        const col = COLS.find(c => c.key === s.key)
        const cmp = col?.num
          ? (Number(va) || 0) - (Number(vb) || 0)
          : String(va).localeCompare(String(vb), 'id', { numeric: true })
        if (cmp !== 0) return s.dir === 'asc' ? cmp : -cmp
      }
      return 0
    })
  }, [filtered, sorts])

  const hasActiveFilters = tanggalFilter !== 'all' || skshhkFilter !== 'all'
  const showDkhpGaps = !search.trim() && !hasActiveFilters && (sorts.length === 0 || (sorts[0]?.key === 'no_dkhp' && sorts[0]?.dir === 'asc'))
  const tableRows = useMemo(() => withDkhpGaps(sorted, showDkhpGaps), [sorted, showDkhpGaps])
  const missingDkhpNumbers = useMemo(() => tableRows.filter(row => row._missingDkhp).map(row => row.no_dkhp), [tableRows])
  const missingDkhpCount = missingDkhpNumbers.length

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

  useEffect(() => { setCurrentPage(1) }, [search, searchCol, tanggalFilter, skshhkFilter])

  useEffect(() => {
    if (!showColDropdown) return
    function onClickOutside(e) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(e.target)) setShowColDropdown(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [showColDropdown])

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

  const PAGE_SIZES = [
    { label: '10',    value: 10 },
    { label: '20',    value: 20 },
    { label: '50',    value: 50 },
    { label: '100',   value: 100 },
    { label: '500',   value: 500 },
    { label: '1.000', value: 1000 },
    { label: 'Semua', value: 0 },
  ]

  const totalPages    = pageSize === 0 ? 1 : Math.ceil(tableRows.length / pageSize)
  const safePage      = Math.min(currentPage, totalPages || 1)
  const displayedRows = pageSize === 0
    ? tableRows
    : tableRows.slice((safePage - 1) * pageSize, safePage * pageSize)

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

      const scopedTpkId = requireTpkId(tpkId)
      const { data: pejabatList } = await supabase
        .from('tabel_pejabat')
        .select('*')
        .eq('tpk_id', scopedTpkId)
        .eq('aktif', true)
      const has = (p, needle) => (p.jabatan || '').toLowerCase().includes(needle)
      const penerbit = (pejabatList || []).find(p => has(p, 'penerbit')) || {}
      const kepala   = (pejabatList || []).find(p => has(p, 'kepala tpk')) || {}

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
        return decimals != null ? Number(n.toFixed(decimals)) : n
      }

      const aoa = []
      const merges = []
      const pageBreakRows = []
      const emptyTotal = () => ({ ai_bt:0, ai_m3:0, aii_bt:0, aii_m3:0, aiii_bt:0, aiii_m3:0, jml_bt:0, jml_m3:0 })
      const addToTotal = (acc, r) => {
        acc.ai_bt   += Number(r.ai_bt)   || 0
        acc.ai_m3   += Number(r.ai_m3)   || 0
        acc.aii_bt  += Number(r.aii_bt)  || 0
        acc.aii_m3  += Number(r.aii_m3)  || 0
        acc.aiii_bt += Number(r.aiii_bt) || 0
        acc.aiii_m3 += Number(r.aiii_m3) || 0
        acc.jml_bt  += Number(r.jml_bt)  || 0
        acc.jml_m3  += Number(r.jml_m3)  || 0
      }
      const totalRow = (label, total) => [
        label, null, null, null, null, null, null,
        total.aiii_bt,
        Number(total.aiii_m3.toFixed(3)),
        total.aii_bt,
        Number(total.aii_m3.toFixed(3)),
        total.ai_bt,
        Number(total.ai_m3.toFixed(3)),
        total.jml_bt,
        Number(total.jml_m3.toFixed(3)),
        '',
        '',
      ]
      const dataRow = (r, no) => [
        no,
        fmtDDMMYYYY(r.tanggal),
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
        Number(r.jml_bt) || 0,
        Number((Number(r.jml_m3) || 0).toFixed(3)),
        r.tanggal_dimatikan ? '' : 'V',
        r.tanggal_dimatikan ? fmtDDMMYYYY(r.tanggal_dimatikan) : '',
      ]

      const pushReportHeader = () => {
        const titleR = aoa.length
        aoa.push([null,'LAPORAN BULANAN PENERBITAN SURAT KETERANGAN SAH HASIL HUTAN KAYU (SKSHHK)',null,null,null,null,null,null,null,null,null,null,null,null,null,'Lampiran : 6'])
        const divR = aoa.length
        aoa.push([null,'DIVISI REGIONAL',null,':  JAWA TIMUR'])
        const kphR = aoa.length
        aoa.push([null,'KPH',null,':  BANYUWANGI UTARA',null,null,null,null,null,null,null,null,' BULAN : ', monthLabel])
        const tpkR = aoa.length
        aoa.push([null,'TPK',null,`:  ${tpkUpper}`,null,null,null,null,null,null,null,null,' TAHUN : ', String(y)])
        aoa.push([])
        merges.push(
          { s: { r: titleR, c: 1 }, e: { r: titleR, c: 13 } },
          { s: { r: divR, c: 1 }, e: { r: divR, c: 2 } },
          { s: { r: kphR, c: 1 }, e: { r: kphR, c: 2 } },
          { s: { r: tpkR, c: 1 }, e: { r: tpkR, c: 2 } },
        )
      }

      const pushTableHeader = () => {
        const hdr1 = aoa.length
        aoa.push(['KETERANGAN SURAT BUKTI PENGIRIMAN',null,null,null,null,'KETERANGAN  JUMLAH FISIK  PENERIMAAN',null,null,null,null,null,null,null,null,null,'KETERANGAN  STATUS  PENERIMAAN SKSHH DI TUJUAN'])
        const hdr2 = aoa.length
        aoa.push(['NO','TGL SKSHHK','KAYU BULAT/ OLAHAN',null,null,'TUJUAN KIRIM',null,'LOG AIII',null,' LOG AII ',null,' LOG AI ',null,'JUMLAH',null,'',''])
        const hdr3 = aoa.length
        aoa.push([null,'','NO SKSHHK','DKHP','JENIS','INDUSTRI','TPK','BTG','M3','BTG','M3','BTG','M3','BTG','M3','BELUM DIMATIKAN','DIMATIKAN'])
        merges.push(
          { s: { r: hdr1, c: 0 },  e: { r: hdr1, c: 4 } },
          { s: { r: hdr1, c: 5 },  e: { r: hdr1, c: 14 } },
          { s: { r: hdr1, c: 15 }, e: { r: hdr2, c: 16 } },
          { s: { r: hdr2, c: 0 },  e: { r: hdr3, c: 0 } },
          { s: { r: hdr2, c: 1 },  e: { r: hdr3, c: 1 } },
          { s: { r: hdr2, c: 2 },  e: { r: hdr2, c: 4 } },
          { s: { r: hdr2, c: 5 },  e: { r: hdr2, c: 6 } },
          { s: { r: hdr2, c: 7 },  e: { r: hdr2, c: 8 } },
          { s: { r: hdr2, c: 9 },  e: { r: hdr2, c: 10 } },
          { s: { r: hdr2, c: 11 }, e: { r: hdr2, c: 12 } },
          { s: { r: hdr2, c: 13 }, e: { r: hdr2, c: 14 } },
        )
      }

      const grandTotal = emptyTotal()
      for (let start = 0; start < monthRows.length; start += 30) {
        const chunk = monthRows.slice(start, start + 30)
        const subtotal = emptyTotal()
        const isLast = start + 30 >= monthRows.length

        pushReportHeader()
        pushTableHeader()
        for (let i = 0; i < 30; i++) {
          const row = chunk[i]
          if (row) {
            aoa.push(dataRow(row, start + i + 1))
            addToTotal(subtotal, row)
            addToTotal(grandTotal, row)
          } else {
            aoa.push(new Array(17).fill(null))
          }
        }
        const subtotalR = aoa.length
        aoa.push(totalRow('JUMLAH', subtotal))
        merges.push({ s: { r: subtotalR, c: 0 }, e: { r: subtotalR, c: 6 } })

        if (!isLast) {
          pageBreakRows.push(aoa.length)
          for (let i = 0; i < 8; i++) aoa.push([])
        }
      }

      aoa.push([])
      const dateRow = new Array(17).fill(null); dateRow[14] = dateLine.toUpperCase()
      aoa.push(dateRow)
      const titleRow = new Array(17).fill(null); titleRow[8] = 'Pejabat Penerbit'; titleRow[14] = `Kepala TPK ${tpkName}`
      aoa.push(titleRow)
      aoa.push([]); aoa.push([])
      const nameRow = new Array(17).fill(null)
      nameRow[8] = (penerbit.nama || '').toUpperCase()
      nameRow[14] = (kepala.nama || '').toUpperCase()
      aoa.push(nameRow)
      const idRow = new Array(17).fill(null)
      idRow[8] = penerbit.npk ? `NO.REG. ${penerbit.npk}` : ''
      idRow[14] = kepala.npk ? `NPK.${kepala.npk}` : ''
      aoa.push(idRow)
      const grandTotalR = aoa.length
      aoa.push(totalRow('TOTAL', grandTotal))
      merges.push({ s: { r: grandTotalR, c: 0 }, e: { r: grandTotalR, c: 6 } })

      const ws = XLSX.utils.aoa_to_sheet(aoa)
      ws['!merges'] = merges
      ws['!rowBreaks'] = pageBreakRows.map(r => ({ id: r }))
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

  if (!tpkId) return <TpkRequiredState />

  return (
    <div style={{ padding: 24, height: '100vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0a0a0a', color: '#f0f0f0' }}>
      <style>{`
        .dk-input { background: rgba(255,255,255,0.03) !important; border: 1px solid rgba(255,255,255,0.1) !important; color: #f0f0f0 !important; border-radius: 3px; outline: none; font-family: monospace; font-size: 12px; }
        .dk-input:focus { border-color: rgba(0,255,136,0.5) !important; box-shadow: 0 0 0 2px rgba(0,255,136,0.07); }
        .dk-input option { background: #111; color: #f0f0f0; font-family: monospace; }
        .dk-input option:hover,
        .dk-input option:focus,
        .dk-input option:checked {
          background: linear-gradient(0deg, rgba(0,255,136,0.18), rgba(0,255,136,0.18)), #111;
          color: #00ff88;
        }
        .dk-input[type=number] { -moz-appearance: textfield; appearance: textfield; }
        .dk-input[type=number]::-webkit-inner-spin-button, .dk-input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .dk-row:hover td { background: rgba(255,255,255,0.025) !important; }
        .dk-th:hover { background: rgba(255,255,255,0.04) !important; }
        .dk-fi:focus { border-color: rgba(0,255,136,0.5) !important; box-shadow: 0 0 0 2px rgba(0,255,136,0.07); }
        .dk-fi::placeholder { color: rgba(255,255,255,0.15); }
        .dk-fi[type=number] { -moz-appearance: textfield; }
        .dk-fi[type=number]::-webkit-inner-spin-button, .dk-fi[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .dk-missing-dkhp > summary::-webkit-details-marker { display: none; }
        .dk-missing-dkhp > summary { list-style: none; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f0', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'monospace' }}>
            <ScrollText size={18} style={{ color: '#00ff88' }}/>
            DKHP SKSHHK
          </h1>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3, fontFamily: 'monospace' }}>
            register dokumen pengangkutan hasil hutan kayu
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {missingDkhpCount > 0 && (
            <details className="dk-missing-dkhp" style={{ position: 'relative' }}>
              <summary style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 9px', fontSize: 11, fontFamily: 'monospace', color: '#ffaa00', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.28)', borderRadius: 3 }}>
                <span>{missingDkhpCount.toLocaleString('id')} nomor DKHP kosong</span>
                <ChevronDown size={12}/>
              </summary>
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 30, width: 260, maxHeight: 190, overflowY: 'auto', padding: 10, background: '#111', border: '1px solid rgba(255,170,0,0.22)', borderRadius: 4, boxShadow: '0 12px 32px rgba(0,0,0,0.45)' }}>
                <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,170,0,0.7)', marginBottom: 8 }}>
                  detail nomor kosong
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {missingDkhpNumbers.map(no => (
                    <span key={no} style={{ minWidth: 34, padding: '3px 6px', borderRadius: 3, background: 'rgba(255,170,0,0.09)', border: '1px solid rgba(255,170,0,0.18)', color: '#ffaa00', fontSize: 11, fontFamily: 'monospace', textAlign: 'center' }}>
                      {no}
                    </span>
                  ))}
                </div>
              </div>
            </details>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
            <ThemedSelect
              value={exportMonth}
              onChange={setExportMonth}
              options={exportMonthOptions}
              placeholder="bulan"
              disabled={!exportMonthOptions.length || exporting}
              style={{
                flex: '0 0 154px',
                width: 154,
                minWidth: 154,
                minHeight: 28,
                padding: '4px 8px',
                background: 'rgba(255,255,255,0.035)',
                borderColor: 'rgba(255,255,255,0.1)',
                color: '#f0f0f0',
              }}
            />
            <button
              onClick={handleExport}
              disabled={exporting || !exportMonth || !exportMonthOptions.length}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: 11, background: (exporting || !exportMonth || !exportMonthOptions.length) ? 'rgba(0,255,136,0.15)' : '#00ff88', color: (exporting || !exportMonth || !exportMonthOptions.length) ? 'rgba(0,255,136,0.4)' : '#0a0a0a', borderRadius: 3, border: 'none', cursor: (exporting || !exportMonth || !exportMonthOptions.length) ? 'not-allowed' : 'pointer', fontFamily: 'monospace', fontWeight: 700 }}
            >
              {exporting ? <Loader2 size={11} className="animate-spin"/> : <Download size={11}/>}
              arus kayu
            </button>
          </div>
          <button
            onClick={openAdd}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, color: 'rgba(255,255,255,0.65)', cursor: 'pointer', fontFamily: 'monospace' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#f0f0f0' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}
          >
            <Plus size={13}/> tambah
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: 12, background: '#00ff88', color: '#0a0a0a', borderRadius: 3, border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 700 }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <Upload size={13}/> import excel
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
        </div>
      </div>

      {rows.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)' }}>
              menampilkan{' '}
              <span style={{ color: '#f0f0f0', fontWeight: 600 }}>{displayedRows.length.toLocaleString('id')}</span>
              {' '}dari{' '}
              <span style={{ color: '#f0f0f0', fontWeight: 600 }}>{sorted.length.toLocaleString('id')}</span>
              {search.trim() && <span style={{ color: 'rgba(255,255,255,0.22)' }}> (total {rows.length.toLocaleString('id')})</span>}
              {' '}dokumen
            </p>
            {lastUpdated && (
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.22)' }}>
                diperbarui{' '}
                <span style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {lastUpdated.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}{', '}
                  {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </span>
              </span>
            )}
            {pageSize > 0 && totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '3px 8px', fontSize: 10, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'monospace', opacity: safePage === 1 ? 0.4 : 1 }}
                >
                  <ChevronLeft size={10}/> prev
                </button>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', padding: '0 6px', fontFamily: 'monospace' }}>
                  {safePage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '3px 8px', fontSize: 10, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'monospace', opacity: safePage === totalPages ? 0.4 : 1 }}
                >
                  next <ChevronRight size={10}/>
                </button>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ThemedSelect
              value={tanggalFilter}
              onChange={setTanggalFilter}
              options={tanggalFilterOptions}
              style={{
                flex: '0 0 138px',
                width: 138,
                minWidth: 138,
                minHeight: 28,
                padding: '4px 8px',
                background: tanggalFilter === 'all' ? 'rgba(255,255,255,0.03)' : 'rgba(0,255,136,0.06)',
                borderColor: tanggalFilter === 'all' ? 'rgba(255,255,255,0.1)' : 'rgba(0,255,136,0.3)',
                color: tanggalFilter === 'all' ? 'rgba(255,255,255,0.55)' : '#00ff88',
                fontSize: 11,
              }}
            />
            <ThemedSelect
              value={skshhkFilter}
              onChange={setSkshhkFilter}
              options={skshhkFilterOptions}
              style={{
                flex: '0 0 132px',
                width: 132,
                minWidth: 132,
                minHeight: 28,
                padding: '4px 8px',
                background: skshhkFilter === 'all' ? 'rgba(255,255,255,0.03)' : 'rgba(0,255,136,0.06)',
                borderColor: skshhkFilter === 'all' ? 'rgba(255,255,255,0.1)' : 'rgba(0,255,136,0.3)',
                color: skshhkFilter === 'all' ? 'rgba(255,255,255,0.55)' : '#00ff88',
                fontSize: 11,
              }}
            />
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
                <Search size={11} style={{ position: 'absolute', left: 7, color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }}/>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="cari..."
                  className="dk-input"
                  style={{ height: 28, paddingLeft: 24, paddingRight: search ? 22 : 8, width: 140 }}
                />
                {search && (
                  <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex' }}>
                    <X size={10}/>
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => { setDraftSorts([...sorts]); setShowSortPanel(true) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: 11, borderRadius: 3, cursor: 'pointer', fontFamily: 'monospace',
                ...(sorts.length > 0
                  ? { background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)', color: '#00ff88' }
                  : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' })
              }}
            >
              <SlidersHorizontal size={11}/>
              urutan
              {sorts.length > 0 && (
                <span style={{ background: '#00ff88', color: '#0a0a0a', borderRadius: 99, width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>
                  {sorts.length}
                </span>
              )}
            </button>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', fontFamily: 'monospace' }}>tampilkan:</span>
            <div style={{ display: 'flex', gap: 3 }}>
              {PAGE_SIZES.map(p => (
                <button
                  key={p.value}
                  onClick={() => { setPageSize(p.value); setCurrentPage(1) }}
                  style={{
                    padding: '4px 8px', fontSize: 10, borderRadius: 3, fontFamily: 'monospace', fontWeight: 600, cursor: 'pointer',
                    ...(pageSize === p.value
                      ? { background: '#00ff88', color: '#0a0a0a', border: 'none' }
                      : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' })
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12, fontFamily: 'monospace' }}>
            <Loader2 size={14} className="animate-spin" style={{ marginRight: 8 }}/> memuat…
          </div>
        ) : !sorted.length ? (
          <div style={{ padding: 40, textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.22)', fontFamily: 'monospace' }}>
            belum ada data — klik <span style={{ color: '#00ff88' }}>import excel</span> atau <span style={{ color: '#00ff88' }}>tambah</span> untuk mulai
          </div>
        ) : (
          <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', scrollbarGutter: 'stable both-edges' }}>
            <table style={{ minWidth: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {COLS.map(c => (
                    <th
                      key={c.key}
                      onClick={() => toggleSort(c.key)}
                      className="dk-th"
                      style={{ padding: '8px 8px', fontFamily: 'monospace', fontWeight: 600, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', textAlign: c.num ? 'right' : 'left' }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        {c.label}
                        {(() => {
                          const idx = sorts.findIndex(s => s.key === c.key)
                          if (idx === -1) return <ChevronsUpDown size={10} style={{ color: 'rgba(255,255,255,0.15)' }}/>
                          const s = sorts[idx]
                          return (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                              {sorts.length > 1 && <span style={{ fontSize: 8, fontWeight: 700, color: '#00ff88' }}>{idx + 1}</span>}
                              {s.dir === 'asc' ? <ChevronUp size={10} style={{ color: '#00ff88' }}/> : <ChevronDown size={10} style={{ color: '#00ff88' }}/>}
                            </span>
                          )
                        })()}
                      </span>
                    </th>
                  ))}
                  <th style={{ width: 44 }}/>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((row) => row._missingDkhp ? (
                  <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,170,0,0.08)', background: 'rgba(255,170,0,0.035)' }}>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace', color: '#ffaa00', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {row.no_dkhp}
                    </td>
                    <td colSpan={COLS.length} style={{ padding: '7px 8px', fontFamily: 'monospace', color: 'rgba(255,170,0,0.58)', fontSize: 10, letterSpacing: '0.02em' }}>
                      nomor DKHP tidak ada di database
                    </td>
                  </tr>
                ) : (
                  <tr key={row.id} className="dk-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }} onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, row }) }}>
                    {COLS.map(c => {
                      const v = row[c.key]
                      let content
                      if (c.key === 'tanggal' || c.key === 'tanggal_dimatikan') content = displayDate(v)
                      else if (c.key === 'klas') content = <KlasBadge val={v}/>
                      else if (c.key === 'jenis') content = <JenisBadge val={v} klas={row.klas}/>
                      else if (c.num) {
                        const n = Number(v) || 0
                        if (!n) content = <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>
                        else content = c.int ? n.toLocaleString('id') : n.toFixed(3)
                      } else {
                        content = v
                      }
                      const isTujuan = c.key === 'tujuan'
                      return (
                        <td
                          key={c.key}
                          title={isTujuan && v ? v : undefined}
                          style={{
                            padding: '7px 8px',
                            whiteSpace: isTujuan ? 'normal' : 'nowrap',
                            maxWidth: isTujuan ? 280 : undefined,
                            overflow: isTujuan ? 'hidden' : undefined,
                            textOverflow: isTujuan ? 'ellipsis' : undefined,
                            textAlign: c.num ? 'right' : 'left',
                            fontFamily: c.num ? 'monospace' : undefined,
                            color: c.total ? '#f0f0f0' : 'rgba(255,255,255,0.7)',
                            fontWeight: c.total ? 600 : undefined,
                          }}
                        >
                          {content || (!c.num && <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>)}
                        </td>
                      )
                    })}
                    <td style={{ padding: '7px 6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2, opacity: 0, transition: 'opacity 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                      >
                        <button onClick={() => openEdit(row)} style={{ padding: 4, borderRadius: 3, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#f0f0f0'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'none' }}
                        ><Pencil size={12}/></button>
                        <button onClick={() => setDeleteRow(row)} style={{ padding: 4, borderRadius: 3, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#ff6b6b'; e.currentTarget.style.background = 'rgba(255,107,107,0.08)' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'none' }}
                        ><Trash2 size={12}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot style={{ borderTop: '2px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                <tr>
                  <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 700, color: '#f0f0f0', fontSize: 11 }} colSpan={11}>TOTAL</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#f0f0f0', fontSize: 11 }}>{totals.jml_bt.toLocaleString('id')}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#f0f0f0', fontSize: 11 }}>{totals.jml_m3.toFixed(3)}</td>
                  <td colSpan={7}/>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Sort panel modal */}
      {showSortPanel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, width: '100%', maxWidth: 360, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ fontFamily: 'monospace', fontWeight: 600, color: '#f0f0f0', fontSize: 13 }}>pengurutan</p>
              <button onClick={() => setShowSortPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}><X size={14}/></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
              {draftSorts.length === 0 && (
                <p style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.22)', textAlign: 'center', padding: '10px 0' }}>belum ada aturan pengurutan</p>
              )}
              {draftSorts.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', width: 14, textAlign: 'center', fontFamily: 'monospace' }}>{i + 1}</span>
                  <ThemedSelect
                    value={s.key}
                    onChange={next => setDraftSorts(prev => prev.map((x, j) => j === i ? { ...x, key: next } : x))}
                    options={COLS.map(c => ({ value: c.key, label: c.label }))}
                    style={{ flex: 1, minHeight: 29, padding: '5px 6px', fontSize: 11 }}
                  />
                  <button
                    onClick={() => setDraftSorts(prev => prev.map((x, j) => j === i ? { ...x, dir: x.dir === 'asc' ? 'desc' : 'asc' } : x))}
                    style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '5px 8px', fontSize: 10, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', minWidth: 52, justifyContent: 'center', fontFamily: 'monospace' }}
                  >
                    {s.dir === 'asc' ? <><ChevronUp size={10}/> A–Z</> : <><ChevronDown size={10}/> Z–A</>}
                  </button>
                  <button onClick={() => setDraftSorts(prev => prev.filter((_, j) => j !== i))}
                    style={{ padding: 5, borderRadius: 3, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#ff6b6b'; e.currentTarget.style.background = 'rgba(255,107,107,0.08)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'none' }}
                  ><X size={12}/></button>
                </div>
              ))}
            </div>
            {draftSorts.length < COLS.length && (
              <button
                onClick={() => { const used = new Set(draftSorts.map(s => s.key)); const next = COLS.find(c => !used.has(c.key))?.key || COLS[0].key; setDraftSorts(prev => [...prev, { key: next, dir: 'asc' }]) }}
                style={{ width: '100%', padding: '6px 0', marginBottom: 12, fontSize: 11, border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 3, background: 'none', color: 'rgba(255,255,255,0.32)', cursor: 'pointer', fontFamily: 'monospace' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,255,136,0.4)'; e.currentTarget.style.color = '#00ff88' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.32)' }}
              >+ tambah kolom urutan</button>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <button onClick={() => { setDraftSorts([]); setSorts([]); setCurrentPage(1); setShowSortPanel(false) }} style={{ padding: '7px 12px', fontSize: 11, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace' }}>reset</button>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setShowSortPanel(false)} style={{ padding: '7px 14px', fontSize: 11, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace' }}>batal</button>
                <button onClick={() => { setSorts(draftSorts); setCurrentPage(1); setShowSortPanel(false) }} style={{ padding: '7px 14px', fontSize: 11, borderRadius: 3, background: '#00ff88', color: '#0a0a0a', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 700 }}>terapkan</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} />

      {preview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, width: '100%', maxWidth: 400, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ padding: 8, background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 3 }}>
                  <FileSpreadsheet size={16} style={{ color: '#00ff88' }}/>
                </div>
                <div>
                  <p style={{ fontWeight: 600, color: '#f0f0f0', fontSize: 13, fontFamily: 'monospace' }}>konfirmasi import</p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2, fontFamily: 'monospace', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview.fileName}</p>
                </div>
              </div>
              <button onClick={() => setPreview(null)} disabled={importing} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}><X size={14}/></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, marginBottom: 20, fontFamily: 'monospace' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'rgba(255,255,255,0.4)' }}>total terbaca</span><span style={{ color: '#f0f0f0', fontWeight: 600 }}>{preview.rows.length}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'rgba(255,255,255,0.4)' }}>akan diimport</span><span style={{ color: '#00ff88', fontWeight: 600 }}>{preview.newCount}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'rgba(255,255,255,0.4)' }}>sudah ada (skip)</span><span style={{ color: 'rgba(255,255,255,0.35)' }}>{preview.skipCount}</span></div>
            </div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <button onClick={() => setPreview(null)} disabled={importing} style={{ padding: '7px 14px', fontSize: 11, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace' }}>batal</button>
              <button onClick={handleImport} disabled={importing || !preview.newCount} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 11, borderRadius: 3, background: (importing || !preview.newCount) ? 'rgba(0,255,136,0.15)' : '#00ff88', color: (importing || !preview.newCount) ? 'rgba(0,255,136,0.4)' : '#0a0a0a', border: 'none', cursor: (importing || !preview.newCount) ? 'not-allowed' : 'pointer', fontFamily: 'monospace', fontWeight: 700 }}>
                {importing && <Loader2 size={11} className="animate-spin"/>}
                {importing ? 'mengimport…' : `import ${preview.newCount} data`}
              </button>
            </div>
          </div>
        </div>
      )}

      {editRow && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form onSubmit={e => { e.preventDefault(); if (!saving) handleSave() }} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, width: '100%', maxWidth: 700, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ padding: 8, background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 3 }}>
                  <Pencil size={14} style={{ color: '#00ff88' }}/>
                </div>
                <p style={{ fontWeight: 600, color: '#f0f0f0', fontFamily: 'monospace', fontSize: 13 }}>{editRow._new ? 'tambah skshhk' : 'edit skshhk'}</p>
              </div>
              <button type="button" onClick={() => setEditRow(null)} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}><X size={14}/></button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {(() => {
                const klasNorm = (editRow.klas || '').toUpperCase()
                const jenisOptions = JENIS_BY_KLAS[klasNorm] || []
                const iStyle = { width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, padding: '7px 10px', fontSize: 12, color: '#f0f0f0', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }
                const selectStyle = { ...iStyle, backgroundColor: '#101a14', borderColor: 'rgba(0,255,136,0.28)' }
                const computedBt = num(editRow.ai_bt, true) + num(editRow.aii_bt, true) + num(editRow.aiii_bt, true)
                const computedM3 = +(num(editRow.ai_m3) + num(editRow.aii_m3) + num(editRow.aiii_m3)).toFixed(3)
                const handleNumberKey = (e, key) => {
                  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
                  e.preventDefault()
                  const isM3 = key.endsWith('_m3')
                  const step = isM3 ? 0.001 : 1
                  const decimals = isM3 ? 3 : 0
                  const current = Number(editRow[key]) || 0
                  const next = Math.max(0, current + (e.key === 'ArrowUp' ? step : -step))
                  setEditRow(p => ({ ...p, [key]: isM3 ? next.toFixed(decimals) : String(Math.round(next)) }))
                }
                const handleDateBlur = key => {
                  setEditRow(p => {
                    const normalized = normalizeDateInput(p[key], p._dateYear || new Date().getFullYear())
                    return normalized || !p[key] ? { ...p, [key]: normalized || '' } : p
                  })
                }
                const fields = [
                  { label: 'No. DKHP',      key: 'no_dkhp' },
                  { label: 'Tanggal',       key: 'tanggal',   type: 'date' },
                  { label: 'No. SKSHHK *',  key: 'no_skshhk' },
                  { label: 'Tanggal Dimatikan', key: 'tanggal_dimatikan', type: 'date' },
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
                    <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.38)', marginBottom: 4, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</label>
                    {f.kind === 'klas' ? (
                      <ThemedSelect
                        value={editRow.klas ?? ''}
                        onChange={next => setEditRow(p => { const allowed = JENIS_BY_KLAS[next] || []; const keepJenis = allowed.includes((p.jenis || '').toUpperCase()); return { ...p, klas: next, jenis: keepJenis ? p.jenis : (allowed.length === 1 ? allowed[0] : '') } })}
                        options={[{ value: '', label: '— pilih klas —' }, ...KLAS_OPTIONS]}
                        style={selectStyle}
                      />
                    ) : f.kind === 'computed' ? (
                      <input type="text" value={f.display} readOnly tabIndex={-1} style={{ ...iStyle, textAlign: 'right', opacity: 0.5, cursor: 'not-allowed' }}/>
                    ) : f.kind === 'jenis' ? (
                      <ThemedSelect
                        value={editRow.jenis ?? ''}
                        onChange={next => setEditRow(p => ({ ...p, jenis: next }))}
                        disabled={!klasNorm}
                        placeholder={klasNorm ? '— pilih jenis —' : 'Pilih klas dulu'}
                        options={[{ value: '', label: klasNorm ? '— pilih jenis —' : 'Pilih klas dulu' }, ...jenisOptions]}
                        style={selectStyle}
                      />
                    ) : (
                      <input
                        type={f.type === 'date' ? 'text' : (f.type || 'text')}
                        value={f.type === 'date' ? (displayDate(editRow[f.key]) || '') : (editRow[f.key] ?? '')}
                        onChange={e => setEditRow(p => ({ ...p, [f.key]: e.target.value }))}
                        onBlur={f.type === 'date' ? () => handleDateBlur(f.key) : undefined}
                        onKeyDown={f.type === 'number' ? e => handleNumberKey(e, f.key) : undefined}
                        placeholder={f.type === 'date' ? 'dd/mm/yyyy' : undefined}
                        inputMode={f.type === 'date' ? 'numeric' : undefined}
                        step={f.type === 'number' ? (f.key.endsWith('_m3') ? '0.001' : '1') : undefined}
                        min={f.type === 'number' ? '0' : undefined}
                        className="dk-input"
                        style={iStyle}
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
              <div key={f.key} style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.38)', marginBottom: 4, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</label>
                {f.multiline ? (
                  <textarea rows={2} value={editRow[f.key] ?? ''} onChange={e => setEditRow(p => ({ ...p, [f.key]: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, padding: '7px 10px', fontSize: 12, color: '#f0f0f0', fontFamily: 'monospace', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}/>
                ) : (
                  <input type="text" value={editRow[f.key] ?? ''} onChange={e => setEditRow(p => ({ ...p, [f.key]: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, padding: '7px 10px', fontSize: 12, color: '#f0f0f0', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }}/>
                )}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" onClick={() => setEditRow(null)} disabled={saving} style={{ padding: '8px 16px', fontSize: 12, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace' }}>batal</button>
              <button type="submit" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 12, borderRadius: 3, background: saving ? 'rgba(0,255,136,0.3)' : '#00ff88', color: '#0a0a0a', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'monospace', fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
                {saving && <Loader2 size={12} className="animate-spin"/>}
                {saving ? 'menyimpan…' : 'simpan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteRow && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, width: '100%', maxWidth: 320, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ padding: 8, background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 3 }}>
                <Trash2 size={16} style={{ color: '#ff6b6b' }}/>
              </div>
              <div>
                <p style={{ fontWeight: 600, color: '#f0f0f0', fontSize: 13, fontFamily: 'monospace' }}>hapus skshhk</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2, fontFamily: 'monospace' }}>{deleteRow.no_skshhk}</p>
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 20, fontFamily: 'monospace' }}>data akan dihapus permanen.</p>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteRow(null)} disabled={deleting} style={{ padding: '7px 14px', fontSize: 11, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace' }}>batal</button>
              <button onClick={handleDelete} disabled={deleting} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 11, borderRadius: 3, background: '#ff6b6b', color: '#fff', border: 'none', cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'monospace', fontWeight: 700, opacity: deleting ? 0.7 : 1 }}>
                {deleting && <Loader2 size={11} className="animate-spin"/>}
                {deleting ? 'menghapus…' : 'hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Context menu */}
      {contextMenu && (
        <div
          style={{ position: 'fixed', zIndex: 200, background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.6)', padding: '4px 0', minWidth: 160, top: contextMenu.y, left: contextMenu.x }}
          onMouseDown={e => e.stopPropagation()}
        >
          <button
            onClick={() => { openEdit(contextMenu.row); setContextMenu(null) }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '7px 16px', fontSize: 12, color: 'rgba(255,255,255,0.65)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'monospace' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <Pencil size={12} style={{ color: 'rgba(255,255,255,0.3)' }}/> edit
          </button>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '3px 0' }}/>
          <button
            onClick={() => { setDeleteRow(contextMenu.row); setContextMenu(null) }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '7px 16px', fontSize: 12, color: '#ff6b6b', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'monospace' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,107,107,0.07)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <Trash2 size={12}/> hapus
          </button>
        </div>
      )}
    </div>
  )
}
