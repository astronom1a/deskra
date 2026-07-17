import { Fragment, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileBarChart2, Upload, Loader2, AlertCircle, ChevronRight, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthProvider'
import { getEffectiveTpkId } from '../../lib/effectiveTpk'
import { requireTpkId } from '../../lib/tenantScope'
import { parseDk310 } from './parseDk310'
import Toast, { useToast } from '../../components/ui/Toast'
import TpkRequiredState from '../../components/layout/TpkRequiredState'
import { TableSkeleton } from '../../components/ui/LoadingState'
import { useIsMobile } from '../../lib/hooks/useIsMobile'
import DataCard from '../../components/ui/responsive/DataCard'

function fmt(n, dec = 0) {
  if (n == null) return '—'
  return Number(n).toLocaleString('id-ID', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function SummaryCard({ label, btg, m3 }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 4,
      padding: '14px 18px',
      minWidth: 0,
    }}>
      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
        {label}
      </p>
      <p style={{ fontSize: 20, fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace', lineHeight: 1 }}>
        {fmt(btg)} <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>btg</span>
      </p>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#379165', fontFamily: 'monospace', marginTop: 5 }}>
        {fmt(m3, 3)} <span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(55,145,101,0.6)' }}>m³</span>
      </p>
    </div>
  )
}

const CARDS = [
  { key: 'penambahan',         label: 'Penambahan' },
  { key: 'sisa_lalu',          label: 'Sisa yang Lalu' },
  { key: 'jumlah_persediaan',  label: 'Jumlah Persediaan' },
  { key: 'jumlah_pengurangan', label: 'Jumlah Pengurangan' },
  { key: 'sisa_sekarang',      label: 'Sisa Sekarang' },
]

function parseMasaBulan(masa) {
  if (!masa) return null
  const stripped = masa.replace(/^[IVXLC]+\s*[-–]\s*/i, '').trim()
  return stripped || null
}

const ROMAN_MAP = { I: 1, V: 5, X: 10, L: 50, C: 100 }
function romanToInt(str) {
  let result = 0
  for (let i = 0; i < str.length; i++) {
    const cur = ROMAN_MAP[str[i]] || 0
    const next = ROMAN_MAP[str[i + 1]] || 0
    result += cur < next ? -cur : cur
  }
  return result
}
const BULAN_MAP = {
  januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6,
  juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12,
}
function periodSortKey(p) {
  const m = String(p.periode || '').match(/^([IVXLC]+)-(\w+)-(\d{4})$/i)
  if (!m) return 0
  const bulan = BULAN_MAP[m[2].toLowerCase()] || 0
  return Number(m[3]) * 1000 + bulan * 10 + romanToInt(m[1].toUpperCase())
}

const FLOW_KEYS    = ['penambahan', 'jumlah_pengurangan']
const BALANCE_KEYS = ['sisa_lalu', 'jumlah_persediaan', 'sisa_sekarang']

const TH = {
  padding: '8px 10px', textAlign: 'left', fontWeight: 600, fontSize: 10,
  color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
}
const TH_SUB = {
  padding: '4px 10px', textAlign: 'right', fontWeight: 500, fontSize: 10,
  letterSpacing: '0.03em', whiteSpace: 'nowrap',
}
const TD = { padding: '9px 10px', color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap' }

export default function Dk310() {
  const navigate  = useNavigate()
  const { profile, activeTpkId } = useAuth()
  const tpkId     = getEffectiveTpkId({ activeTpkId, profile })
  const fileRef   = useRef(null)
  const isMobile  = useIsMobile()
  const { toast, showToast } = useToast(3000)

  const [periods,    setPeriods]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [importing,  setImporting]  = useState(false)
  const [preview,    setPreview]    = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => { if (tpkId) fetchPeriods() }, [tpkId])

  async function fetchPeriods() {
    setLoading(true)
    const { data, error } = await supabase
      .from('tabel_dk310_periods')
      .select('*')
      .eq('tpk_id', tpkId)
      .eq('jenis', 'penambahan')
      .order('created_at', { ascending: false })
    setLoading(false)
    if (error) { showToast(error.message, 'error'); return }
    setPeriods(data || [])
  }

  async function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    try {
      const result = await parseDk310(file)
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
    const { data: existing, error: existingErr } = await supabase
      .from('tabel_dk310_periods')
      .select('id')
      .eq('tpk_id', scopedTpkId)
      .eq('jenis', 'penambahan')
      .eq('periode', preview.periodData.periode)
      .maybeSingle()
    if (existingErr) { setImporting(false); showToast(existingErr.message, 'error'); return }
    if (existing) {
      setImporting(false)
      showToast(`Periode ${preview.periodData.periode} sudah pernah diimport.`, 'error')
      return
    }

    const { data: period, error: periodErr } = await supabase
      .from('tabel_dk310_periods')
      .insert({ ...preview.periodData, tpk_id: scopedTpkId, created_by: profile?.id, jenis: 'penambahan' })
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
    await fetchPeriods()
    setImporting(false)
    showToast(`Berhasil import: ${importedCount} surat bukti`)
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('tabel_dk310_periods').delete().eq('id', id)
    if (error) { showToast(error.message, 'error'); return }
    setDeletingId(null)
    await fetchPeriods()
    showToast('Periode berhasil dihapus.')
  }

  // Penambahan & pengurangan adalah nilai arus (flow) — dijumlah antar periode.
  // Sisa lalu/persediaan/sekarang adalah saldo (stock) — ambil dari periode terbaru saja.
  const totals = periods.reduce((acc, p) => {
    for (const key of FLOW_KEYS) {
      acc[key + '_btg'] = (acc[key + '_btg'] || 0) + (p[key + '_btg'] || 0)
      acc[key + '_m3']  = (acc[key + '_m3']  || 0) + (p[key + '_m3']  || 0)
    }
    return acc
  }, {})
  const latestPeriod = periods.reduce((latest, p) => (
    !latest || periodSortKey(p) > periodSortKey(latest) ? p : latest
  ), null)
  for (const key of BALANCE_KEYS) {
    totals[key + '_btg'] = latestPeriod?.[key + '_btg'] ?? null
    totals[key + '_m3']  = latestPeriod?.[key + '_m3']  ?? null
  }

  if (!tpkId) return <TpkRequiredState />

  return (
    <div style={{ minHeight: '100%', background: '#0a0a0a' }}>
      <Toast toast={toast} />
      <div className="relative z-10 ds-page mx-auto" style={{ width: '100%', maxWidth: 'min(96vw, 1440px)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileBarChart2 size={20} style={{ color: '#00ff88' }} />
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f0f0f0', letterSpacing: '-0.02em' }}>
              DK310<span style={{ color: '#00ff88' }}>+</span>
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
        {!loading && periods.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 28 }}>
            {CARDS.map(c => (
              <SummaryCard key={c.key} label={c.label} btg={totals[c.key + '_btg']} m3={totals[c.key + '_m3']} />
            ))}
          </div>
        )}

        {/* Section label */}
        <p style={{ fontSize: 10, color: '#00ff88', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Daftar Periode
        </p>

        {/* Table */}
        {loading ? (
          <TableSkeleton rows={5} columns={12} />
        ) : periods.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.2)', fontSize: 13, padding: '24px 0' }}>
            <AlertCircle size={14} /> Belum ada data. Import file Excel DK310P untuk memulai.
          </div>
        ) : isMobile ? (
          <div className="ds-card-list">
            {periods.map(p => {
              const isConfirming = deletingId === p.id
              return (
                <DataCard
                  key={p.id}
                  title={p.periode}
                  badge={parseMasaBulan(p.masa_pembayaran) ? (
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', flexShrink: 0 }}>
                      {parseMasaBulan(p.masa_pembayaran)}
                    </span>
                  ) : null}
                  onClick={() => !isConfirming && navigate(`/dk310/penambahan/${p.id}`)}
                  fields={CARDS.map(c => ({
                    label: c.label,
                    value: (
                      <>
                        <span style={{ color: '#f0f0f0' }}>{fmt(p[c.key + '_btg'])} btg</span>
                        <span style={{ color: '#379165' }}> · {fmt(p[c.key + '_m3'], 3)} m³</span>
                      </>
                    ),
                  }))}
                  actions={isConfirming ? (
                    <>
                      <span style={{ fontSize: 11, color: 'rgba(255,100,100,0.8)', fontFamily: 'monospace', alignSelf: 'center' }}>Hapus?</span>
                      <button onClick={() => handleDelete(p.id)} style={{ padding: '6px 14px', fontSize: 11, borderRadius: 3, border: '1px solid rgba(255,80,80,0.4)', background: 'rgba(255,60,60,0.15)', color: '#ff6b6b', cursor: 'pointer', fontFamily: 'monospace' }}>Ya</button>
                      <button onClick={() => setDeletingId(null)} style={{ padding: '6px 14px', fontSize: 11, borderRadius: 3, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'monospace' }}>Batal</button>
                    </>
                  ) : (
                    <button onClick={() => setDeletingId(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'rgba(255,107,107,0.06)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 3, color: '#ff6b6b', cursor: 'pointer', fontFamily: 'monospace', fontSize: 11 }}><Trash2 size={12}/> hapus</button>
                  )}
                />
              )
            })}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <th style={TH}>No</th>
                  <th style={TH}>Periode</th>
                  {CARDS.map(c => (
                    <th key={c.key} colSpan={2} style={{ ...TH, textAlign: 'center' }}>{c.label}</th>
                  ))}
                  <th style={TH} colSpan={2}></th>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th style={TH_SUB}></th>
                  <th style={TH_SUB}></th>
                  {CARDS.map(c => (
                    <Fragment key={c.key}>
                      <th style={{ ...TH_SUB, color: 'rgba(255,255,255,0.5)' }}>Btg</th>
                      <th style={{ ...TH_SUB, color: 'rgba(55,145,101,0.8)' }}>m³</th>
                    </Fragment>
                  ))}
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
                      onClick={() => !isConfirming && navigate(`/dk310/penambahan/${p.id}`)}
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
                      {CARDS.map(c => (
                        <Fragment key={c.key}>
                          <td style={{ ...TD, textAlign: 'right', color: '#f0f0f0' }}>{fmt(p[c.key + '_btg'])}</td>
                          <td style={{ ...TD, textAlign: 'right', color: '#379165' }}>{fmt(p[c.key + '_m3'], 3)}</td>
                        </Fragment>
                      ))}
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
