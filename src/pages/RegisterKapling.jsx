import { useEffect, useMemo, useRef, useState } from 'react'
import { Upload, X, FileText, Settings, Plus, Tag, FileBarChart2 } from 'lucide-react'
import Toast, { useToast } from '../components/Toast'
import * as XLSX from 'xlsx'
import * as pdfjsLib from 'pdfjs-dist'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthProvider'
import { getEffectiveTpkId } from '../lib/effectiveTpk'
import { getTpkScopedStorageKey } from '../lib/tpkScopedStorage'
import ThemedSelect from '../components/ThemedSelect'
import TpkRequiredState from '../components/TpkRequiredState'
import RegisterKaplingBatchEditModal from './RegisterKaplingBatchEditModal.jsx'
import RegisterKaplingContextMenu from './RegisterKaplingContextMenu.jsx'
import RegisterKaplingDeleteModal from './RegisterKaplingDeleteModal.jsx'
import RegisterKaplingDkhpImportPreview from './RegisterKaplingDkhpImportPreview.jsx'
import RegisterKaplingDkhpModal from './RegisterKaplingDkhpModal.jsx'
import RegisterKaplingEditModal from './RegisterKaplingEditModal.jsx'
import RegisterKaplingExcelImportPreview from './RegisterKaplingExcelImportPreview.jsx'
import RegisterKaplingFixPrefixModal from './RegisterKaplingFixPrefixModal.jsx'
import RegisterKaplingInvoicePreview from './RegisterKaplingInvoicePreview.jsx'
import RegisterKaplingSettingsModal from './RegisterKaplingSettingsModal.jsx'
import RegisterKaplingSortPanel from './RegisterKaplingSortPanel.jsx'
import RegisterKaplingTable from './RegisterKaplingTable.jsx'
import RegisterKaplingToolbar from './RegisterKaplingToolbar.jsx'
import {
  prepareExcelImportPreview,
  saveExcelImportPreview,
} from './registerKaplingExcelImport'
import {
  prepareDkhpImportPreview,
  saveDkhpForRows,
  saveDkhpImportPreview,
} from './registerKaplingDkhpImport'
import {
  prepareInvoiceImportPreview,
  saveInvoiceImportPreview,
} from './registerKaplingInvoiceImport'
import {
  buildFixPrefixMap,
  saveFixPrefixUpdates,
} from './registerKaplingFixPrefix'
import {
  buildRegisterKaplingMetrics,
  countMissingKaplings,
} from './registerKaplingMetrics'
import {
  saveBatchDeleteRows,
  saveBatchEditRows,
  saveDeletedRow,
  saveEditedRow,
} from './registerKaplingCrud'
import {
  fetchPenguranganInvoices,
  fetchRegisterKaplingRows,
} from './registerKaplingDataLoader'
import {
  COL_MAP_STORAGE_KEY,
  COLS,
  DEFAULT_COL_MAP,
  EXCEL_HEADERS_STORAGE_KEY,
  FIELD_DEFS,
  PAGE_SIZES,
  SORTIMENS,
} from './registerKaplingConstants'
import {
  analyzeKapling,
  formatDate,
  formatPeriode,
} from './registerKaplingUtils'
import { buildRegisterKaplingTableState } from './registerKaplingTable'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href

