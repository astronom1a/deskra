import { useEffect, useMemo, useRef, useState } from 'react'
import { logActivity, buildDiff } from '../../../lib/activityLog'
import * as XLSX from 'xlsx'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../lib/AuthProvider'
import { getEffectiveTpkId } from '../../../lib/effectiveTpk'
import { getTpkScopedStorageKey } from '../../../lib/tpkScopedStorage'
import { useToast } from '../../../components/ui/Toast'
import {
  prepareExcelImportPreview,
  saveExcelImportPreview,
} from '../utils/registerKaplingExcelImport'
import {
  parsePdfInvoice,
  prepareInvoiceImportPreview,
  saveInvoiceImportPreview,
} from '../utils/registerKaplingInvoiceImport'
import {
  prepareDkhpImportPreview,
  readDkhpWorkbookRows,
  saveDkhpForRows,
  saveDkhpImportPreview,
} from '../utils/registerKaplingDkhpImport'
import {
  buildFixPrefixMap,
  saveFixPrefixUpdates,
} from '../utils/registerKaplingFixPrefix'
import {
  buildRegisterKaplingMetrics,
  countMissingKaplings,
} from '../utils/registerKaplingMetrics'
import {
  clearDkhpConflict,
  saveBatchDeleteRows,
  saveBatchEditRows,
  saveDeletedRow,
  saveEditedRow,
  saveQuickInvoisRow,
} from '../utils/registerKaplingCrud'
import {
  fetchPenguranganInvoices,
  fetchRegisterKaplingRows,
} from '../utils/registerKaplingDataLoader'
import {
  COL_MAP_STORAGE_KEY,
  COLS,
  DEFAULT_COL_MAP,
  EXCEL_HEADERS_STORAGE_KEY,
  FIELD_DEFS,
  INVOIS_PREFIX_MAP,
  SORTIMENS,
} from '../utils/registerKaplingConstants'
import { analyzeKapling } from '../utils/registerKaplingUtils'
import { buildRegisterKaplingTableState } from '../utils/registerKaplingTable'
import { exportRegisterKaplingToExcel } from '../utils/registerKaplingExcelExport'
import { useRegisterKaplingColumnSettings } from './useRegisterKaplingColumnSettings'
import {
  getNextRegisterKaplingSelection,
  useRegisterKaplingTableControls,
} from './useRegisterKaplingTableControls'

const EMPTY_ROW = {
  _new: true, no_kapling: '', tgl_kapling: '', periode: '', no_blok: '', jenis: '',
  sortimen: '', sort_untuk: '', panjang: '', lebar: '', diameter_tebal: '', status: '',
  mutu: '', cacat: '', asal_kayu: '', sertifikasi: '', batang: 0, volume: 0,
  no_invois: '', pembeli: '', dkhp: '', skshhk: '',
}

const EMPTY_BATCH_EDIT = { tgl_kapling: '', periode: '', no_blok: '', sertifikasi: '' }

