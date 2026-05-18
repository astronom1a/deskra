import { Fragment, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileBarChart2, Upload, Loader2, AlertCircle, ChevronRight, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthProvider'
import { getEffectiveTpkId } from '../../lib/effectiveTpk'
import { requireTpkId } from '../../lib/tenantScope'
import { parseDk310m } from './parseDk310m'
import Toast, { useToast } from '../../components/ui/Toast'
import TpkRequiredState from '../../components/layout/TpkRequiredState'
import { TableSkeleton } from '../../components/ui/LoadingState'

function fmt(n, dec = 0) {
  if (n == null) return '—'
  return Number(n).toLocaleString('id-ID', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function TotalCard({ btg, m3 }) {
  return (
    <div style={{
      background: 'rgba(0,255,136,0.04)',
      border: '1px solid rgba(0,255,136,0.15)',
      borderRadius: 4,
      padding: '14px 18px',
      minWidth: 0,
    }}>
      <p style={{ fontSize: 10, color: '#00ff88', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
        Jumlah Pengurangan
      </p>
      <p style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace', lineHeight: 1 }}>
        {fmt(btg)} <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>btg</span>
      </p>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#379165', fontFamily: 'monospace', marginTop: 6 }}>
        {fmt(m3, 3)} <span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(55,145,101,0.6)' }}>m³</span>
      </p>
    </div>
  )
}

function JenisCard({ jenis, btg, m3, sortimen }) {
  const kb  = sortimen.filter(s => s.cat === 'KB'  && (s.btg || s.m3))
  const tbn = sortimen.filter(s => s.cat === 'TBN' && (s.btg || s.m3))
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 4,
      padding: '14px 16px',
      minWidth: 0,
    }}>
      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        {jenis}
      </p>
      <p style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace', lineHeight: 1 }}>
        {fmt(btg)} <span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>btg</span>
      </p>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#379165', fontFamily: 'monospace', marginTop: 4, marginBottom: 12 }}>
        {fmt(m3, 3)} <span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(55,145,101,0.5)' }}>m³</span>
      </p>

      {[{ label: 'KB', rows: kb }, { label: 'TBN', rows: tbn }].filter(g => g.rows.length > 0).map(group => (
        <div key={group.label} style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
            {group.label}
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, fontFamily: 'monospace' }}>
            <tbody>
              {group.rows.map(s => (
                <tr key={s.code}>
                  <td style={{ padding: '2px 0', color: 'rgba(255,255,255,0.45)', paddingRight: 8 }}>{s.label}</td>
                  <td style={{ padding: '2px 0', textAlign: 'right', color: 'rgba(255,255,255,0.7)', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmt(s.btg)}</td>
                  <td style={{ padding: '2px 0 2px 6px', textAlign: 'right', color: 'rgba(55,145,101,0.8)', whiteSpace: 'nowrap' }}>{fmt(s.m3, 3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

const TH = {
  padding: '8px 10px', textAlign: 'left', fontWeight: 600, fontSize: 10,
  color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
}
const TH_SUB = {
  padding: '4px 10px', textAlign: 'right', fontWeight: 500, fontSize: 10,
  letterSpacing: '0.03em', whiteSpace: 'nowrap',
}
const TD = { padding: '9px 10px', color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap' }

function parseMasaBulan(masa) {
  if (!masa) return null
  const stripped = masa.replace(/^[IVXLC]+\s*[-–]\s*/i, '').trim()
  return stripped || null
}

const PERIOD_COLS = [
  { key: 'jumlah_pengurangan', label: 'Jumlah Pengurangan' },
]

export default function Dk310Pengurangan() {
  const navigate = useNavigate()
  const { profile, activeTpkId } = useAuth()
  const tpkId     = getEffectiveTpkId({ activeTpkId, profile })
  const fileRef   = useRef(null)
  const { toast, showToast } = useToast(3000)

  const [periods,    setPeriods]    = useState([])
  const [breakdown,  setBreakdown]  = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [importing,  setImporting]  = useState(false)
  const [preview,    setPreview]    = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => { if (tpkId) fetchAll() }, [tpkId])

  async function fetchAll() {
    setLoading(true)
    const { data: pData, error: pErr } = await supabase
      .from('tabel_dk310_periods')
      .select('*')
      .eq('tpk_id', tpkId)
      .eq('jenis', 'pengurangan')
      .order('created_at', { ascending: false })
    if (pErr) { setLoading(false); showToast(pErr.message, 'error'); return }
    const periods = pData || []
    setPeriods(periods)

    if (periods.length > 0) {
      const { data: sbData, error: sbErr } = await supabase
        .from('tabel_dk310_surat_bukti')
        .select('jenis, jumlah_total_btg, jumlah_total_m3, tabel_dk310_surat_bukti_mutu(*)')
        .in('period_id', periods.map(p => p.id))
      if (!sbErr && sbData) setBreakdown(buildBreakdown(sbData))
    } else {
      setBreakdown(null)
    }
    setLoading(false)
  }

  function buildBreakdown(sbData) {
    const jenisMap = {}
    let totalBtg = 0, totalM3 = 0
    for (const sb of sbData) {
      const j = sb.jenis || 'Lainnya'
      if (!jenisMap[j]) jenisMap[j] = { btg: 0, m3: 0, mutu: {} }
      jenisMap[j].btg += sb.jumlah_total_btg || 0
      jenisMap[j].m3  += sb.jumlah_total_m3  || 0
      totalBtg += sb.jumlah_total_btg || 0
      totalM3  += sb.jumlah_total_m3  || 0
      for (const m of sb.tabel_dk310_surat_bukti_mutu || []) {
        if (!jenisMap[j].mutu[m.mutu_code]) {
          jenisMap[j].mutu[m.mutu_code] = { code: m.mutu_code, label: m.mutu_label, cat: m.kategori, btg: 0, m3: 0 }
        }
        jenisMap[j].mutu[m.mutu_code].btg += m.btg || 0
        jenisMap[j].mutu[m.mutu_code].m3  += m.m3  || 0
      }
    }
    const jenisList = Object.entries(jenisMap).map(([jenis, val]) => ({
      jenis,
      btg: val.btg,
      m3:  val.m3,
      sortimen: Object.values(val.mutu),
    }))
    return { totalBtg, totalM3, jenisList }
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('tabel_dk310_periods').delete().eq('id', id)
    if (error) { showToast(error.message, 'error'); return }
    setDeletingId(null)
    await fetchAll()
    showToast('Periode berhasil dihapus.')
  }

  async function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    try {
      const result = await parseDk310m(file)
      if (!result.suratBuktiList.length) {
        showToast('Tidak ada data surat bukti terbaca dari file ini.', 'error')
        return
      }
      setPreview({ ...result, fileName: file.name })
    } catch (err) {
      showToast(err.message || 'Gagal membaca file Excel.', 'error')
    }
  }

  async function handleImport() {
    if (!preview) return
    let scopedTpkId
    try { scopedTpkId = requireTpkId(tpkId) } catch (err) {
      showToast(err.message, 'error'); return
    }
    setImporting(true)
    const { data: period, error: periodErr } = await supabase
      .from('tabel_dk310_periods')
      .insert({ ...preview.periodData, tpk_id: scopedTpkId, created_by: profile?.id, jenis: 'pengurangan' })
      .select('id')
      .single()
    if (periodErr) { setImporting(false); showToast(periodErr.message, 'error'); return }

    const sbPayload = preview.suratBuktiList.map((sb, idx) => ({
      period_id:        period.id,
      urutan:           idx + 1,
      jenis:            sb.jenis,
      tanggal:          sb.tanggal,
      nomor_surat:      sb.nomor_surat,
      jumlah_total_btg: sb.jumlah_total_btg,
      jumlah_total_m3:  sb.jumlah_total_m3,
    }))
    const { data: sbRows, error: sbErr } = await supabase
      .from('tabel_dk310_surat_bukti')
      .insert(sbPayload)
      .select('id')
    if (sbErr) {
      await supabase.from('tabel_dk310_periods').delete().eq('id', period.id)
      setImporting(false); showToast(sbErr.message, 'error'); return
    }

    const mutuPayload = []
    preview.suratBuktiList.forEach((sb, idx) => {
      const sbId = sbRows[idx]?.id
      if (!sbId) return
      for (const m of sb.mutu) {
        mutuPayload.push({ surat_bukti_id: sbId, kategori: m.cat, mutu_code: m.code, mutu_label: m.label, btg: m.btg, m3: m.m3 })
      }
    })
    const { error: mutuErr } = await supabase.from('tabel_dk310_surat_bukti_mutu').insert(mutuPayload)
    if (mutuErr) {
      await supabase.from('tabel_dk310_periods').delete().eq('id', period.id)
      setImporting(false); showToast(mutuErr.message, 'error'); return
    }
    const importedCount = preview.suratBuktiList.length
    setPreview(null)
    await fetchAll()
    setImporting(false)
    showToast(`Berhasil import: ${importedCount} surat bukti`)
  }

  if (!tpkId) return <TpkRequiredState />

  return (
    <div style={{ minHeight: '100%', background: '#0a0a0a' }}>
      <Toast toast={toast} />
      <div className="relative z-10 p-6 mx-auto" style={{ width: '100%', maxWidth: 'min(96vw, 1440px)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileBarChart2 size={20} style={{ color: '#00ff88' }} />
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f0f0f0', letterSpacing: '-0.02em' }}>
              DK310<span style={{ color: '#ff6b6b' }}>−</span>
            </h1>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: importing ? 'rgba(55,145,101,0.15)' : 'rgba(55,145,101,0.2)',
              border: '1px solid rgba(55,145,101,0.4)',
              borderRadius: 4, padding: '7px 14px', cursor: importing ? 'not-allowed' : 'pointer',
              color: '#00ff88', fontSize: 13, fontWeight: 600,
            }}
          >
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Import Excel
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
        </div>

        {/* Preview banner */}
        {preview && (
          <div style={{
            background: 'rgba(55,145,101,0.1)', border: '1px solid rgba(55,145,101,0.3)',
            borderRadius: 4, padding: '12px 16px', marginBottom: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
          }}>
            <div>
              <p style={{ color: '#00ff88', fontSize: 13, fontWeight: 600 }}>{preview.fileName}</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }}>
                Periode: {preview.periodData.periode} · {preview.suratBuktiList.length} surat bukti
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setPreview(null)}
                style={{ padding: '6px 12px', borderRadius: 3, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer' }}
              >
                Batal
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                style={{ padding: '6px 14px', borderRadius: 3, border: '1px solid rgba(55,145,101,0.5)', background: 'rgba(55,145,101,0.2)', color: '#00ff88', fontSize: 12, fontWeight: 600, cursor: importing ? 'not-allowed' : 'pointer' }}
              >
                {importing ? 'Menyimpan...' : 'Simpan ke Database'}
              </button>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        {!loading && breakdown && (
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 10, color: '#00ff88', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              Ringkasan
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: `200px repeat(${breakdown.jenisList.length}, minmax(200px, 1fr))`, gap: 10 }}>
              <TotalCard btg={breakdown.totalBtg} m3={breakdown.totalM3} />
              {breakdown.jenisList.map(j => (
                <JenisCard key={j.jenis} jenis={j.jenis} btg={j.btg} m3={j.m3} sortimen={j.sortimen} />
              ))}
            </div>
          </div>
        )}

        {/* Section label */}
        <p style={{ fontSize: 10, color: '#00ff88', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Daftar Periode
        </p>

        {/* Table */}
        {loading ? (
          <TableSkeleton rows={5} columns={6} />
        ) : periods.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.2)', fontSize: 13, padding: '24px 0' }}>
            <AlertCircle size={14} /> Belum ada data. Import file Excel DK310M untuk memulai.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <th style={TH}>No</th>
                  <th style={TH}>Periode</th>
                  <th style={{ ...TH, textAlign: 'center' }} colSpan={2}>Jumlah Pengurangan</th>
                  <th style={TH} colSpan={2}></th>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th style={TH_SUB}></th>
                  <th style={TH_SUB}></th>
                  <th style={{ ...TH_SUB, color: 'rgba(255,255,255,0.5)' }}>Btg</th>
                  <th style={{ ...TH_SUB, color: 'rgba(55,145,101,0.8)' }}>m³</th>
                  <th style={TH_SUB}></th>
                  <th style={TH_SUB}></th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p, idx) => {
                  const isConfirming = deletingId === p.id
                  return (
                    <tr
                      key={p.id}
                      onClick={() => !isConfirming && navigate(`/dk310/pengurangan/${p.id}`)}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: isConfirming ? 'default' : 'pointer', transition: 'background 0.15s', background: isConfirming ? 'rgba(255,60,60,0.04)' : 'transparent' }}
                      onMouseEnter={e => { if (!isConfirming) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                      onMouseLeave={e => { if (!isConfirming) e.currentTarget.style.background = 'transparent' }}
                    >
                      <td style={TD}>{idx + 1}</td>
                      <td style={{ ...TD }}>
                        <span style={{ color: '#00ff88', fontWeight: 600 }}>{p.periode}</span>
                        {parseMasaBulan(p.masa_pembayaran) && (
                          <span style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2, fontWeight: 400 }}>
                            {parseMasaBulan(p.masa_pembayaran)}
                          </span>
                        )}
                      </td>
                      <td style={{ ...TD, textAlign: 'right', color: p.jumlah_pengurangan_btg != null ? '#f0f0f0' : 'rgba(255,255,255,0.2)' }}>
                        {fmt(p.jumlah_pengurangan_btg)}
                      </td>
                      <td style={{ ...TD, textAlign: 'right', color: p.jumlah_pengurangan_m3 != null ? '#379165' : 'rgba(55,145,101,0.3)' }}>
                        {fmt(p.jumlah_pengurangan_m3, 3)}
                      </td>
                      <td style={{ ...TD, textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        {isConfirming ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                            <span style={{ fontSize: 11, color: 'rgba(255,100,100,0.8)' }}>Hapus?</span>
                            <button onClick={() => handleDelete(p.id)} style={{ padding: '3px 10px', fontSize: 11, borderRadius: 3, border: '1px solid rgba(255,80,80,0.4)', background: 'rgba(255,60,60,0.15)', color: '#ff6b6b', cursor: 'pointer' }}>Ya</button>
                            <button onClick={() => setDeletingId(null)} style={{ padding: '3px 10px', fontSize: 11, borderRadius: 3, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>Batal</button>
                          </div>
                        ) : (
                          <button
                            onClick={e => { e.stopPropagation(); setDeletingId(p.id) }}
                            style={{ padding: '4px 6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.18)', borderRadius: 3, lineHeight: 0 }}
                            onMouseEnter={e => e.currentTarget.style.color = '#ff6b6b'}
                            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.18)'}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                      <td style={{ ...TD, color: 'rgba(255,255,255,0.2)', textAlign: 'right', width: 24 }} onClick={e => e.stopPropagation()}>
                        {!isConfirming && <ChevronRight size={14} />}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