const INVOIS_PREFIX_MAP = {
  ECR: { bg: 'rgba(0,180,255,0.1)',   color: 'rgba(0,180,255,0.95)',  border: 'rgba(0,180,255,0.28)',  desc: 'Retail' },
  ECK: { bg: 'rgba(0,255,136,0.08)',  color: '#00ff88',               border: 'rgba(0,255,136,0.22)',  desc: 'DK318'  },
  EKK: { bg: 'rgba(170,80,255,0.1)',  color: 'rgba(170,80,255,0.9)',  border: 'rgba(170,80,255,0.28)', desc: 'Khusus' },
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

async function readDkhpWorkbookRows(file) {
  const arrayBuffer = await file.arrayBuffer()
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
}

const RK_BADGE_BASE = { display: 'inline-block', padding: '2px 6px', borderRadius: 3, fontSize: 10, fontWeight: 600, fontFamily: 'monospace' }

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

  const [expandedCard, setExpandedCard]     = useState(null)

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
    try {
      const [loadedRows, loadedPenguranganInvoices] = await Promise.all([
        fetchRegisterKaplingRows({ supabase, tpkId }),
        fetchPenguranganInvoices({ supabase, tpkId }),
      ])
      setRows(loadedRows)
      setSelectedIds(new Set())
      setPenguranganInvoices(loadedPenguranganInvoices)
    } catch (error) {
      showToast(error.message, 'error')
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
      const result = prepareExcelImportPreview({
        colMap,
        currentRows: rows,
        fieldDefs: FIELD_DEFS,
        fileName: file.name,
        rawRows: raw,
      })

      if (result.headers.length) {
        setExcelHeaders(result.headers)
        localStorage.setItem(excelHeadersStorageKey, JSON.stringify(result.headers))
      }

      if (result.error) {
        showToast(result.error, 'error')
        return
      }

      setPreview(result.preview)
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

    const result = await saveExcelImportPreview({
      currentRows: rows,
      preview,
      supabase,
      tpkId,
    })
    setImporting(false)
    showToast(result.message, result.type)
    if (result.closePreview) setPreview(null)
    if (result.refresh) fetchData()
  }

  // ── Edit / Add row ────────────────────────────────────────────────────────
  async function handleEditSave() {
    if (!editRow) return
    if (!editRow.no_kapling?.trim()) { showToast('No. Kapling wajib diisi.', 'error'); return }
    if (!tpkId) { showToast('Profil TPK tidak ditemukan. Coba login ulang.', 'error'); return }
    setEditSaving(true)
    const result = await saveEditedRow({ row: editRow, supabase, tpkId })
    setEditSaving(false)
    showToast(result.message, result.type)
    if (result.closeEditor) setEditRow(null)
    if (result.refresh) fetchData()
  }

  // ── Batch delete ─────────────────────────────────────────────────────────
  async function handleBatchDelete() {
    if (!tpkId) { showToast('Profil TPK tidak ditemukan. Coba login ulang.', 'error'); return }
    setBatchDeleting(true)
    const result = await saveBatchDeleteRows({ selectedIds, supabase, tpkId })
    setBatchDeleting(false)
    showToast(result.message, result.type)
    if (result.closeEditor) setShowBatchDelete(false)
    if (result.refresh) fetchData()
  }

  // ── Batch edit ───────────────────────────────────────────────────────────
  async function handleBatchEdit() {
    if (!tpkId) { showToast('Profil TPK tidak ditemukan. Coba login ulang.', 'error'); return }
    setBatchEditSaving(true)
    const result = await saveBatchEditRows({ data: batchEditData, selectedIds, supabase, tpkId })
    setBatchEditSaving(false)
    showToast(result.message, result.type)
    if (result.closeEditor) setShowBatchEdit(false)
    if (result.resetData) setBatchEditData({ tgl_kapling: '', periode: '', no_blok: '', sertifikasi: '' })
    if (result.refresh) fetchData()
  }

  // ── Delete row ────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteRow) return
    if (!tpkId) { showToast('Profil TPK tidak ditemukan. Coba login ulang.', 'error'); return }
    setDeleting(true)
    const result = await saveDeletedRow({ row: deleteRow, supabase, tpkId })
    setDeleting(false)
    showToast(result.message, result.type)
    if (result.closeEditor) setDeleteRow(null)
    if (result.refresh) fetchData()
  }

  // ── PDF invoice input ─────────────────────────────────────────────────────
  async function handleInvoisFileChange(e) {
    const files = [...(e.target.files || [])]
    if (!files.length) return
    e.target.value = ''

    try {
      const result = await prepareInvoiceImportPreview({
        files,
        parseInvoice: parsePdfInvoice,
        rows,
      })
      if (result.error) {
        showToast(result.error, 'error')
        return
      }
      setInvoisPreview(result.preview)
    } catch (err) {
      showToast('Gagal membaca PDF invois: ' + err.message, 'error')
    }
  }

  async function handleInvoisSave() {
    if (!invoisPreview?.totalMatched) return
    if (!tpkId) { showToast('Profil TPK tidak ditemukan. Coba login ulang.', 'error'); return }
    setInvoisSaving(true)
    const result = await saveInvoiceImportPreview({
      preview: invoisPreview,
      supabase,
      tpkId,
    })
    setInvoisSaving(false)
    showToast(result.message, result.type)
    if (result.closePreview) setInvoisPreview(null)
    if (result.refresh) fetchData()
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
    setDkhpSaving(true)
    const result = await saveDkhpForRows({
      dkhpInput,
      conflicts: dkhpConflicts,
      rows: dkhpModalRows,
      skipConflicts,
      supabase,
      tpkId,
    })
    setDkhpSaving(false)
    if (result.message) toast(result.message, result.type)
    if (result.closeModal) setShowDkhpModal(false)
    if (result.refresh) fetchData()
  }

  async function handleDkhpImportFiles(e) {
    const files = [...(e.target.files || [])]
    if (!files.length) return
    e.target.value = ''
    const result = await prepareDkhpImportPreview({
      files,
      readWorkbookRows: readDkhpWorkbookRows,
      rows,
    })
    if (result.error) { toast(result.error, 'error'); return }
    setDkhpImportPreview(result.preview)
  }

  async function handleDkhpImportSave(skipConflicts) {
    setDkhpImportSaving(true)
    const result = await saveDkhpImportPreview({
      preview: dkhpImportPreview,
      skipConflicts,
      supabase,
      tpkId,
    })
    setDkhpImportSaving(false)
    toast(result.message, result.type)
    if (result.closePreview) setDkhpImportPreview(null)
    if (result.refresh) fetchData()
  }

  function handleOpenFixPrefix() {
    setFixPrefixMap(buildFixPrefixMap({
      invoicePrefixMap: INVOIS_PREFIX_MAP,
      penguranganInvoices,
      rows,
    }))
    setShowFixPrefix(true)
  }

  async function handleApplyFixPrefix() {
    if (!tpkId) { showToast('Profil TPK tidak ditemukan.', 'error'); return }
    setFixPrefixSaving(true)
    const result = await saveFixPrefixUpdates({ fixPrefixMap, supabase, tpkId })
    setFixPrefixSaving(false)
    showToast(result.message, result.type)
    if (result.closeModal) setShowFixPrefix(false)
    if (result.refresh) fetchData()
  }

  const kaplingInfo = useMemo(() => analyzeKapling(rows), [rows])

  const totalMissingCount = useMemo(() => countMissingKaplings(kaplingInfo), [kaplingInfo])

  const {
    blokBreakdown,
    missingInvoices,
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
  } = useMemo(() => buildRegisterKaplingMetrics({
    penguranganInvoices,
    rows,
    sortimens: SORTIMENS,
  }), [penguranganInvoices, rows])

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

  const {
    searchedRows,
    totalPages,
    safePage,
    displayedRows,
    displayedIds,
    allSelected,
    someSelected,
  } = useMemo(() => buildRegisterKaplingTableState({
    rows,
    sorts,
    searchTerm,
    searchCol,
    pageSize,
    currentPage,
    selectedIds,
    cols: COLS,
  }), [rows, sorts, searchTerm, searchCol, pageSize, currentPage, selectedIds])

  const filteredBatang = searchedRows.reduce((s, r) => s + (r.batang || 0), 0)
  const filteredVolume = searchedRows.reduce((s, r) => s + Number(r.volume || 0), 0)

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
          <div
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 0, transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease', cursor: 'pointer' }}
            onClick={() => setExpandedCard(expandedCard === 'kapling' ? null : 'kapling')}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
          >
            <div style={{ display: 'flex', gap: 16 }}>
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
            <div style={{ overflow: 'hidden', maxHeight: expandedCard === 'kapling' ? 300 : 0, transition: 'max-height 0.3s ease', marginTop: expandedCard === 'kapling' ? 12 : 0 }}>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>breakdown per blok</p>
                <div className="scrollbar-thin" style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 200, overflowY: 'auto', paddingRight: 6 }}>
                  {blokBreakdown.map(([blok, val]) => {
                    const pct = totalVolume > 0 ? (val.volume / totalVolume) * 100 : 0
                    return (
                      <div key={blok}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>{blok}</span>
                          <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)' }}>{val.volume.toFixed(3)} m³ · {val.batang.toLocaleString('id')} btg</span>
                        </div>
                        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'rgba(255,255,255,0.25)', borderRadius: 2, transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Invois Terlewat (dari DK310 Pengurangan) */}
          <div
            style={{
              background: missingInvoices.length > 0 ? 'rgba(255,107,107,0.04)' : 'rgba(0,255,136,0.03)',
              border: `1px solid ${missingInvoices.length > 0 ? 'rgba(255,107,107,0.18)' : 'rgba(0,255,136,0.12)'}`,
              borderRadius: 3, padding: '16px 20px',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease', cursor: 'pointer',
            }}
            onClick={() => setExpandedCard(expandedCard === 'invois' ? null : 'invois')}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = missingInvoices.length > 0 ? '0 8px 24px rgba(255,107,107,0.1)' : '0 8px 24px rgba(0,255,136,0.08)'
              e.currentTarget.style.borderColor = missingInvoices.length > 0 ? 'rgba(255,107,107,0.32)' : 'rgba(0,255,136,0.24)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = ''
              e.currentTarget.style.boxShadow = ''
              e.currentTarget.style.borderColor = missingInvoices.length > 0 ? 'rgba(255,107,107,0.18)' : 'rgba(0,255,136,0.12)'
            }}
          >
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
                <p style={{ fontSize: 22, fontWeight: 700, color: '#ff6b6b', fontFamily: 'monospace', lineHeight: 1 }}>
                  {missingInvoices.length}
                </p>
                <p style={{ fontSize: 10, color: 'rgba(255,107,107,0.45)', fontFamily: 'monospace', marginTop: 5 }}>klik untuk lihat detail</p>
              </>
            )}
            {penguranganInvoices.length > 0 && missingInvoices.length > 0 && (
              <div style={{ overflow: 'hidden', maxHeight: expandedCard === 'invois' ? 300 : 0, transition: 'max-height 0.3s ease', marginTop: expandedCard === 'invois' ? 12 : 0 }}>
                <div style={{ borderTop: '1px solid rgba(255,107,107,0.15)', paddingTop: 12 }}>
                  <p style={{ fontSize: 9, color: 'rgba(255,107,107,0.4)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>semua invois terlewat</p>
                  <div className="scrollbar-thin" style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto', paddingRight: 6 }}>
                    {missingInvoices.map((inv, i) => {
                      const prefix = String(inv).slice(0, 3).toUpperCase()
                      const pfx = INVOIS_PREFIX_MAP[prefix]
                      return (
                        <div key={inv} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 10, color: 'rgba(255,107,107,0.4)', fontFamily: 'monospace', minWidth: 18, textAlign: 'right' }}>{i + 1}.</span>
                          {pfx && <span style={{ ...RK_BADGE_BASE, background: pfx.bg, color: pfx.color, border: `1px solid ${pfx.border}`, fontSize: 9 }}>{prefix}</span>}
                          <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.6)' }}>{inv}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Total Batang + Volume (gabungan) */}
          <div
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease', cursor: 'pointer' }}
            onClick={() => setExpandedCard(expandedCard === 'volume' ? null : 'volume')}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(55,145,101,0.1)'; e.currentTarget.style.borderColor = 'rgba(55,145,101,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
          >
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
            <div style={{ overflow: 'hidden', maxHeight: expandedCard === 'volume' ? 200 : 0, transition: 'max-height 0.3s ease' }}>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>proporsi volume per sortimen</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {SORTIMENS.map(m => {
                    const pct = totalVolume > 0 ? (sortVolume[m] / totalVolume) * 100 : 0
                    return (
                      <div key={m}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 600, fontFamily: 'monospace', color: 'rgba(55,145,101,0.8)' }}>{m}</span>
                          <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(55,145,101,0.6)' }}>{sortVolume[m].toFixed(3)} m³ · {pct.toFixed(1)}%</span>
                        </div>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'rgba(55,145,101,0.6)', borderRadius: 2, transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Sisa Persediaan */}
          <div
            style={{ background: 'rgba(255,170,0,0.04)', border: '1px solid rgba(255,170,0,0.15)', borderRadius: 3, padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease', cursor: 'pointer' }}
            onClick={() => setExpandedCard(expandedCard === 'sisa' ? null : 'sisa')}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,170,0,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,170,0,0.28)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'rgba(255,170,0,0.15)' }}
          >
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,170,0,0.55)', marginBottom: 3, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>sisa persediaan</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#ffaa00', fontFamily: 'monospace', lineHeight: 1 }}>
                {unsoldVolume.toFixed(3)} <span style={{ fontSize: 11, color: 'rgba(255,170,0,0.55)', fontWeight: 600 }}>m³</span>
              </p>
              <p style={{ fontSize: 10, color: 'rgba(255,170,0,0.5)', fontFamily: 'monospace', marginTop: 4 }}>{unsoldBatang.toLocaleString('id')} batang</p>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,170,0,0.12)', marginTop: 12, paddingTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {SORTIMENS.map(m => (
                <div key={m}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,170,0,0.4)', fontFamily: 'monospace', marginBottom: 4 }}>{m}</p>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,170,0,0.7)', fontFamily: 'monospace', lineHeight: 1 }}>
                    {unsoldSortVolume[m].toFixed(3)} <span style={{ fontSize: 9, color: 'rgba(255,170,0,0.45)' }}>m³</span>
                  </p>
                  <p style={{ fontSize: 10, color: 'rgba(255,170,0,0.5)', fontFamily: 'monospace', marginTop: 2 }}>
                    {unsoldSortBatang[m].toLocaleString('id')} btg
                  </p>
                </div>
              ))}
            </div>
            <div style={{ overflow: 'hidden', maxHeight: expandedCard === 'sisa' ? 220 : 0, transition: 'max-height 0.3s ease', marginTop: expandedCard === 'sisa' ? 12 : 0 }}>
              <div style={{ borderTop: '1px solid rgba(255,170,0,0.12)', paddingTop: 12 }}>
                <p style={{ fontSize: 9, color: 'rgba(255,170,0,0.3)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>terjual vs sisa per sortimen</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {SORTIMENS.map(m => {
                    const total = sortVolume[m]
                    const sold = soldSortVolume[m]
                    const sisa = unsoldSortVolume[m]
                    const soldPct = total > 0 ? (sold / total) * 100 : 0
                    return (
                      <div key={m}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 600, fontFamily: 'monospace', color: 'rgba(255,170,0,0.7)' }}>{m}</span>
                          <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)' }}>
                            <span style={{ color: 'rgba(0,255,136,0.6)' }}>{sold.toFixed(3)}</span> / <span style={{ color: 'rgba(255,170,0,0.6)' }}>{sisa.toFixed(3)}</span> m³
                          </span>
                        </div>
                        <div style={{ height: 5, background: 'rgba(255,170,0,0.12)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${soldPct}%`, background: 'rgba(0,255,136,0.45)', borderRadius: 2, transition: 'width 0.4s ease' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                          <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(0,255,136,0.45)' }}>terjual {soldPct.toFixed(1)}%</span>
                          <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(255,170,0,0.45)' }}>sisa {(100 - soldPct).toFixed(1)}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {showSettings && (
        <RegisterKaplingSettingsModal
          draftMap={draftMap}
          excelHeaders={excelHeaders}
          fieldDefs={FIELD_DEFS}
          onCancel={() => setShowSettings(false)}
          onChangeField={(key, value) => setDraftMap(prev => ({ ...prev, [key]: value }))}
          onResetDefault={() => setDraftMap({ ...DEFAULT_COL_MAP })}
          onSave={() => {
            saveColMap(draftMap)
            setShowSettings(false)
            showToast('Pengaturan disimpan')
          }}
        />
      )}

      {preview && (
        <RegisterKaplingExcelImportPreview
          importing={importing}
          onCancel={() => setPreview(null)}
          onConfirm={handleImport}
          onModeChange={mode => setPreview(current => ({ ...current, mode }))}
          preview={preview}
        />
      )}

      {invoisPreview && (
        <RegisterKaplingInvoicePreview
          isSaving={invoisSaving}
          onCancel={() => setInvoisPreview(null)}
          onSave={handleInvoisSave}
          preview={invoisPreview}
        />
      )}

      {showFixPrefix && (
        <RegisterKaplingFixPrefixModal
          entries={Object.values(fixPrefixMap)}
          invoicePrefixMap={INVOIS_PREFIX_MAP}
          isSaving={fixPrefixSaving}
          onApply={handleApplyFixPrefix}
          onCancel={() => setShowFixPrefix(false)}
        />
      )}

      {editRow && (
        <RegisterKaplingEditModal
          invoicePrefixMap={INVOIS_PREFIX_MAP}
          isSaving={editSaving}
          onCancel={() => setEditRow(null)}
          onChange={(key, value) => setEditRow(prev => ({ ...prev, [key]: value }))}
          onNumberStep={(event, key) => {
            if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
            event.preventDefault()
            const isVolume = key === 'volume'
            const step = isVolume ? 0.001 : 1
            const current = Number(editRow[key]) || 0
            const next = Math.max(0, current + (event.key === 'ArrowUp' ? step : -step))
            setEditRow(prev => ({ ...prev, [key]: isVolume ? next.toFixed(3) : String(Math.round(next)) }))
          }}
          onSave={handleEditSave}
          row={editRow}
        />
      )}

      {deleteRow && (
        <RegisterKaplingDeleteModal
          isDeleting={deleting}
          mode="single"
          noKapling={deleteRow.no_kapling}
          onCancel={() => setDeleteRow(null)}
          onConfirm={handleDelete}
        />
      )}

      {showBatchDelete && (
        <RegisterKaplingDeleteModal
          count={selectedIds.size}
          isDeleting={batchDeleting}
          mode="batch"
          onCancel={() => setShowBatchDelete(false)}
          onConfirm={handleBatchDelete}
        />
      )}

      {showBatchEdit && (
        <RegisterKaplingBatchEditModal
          data={batchEditData}
          isSaving={batchEditSaving}
          onCancel={() => setShowBatchEdit(false)}
          onChange={(key, value) => setBatchEditData(prev => ({ ...prev, [key]: value }))}
          onSubmit={handleBatchEdit}
          selectedCount={selectedIds.size}
        />
      )}

      {showSortPanel && (
        <RegisterKaplingSortPanel
          columns={COLS}
          draftSorts={draftSorts}
          onAddSort={() => {
            const used = new Set(draftSorts.map(sort => sort.key))
            const next = COLS.find(column => !used.has(column.key))?.key || COLS[0].key
            setDraftSorts(prev => [...prev, { key: next, dir: 'asc' }])
          }}
          onApply={() => {
            setSorts(draftSorts)
            setCurrentPage(1)
            setShowSortPanel(false)
          }}
          onCancel={() => setShowSortPanel(false)}
          onChangeSortKey={(index, next) => {
            setDraftSorts(prev => prev.map((sort, sortIndex) => sortIndex === index ? { ...sort, key: next } : sort))
          }}
          onRemoveSort={index => {
            setDraftSorts(prev => prev.filter((_, sortIndex) => sortIndex !== index))
          }}
          onReset={() => {
            setDraftSorts([])
            setSorts([])
            setCurrentPage(1)
            setShowSortPanel(false)
          }}
          onToggleSortDir={index => {
            setDraftSorts(prev => prev.map((sort, sortIndex) => sortIndex === index ? { ...sort, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : sort))
          }}
        />
      )}

      {/* Table toolbar */}
      <RegisterKaplingToolbar
        columns={COLS}
        colDropdownRef={colDropdownRef}
        currentPage={currentPage}
        displayedCount={displayedRows.length}
        onBatchDelete={() => setShowBatchDelete(true)}
        onBatchEdit={() => {
          setBatchEditData({ tgl_kapling: '', periode: '', no_blok: '', sertifikasi: '' })
          setShowBatchEdit(true)
        }}
        onClearSearch={() => setSearchTerm('')}
        onOpenSortPanel={() => {
          setDraftSorts([...sorts])
          setShowSortPanel(true)
        }}
        onPageNext={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
        onPagePrev={() => setCurrentPage(p => Math.max(1, p - 1))}
        onSearchChange={setSearchTerm}
        onSearchColChange={key => {
          setSearchCol(key)
          setShowColDropdown(false)
        }}
        onSetPageSize={value => {
          setPageSize(value)
          setCurrentPage(1)
        }}
        onToggleColDropdown={() => setShowColDropdown(v => !v)}
        pageSize={pageSize}
        pageSizes={PAGE_SIZES}
        rowsCount={rows.length}
        safePage={safePage}
        searchCol={searchCol}
        searchTerm={searchTerm}
        searchedCount={searchedRows.length}
        selectedCount={selectedIds.size}
        showColDropdown={showColDropdown}
        sorts={sorts}
        totalPages={totalPages}
      />

      <RegisterKaplingTable
        allSelected={allSelected}
        columns={COLS}
        displayedRows={displayedRows}
        filteredBatang={filteredBatang}
        filteredVolume={filteredVolume}
        isEmpty={rows.length === 0}
        isLoading={loading}
        onDeleteRow={setDeleteRow}
        onEditRow={setEditRow}
        onOpenContextMenu={(e, row) => {
          e.preventDefault()
          setContextMenu({ x: e.clientX, y: e.clientY, row })
        }}
        onOpenDkhpModal={handleOpenDkhpModal}
        onToggleSelectAll={toggleSelectAll}
        onToggleSelectRow={toggleSelectRow}
        onToggleSort={toggleSort}
        pageSize={pageSize}
        safePage={safePage}
        selectAllRef={selectAllRef}
        selectedIds={selectedIds}
        sorts={sorts}
        someSelected={someSelected}
      />

      {contextMenu && (
        <RegisterKaplingContextMenu
          isBatch={selectedIds.size > 1 && selectedIds.has(contextMenu.row.id)}
          menu={contextMenu}
          onDelete={() => {
            if (selectedIds.size > 1 && selectedIds.has(contextMenu.row.id)) {
              setShowBatchDelete(true)
            } else {
              setDeleteRow(contextMenu.row)
            }
            setContextMenu(null)
          }}
          onEdit={() => {
            if (selectedIds.size > 1 && selectedIds.has(contextMenu.row.id)) {
              setBatchEditData({ tgl_kapling: '', periode: '', no_blok: '', sertifikasi: '' })
              setShowBatchEdit(true)
            } else {
              setEditRow({ ...contextMenu.row })
            }
            setContextMenu(null)
          }}
          selectedCount={selectedIds.size}
        />
      )}

      {dkhpImportPreview && (
        <RegisterKaplingDkhpImportPreview
          isSaving={dkhpImportSaving}
          onCancel={() => setDkhpImportPreview(null)}
          onSave={handleDkhpImportSave}
          preview={dkhpImportPreview}
        />
      )}

      {showDkhpModal && (
        <RegisterKaplingDkhpModal
          conflicts={dkhpConflicts}
          input={dkhpInput}
          isSaving={dkhpSaving}
          onCancel={() => setShowDkhpModal(false)}
          onChangeInput={setDkhpInput}
          onCheck={handleCheckDkhp}
          onSave={handleSaveDkhp}
          rows={dkhpModalRows}
          step={dkhpStep}
        />
      )}
    </div>
  )
}
