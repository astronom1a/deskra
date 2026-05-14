import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Save, AlertCircle, CheckCircle2, CalendarDays, Sparkles, Layers, Lock } from 'lucide-react'
import { DEFAULT_TARIF_PERIODE, TUMPUK_TARIF_KODE } from '../lib/rekapPekerjaan'
import { useAuth } from '../lib/AuthProvider'
import { requireTpkId } from '../lib/tenantScope'
import { getEffectiveTpkId } from '../lib/effectiveTpk'
import TpkRequiredState from '../components/TpkRequiredState'

const JENIS_LIST = [
  { key: 'JATI', label: 'Tumpuk Kapling JATI' },
  { key: 'RIMBA_MAHONI', label: 'Tumpuk Kapling RIMBA (Mahoni)' },
  { key: 'RIMBA_KEDAWUNG', label: 'Tumpuk Kapling RIMBA (Kedawung)' },
]
const SORTIMEN_LIST = ['AI', 'AII', 'AIII']
// Tarif default fallback — dipakai bila Tarif Periode di Main Link belum di-set.
const DEFAULT_TARIF = {
  AI:   DEFAULT_TARIF_PERIODE.tumpuk_ai,
  AII:  DEFAULT_TARIF_PERIODE.tumpuk_aii,
  AIII: DEFAULT_TARIF_PERIODE.tumpuk_aiii,
}

function formatRupiah(val) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(Math.round(val || 0))
}

function formatTanggal(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatNum(n) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(n || 0)
}