export function useRegisterKaplingPage() {
  const { profile, activeTpkId, tpk } = useAuth()
  const tpkId = getEffectiveTpkId({ activeTpkId, profile })
  const colMapStorageKey    = getTpkScopedStorageKey(COL_MAP_STORAGE_KEY, tpkId)
  const excelHeadersStorageKey = getTpkScopedStorageKey(EXCEL_HEADERS_STORAGE_KEY, tpkId)

  const [rows, setRows]                     = useState([])
  const [loading, setLoading]               = useState(true)
  const [realtimeStatus, setRealtimeStatus] = useState('connecting')
  const [penguranganInvoices, setPenguranganInvoices] = useState([])

  const [importing, setImporting]           = useState(false)
  const [preview, setPreview]               = useState(null)

  const [invoisPreview, setInvoisPreview]   = useState(null)
  const [invoisSaving, setInvoisSaving]     = useState(false)

  const [editRow, setEditRow]               = useState(null)
  const [editSaving, setEditSaving]         = useState(false)

  const [deleteRow, setDeleteRow]           = useState(null)
  const [deleting, setDeleting]             = useState(false)

  const [selectedIds, setSelectedIds]       = useState(new Set())
  const [showBatchDelete, setShowBatchDelete] = useState(false)
  const [batchDeleting, setBatchDeleting]   = useState(false)
  const [showBatchEdit, setShowBatchEdit]   = useState(false)
  const [batchEditData, setBatchEditData]   = useState(EMPTY_BATCH_EDIT)
  const [batchEditSaving, setBatchEditSaving] = useState(false)

  const [contextMenu, setContextMenu]       = useState(null)

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

  const [invoisRow, setInvoisRow]       = useState(null) // row yang sedang diedit invois-nya
  const [invoisInput, setInvoisInput]   = useState({ no_invois: '', pembeli: '' })
  const [invoisSavingQuick, setInvoisSavingQuick] = useState(false)

  const { toast, showToast } = useToast(3500)

  const fileRef        = useRef()
  const invoisRef      = useRef()
  const dkhpImportRef  = useRef()
  const selectAllRef   = useRef()
  const colDropdownRef = useRef()

  const {
    colMap, draftMap, excelHeaders,
    saveColMap, saveExcelHeaders, setDraftMap,
    setShowSettings, showSettings,
  } = useRegisterKaplingColumnSettings({ colMapStorageKey, defaultColMap: DEFAULT_COL_MAP, excelHeadersStorageKey })

  const {
    currentPage, draftSorts, pageSize, searchCol, searchTerm,
    setCurrentPage, setDraftSorts, setPageSize, setSearchCol, setSearchTerm,
    setShowColDropdown, setShowSortPanel, setSorts,
    showColDropdown, showSortPanel, sorts, toggleSort,
  } = useRegisterKaplingTableControls()

  // ── Data fetching & realtime ──────────────────────────────────────────────
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
        event: '*', schema: 'public',
        table: 'tabel_register_kapling',
        filter: `tpk_id=eq.${tpkId}`,
      }, () => fetchData())
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
      const [loadedRows, loadedInvoices] = await Promise.all([
        fetchRegisterKaplingRows({ supabase, tpkId }),
        fetchPenguranganInvoices({ supabase, tpkId }),
      ])
      setRows(loadedRows)
      setSelectedIds(new Set())
      setPenguranganInvoices(loadedInvoices)
    } catch (error) {
      showToast(error.message, 'error')
    }
    setLoading(false)
  }

  // ── Context menu dismiss ──────────────────────────────────────────────────
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

  // ── Clear DKHP conflict flag ──────────────────────────────────────────────
  async function handleClearDkhpConflict(row) {
    setContextMenu(null)
    const { error } = await clearDkhpConflict({ rowId: row.id, supabase, tpkId })
    if (error) { showToast('Gagal reset konflik DKHP', 'error'); return }
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, dkhp_conflict: false } : r))
    showToast('Konflik DKHP sudah ditandai diperiksa', 'success')
  }

  // ── Col dropdown dismiss ──────────────────────────────────────────────────
  useEffect(() => {
    if (!showColDropdown) return
    function onClickOutside(e) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(e.target)) setShowColDropdown(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [showColDropdown])

  // ── Excel import ──────────────────────────────────────────────────────────
  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = evt => {
      const wb  = XLSX.read(evt.target.result, { type: 'binary', cellDates: true })
      const ws  = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
      const result = prepareExcelImportPreview({ colMap, currentRows: rows, fieldDefs: FIELD_DEFS, fileName: file.name, rawRows: raw })
      if (result.headers.length) saveExcelHeaders(result.headers)
      if (result.error) { showToast(result.error, 'error'); return }
      setPreview(result.preview)
    }
    reader.readAsBinaryString(file)
  }

  async function handleImport() {
    if (!preview || !tpkId) return
    setImporting(true)
    const result = await saveExcelImportPreview({ currentRows: rows, preview, supabase, tpkId })
    setImporting(false)
    showToast(result.message, result.type)
    if (result.closePreview) setPreview(null)
    if (result.refresh) fetchData()
  }

  // ── Edit / add row ────────────────────────────────────────────────────────
  async function handleEditSave() {
    if (!editRow) return
    if (!editRow.no_kapling?.trim()) { showToast('No. Kapling wajib diisi.', 'error'); return }
    if (!tpkId) { showToast('Profil TPK tidak ditemukan. Coba login ulang.', 'error'); return }
    const isNew  = Boolean(editRow._new)
    const oldRow = isNew ? null : rows.find(r => r.id === editRow.id)
    setEditSaving(true)
    const result = await saveEditedRow({ row: editRow, supabase, tpkId })
    setEditSaving(false)
    showToast(result.message, result.type)
    if (result.closeEditor) setEditRow(null)
    if (result.refresh) {
      fetchData()
      if (isNew) {
        logActivity({ action: 'create', entityType: 'register_kapling', entityLabel: editRow.no_kapling, tpkId, profile })
      } else if (oldRow) {
        const diff = buildDiff(oldRow, editRow, FIELD_DEFS)
        logActivity({ action: 'update', entityType: 'register_kapling', entityId: editRow.id, entityLabel: editRow.no_kapling, diff, tpkId, profile })
      }
    }
  }

  function handleEditNumberStep(event, key) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    event.preventDefault()
    const isVolume = key === 'volume'
    const step     = isVolume ? 0.001 : 1
    const current  = Number(editRow[key]) || 0
    const next     = Math.max(0, current + (event.key === 'ArrowUp' ? step : -step))
    setEditRow(prev => ({ ...prev, [key]: isVolume ? next.toFixed(3) : String(Math.round(next)) }))
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteRow || !tpkId) return
    const snapshot = { ...deleteRow }
    setDeleting(true)
    const result = await saveDeletedRow({ row: deleteRow, supabase, tpkId })
    setDeleting(false)
    showToast(result.message, result.type)
    if (result.closeEditor) setDeleteRow(null)
    if (result.refresh) {
      fetchData()
      logActivity({ action: 'delete', entityType: 'register_kapling', entityId: snapshot.id, entityLabel: snapshot.no_kapling, tpkId, profile })
    }
  }

  // ── Batch delete ──────────────────────────────────────────────────────────
  async function handleBatchDelete() {
    if (!tpkId) { showToast('Profil TPK tidak ditemukan. Coba login ulang.', 'error'); return }
    setBatchDeleting(true)
    const result = await saveBatchDeleteRows({ selectedIds, supabase, tpkId })
    setBatchDeleting(false)
    showToast(result.message, result.type)
    if (result.closeEditor) setShowBatchDelete(false)
    if (result.refresh) {
      fetchData()
      logActivity({ action: 'delete', entityType: 'register_kapling', entityLabel: `${[...selectedIds].length} kapling (batch)`, tpkId, profile })
    }
  }

  // ── Batch edit ────────────────────────────────────────────────────────────
  async function handleBatchEdit() {
    if (!tpkId) { showToast('Profil TPK tidak ditemukan. Coba login ulang.', 'error'); return }
    setBatchEditSaving(true)
    const result = await saveBatchEditRows({ data: batchEditData, selectedIds, supabase, tpkId })
    setBatchEditSaving(false)
    showToast(result.message, result.type)
    if (result.closeEditor) setShowBatchEdit(false)
    if (result.resetData) setBatchEditData(EMPTY_BATCH_EDIT)
    if (result.refresh) fetchData()
  }

  // ── PDF invoice ───────────────────────────────────────────────────────────
  async function handleInvoisFileChange(e) {
    const files = [...(e.target.files || [])]
    if (!files.length) return
    e.target.value = ''
    try {
      const result = await prepareInvoiceImportPreview({ files, parseInvoice: parsePdfInvoice, rows })
      if (result.error) { showToast(result.error, 'error'); return }
      setInvoisPreview(result.preview)
    } catch (err) {
      showToast('Gagal membaca PDF invois: ' + err.message, 'error')
    }
  }

  async function handleInvoisSave() {
    if (!invoisPreview?.totalMatched || !tpkId) return
    setInvoisSaving(true)
    const result = await saveInvoiceImportPreview({ preview: invoisPreview, supabase, tpkId })
    setInvoisSaving(false)
    showToast(result.message, result.type)
    if (result.closePreview) setInvoisPreview(null)
    if (result.refresh) fetchData()
  }

  // ── DKHP modal ────────────────────────────────────────────────────────────
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
    const result = await saveDkhpForRows({ dkhpInput, conflicts: dkhpConflicts, rows: dkhpModalRows, skipConflicts, supabase, tpkId })
    setDkhpSaving(false)
    if (result.message) toast(result.message, result.type)
    if (result.closeModal) setShowDkhpModal(false)
    if (result.refresh) fetchData()
  }

  // ── DKHP import ───────────────────────────────────────────────────────────
  async function handleDkhpImportFiles(e) {
    const files = [...(e.target.files || [])]
    if (!files.length) return
    e.target.value = ''
    const result = await prepareDkhpImportPreview({ files, readWorkbookRows: readDkhpWorkbookRows, rows })
    if (result.error) { toast(result.error, 'error'); return }
    setDkhpImportPreview(result.preview)
  }

  async function handleDkhpImportSave(skipConflicts) {
    setDkhpImportSaving(true)
    const result = await saveDkhpImportPreview({ preview: dkhpImportPreview, skipConflicts, supabase, tpkId })
    setDkhpImportSaving(false)
    toast(result.message, result.type)
    if (result.closePreview) setDkhpImportPreview(null)
    if (result.refresh) fetchData()
  }

  // ── Quick invois edit ─────────────────────────────────────────────────────
  function handleOpenInvoisModal(row) {
    setInvoisRow(row)
    setInvoisInput({ no_invois: row.no_invois || '', pembeli: row.pembeli || '' })
  }

  async function handleSaveQuickInvois() {
    if (!invoisRow || !tpkId) return
    setInvoisSavingQuick(true)
    const result = await saveQuickInvoisRow({ row: invoisRow, noInvois: invoisInput.no_invois, pembeli: invoisInput.pembeli, supabase, tpkId })
    setInvoisSavingQuick(false)
    showToast(result.message, result.type)
    if (result.closeModal) setInvoisRow(null)
    if (result.refresh) fetchData()
  }

  // ── Fix prefix ────────────────────────────────────────────────────────────
  function handleOpenFixPrefix() {
    setFixPrefixMap(buildFixPrefixMap({ invoicePrefixMap: INVOIS_PREFIX_MAP, penguranganInvoices, rows }))
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

  // ── Selection ─────────────────────────────────────────────────────────────
  function toggleSelectRow(id) {
    setSelectedIds(prev => getNextRegisterKaplingSelection({ rowId: id, selectedIds: prev }))
  }

  // ── Computed ──────────────────────────────────────────────────────────────
  const kaplingInfo        = useMemo(() => analyzeKapling(rows), [rows])
  const totalMissingCount  = useMemo(() => countMissingKaplings(kaplingInfo), [kaplingInfo])

  const {
    blokBreakdown, missingInvoices,
    soldSortBatang, soldSortVolume,
    sortBatang, sortVolume,
    totalBatang, totalVolume,
    unsoldBatang, unsoldSortBatang, unsoldSortVolume, unsoldVolume,
  } = useMemo(() => buildRegisterKaplingMetrics({ penguranganInvoices, rows, sortimens: SORTIMENS }), [penguranganInvoices, rows])

  const {
    searchedRows, totalPages, safePage,
    displayedRows, displayedIds,
    allSelected, someSelected,
  } = useMemo(() => buildRegisterKaplingTableState({
    rows, sorts, searchTerm, searchCol, pageSize, currentPage, selectedIds, cols: COLS,
  }), [rows, sorts, searchTerm, searchCol, pageSize, currentPage, selectedIds])

  const filteredBatang = searchedRows.reduce((s, r) => s + (r.batang || 0), 0)
  const filteredVolume = searchedRows.reduce((s, r) => s + Number(r.volume || 0), 0)

  function toggleSelectAll() {
    setSelectedIds(prev => getNextRegisterKaplingSelection({ allSelected, displayedIds, selectedIds: prev }))
  }

  function handleExport() {
    exportRegisterKaplingToExcel({ rows: searchedRows, tpkName: tpk?.namatpk })
  }

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected && !allSelected
  }, [someSelected, allSelected])

  return {
    tpkId,
    // data
    rows, loading, realtimeStatus, penguranganInvoices,
    // toast
    toast, showToast,
    // excel import
    importing, preview, setPreview, handleFileChange, handleImport,
    // edit/add
    editRow, setEditRow, editSaving, handleEditSave, handleEditNumberStep,
    EMPTY_ROW,
    // delete
    deleteRow, setDeleteRow, deleting, handleDelete,
    // batch delete
    showBatchDelete, setShowBatchDelete, batchDeleting, handleBatchDelete,
    // batch edit
    showBatchEdit, setShowBatchEdit, batchEditData, setBatchEditData, batchEditSaving, handleBatchEdit,
    // context menu
    contextMenu, setContextMenu, handleClearDkhpConflict,
    // invois
    invoisPreview, setInvoisPreview, invoisSaving, handleInvoisFileChange, handleInvoisSave,
    // fix prefix
    showFixPrefix, setShowFixPrefix, fixPrefixMap, fixPrefixSaving, handleOpenFixPrefix, handleApplyFixPrefix,
    // dkhp modal
    showDkhpModal, setShowDkhpModal, dkhpModalRows, dkhpInput, setDkhpInput,
    dkhpConflicts, dkhpStep, dkhpSaving, handleOpenDkhpModal, handleCheckDkhp, handleSaveDkhp,
    // dkhp import
    dkhpImportPreview, setDkhpImportPreview, dkhpImportSaving, handleDkhpImportFiles, handleDkhpImportSave,
    // quick invois edit
    invoisRow, setInvoisRow, invoisInput, setInvoisInput, invoisSavingQuick, handleOpenInvoisModal, handleSaveQuickInvois,
    // column settings
    colMap, draftMap, setDraftMap, excelHeaders, saveColMap, showSettings, setShowSettings,
    // table controls
    currentPage, setCurrentPage, draftSorts, setDraftSorts, pageSize, setPageSize,
    searchCol, setSearchCol, searchTerm, setSearchTerm,
    showColDropdown, setShowColDropdown, showSortPanel, setShowSortPanel,
    setSorts, sorts, toggleSort,
    // selection
    selectedIds, allSelected, someSelected, toggleSelectRow, toggleSelectAll,
    // computed table state
    searchedRows, totalPages, safePage, displayedRows, displayedIds,
    filteredBatang, filteredVolume,
    // computed metrics
    kaplingInfo, totalMissingCount,
    blokBreakdown, missingInvoices,
    soldSortBatang, soldSortVolume, sortBatang, sortVolume,
    totalBatang, totalVolume,
    unsoldBatang, unsoldSortBatang, unsoldSortVolume, unsoldVolume,
    // cards
    expandedCard, setExpandedCard,
    // refs
    fileRef, invoisRef, dkhpImportRef, selectAllRef, colDropdownRef,
    // export
    handleExport,
  }
}
