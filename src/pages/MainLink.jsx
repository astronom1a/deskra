import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { buildRows, DEFAULT_TARIF_PERIODE } from '../lib/rekapPekerjaan'
import { Plus, Save, AlertCircle, CheckCircle2, CalendarDays, X, Trash2, RefreshCw, Settings2, ChevronDown, ChevronUp, Printer, FileText, ClipboardCheck, Receipt, Wallet, ClipboardList, FileSpreadsheet } from 'lucide-react'

// ─── helpers ────────────────────────────────────────────────
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember']

const PERIODE_OPTIONS = Array.from({ length: 12 }, (_, i) => [
  { label: `I/${i+1}`, half: 'I', bulan: i+1 },
  { label: `II/${i+1}`, half: 'II', bulan: i+1 },
]).flat()

function parseHalf(p) { return p?.startsWith('II/') ? 'II' : 'I' }

function isLeapYear(y) { return (y%4===0 && y%100!==0) || y%400===0 }
function lastDay(m,y) {
  if (m===2) return isLeapYear(y)?29:28
  return [4,6,9,11].includes(m)?30:31
}
function generateTanggal(half, bulan, tahun) {
  const m = String(bulan).padStart(2,'0')
  return half==='I'
    ? { tgl_awal:`${tahun}-${m}-01`, tgl_akhir:`${tahun}-${m}-15` }
    : { tgl_awal:`${tahun}-${m}-16`, tgl_akhir:`${tahun}-${m}-${String(lastDay(bulan,tahun)).padStart(2,'0')}` }
}

function formatRupiah(v) {
  return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0,maximumFractionDigits:0}).format(Math.round(v||0))
}
function formatTanggal(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})
}
function formatNum(n,dec=3) {
  if (!n && n!==0) return '—'
  return new Intl.NumberFormat('id-ID',{maximumFractionDigits:dec}).format(n)
}