export default function TumpukKapling() {
  const { profile, activeTpkId } = useAuth()
  const tpkId = getEffectiveTpkId({ activeTpkId, profile })
  const [periodes, setPeriodes] = useState([])
  const [selectedPeriode, setSelectedPeriode] = useState(null)
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState({ penomoran: 0, sabuk: 0, slaghammer: 0 })
  // Tarif per sortimen — sumber: tabel_tarif_periode (dikelola di Main Link)
  const [tarifSortimen, setTarifSortimen] = useState(DEFAULT_TARIF)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (tpkId) fetchPeriodes()
    else {
      setPeriodes([])
      setSelectedPeriode(null)
    }
  }, [tpkId])

  useEffect(() => {
    if (selectedPeriode) fetchData(selectedPeriode.id)
  }, [selectedPeriode])

  async function fetchPeriodes() {
    const scopedTpkId = requireTpkId(tpkId)
    const { data } = await supabase
      .from('tabel_periode')
      .select('*')
      .eq('tpk_id', scopedTpkId)
      .order('created_at', { ascending: false })
    setPeriodes(data || [])
    if (data?.length && !selectedPeriode) setSelectedPeriode(data[0])
    if (!data?.some(p => p.id === selectedPeriode?.id)) setSelectedPeriode(data?.[0] || null)
  }

  async function fetchData(periodeId) {
    const scopedTpkId = requireTpkId(selectedPeriode?.tpk_id || tpkId)
    setLoading(true)
    const [{ data: rowData }, { data: tarifData }] = await Promise.all([
      supabase.from('tabel_tumpuk_kapling').select('*').eq('tpk_id', scopedTpkId).eq('periode_id', periodeId),
      supabase.from('tabel_tarif_periode').select('kode,tarif').eq('tpk_id', scopedTpkId).eq('periode_id', periodeId),
    ])
    setRows(rowData || [])
    // Build map sortimen → tarif (fallback: DEFAULT_TARIF_PERIODE)
    const tarifByKode = Object.fromEntries((tarifData || []).map(t => [t.kode, t.tarif]))
    setTarifSortimen({
      AI:   tarifByKode[TUMPUK_TARIF_KODE.AI]   ?? DEFAULT_TARIF.AI,
      AII:  tarifByKode[TUMPUK_TARIF_KODE.AII]  ?? DEFAULT_TARIF.AII,
      AIII: tarifByKode[TUMPUK_TARIF_KODE.AIII] ?? DEFAULT_TARIF.AIII,
    })
    fetchSummary(rowData || [])
    setLoading(false)
  }

  function fetchSummary(sourceRows) {
    const total = sourceRows.reduce((sum, row) => sum + Number(row.volume || 0), 0)
    const slagTotal = sourceRows
      .filter(row => ['JATI', 'RIMBA_MAHONI'].includes(row.jenis))
      .reduce((sum, row) => sum + Number(row.volume || 0), 0)
    setSummary({
      penomoran: { fisik: total, tarif: 900, nilai: total * 900 },
      sabuk: { fisik: total, tarif: 400, nilai: total * 400 },
      slaghammer: { fisik: slagTotal, tarif: 3000, nilai: slagTotal * 3000 },
    })
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function getRow(jenis, sortimen) {
    return rows.find(r => r.jenis === jenis && r.sortimen === sortimen)
  }

  function buildEmptyGrid(periodeId) {
    const list = []
    for (const j of JENIS_LIST) {
      for (const s of SORTIMEN_LIST) {
        list.push({
          _key: `${j.key}-${s}`,
          periode_id: periodeId,
          jenis: j.key,
          sortimen: s,
          volume: 0,
          tarif: tarifSortimen[s] ?? DEFAULT_TARIF[s],
        })
      }
    }
    return list
  }

  async function handleSeed() {
    if (!selectedPeriode) return
    const scopedTpkId = requireTpkId(selectedPeriode.tpk_id || tpkId)
    const payload = buildEmptyGrid(selectedPeriode.id).map(row => ({
      periode_id: selectedPeriode.id,
      tpk_id: scopedTpkId,
      jenis: row.jenis,
      sortimen: row.sortimen,
      volume: 0,
      tarif: row.tarif,
    }))
    const { error } = await supabase
      .from('tabel_tumpuk_kapling')
      .upsert(payload, { onConflict: 'periode_id,jenis,sortimen' })
    if (error) return showToast(error.message, 'error')
    showToast('9 baris default berhasil dibuat')
    fetchData(selectedPeriode.id)
  }

  function updateVolume(jenis, sortimen, value) {
    const val = value === '' ? '' : parseFloat(value)
    setRows(prev => {
      const idx = prev.findIndex(r => r.jenis === jenis && r.sortimen === sortimen)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], volume: val }
        return next
      }
      return [...prev, {
        _key: `${jenis}-${sortimen}`,
        periode_id: selectedPeriode.id,
        jenis, sortimen,
        volume: val,
        tarif: tarifSortimen[sortimen] ?? DEFAULT_TARIF[sortimen],
      }]
    })
  }

  async function handleSave() {
    if (!selectedPeriode) return showToast('Pilih periode dulu', 'error')
    const scopedTpkId = requireTpkId(selectedPeriode.tpk_id || tpkId)
    setLoading(true)

    const payload = []
    for (const j of JENIS_LIST) {
      for (const s of SORTIMEN_LIST) {
        const row = getRow(j.key, s)
        payload.push({
          periode_id: selectedPeriode.id,
          tpk_id: scopedTpkId,
          jenis: j.key,
          sortimen: s,
          volume: parseFloat(row?.volume) || 0,
          // Tarif selalu diambil dari Tarif Periode (Main Link), bukan dari user.
          tarif: tarifSortimen[s] ?? DEFAULT_TARIF[s],
        })
      }
    }

    const { error } = await supabase
      .from('tabel_tumpuk_kapling')
      .upsert(payload, { onConflict: 'periode_id,jenis,sortimen' })

    if (error) {
      showToast(error.message, 'error')
    } else {
      showToast('Data Tumpuk Kapling tersimpan')
      fetchData(selectedPeriode.id)
    }
    setLoading(false)
  }

  const hasData = rows.length > 0
  const grid = hasData ? rows : (selectedPeriode ? buildEmptyGrid(selectedPeriode.id) : [])

  function totalPerJenis(jenis) {
    return SORTIMEN_LIST.reduce((sum, s) => {
      const r = grid.find(x => x.jenis === jenis && x.sortimen === s)
      return sum + (parseFloat(r?.volume) || 0)
    }, 0)
  }
  function nilaiPerJenis(jenis) {
    return SORTIMEN_LIST.reduce((sum, s) => {
      const r = grid.find(x => x.jenis === jenis && x.sortimen === s)
      const tarif = tarifSortimen[s] ?? DEFAULT_TARIF[s]
      return sum + (parseFloat(r?.volume) || 0) * tarif
    }, 0)
  }

  if (!tpkId) return <TpkRequiredState />

  return (
    <div style={{ padding: 24, minHeight: '100%', background: '#0a0a0a', color: '#f0f0f0' }}>
      <style>{`
        .tk-input { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); color: #f0f0f0; border-radius: 3px; outline: none; font-family: monospace; font-size: 12px; -moz-appearance: textfield; }
        .tk-input:focus { border-color: rgba(0,255,136,0.5); box-shadow: 0 0 0 2px rgba(0,255,136,0.07); }
        .tk-input::-webkit-inner-spin-button, .tk-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .tk-row:hover td { background: rgba(255,255,255,0.02) !important; }
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

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Layers size={18} style={{ color: '#00ff88' }}/> Tumpuk Kapling
        </h1>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3, fontFamily: 'monospace' }}>
          Input volume per jenis &amp; sortimen. Penomoran, Sabuk, dan Slaghammer otomatis terhitung.
        </p>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 3, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Lock size={10}/> Tarif sortimen dikelola di <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>Main Link → Tarif Periode</span>.
        </p>
      </div>

      {/* Periode selector */}
      <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, padding: '12px 16px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>Periode:</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flex: 1 }}>
          {periodes.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPeriode(p)}
              style={{
                padding: '4px 10px', borderRadius: 3, fontSize: 11, fontFamily: 'monospace',
                fontWeight: selectedPeriode?.id === p.id ? 700 : 400,
                background: selectedPeriode?.id === p.id ? '#00ff88' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${selectedPeriode?.id === p.id ? '#00ff88' : 'rgba(255,255,255,0.08)'}`,
                color: selectedPeriode?.id === p.id ? '#0a0a0a' : 'rgba(255,255,255,0.65)',
                cursor: 'pointer',
              }}
            >{p.periode}</button>
          ))}
          {periodes.length === 0 && (
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>Belum ada periode. Buat di Main Link.</span>
          )}
        </div>
        {selectedPeriode && (
          <p style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <CalendarDays size={11}/>
            {formatTanggal(selectedPeriode.tgl_awal)} – {formatTanggal(selectedPeriode.tgl_akhir)}
          </p>
        )}
      </div>

      {selectedPeriode && (
        <>
          {/* Info belum ada data */}
          {!hasData && !loading && (
            <div style={{ background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 3, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'monospace', fontSize: 12, color: '#ffaa00' }}>
                <Sparkles size={14}/>
                <span>Belum ada data untuk periode ini. Gunakan grid di bawah atau generate 9 baris default.</span>
              </div>
              <button
                onClick={handleSeed}
                style={{ padding: '5px 12px', background: 'rgba(255,170,0,0.15)', border: '1px solid rgba(255,170,0,0.3)', borderRadius: 3, color: '#ffaa00', fontSize: 11, fontFamily: 'monospace', cursor: 'pointer', fontWeight: 700 }}
              >Generate Default</button>
            </div>
          )}

          {/* Grid input per jenis */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            {JENIS_LIST.map(j => (
              <div key={j.key} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.015)' }}>
                  <p style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#f0f0f0' }}>{j.label}</p>
                  <div style={{ display: 'flex', gap: 16, fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                    <span>Total: <strong style={{ color: '#f0f0f0' }}>{formatNum(totalPerJenis(j.key))} M³</strong></span>
                    <span style={{ color: '#00ff88', fontWeight: 600 }}>{formatRupiah(nilaiPerJenis(j.key))}</span>
                  </div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '7px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)', width: 80 }}>Sortimen</th>
                      <th style={{ padding: '7px 12px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)', width: 140 }}>Volume (M³)</th>
                      <th style={{ padding: '7px 12px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)', width: 140 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Tarif <Lock size={10}/></span>
                      </th>
                      <th style={{ padding: '7px 12px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>Nilai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SORTIMEN_LIST.map(s => {
                      const r = grid.find(x => x.jenis === j.key && x.sortimen === s)
                      const vol = parseFloat(r?.volume) || 0
                      const trf = tarifSortimen[s] ?? DEFAULT_TARIF[s]
                      return (
                        <tr key={s} className="tk-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '7px 12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{s}</td>
                          <td style={{ padding: '5px 12px' }}>
                            <input
                              type="number" step="0.001"
                              value={r?.volume ?? ''}
                              onChange={e => updateVolume(j.key, s, e.target.value)}
                              className="tk-input"
                              style={{ width: '100%', padding: '5px 8px', textAlign: 'right', boxSizing: 'border-box' }}
                              placeholder="0"
                            />
                          </td>
                          <td style={{ padding: '7px 12px', textAlign: 'right', color: 'rgba(255,255,255,0.35)' }}>
                            {formatRupiah(trf)}
                          </td>
                          <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 600, color: vol > 0 ? '#f0f0f0' : 'rgba(255,255,255,0.2)' }}>
                            {formatRupiah(vol * trf)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Summary turunan */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Penomoran Kapling', data: summary.penomoran, note: 'Semua jenis',   accent: '#60a5fa' },
              { label: 'Sabuk Kapling',     data: summary.sabuk,     note: '= Penomoran',   accent: '#34d399' },
              { label: 'Slaghammer',        data: summary.slaghammer, note: 'JATI + Mahoni', accent: '#fb923c' },
            ].map(c => (
              <div key={c.label} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, padding: '14px 16px' }}>
                <p style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: c.accent, marginBottom: 2 }}>{c.label}</p>
                <p style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>{c.note}</p>
                <p style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: '#f0f0f0' }}>{formatNum(c.data.fisik)} M³</p>
                <p style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>× {formatRupiah(c.data.tarif)}</p>
                <p style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, marginTop: 4, color: c.accent }}>{formatRupiah(c.data.nilai)}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSave}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: loading ? 'rgba(0,255,136,0.15)' : '#00ff88', color: loading ? 'rgba(0,255,136,0.4)' : '#0a0a0a', borderRadius: 3, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}
            ><Save size={13}/> {loading ? 'Menyimpan...' : 'Simpan Data'}</button>
          </div>
        </>
      )}
    </div>
  )
}
