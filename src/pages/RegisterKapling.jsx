import { useEffect, useMemo, useRef, useState } from 'react'
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle, Loader2, FileText, Pencil, Trash2, Settings, ChevronUp, ChevronDown, ChevronsUpDown, SlidersHorizontal, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import * as XLSX from 'xlsx'
import * as pdfjsLib from 'pdfjs-dist'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthProvider'

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
  const [deleteRow, setDeleteRow]             = useState(null)
  const [deleting, setDeleting]               = useState(false)
  const [selectedIds, setSelectedIds]         = useState(new Set())
  const [showBatchDelete, setShowBatchDelete] = useState(false)
  const [batchDeleting, setBatchDeleting]     = useState(false)
  const [showBatchEdit, setShowBatchEdit]     = useState(false)
  const [batchEditData, setBatchEditData]     = useState({ tgl_kapling: '', periode: '', no_blok: '', sertifikasi: '' })
  const [batchEditSaving, setBatchEditSaving] = useState(false)
  const [contextMenu, setContextMenu]         = useState(null)
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
  const [currentPage, setCurrentPage]   = useState(1)
  const [sorts, setSorts]               = useState([])
  const [showSortPanel, setShowSortPanel] = useState(false)
  const [draftSorts, setDraftSorts]     = useState([])
  const [searchTerm, setSearchTerm]     = useState('')
  const [searchCol, setSearchCol]       = useState('all')
  const [realtimeStatus, setRealtimeStatus] = useState('connecting')

  const fileRef      = useRef()
  const invoisRef    = useRef()
  const selectAllRef = useRef()

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
    setSelectedIds(new Set())
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
    const tpkId = profile?.tpk_id
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

  // ── Edit row ──────────────────────────────────────────────────────────────
  async function handleEditSave() {
    if (!editRow) return
    setEditSaving(true)
    const { error } = await supabase
      .from('tabel_register_kapling')
      .update({
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

  // ── Batch delete ─────────────────────────────────────────────────────────
  async function handleBatchDelete() {
    setBatchDeleting(true)
    const ids = [...selectedIds]
    const { error } = await supabase
      .from('tabel_register_kapling')
      .delete()
      .in('id', ids)
    setBatchDeleting(false)
    if (error) { showToast(error.message, 'error'); return }
    showToast(`${ids.length} kapling berhasil dihapus`)
    setShowBatchDelete(false)
    fetchData()
  }

  // ── Batch edit ───────────────────────────────────────────────────────────
  async function handleBatchEdit() {
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

  const kaplingInfo = useMemo(() => analyzeKapling(rows), [rows])

  const totalBatang = rows.reduce((s, r) => s + (r.batang || 0), 0)
  const totalVolume = rows.reduce((s, r) => s + Number(r.volume || 0), 0)

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
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-4 flex gap-4">
            {/* kiri: total + terakhir */}
            <div className="shrink-0">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Total Kapling</p>
              <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{rows.length.toLocaleString('id')}</p>
              {kaplingInfo && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">
                  Terakhir:&nbsp;
                  <span className="font-mono font-semibold text-gray-600 dark:text-gray-300">
                    {kaplingInfo.shorten(kaplingInfo.last)}
                  </span>
                </p>
              )}
            </div>
            {/* kanan: rincian loncat */}
            {kaplingInfo?.missing.length > 0 && (
              <div className="flex-1 min-w-0 border-l border-gray-100 dark:border-gray-700 pl-4">
                <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 mb-1.5">
                  Missing ({kaplingInfo.missing.length})
                </p>
                <div className="flex flex-wrap gap-1 content-start max-h-[60px] overflow-y-auto pr-0.5">
                  {kaplingInfo.missing.map((m, i) => (
                    <span key={i} className="text-[10px] font-mono bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded px-1.5 py-0.5 leading-none whitespace-nowrap">
                      {m.from === m.to
                        ? kaplingInfo.shorten(m.from)
                        : `${kaplingInfo.shorten(m.from)}–${kaplingInfo.shorten(m.to)}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

            {/* header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-primary-50 dark:bg-primary-900/30 p-2 rounded-lg">
                  <FileSpreadsheet size={20} className="text-primary-600"/>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{preview.fileName}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{preview.rows.length} baris ditemukan</p>
                </div>
              </div>
              <button onClick={() => setPreview(null)}><X size={16} className="text-gray-400 dark:text-gray-500 hover:text-gray-600"/></button>
            </div>

            {/* mode tabs */}
            <div className="px-6 flex-shrink-0">
              <div className="flex p-1 bg-gray-100 dark:bg-gray-900 rounded-lg mb-4">
                <button
                  onClick={() => setPreview(p => ({ ...p, mode: 'insert' }))}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    preview.mode === 'insert'
                      ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                  }`}
                >
                  Tambah Baru
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    preview.mode === 'insert' ? 'bg-green-100 text-green-700' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  }`}>{preview.newCount}</span>
                </button>
                <button
                  onClick={() => setPreview(p => ({ ...p, mode: 'update' }))}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    preview.mode === 'update'
                      ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                  }`}
                >
                  Update Kolom Kosong
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    preview.mode === 'update' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  }`}>{preview.updateRows.length}</span>
                </button>
              </div>
            </div>

            {/* body */}
            <div className="px-6 overflow-y-auto flex-1 min-h-0">
              {preview.mode === 'insert' ? (
                <>
                  <div className="flex gap-3 mb-4">
                    <div className="flex-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
                      <p className="text-xs text-green-600 dark:text-green-400 mb-0.5">Kapling baru</p>
                      <p className="text-xl font-bold text-green-700 dark:text-green-300">{preview.newCount}</p>
                    </div>
                    {(preview.skipCount > 0 || preview.updateRows.length > 0) && (
                      <div className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Sudah ada</p>
                        <p className="text-xl font-bold text-gray-500 dark:text-gray-400">
                          {preview.skipCount + preview.updateRows.length}
                        </p>
                      </div>
                    )}
                  </div>
                  {preview.newCount === 0
                    ? <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 mb-4 text-xs text-amber-700 dark:text-amber-400">
                        Semua kapling dalam file ini sudah ada di database.
                      </div>
                    : <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg px-4 py-3 mb-4 text-xs text-blue-700 dark:text-blue-400">
                        Hanya kapling baru yang akan ditambahkan. Data yang sudah ada tidak akan diubah.
                      </div>
                  }
                </>
              ) : (
                <>
                  {preview.updateRows.length === 0 ? (
                    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 mb-4 text-xs text-gray-500 dark:text-gray-400">
                      Tidak ada kapling dengan kolom kosong yang bisa diisi.
                    </div>
                  ) : (
                    <>
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg px-4 py-3 mb-3 text-xs text-blue-700 dark:text-blue-400">
                        Hanya kolom yang kosong di database yang akan diisi. Kolom yang sudah berisi data tidak akan diubah.
                      </div>
                      <div className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden mb-4">
                        <div className="bg-gray-50 dark:bg-gray-900 px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 flex justify-between">
                          <span>No. Kapling</span>
                          <span>Kolom yang akan diisi</span>
                        </div>
                        <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-[260px] overflow-y-auto">
                          {preview.updateRows.map(({ row, fields }) => (
                            <div key={row.no_kapling} className="px-3 py-2 flex items-center justify-between gap-2">
                              <span className="font-mono text-xs text-gray-700 dark:text-gray-200 shrink-0">{row.no_kapling}</span>
                              <div className="flex flex-wrap gap-1 justify-end">
                                {fields.slice(0, 4).map(f => (
                                  <span key={f.key} className="text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded px-1.5 py-0.5 leading-none whitespace-nowrap">
                                    {f.label}
                                  </span>
                                ))}
                                {fields.length > 4 && (
                                  <span className="text-[10px] text-gray-400 dark:text-gray-500">+{fields.length - 4}</span>
                                )}
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

            {/* footer */}
            <div className="flex gap-2 justify-end px-6 pb-6 pt-2 flex-shrink-0 border-t border-gray-100 dark:border-gray-700 mt-2">
              <button onClick={() => setPreview(null)} className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                Batal
              </button>
              {preview.mode === 'insert' ? (
                <button
                  onClick={handleImport}
                  disabled={importing || preview.newCount === 0}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60"
                >
                  {importing && <Loader2 size={13} className="animate-spin"/>}
                  {importing ? 'Menyimpan...' : `Tambah ${preview.newCount} Kapling`}
                </button>
              ) : (
                <button
                  onClick={handleImport}
                  disabled={importing || preview.updateRows.length === 0}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {importing && <Loader2 size={13} className="animate-spin"/>}
                  {importing ? 'Mengupdate...' : `Update ${preview.updateRows.length} Kapling`}
                </button>
              )}
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
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-700/60 shrink-0">
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100">Edit Kapling</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono">{editRow.no_kapling}</p>
              </div>
              <button onClick={() => setEditRow(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <X size={16} className="text-gray-400 dark:text-gray-500"/>
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto px-6 py-4 flex flex-col gap-5">

              {/* Identitas */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Identitas</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Tgl Kapling', key: 'tgl_kapling', type: 'date', span: 1 },
                    { label: 'Periode',     key: 'periode',     span: 1 },
                    { label: 'No Blok',     key: 'no_blok',     span: 1 },
                  ].map(f => (
                    <div key={f.key} className={f.span === 2 ? 'col-span-2' : ''}>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{f.label}</label>
                      <input
                        type={f.type || 'text'}
                        value={editRow[f.key] ?? ''}
                        onChange={e => setEditRow(prev => ({ ...prev, [f.key]: e.target.value }))}
                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                        step={f.type === 'number' ? 'any' : undefined}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Kayu */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Kayu</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Jenis Kayu',   key: 'jenis' },
                    { label: 'Sortimen',     key: 'sortimen' },
                    { label: 'Sort. Untuk',  key: 'sort_untuk' },
                    { label: 'Asal Kayu',    key: 'asal_kayu' },
                    { label: 'Panjang',      key: 'panjang' },
                    { label: 'Lebar',        key: 'lebar' },
                    { label: 'Dia/Tebal',    key: 'diameter_tebal' },
                    { label: 'Jumlah',       key: 'batang',  type: 'number' },
                    { label: 'Volume (M³)',  key: 'volume',  type: 'number' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{f.label}</label>
                      <input
                        type={f.type || 'text'}
                        value={editRow[f.key] ?? ''}
                        onChange={e => setEditRow(prev => ({ ...prev, [f.key]: e.target.value }))}
                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                        step={f.type === 'number' ? 'any' : undefined}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Kualitas */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Kualitas</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Status',  key: 'status',      opts: ['LOKAL', 'INDUSTRI'] },
                    { label: 'Mutu',    key: 'mutu',         opts: ['P', 'D', 'T', 'M', 'L', 'KBP'] },
                    { label: 'Cacat',   key: 'cacat',        opts: [{ v: 'NRM', l: 'NRM' }, { v: 'BUN', l: 'BUN (BC)' }, { v: 'DOR', l: 'DOR (DR)' }] },
                    { label: 'Sertifikasi', key: 'sertifikasi', opts: ['FSC', 'NFSC'] },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{f.label}</label>
                      <select
                        value={editRow[f.key] ?? ''}
                        onChange={e => setEditRow(prev => ({ ...prev, [f.key]: e.target.value }))}
                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                      >
                        <option value="">— Pilih —</option>
                        {f.opts.map(o => typeof o === 'string'
                          ? <option key={o} value={o}>{o}</option>
                          : <option key={o.v} value={o.v}>{o.l}</option>
                        )}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dokumen */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Dokumen</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'No. Invois', key: 'no_invois', span: 2 },
                    { label: 'DKHP',       key: 'dkhp' },
                    { label: 'SKSHHK',     key: 'skshhk', span: 2 },
                    { label: 'Pembeli',    key: 'pembeli' },
                  ].map(f => (
                    <div key={f.key} className={f.span === 2 ? 'col-span-2' : ''}>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{f.label}</label>
                      <input
                        type="text"
                        value={editRow[f.key] ?? ''}
                        onChange={e => setEditRow(prev => ({ ...prev, [f.key]: e.target.value }))}
                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                      />
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="flex gap-2 justify-end px-6 py-4 border-t border-gray-100 dark:border-gray-700/60 shrink-0">
              <button onClick={() => setEditRow(null)} className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Batal</button>
              <button onClick={handleEditSave} disabled={editSaving} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60 transition-colors">
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

      {/* Batch delete confirm modal */}
      {showBatchDelete && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-50 p-2 rounded-lg">
                <Trash2 size={18} className="text-red-500"/>
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Hapus Data Terpilih</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{selectedIds.size} kapling dipilih</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
              Semua kapling yang dipilih akan dihapus permanen dan tidak dapat dikembalikan.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowBatchDelete(false)}
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Batal
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={batchDeleting}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-60"
              >
                {batchDeleting && <Loader2 size={13} className="animate-spin"/>}
                {batchDeleting ? 'Menghapus...' : `Hapus ${selectedIds.size} Kapling`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch edit modal */}
      {showBatchEdit && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg">
                <Pencil size={18} className="text-blue-600 dark:text-blue-400"/>
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Edit Massal</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{selectedIds.size} kapling terpilih · isi field yang ingin diubah</p>
              </div>
              <button onClick={() => setShowBatchEdit(false)} className="ml-auto">
                <X size={16} className="text-gray-400 dark:text-gray-500 hover:text-gray-600"/>
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tgl Kapling</label>
                <input
                  type="date"
                  value={batchEditData.tgl_kapling}
                  onChange={e => setBatchEditData(prev => ({ ...prev, tgl_kapling: e.target.value }))}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Periode</label>
                <input
                  type="text"
                  value={batchEditData.periode}
                  onChange={e => setBatchEditData(prev => ({ ...prev, periode: e.target.value }))}
                  placeholder="Kosongkan untuk tidak diubah"
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">No Blok</label>
                <input
                  type="text"
                  value={batchEditData.no_blok}
                  onChange={e => setBatchEditData(prev => ({ ...prev, no_blok: e.target.value }))}
                  placeholder="Kosongkan untuk tidak diubah"
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sertifikasi</label>
                <select
                  value={batchEditData.sertifikasi}
                  onChange={e => setBatchEditData(prev => ({ ...prev, sertifikasi: e.target.value }))}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                >
                  <option value="">— Tidak diubah —</option>
                  <option value="FSC">FSC</option>
                  <option value="NFSC">NFSC</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowBatchEdit(false)}
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Batal
              </button>
              <button
                onClick={handleBatchEdit}
                disabled={batchEditSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
              >
                {batchEditSaving && <Loader2 size={13} className="animate-spin"/>}
                {batchEditSaving ? 'Menyimpan...' : `Update ${selectedIds.size} Kapling`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sort panel modal */}
      {showSortPanel && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100">Urutan Data</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Atur prioritas kolom dan arah pengurutan</p>
              </div>
              <button onClick={() => setShowSortPanel(false)}><X size={16} className="text-gray-400 dark:text-gray-500 hover:text-gray-600"/></button>
            </div>

            <div className="space-y-2 mb-3">
              {draftSorts.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-3">Belum ada aturan pengurutan</p>
              )}
              {draftSorts.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 w-4 text-center">{i + 1}</span>
                  <select
                    value={s.key}
                    onChange={e => setDraftSorts(prev => prev.map((x, j) => j === i ? { ...x, key: e.target.value } : x))}
                    className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {COLS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                  <button
                    onClick={() => setDraftSorts(prev => prev.map((x, j) => j === i ? { ...x, dir: x.dir === 'asc' ? 'desc' : 'asc' } : x))}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 min-w-[60px] justify-center"
                  >
                    {s.dir === 'asc' ? <><ChevronUp size={11}/> A–Z</> : <><ChevronDown size={11}/> Z–A</>}
                  </button>
                  <button
                    onClick={() => setDraftSorts(prev => prev.filter((_, j) => j !== i))}
                    className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 dark:text-gray-500 hover:text-red-500"
                  >
                    <X size={13}/>
                  </button>
                </div>
              ))}
            </div>

            {draftSorts.length < COLS.length && (
              <button
                onClick={() => {
                  const used = new Set(draftSorts.map(s => s.key))
                  const next = COLS.find(c => !used.has(c.key))?.key || COLS[0].key
                  setDraftSorts(prev => [...prev, { key: next, dir: 'asc' }])
                }}
                className="w-full py-2 mb-4 text-xs border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-primary-400 hover:text-primary-600 transition-colors"
              >
                + Tambah Kolom Urutan
              </button>
            )}

            <div className="flex gap-2 justify-between">
              <button
                onClick={() => { setDraftSorts([]); setSorts([]); setCurrentPage(1); setShowSortPanel(false) }}
                className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Reset
              </button>
              <div className="flex gap-2">
                <button onClick={() => setShowSortPanel(false)} className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">Batal</button>
                <button
                  onClick={() => { setSorts(draftSorts); setCurrentPage(1); setShowSortPanel(false) }}
                  className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Terapkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table toolbar */}
      {rows.length > 0 && (
        <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Menampilkan{' '}
              <span className="font-semibold text-gray-600 dark:text-gray-300">{displayedRows.length.toLocaleString('id')}</span>
              {' '}dari{' '}
              <span className="font-semibold text-gray-600 dark:text-gray-300">{searchedRows.length.toLocaleString('id')}</span>
              {searchTerm.trim() && (
                <span className="text-gray-400 dark:text-gray-500">
                  {' '}(total {rows.length.toLocaleString('id')})
                </span>
              )}
              {' '}kapling
            </p>
            {selectedIds.size > 0 && (
              <>
                <button
                  onClick={() => { setBatchEditData({ tgl_kapling: '', periode: '', no_blok: '', sertifikasi: '' }); setShowBatchEdit(true) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                >
                  <Pencil size={12}/>
                  Edit {selectedIds.size} terpilih
                </button>
                <button
                  onClick={() => setShowBatchDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                >
                  <Trash2 size={12}/>
                  Hapus {selectedIds.size} terpilih
                </button>
              </>
            )}
            {pageSize > 0 && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="flex items-center gap-0.5 px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={11}/> Prev
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400 px-2 font-medium">
                  {safePage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="flex items-center gap-0.5 px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next <ChevronRight size={11}/>
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="flex items-center gap-1">
              <select
                value={searchCol}
                onChange={e => setSearchCol(e.target.value)}
                className="h-7 px-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-400"
              >
                <option value="all">Semua Kolom</option>
                {COLS.map(c => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
              <div className="relative flex items-center">
                <Search size={12} className="absolute left-2 text-gray-400 dark:text-gray-500 pointer-events-none"/>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Cari..."
                  className="h-7 pl-6 pr-6 text-xs w-40 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-400"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X size={11}/>
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => { setDraftSorts([...sorts]); setShowSortPanel(true) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                sorts.length > 0
                  ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-700 text-primary-700 dark:text-primary-400'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <SlidersHorizontal size={12}/>
              Urutan
              {sorts.length > 0 && (
                <span className="bg-primary-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold leading-none">
                  {sorts.length}
                </span>
              )}
            </button>
            <span className="text-xs text-gray-400 dark:text-gray-500">Tampilkan:</span>
            <div className="flex gap-1">
              {PAGE_SIZES.map(p => (
                <button
                  key={p.value}
                  onClick={() => { setPageSize(p.value); setCurrentPage(1) }}
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
                  <th className="px-2 py-2.5 sticky left-0 bg-gray-50 dark:bg-gray-900 z-10 w-8">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-2 py-2.5 text-left font-semibold text-gray-500 dark:text-gray-400 w-8">No</th>
                  {COLS.map(c => (
                    <th
                      key={c.key}
                      onClick={() => toggleSort(c.key)}
                      className={`px-2 py-2.5 font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${c.num ? 'text-right' : 'text-left'} ${c.w}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {c.label}
                        {(() => {
                          const idx = sorts.findIndex(s => s.key === c.key)
                          if (idx === -1) return <ChevronsUpDown size={11} className="text-gray-300 dark:text-gray-600"/>
                          const s = sorts[idx]
                          return (
                            <span className="inline-flex items-center gap-0.5">
                              {sorts.length > 1 && <span className="text-[9px] font-bold text-primary-400 leading-none">{idx + 1}</span>}
                              {s.dir === 'asc'
                                ? <ChevronUp size={11} className="text-primary-500"/>
                                : <ChevronDown size={11} className="text-primary-500"/>}
                            </span>
                          )
                        })()}
                      </span>
                    </th>
                  ))}
                  <th className="px-2 py-2.5 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayedRows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={`transition-colors group ${selectedIds.has(row.id) ? 'bg-primary-50 dark:bg-primary-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, row }) }}
                  >
                    <td className="px-2 py-2 sticky left-0 z-10 bg-inherit">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleSelectRow(row.id)}
                        className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-2 py-2 text-gray-400 dark:text-gray-500">{(safePage - 1) * (pageSize || 0) + i + 1}</td>
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
                  <td className="px-2 py-2 sticky left-0 bg-gray-50 dark:bg-gray-900 z-10" colSpan={12}>TOTAL</td>
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

      {/* Context menu */}
      {contextMenu && (() => {
        const isBatch = selectedIds.size > 1 && selectedIds.has(contextMenu.row.id)
        return (
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1 min-w-[160px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onMouseDown={e => e.stopPropagation()}
          >
            {isBatch && (
              <div className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {selectedIds.size} kapling terpilih
              </div>
            )}
            <button
              onClick={() => {
                if (isBatch) {
                  setBatchEditData({ tgl_kapling: '', periode: '', no_blok: '', sertifikasi: '' })
                  setShowBatchEdit(true)
                } else {
                  setEditRow({ ...contextMenu.row })
                }
                setContextMenu(null)
              }}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Pencil size={13} className="text-gray-400 dark:text-gray-500"/>
              {isBatch ? `Edit ${selectedIds.size} terpilih` : 'Edit'}
            </button>
            <div className="my-1 border-t border-gray-100 dark:border-gray-700"/>
            <button
              onClick={() => {
                if (isBatch) {
                  setShowBatchDelete(true)
                } else {
                  setDeleteRow(contextMenu.row)
                }
                setContextMenu(null)
              }}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 size={13}/>
              {isBatch ? `Hapus ${selectedIds.size} terpilih` : 'Hapus'}
            </button>
          </div>
        )
      })()}
    </div>
  )
}