// ─── Component ───────────────────────────────────────────────
export default function MainLink() {
  const [periodes, setPeriodes]         = useState([])
  const [selectedPeriode, setSelected]  = useState(null)
  const [rows, setRows]                 = useState([])
  const [loading, setLoading]           = useState(false)
  const [saving, setSaving]             = useState(false)
  const [toast, setToast]               = useState(null)
  const [confirmDelete, setConfirmDel]  = useState(null)
  const [showPeriodeForm, setShowForm]  = useState(false)
  const [showTarif, setShowTarif]       = useState(false)
  const [tarifRows, setTarifRows]       = useState([])
  const [savingTarif, setSavingTarif]   = useState(false)
  const currentYear = new Date().getFullYear()
  const [newPeriode, setNewPeriode] = useState({ periodeOption: PERIODE_OPTIONS[0], tahun: currentYear })

  function openCetak(jenis) {
    if (!selectedPeriode) return showToast('Pilih periode dulu', 'error')
    window.open(`/cetak/${jenis}/${selectedPeriode.id}`, '_blank')
  }
  function openKwitansi(itemKey) {
    if (!selectedPeriode) return showToast('Pilih periode dulu', 'error')
    window.open(`/cetak/kwitansi/${selectedPeriode.id}/${itemKey}`, '_blank')
  }
  function openLampiran31(itemKey) {
    if (!selectedPeriode) return showToast('Pilih periode dulu', 'error')
    window.open(`/cetak/lampiran-31/${selectedPeriode.id}/${itemKey}`, '_blank')
  }
  function openAbsen(itemKey) {
    if (!selectedPeriode) return showToast('Pilih periode dulu', 'error')
    window.open(`/cetak/absen/${selectedPeriode.id}/${itemKey}`, '_blank')
  }
  // Item yang punya template kwitansi (TUMPUK & TENAGA BANTU ditunda).
  // Note: ketiga barcode dipetakan ke satu URL 'barcode' (digabung jadi 1 kwitansi).
  const KWITANSI_AVAILABLE = new Set([
    'penomoran','sabuk','tanda_laku','slaghammer',
    'tumpuk_jati','tumpuk_mahoni','tumpuk_kedawung','brongkol',
    'barcode_jati','barcode_mahoni','barcode_kedawung',
    'tenaga','kebersihan','listrik',
  ])
  function kwitansiKeyFor(r) {
    if (['barcode_jati','barcode_mahoni','barcode_kedawung'].includes(r._key)) return 'barcode'
    if (['tumpuk_jati','tumpuk_mahoni','tumpuk_kedawung','brongkol'].includes(r._key)) return 'tumpuk'
    return r._key
  }
  const LAMPIRAN31_KEYS = new Set(['penomoran','sabuk','tanda_laku','slaghammer','barcode','kebersihan','listrik','tumpuk','tenaga'])
  function isLampiran31Available(r) {
    if (r._key.startsWith('custom_')) return false
    return LAMPIRAN31_KEYS.has(kwitansiKeyFor(r))
  }
  function isAbsenAvailable(r) {
    if (r._key.startsWith('custom_')) return false
    return LAMPIRAN31_KEYS.has(kwitansiKeyFor(r))
  }
  function isKwitansiAvailable(r) {
    return KWITANSI_AVAILABLE.has(r._key) || r._key.startsWith('custom_')
  }

  const displayRows = useMemo(() => {
    const out = []
    const barcodeRows = rows.filter(r => ['barcode_jati', 'barcode_mahoni', 'barcode_kedawung'].includes(r._key))
    const barcodeNo = barcodeRows
      .map(r => r.no)
      .filter(n => typeof n === 'number')
      .sort((a, b) => a - b)[0] ?? '-'

    rows.forEach(r => {
      if (r._key === 'tumpuk_jati') {
        out.push({
          ...r,
          _key: 'view_tumpuk_point',
          uraian: 'TUMPUK KAPLING',
          fisik: 0,
          tarif: 0,
          _viewType: 'point',
          _printKey: 'tumpuk',
        })
        out.push({
          ...r,
          _key: 'view_tumpuk_jati_sub',
          no: '-',
          uraian: 'JATI',
          _viewType: 'sub',
          _printKey: 'tumpuk',
        })
        return
      }
      if (r._key === 'tumpuk_mahoni') {
        out.push({
          ...r,
          _key: 'view_tumpuk_mahoni_sub',
          no: '-',
          uraian: 'RIMBA (MAHONI)',
          _viewType: 'sub',
          _printKey: 'tumpuk',
        })
        return
      }
      if (r._key === 'tumpuk_kedawung') {
        out.push({
          ...r,
          _key: 'view_tumpuk_kedawung_sub',
          no: '-',
          uraian: 'RIMBA (KEDAWUNG)',
          _viewType: 'sub',
          _printKey: 'tumpuk',
        })
        return
      }
      if (r._key === 'brongkol') {
        out.push({
          ...r,
          _key: 'view_tumpuk_brongkol_sub',
          no: '-',
          uraian: 'BRONGKOL',
          _viewType: 'sub',
          _printKey: 'tumpuk',
        })
        return
      }
      if (r._key === 'barcode_jati') {
        out.push({
          ...r,
          _key: 'view_barcode_point',
          no: barcodeNo,
          uraian: 'PEMASANGAN BARCODE',
          fisik: 0,
          tarif: 0,
          _viewType: 'point',
          _printKey: 'barcode',
        })
        out.push({
          ...r,
          _key: 'view_barcode_jati_sub',
          no: '-',
          uraian: 'JATI',
          _viewType: 'sub',
          _printKey: 'barcode',
        })
        return
      }
      if (r._key === 'barcode_mahoni') {
        out.push({
          ...r,
          _key: 'view_barcode_mahoni_sub',
          no: '-',
          uraian: 'MAHONI',
          _viewType: 'sub',
          _printKey: 'barcode',
        })
        return
      }
      if (r._key === 'barcode_kedawung') {
        out.push({
          ...r,
          _key: 'view_barcode_kedawung_sub',
          no: '-',
          uraian: 'KEDAWUNG',
          _viewType: 'sub',
          _printKey: 'barcode',
        })
        return
      }
      out.push({ ...r, _viewType: 'normal', _printKey: kwitansiKeyFor(r) })
    })
    return out
  }, [rows])

  function canShowQuickPrint(r) {
    if (r._viewType === 'sub') return false
    if (r._viewType === 'point') return true
    return isKwitansiAvailable(r)
  }

  const previewTanggal = generateTanggal(newPeriode.periodeOption.half, newPeriode.periodeOption.bulan, Number(newPeriode.tahun))

  function showToast(msg, type='success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── fetch periods ──
  useEffect(() => { fetchPeriodes() }, [])

  async function fetchPeriodes() {
    const { data } = await supabase.from('tabel_periode').select('*').order('created_at',{ascending:false})
    setPeriodes(data||[])
    if (data?.length && !selectedPeriode) setSelected(data[0])
  }

  // ── fetch tarif rows for selected periode ──
  async function fetchTarif(periodeId) {
    const { data } = await supabase
      .from('tabel_tarif_periode').select('*')
      .eq('periode_id', periodeId).order('created_at')
    if (data?.length) {
      setTarifRows(data)
    } else {
      // fallback defaults jika belum di-seed
      setTarifRows(Object.entries(DEFAULT_TARIF_PERIODE).map(([kode, tarif]) => ({
        _unsaved: true, kode, tarif,
        uraian: { penomoran:'PENOMORAN KAPLING', sabuk:'SABUK KAPLING',
          tanda_laku:'TANDA LAKU', slaghammer:'SLAGHAMMER',
          barcode:'PEMASANGAN BARCODE', brongkol:'TUMPUK BRONGKOL' }[kode] || kode,
        kode_rek: ['penomoran','sabuk','tanda_laku','slaghammer'].includes(kode) ? '51.69.43' : '51.69.44',
        satuan: { penomoran:'M3', sabuk:'M3', tanda_laku:'M3', slaghammer:'M3', barcode:'BTG', brongkol:'SM' }[kode],
      })))
    }
  }

  // ── build rows whenever periode changes ──
  const loadRows = useCallback(async (p) => {
    if (!p) return
    setLoading(true)
    try {
      const built = await buildRows(p.id, p.periode)
      setRows(built)
    } catch(e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedPeriode) {
      loadRows(selectedPeriode)
      fetchTarif(selectedPeriode.id)
    }
  }, [selectedPeriode, loadRows])

  // ── create periode ──
  async function handleCreatePeriode() {
    const { periodeOption, tahun } = newPeriode
    const tahunNum = Number(tahun)
    if (!tahun || tahunNum<2000 || tahunNum>2100) return showToast('Tahun tidak valid','error')
    const label = `${periodeOption.label} / ${tahun}`
    const { tgl_awal, tgl_akhir } = generateTanggal(periodeOption.half, periodeOption.bulan, tahunNum)
    const { data, error } = await supabase.from('tabel_periode')
      .insert({ periode:label, tgl_awal, tgl_akhir, status:'aktif' }).select().single()
    if (error) return showToast(error.message,'error')
    // Seed tarif default untuk periode baru
    await supabase.rpc('seed_tarif_periode', { p_periode_id: data.id })
    setShowForm(false)
    await fetchPeriodes()
    setSelected(data)
    showToast(`Periode ${label} berhasil dibuat`)
  }

  // ── save tarif per periode ──
  async function handleSaveTarif() {
    if (!selectedPeriode) return
    setSavingTarif(true)
    const payload = tarifRows.map(r => ({
      periode_id: selectedPeriode.id,
      kode: r.kode,
      kode_rek: r.kode_rek,
      uraian: r.uraian,
      satuan: r.satuan,
      tarif: parseFloat(r.tarif) || 0,
    }))
    const { error } = await supabase
      .from('tabel_tarif_periode')
      .upsert(payload, { onConflict: 'periode_id,kode' })
    if (error) showToast(error.message, 'error')
    else {
      showToast('Tarif periode berhasil disimpan')
      // Refresh main rows dengan tarif baru
      loadRows(selectedPeriode)
    }
    setSavingTarif(false)
  }

  // ── delete periode ──
  async function handleDeletePeriode() {
    if (!confirmDelete) return
    const { error } = await supabase.from('tabel_periode').delete().eq('id', confirmDelete.id)
    if (error) return showToast(error.message,'error')
    setConfirmDel(null)
    const next = periodes.filter(p=>p.id!==confirmDelete.id)
    if (selectedPeriode?.id===confirmDelete.id) setSelected(next[0]||null)
    showToast(`Periode ${confirmDelete.periode} berhasil dihapus`)
    fetchPeriodes()
  }

  // ── save to tabel_pekerjaan (untuk cetak) ──
  async function handleSave() {
    if (!selectedPeriode) return
    setSaving(true)
    await supabase.from('tabel_pekerjaan').delete().eq('periode_id', selectedPeriode.id)
    const toInsert = rows
      .filter(r => (r.fisik||0)*(r.tarif||0) > 0 || r.no !== '-')
      .map((r, i) => ({
        periode_id: selectedPeriode.id,
        no: typeof r.no === 'number' ? r.no : null,
        kode_rek: r.kode_rek||null,
        uraian: r.uraian||'',
        satuan: r.satuan||null,
        fisik: r.fisik||0,
        tarif: r.tarif||0,
      }))
    const { error } = await supabase.from('tabel_pekerjaan').insert(toInsert)
    if (error) showToast(error.message,'error')
    else showToast('Data tersimpan & siap cetak')
    setSaving(false)
  }

  const grandTotal = rows.reduce((s,r)=>s+(r.fisik||0)*(r.tarif||0),0)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm text-white
          ${toast.type==='error'?'bg-red-500':'bg-primary-600'}`}>
          {toast.type==='error'?<AlertCircle size={15}/>:<CheckCircle2 size={15}/>} {toast.msg}
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-600"/>
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Hapus Periode?</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">Semua data terkait periode ini akan terhapus permanen.</p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-5 text-center">
              <p className="text-red-700 font-semibold text-sm">{confirmDelete.periode}</p>
              <p className="text-red-500 text-xs">{formatTanggal(confirmDelete.tgl_awal)} – {formatTanggal(confirmDelete.tgl_akhir)}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>setConfirmDel(null)}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">Batal</button>
              <button onClick={handleDeletePeriode}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Main Link</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Rekap uang kerja per periode — otomatis dari Tumpuk Kapling & Detail Pekerjaan</p>
      </div>

      {/* Periode selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-5 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300 shrink-0">Periode:</span>
        <div className="flex flex-wrap gap-2 flex-1">
          {periodes.map(p => (
            <div key={p.id} className="relative group flex items-center">
              <button
                onClick={() => setSelected(p)}
                className={`pl-3 pr-7 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriode?.id===p.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >{p.periode}</button>
              <button
                onClick={e=>{e.stopPropagation();setConfirmDel(p)}}
                title={`Hapus ${p.periode}`}
                className={`absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5
                  opacity-0 group-hover:opacity-100 transition-opacity
                  ${selectedPeriode?.id===p.id
                    ?'text-white/70 hover:text-white hover:bg-white/20'
                    :'text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50'}`}
              ><X size={11}/></button>
            </div>
          ))}
          <button
            onClick={()=>setShowForm(true)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center gap-1"
          ><Plus size={14}/> Periode Baru</button>
        </div>
        {selectedPeriode && (
          <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
            <CalendarDays size={12}/>
            {formatTanggal(selectedPeriode.tgl_awal)} – {formatTanggal(selectedPeriode.tgl_akhir)}
          </p>
        )}
      </div>

      {/* Form periode baru */}
      {showPeriodeForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-5">
          <p className="text-sm font-semibold text-blue-700 mb-4">Tambah Periode Baru</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
            <div>
              <label className="text-xs font-medium text-blue-600 mb-1 block">Periode</label>
              <select
                value={newPeriode.periodeOption.label}
                onChange={e=>{const f=PERIODE_OPTIONS.find(o=>o.label===e.target.value);setNewPeriode(p=>({...p,periodeOption:f}))}}
                className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800"
              >
                {PERIODE_OPTIONS.map(o=>(
                  <option key={o.label} value={o.label}>{o.label} — {BULAN[o.bulan-1]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-blue-600 mb-1 block">Tahun</label>
              <input type="number" value={newPeriode.tahun}
                onChange={e=>setNewPeriode(p=>({...p,tahun:e.target.value}))}
                className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800"
                min={2000} max={2100}/>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-blue-600 bg-blue-100 px-3 py-2 rounded-lg w-fit">
            <CalendarDays size={13}/>
            Tanggal otomatis: <strong>{formatTanggal(previewTanggal.tgl_awal)}</strong> – <strong>{formatTanggal(previewTanggal.tgl_akhir)}</strong>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleCreatePeriode} className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700">Buat Periode</button>
            <button onClick={()=>setShowForm(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-300">Batal</button>
          </div>
        </div>
      )}

      {/* Tabel */}
      {selectedPeriode && (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-4">
            {/* Table header */}
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-semibold text-gray-700 dark:text-gray-200 text-sm">
                  Daftar Pekerjaan — <span className="text-primary-600">{selectedPeriode.periode}</span>
                </p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Data otomatis dari Tumpuk Kapling & Detail Pekerjaan</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={()=>loadRows(selectedPeriode)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                >
                  <RefreshCw size={12} className={loading?'animate-spin':''}/> Refresh
                </button>

                {/* Cetak buttons */}
                <button
                  onClick={()=>openCetak('biaya-tpk')}
                  title="Cetak Biaya TPK"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  <Receipt size={13}/> Biaya TPK
                </button>
                <button
                  onClick={()=>openCetak('gabungan-pembayaran')}
                  title="Cetak Gabungan Pembayaran"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  <Wallet size={13}/> Gabungan Pembayaran
                </button>
                <button
                  onClick={()=>openCetak('pj-uk')}
                  title="Cetak PJ UK"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  <ClipboardList size={13}/> PJ UK
                </button>
                <button
                  onClick={()=>openCetak('permintaan-uk')}
                  title="Cetak Permintaan UK"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  <FileSpreadsheet size={13}/> Permintaan UK
                </button>
                <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  <CalendarDays size={12}/>
                  {formatTanggal(selectedPeriode.tgl_awal)} – {formatTanggal(selectedPeriode.tgl_akhir)}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                  <tr>
                    {['No','Kode Rek','Uraian','Sat','Fisik','Tarif','Nilai','Cetak'].map(h=>(
                      <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan={8} className="px-5 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                      <RefreshCw size={16} className="animate-spin inline mr-2"/>Menghitung data...
                    </td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={8} className="px-5 py-8 text-center text-gray-400 dark:text-gray-500 text-sm italic">
                      Belum ada data. Isi data di Tumpuk Kapling & Detail Pekerjaan.
                    </td></tr>
                  ) : displayRows.map(r => {
                    const nilai = (r.fisik||0)*(r.tarif||0)
                    const isPointrow = r._viewType === 'point'
                    const isEmpty = !isPointrow && nilai === 0 && r.fisik === 0
                    const isSubrow = r._viewType === 'sub' || r._noMode === 'none'
                    return (
                      <tr key={r._key}
                        className={`transition-colors ${
                          isEmpty ? 'opacity-35' : 'hover:bg-gray-50/50'
                        } ${isSubrow ? 'bg-gray-50/30' : ''}`}>
                        <td className={`px-3 py-2 text-xs w-10 font-medium ${
                          typeof r.no==='number' ? 'text-primary-600' : 'text-gray-300 dark:text-gray-600'
                        }`}>{r.no}</td>
                        <td className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 w-24">{r.kode_rek}</td>
                        <td className={`px-3 py-2 ${isSubrow ? 'pl-6 text-gray-500 dark:text-gray-400 italic text-xs' : 'font-medium text-gray-700 dark:text-gray-200'}`}>
                          {r.uraian}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 w-16">{r.satuan}</td>
                        <td className="px-3 py-2 text-right text-sm text-gray-600 dark:text-gray-300 w-28">
                          {r.fisik > 0 ? formatNum(r.fisik) : <span className={isPointrow ? 'text-gray-500 dark:text-gray-400' : 'text-gray-300 dark:text-gray-600'}>—</span>}
                        </td>
                        <td className="px-3 py-2 text-right text-sm text-gray-600 dark:text-gray-300 w-32">
                          {r.tarif > 0 ? formatRupiah(r.tarif) : <span className={isPointrow ? 'text-gray-500 dark:text-gray-400' : 'text-gray-300 dark:text-gray-600'}>—</span>}
                        </td>
                        <td className={`px-3 py-2 text-right font-medium w-36 ${nilai>0?'text-gray-800 dark:text-gray-100':(isPointrow?'text-gray-500 dark:text-gray-400':'text-gray-300 dark:text-gray-600')}`}>
                          {nilai>0 ? formatRupiah(nilai) : '—'}
                        </td>
                        <td className="px-2 py-2 w-24 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {canShowQuickPrint(r) ? (
                              <button
                                onClick={()=>openKwitansi(r._printKey)}
                                title="Cetak kwitansi item ini"
                                className="text-gray-300 dark:text-gray-600 hover:text-primary-600 transition-colors"
                              >
                                <Printer size={14}/>
                              </button>
                            ) : null}
                            {canShowQuickPrint(r) && isLampiran31Available({ _key: r._printKey }) ? (
                              <button
                                onClick={()=>openLampiran31(r._printKey)}
                                title="Cetak Lampiran 3.1 item ini"
                                className="text-gray-300 dark:text-gray-600 hover:text-indigo-600 transition-colors"
                              >
                                <FileText size={14}/>
                              </button>
                            ) : null}
                            {canShowQuickPrint(r) && isAbsenAvailable({ _key: r._printKey }) ? (
                              <button
                                onClick={()=>openAbsen(r._printKey)}
                                title="Cetak Absen item ini"
                                className="text-gray-300 dark:text-gray-600 hover:text-emerald-600 transition-colors"
                              >
                                <ClipboardCheck size={14}/>
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-900 border-t-2 border-gray-200 dark:border-gray-700">
                  <tr>
                    <td colSpan={6} className="px-5 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 text-right">
                      Total Uang Kerja
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-primary-700 text-base">
                      {formatRupiah(grandTotal)}
                    </td>
                    <td/>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end mb-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              <Save size={15}/> {saving?'Menyimpan...':'Simpan Data'}
            </button>
          </div>

          {/* ── Tarif Periode ── */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setShowTarif(v => !v)}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Settings2 size={15} className="text-gray-400 dark:text-gray-500"/>
                <p className="font-semibold text-gray-700 dark:text-gray-200 text-sm">Tarif Periode</p>
                <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                  {selectedPeriode.periode}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {showTarif ? 'Sembunyikan' : 'Tampilkan & Edit'}
                </span>
                {showTarif ? <ChevronUp size={14} className="text-gray-400 dark:text-gray-500"/> : <ChevronDown size={14} className="text-gray-400 dark:text-gray-500"/>}
              </div>
            </button>

            {showTarif && (
              <>
                <div className="border-t border-gray-100 dark:border-gray-800 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Kode Rek</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Uraian</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 w-16">Sat</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 w-40">Tarif (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {tarifRows.map((r, i) => (
                        <tr key={r.kode} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500">{r.kode_rek}</td>
                          <td className="px-4 py-2 text-gray-700 dark:text-gray-200 font-medium">{r.uraian}</td>
                          <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">{r.satuan}</td>
                          <td className="px-4 py-1.5">
                            <input
                              type="number"
                              value={r.tarif}
                              onChange={e => setTarifRows(prev => prev.map((t,j) =>
                                j === i ? { ...t, tarif: e.target.value } : t
                              ))}
                              className="w-full border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-sm text-right outline-none focus:border-primary-400"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Perubahan tarif akan langsung tercermin di tabel di atas setelah disimpan.
                  </p>
                  <button
                    onClick={handleSaveTarif}
                    disabled={savingTarif}
                    className="flex items-center gap-2 px-4 py-1.5 bg-primary-600 text-white rounded-lg text-xs hover:bg-primary-700 disabled:opacity-50"
                  >
                    <Save size={13}/> {savingTarif ? 'Menyimpan...' : 'Simpan Tarif'}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
