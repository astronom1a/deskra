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

// Metadata baris Tarif Periode (urutan & label).
// Tarif Tumpuk Kapling (AI/AII/AIII) dikelola di sini sebagai sumber tunggal.
const TARIF_META = [
  { kode: 'penomoran',   kode_rek: '51.69.43', uraian: 'PENOMORAN KAPLING',                satuan: 'M3'  },
  { kode: 'sabuk',       kode_rek: '51.69.43', uraian: 'SABUK KAPLING',                    satuan: 'M3'  },
  { kode: 'tanda_laku',  kode_rek: '51.69.43', uraian: 'TANDA LAKU',                       satuan: 'M3'  },
  { kode: 'slaghammer',  kode_rek: '51.69.43', uraian: 'SLAGHAMMER',                       satuan: 'M3'  },
  { kode: 'tumpuk_ai',   kode_rek: '51.69.44', uraian: 'TUMPUK KAPLING — Sortimen AI',     satuan: 'M3'  },
  { kode: 'tumpuk_aii',  kode_rek: '51.69.44', uraian: 'TUMPUK KAPLING — Sortimen AII',    satuan: 'M3'  },
  { kode: 'tumpuk_aiii', kode_rek: '51.69.44', uraian: 'TUMPUK KAPLING — Sortimen AIII',   satuan: 'M3'  },
  { kode: 'brongkol',    kode_rek: '51.69.44', uraian: 'TUMPUK BRONGKOL',                  satuan: 'SM'  },
  { kode: 'barcode',     kode_rek: '51.69.44', uraian: 'PEMASANGAN BARCODE',               satuan: 'BTG' },
]

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
    const dbByKode = Object.fromEntries((data || []).map(r => [r.kode, r]))
    // Gabung metadata + DB: tampilkan SEMUA baris (termasuk yang belum di-seed di DB)
    setTarifRows(TARIF_META.map(meta => {
      const db = dbByKode[meta.kode]
      return db
        ? { ...meta, ...db }
        : { ...meta, _unsaved: true, tarif: DEFAULT_TARIF_PERIODE[meta.kode] ?? 0 }
    }))
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
    <div style={{ padding: 24, minHeight: '100%', background: '#0a0a0a', color: '#f0f0f0' }}>
      <style>{`
        .ml-input { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); color: #f0f0f0; border-radius: 3px; outline: none; font-family: monospace; font-size: 12px; -moz-appearance: textfield; }
        .ml-input:focus { border-color: rgba(0,255,136,0.5); box-shadow: 0 0 0 2px rgba(0,255,136,0.07); }
        .ml-input::-webkit-inner-spin-button, .ml-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .ml-input option { background: #1a1a1a; color: #f0f0f0; }
        .ml-row:hover td { background: rgba(255,255,255,0.02) !important; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 50,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', borderRadius: 3, fontSize: 12, fontFamily: 'monospace',
          background: toast.type === 'error' ? 'rgba(255,107,107,0.12)' : 'rgba(0,255,136,0.10)',
          border: `1px solid ${toast.type === 'error' ? 'rgba(255,107,107,0.3)' : 'rgba(0,255,136,0.3)'}`,
          color: toast.type === 'error' ? '#ff6b6b' : '#00ff88',
        }}>
          {toast.type === 'error' ? <AlertCircle size={13}/> : <CheckCircle2 size={13}/>}
          {toast.msg}
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
          <div style={{ background: '#111', border: '1px solid rgba(255,107,107,0.3)', borderRadius: 3, padding: 24, maxWidth: 360, width: '100%', margin: '0 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, background: 'rgba(255,107,107,0.12)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={16} style={{ color: '#ff6b6b' }}/>
              </div>
              <div>
                <p style={{ fontFamily: 'monospace', fontSize: 13, color: '#f0f0f0', fontWeight: 600 }}>Hapus Periode?</p>
                <p style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Semua data terkait periode ini akan terhapus permanen.</p>
              </div>
            </div>
            <div style={{ background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 3, padding: '8px 16px', marginBottom: 16, textAlign: 'center' }}>
              <p style={{ fontFamily: 'monospace', color: '#ff6b6b', fontWeight: 700, fontSize: 13 }}>{confirmDelete.periode}</p>
              <p style={{ fontFamily: 'monospace', color: 'rgba(255,107,107,0.6)', fontSize: 11 }}>{formatTanggal(confirmDelete.tgl_awal)} – {formatTanggal(confirmDelete.tgl_akhir)}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={()=>setConfirmDel(null)}
                style={{ flex: 1, padding: '8px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, color: 'rgba(255,255,255,0.65)', fontSize: 12, fontFamily: 'monospace', cursor: 'pointer' }}>Batal</button>
              <button onClick={handleDeletePeriode}
                style={{ flex: 1, padding: '8px 16px', background: 'rgba(255,107,107,0.15)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: 3, color: '#ff6b6b', fontSize: 12, fontFamily: 'monospace', cursor: 'pointer', fontWeight: 700 }}>Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Wallet size={18} style={{ color: '#00ff88' }}/> Main Link
        </h1>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3, fontFamily: 'monospace' }}>
          Rekap uang kerja per periode — otomatis dari Tumpuk Kapling &amp; Detail Pekerjaan
        </p>
      </div>

      {/* Periode selector */}
      <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, padding: '12px 16px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>Periode:</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flex: 1 }}>
          {periodes.map(p => (
            <div key={p.id} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <button
                onClick={() => setSelected(p)}
                style={{
                  padding: '4px 24px 4px 10px', borderRadius: 3, fontSize: 11, fontFamily: 'monospace',
                  fontWeight: selectedPeriode?.id === p.id ? 700 : 400,
                  background: selectedPeriode?.id === p.id ? '#00ff88' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${selectedPeriode?.id === p.id ? '#00ff88' : 'rgba(255,255,255,0.08)'}`,
                  color: selectedPeriode?.id === p.id ? '#0a0a0a' : 'rgba(255,255,255,0.65)',
                  cursor: 'pointer',
                }}
              >{p.periode}</button>
              <button
                onClick={e => { e.stopPropagation(); setConfirmDel(p) }}
                title={`Hapus ${p.periode}`}
                style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: selectedPeriode?.id === p.id ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.2)', lineHeight: 0 }}
              ><X size={10}/></button>
            </div>
          ))}
          <button
            onClick={()=>setShowForm(true)}
            style={{ padding: '4px 10px', borderRadius: 3, fontSize: 11, fontFamily: 'monospace', background: 'transparent', border: '1px dashed rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          ><Plus size={11}/> Periode Baru</button>
        </div>
        {selectedPeriode && (
          <p style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <CalendarDays size={11}/>
            {formatTanggal(selectedPeriode.tgl_awal)} – {formatTanggal(selectedPeriode.tgl_akhir)}
          </p>
        )}
      </div>

      {/* Form periode baru */}
      {showPeriodeForm && (
        <div style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 3, padding: 20, marginBottom: 16 }}>
          <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#00ff88', fontWeight: 600, marginBottom: 16 }}>Tambah Periode Baru</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 400 }}>
            <div>
              <label style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(0,255,136,0.7)', display: 'block', marginBottom: 4 }}>Periode</label>
              <select
                value={newPeriode.periodeOption.label}
                onChange={e=>{const f=PERIODE_OPTIONS.find(o=>o.label===e.target.value);setNewPeriode(p=>({...p,periodeOption:f}))}}
                className="ml-input" style={{ width: '100%', padding: '6px 8px' }}
              >
                {PERIODE_OPTIONS.map(o=>(
                  <option key={o.label} value={o.label}>{o.label} — {BULAN[o.bulan-1]}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(0,255,136,0.7)', display: 'block', marginBottom: 4 }}>Tahun</label>
              <input type="number" value={newPeriode.tahun}
                onChange={e=>setNewPeriode(p=>({...p,tahun:e.target.value}))}
                className="ml-input" style={{ width: '100%', padding: '6px 8px', boxSizing: 'border-box' }}
                min={2000} max={2100}/>
            </div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: 'monospace', color: 'rgba(0,255,136,0.7)', background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.1)', borderRadius: 3, padding: '6px 10px', width: 'fit-content' }}>
            <CalendarDays size={11}/>
            Tanggal otomatis: <strong>{formatTanggal(previewTanggal.tgl_awal)}</strong> – <strong>{formatTanggal(previewTanggal.tgl_akhir)}</strong>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={handleCreatePeriode} style={{ padding: '7px 14px', background: '#00ff88', color: '#0a0a0a', borderRadius: 3, border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>Buat Periode</button>
            <button onClick={()=>setShowForm(false)} style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, color: 'rgba(255,255,255,0.65)', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }}>Batal</button>
          </div>
        </div>
      )}

      {/* Tabel */}
      {selectedPeriode && (
        <>
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginBottom: 16 }}>
            {/* Table header */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#f0f0f0' }}>
                  Daftar Pekerjaan — <span style={{ color: '#00ff88' }}>{selectedPeriode.periode}</span>
                </p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', marginTop: 2 }}>Data otomatis dari Tumpuk Kapling &amp; Detail Pekerjaan</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={()=>loadRows(selectedPeriode)}
                  disabled={loading}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: 11, fontFamily: 'monospace', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
                ><RefreshCw size={11}/> Refresh</button>

                {[
                  { label: 'Biaya TPK',           icon: Receipt,       action: ()=>openCetak('biaya-tpk') },
                  { label: 'Gabungan Pembayaran',  icon: Wallet,        action: ()=>openCetak('gabungan-pembayaran') },
                  { label: 'PJ UK',                icon: ClipboardList, action: ()=>openCetak('pj-uk') },
                  { label: 'Permintaan UK',        icon: FileSpreadsheet, action: ()=>openCetak('permintaan-uk') },
                ].map(({ label, icon: Icon, action }) => (
                  <button key={label} onClick={action}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: 11, fontFamily: 'monospace', background: 'rgba(0,255,136,0.07)', border: '1px solid rgba(0,255,136,0.18)', borderRadius: 3, color: '#00ff88', cursor: 'pointer' }}
                  ><Icon size={11}/> {label}</button>
                ))}

                <p style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CalendarDays size={10}/>
                  {formatTanggal(selectedPeriode.tgl_awal)} – {formatTanggal(selectedPeriode.tgl_akhir)}
                </p>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' }}>
                <thead>
                  <tr>
                    {['No','Kode Rek','Uraian','Sat','Fisik','Tarif','Nilai','Cetak'].map(h=>(
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', fontSize: 11 }}>
                      Menghitung data...
                    </td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', fontSize: 11, fontStyle: 'italic' }}>
                      Belum ada data. Isi data di Tumpuk Kapling &amp; Detail Pekerjaan.
                    </td></tr>
                  ) : displayRows.map(r => {
                    const nilai = (r.fisik||0)*(r.tarif||0)
                    const isPointrow = r._viewType === 'point'
                    const isEmpty = !isPointrow && nilai === 0 && r.fisik === 0
                    const isSubrow = r._viewType === 'sub' || r._noMode === 'none'
                    return (
                      <tr key={r._key} className="ml-row"
                        style={{ opacity: isEmpty ? 0.3 : 1, background: isSubrow ? 'rgba(255,255,255,0.01)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '7px 10px', fontSize: 11, color: typeof r.no==='number' ? '#00ff88' : 'rgba(255,255,255,0.18)', width: 40 }}>{r.no}</td>
                        <td style={{ padding: '7px 10px', fontSize: 10, color: 'rgba(255,255,255,0.25)', width: 88 }}>{r.kode_rek}</td>
                        <td style={{ padding: '7px 10px', paddingLeft: isSubrow ? 24 : 10, fontWeight: isSubrow ? 400 : 500, color: isSubrow ? 'rgba(255,255,255,0.35)' : '#f0f0f0', fontStyle: isSubrow ? 'italic' : 'normal' }}>
                          {r.uraian}
                        </td>
                        <td style={{ padding: '7px 10px', fontSize: 10, color: 'rgba(255,255,255,0.3)', width: 48 }}>{r.satuan}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', color: 'rgba(255,255,255,0.5)', width: 100 }}>
                          {r.fisik > 0 ? formatNum(r.fisik) : <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', color: 'rgba(255,255,255,0.5)', width: 120 }}>
                          {r.tarif > 0 ? formatRupiah(r.tarif) : <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: nilai > 0 ? 600 : 400, color: nilai > 0 ? '#f0f0f0' : 'rgba(255,255,255,0.18)', width: 140 }}>
                          {nilai > 0 ? formatRupiah(nilai) : '—'}
                        </td>
                        <td style={{ padding: '7px 8px', width: 80 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            {canShowQuickPrint(r) && (
                              <button onClick={()=>openKwitansi(r._printKey)} title="Cetak kwitansi"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.2)', lineHeight: 0 }}
                                onMouseEnter={e=>e.currentTarget.style.color='#00ff88'}
                                onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.2)'}
                              ><Printer size={13}/></button>
                            )}
                            {canShowQuickPrint(r) && isLampiran31Available({ _key: r._printKey }) && (
                              <button onClick={()=>openLampiran31(r._printKey)} title="Cetak Lampiran 3.1"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.2)', lineHeight: 0 }}
                                onMouseEnter={e=>e.currentTarget.style.color='#a78bfa'}
                                onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.2)'}
                              ><FileText size={13}/></button>
                            )}
                            {canShowQuickPrint(r) && isAbsenAvailable({ _key: r._printKey }) && (
                              <button onClick={()=>openAbsen(r._printKey)} title="Cetak Absen"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.2)', lineHeight: 0 }}
                                onMouseEnter={e=>e.currentTarget.style.color='#00ff88'}
                                onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.2)'}
                              ><ClipboardCheck size={13}/></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.015)' }}>
                    <td colSpan={6} style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Total Uang Kerja</td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#00ff88' }}>{formatRupiah(grandTotal)}</td>
                    <td/>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: saving ? 'rgba(0,255,136,0.15)' : '#00ff88', color: saving ? 'rgba(0,255,136,0.4)' : '#0a0a0a', borderRadius: 3, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}
            ><Save size={13}/> {saving?'Menyimpan...':'Simpan Data'}</button>
          </div>

          {/* Tarif Periode */}
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
            <button
              onClick={() => setShowTarif(v => !v)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Settings2 size={13} style={{ color: 'rgba(255,255,255,0.3)' }}/>
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#f0f0f0', fontWeight: 600 }}>Tarif Periode</span>
                <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, padding: '1px 6px' }}>{selectedPeriode.periode}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{showTarif ? 'Sembunyikan' : 'Tampilkan & Edit'}</span>
                {showTarif ? <ChevronUp size={13} style={{ color: 'rgba(255,255,255,0.3)' }}/> : <ChevronDown size={13} style={{ color: 'rgba(255,255,255,0.3)' }}/>}
              </div>
            </button>

            {showTarif && (
              <>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' }}>
                    <thead>
                      <tr>
                        {['Kode Rek','Uraian','Sat','Tarif (Rp)'].map(h => (
                          <th key={h} style={{ padding: '7px 10px', textAlign: h === 'Tarif (Rp)' ? 'right' : 'left', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tarifRows.map((r, i) => (
                        <tr key={r.kode} className="ml-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '6px 10px', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{r.kode_rek}</td>
                          <td style={{ padding: '6px 10px', color: '#f0f0f0' }}>{r.uraian}</td>
                          <td style={{ padding: '6px 10px', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{r.satuan}</td>
                          <td style={{ padding: '4px 10px', width: 160 }}>
                            <input
                              type="number"
                              value={r.tarif}
                              onChange={e => setTarifRows(prev => prev.map((t,j) =>
                                j === i ? { ...t, tarif: e.target.value } : t
                              ))}
                              className="ml-input" style={{ width: '100%', padding: '5px 8px', textAlign: 'right', boxSizing: 'border-box' }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
                    Perubahan tarif akan tercermin di tabel di atas setelah disimpan.
                  </p>
                  <button
                    onClick={handleSaveTarif}
                    disabled={savingTarif}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: savingTarif ? 'rgba(0,255,136,0.15)' : '#00ff88', color: savingTarif ? 'rgba(0,255,136,0.4)' : '#0a0a0a', borderRadius: 3, border: 'none', cursor: savingTarif ? 'not-allowed' : 'pointer', fontFamily: 'monospace', fontSize: 11, fontWeight: 700 }}
                  ><Save size={11}/> {savingTarif ? 'Menyimpan...' : 'Simpan Tarif'}</button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
