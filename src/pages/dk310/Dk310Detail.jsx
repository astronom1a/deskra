import { Fragment, useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, FileBarChart2, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthProvider'
import { getEffectiveTpkId } from '../../lib/effectiveTpk'
import Toast, { useToast } from '../../components/ui/Toast'
import TpkRequiredState from '../../components/layout/TpkRequiredState'
import { PageLoader } from '../../components/ui/LoadingState'
import { useIsMobile } from '../../lib/hooks/useIsMobile'

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

function buildBreakdown(sbList) {
  const jenisMap = {}
  let totalBtg = 0, totalM3 = 0
  for (const sb of sbList) {
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
  return {
    totalBtg, totalM3,
    jenisList: Object.entries(jenisMap).map(([jenis, val]) => ({
      jenis, btg: val.btg, m3: val.m3, sortimen: Object.values(val.mutu),
    })),
  }
}

const CARDS = [
  { key: 'penambahan',         label: 'Penambahan' },
  { key: 'sisa_lalu',          label: 'Sisa yang Lalu' },
  { key: 'jumlah_persediaan',  label: 'Jumlah Persediaan' },
  { key: 'jumlah_pengurangan', label: 'Jumlah Pengurangan' },
  { key: 'sisa_sekarang',      label: 'Sisa Sekarang' },
]

const TH = {
  padding: '8px 10px', textAlign: 'left', fontWeight: 600, fontSize: 10,
  color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
}
const TD = { padding: '9px 10px', color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap' }
const TH_MUTU = {
  padding: '4px 12px 4px 0', fontWeight: 600, fontSize: 9,
  color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
}
const TD_MUTU = { padding: '3px 12px 3px 0', fontSize: 11, whiteSpace: 'nowrap' }

export default function Dk310Detail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const backPath = location.pathname.includes('pengurangan') ? '/dk310/pengurangan' : '/dk310/penambahan'
  const isMobile = useIsMobile()
  const { toast, showToast } = useToast(3000)
  const { profile, activeTpkId } = useAuth()
  const tpkId = getEffectiveTpkId({ activeTpkId, profile })

  const [period,     setPeriod]     = useState(null)
  const [sbList,     setSbList]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [expanded,   setExpanded]   = useState(new Set())

  useEffect(() => { if (tpkId) fetchData() }, [id, tpkId])

  async function fetchData() {
    setLoading(true)
    const [{ data: p, error: pe }, { data: sb, error: sbe }] = await Promise.all([
      supabase
        .from('tabel_dk310_periods')
        .select('id, periode, kph, bkph, masa_pembayaran, tanggal_cetak, jenis, penambahan_btg, penambahan_m3, sisa_lalu_btg, sisa_lalu_m3, jumlah_persediaan_btg, jumlah_persediaan_m3, jumlah_pengurangan_btg, jumlah_pengurangan_m3, sisa_sekarang_btg, sisa_sekarang_m3')
        .eq('id', id)
        .eq('tpk_id', tpkId)
        .single(),
      supabase
        .from('tabel_dk310_surat_bukti')
        .select('id, urutan, jenis, tanggal, nomor_surat, jumlah_total_btg, jumlah_total_m3, tabel_dk310_surat_bukti_mutu(id, kategori, mutu_code, mutu_label, btg, m3)')
        .eq('period_id', id)
        .order('urutan'),
    ])
    setLoading(false)
    if (pe || sbe) {
      showToast((pe || sbe).message, 'error')
      setFetchError(true)
      return
    }
    setFetchError(false)
    setPeriod(p)
    setSbList(sb || [])
  }

  function toggleExpand(sbId) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(sbId) ? next.delete(sbId) : next.add(sbId)
      return next
    })
  }

  if (!tpkId) return <TpkRequiredState />

  if (loading) return (
    <PageLoader label="memuat detail DK310..." />
  )

  if (!period) return (
    <div style={{ minHeight: '100%', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <AlertCircle size={16} style={{ color: 'rgba(255,255,255,0.3)', marginRight: 8 }} />
      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
        {fetchError ? 'Gagal memuat data.' : 'Data tidak ditemukan.'}
      </span>
    </div>
  )

  return (
    <div style={{ minHeight: '100%', background: '#0a0a0a' }}>
      <Toast toast={toast} />
      <div className="relative z-10 ds-page mx-auto" style={{ width: '100%', maxWidth: 'min(96vw, 1440px)' }}>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => navigate(backPath)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', padding: '0 0 12px 0' }}
          >
            <ArrowLeft size={14} /> Kembali
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <FileBarChart2 size={18} style={{ color: '#00ff88' }} />
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f0', letterSpacing: '-0.02em' }}>
              DK310 — {period.periode}
            </h1>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
            {period.kph}  ·  {period.bkph}  ·  Cetak: {period.tanggal_cetak || '—'}
          </p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', marginTop: 2 }}>
            {period.masa_pembayaran}
          </p>
        </div>

        {/* Summary Cards */}
        {period.jenis === 'pengurangan' ? (() => {
          const bd = buildBreakdown(sbList)
          return (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : `200px repeat(${bd.jenisList.length}, minmax(200px, 1fr))`, gap: 10, marginBottom: 28 }}>
              <TotalCard btg={bd.totalBtg} m3={bd.totalM3} />
              {bd.jenisList.map(j => (
                <JenisCard key={j.jenis} jenis={j.jenis} btg={j.btg} m3={j.m3} sortimen={j.sortimen} />
              ))}
            </div>
          )
        })() : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 28 }}>
            {CARDS.map(c => (
              <SummaryCard key={c.key} label={c.label} btg={period[c.key + '_btg']} m3={period[c.key + '_m3']} />
            ))}
          </div>
        )}

        {/* Section label */}
        <p style={{ fontSize: 10, color: '#00ff88', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Surat Bukti ({sbList.length})
        </p>

        {/* Surat bukti table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th style={TH}>No</th>
                <th style={TH}>Nomor Surat</th>
                <th style={TH}>Jenis</th>
                <th style={TH}>Tgl</th>
                <th style={{ ...TH, textAlign: 'right' }}>Total Btg</th>
                <th style={{ ...TH, textAlign: 'right' }}>Total m³</th>
                <th style={TH}></th>
              </tr>
            </thead>
            <tbody>
              {sbList.map(sb => {
                const isOpen   = expanded.has(sb.id)
                const mutuRows = sb.tabel_dk310_surat_bukti_mutu || []
                const kb  = mutuRows.filter(m => m.kategori === 'KB')
                const tbn = mutuRows.filter(m => m.kategori === 'TBN')
                return (
                  <Fragment key={sb.id}>
                    <tr
                      onClick={() => toggleExpand(sb.id)}
                      style={{
                        borderBottom: isOpen ? 'none' : '1px solid rgba(255,255,255,0.04)',
                        cursor: 'pointer', transition: 'background 0.15s',
                        background: isOpen ? 'rgba(55,145,101,0.06)' : 'transparent',
                      }}
                      onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                      onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent' }}
                    >
                      <td style={TD}>{sb.urutan}</td>
                      <td style={{ ...TD, color: '#f0f0f0' }}>{sb.nomor_surat}</td>
                      <td style={{ ...TD, color: 'rgba(255,255,255,0.5)' }}>{sb.jenis}</td>
                      <td style={{ ...TD, color: 'rgba(255,255,255,0.4)' }}>{sb.tanggal}</td>
                      <td style={{ ...TD, textAlign: 'right', color: '#f0f0f0', fontWeight: 600 }}>{fmt(sb.jumlah_total_btg)}</td>
                      <td style={{ ...TD, textAlign: 'right', color: '#379165', fontWeight: 600 }}>{fmt(sb.jumlah_total_m3, 3)}</td>
                      <td style={{ ...TD, color: 'rgba(55,145,101,0.6)', textAlign: 'right' }}>
                        {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </td>
                    </tr>

                    {isOpen && (
                      <tr key={sb.id + '-mutu'}>
                        <td colSpan={7} style={{ padding: '0 0 2px 0', background: 'rgba(55,145,101,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <div style={{ padding: '10px 20px 14px 40px' }}>
                            {[{ label: 'Kayu Bernomor (KB)', rows: kb }, { label: 'Kayu Tak Bernomor (TBN)', rows: tbn }]
                              .filter(g => g.rows.length > 0)
                              .map(group => (
                                <div key={group.label} style={{ marginBottom: 10 }}>
                                  <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                                    {group.label}
                                  </p>
                                  <table style={{ borderCollapse: 'collapse', fontSize: 11 }}>
                                    <thead>
                                      <tr>
                                        <th style={{ ...TH_MUTU, textAlign: 'left' }}>Mutu</th>
                                        <th style={{ ...TH_MUTU, textAlign: 'right' }}>Btg</th>
                                        <th style={{ ...TH_MUTU, textAlign: 'right' }}>m³</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {group.rows.map(m => (
                                        <tr key={m.id}>
                                          <td style={{ ...TD_MUTU, color: m.mutu_code.startsWith('JML') ? '#00ff88' : 'rgba(255,255,255,0.6)', fontWeight: m.mutu_code.startsWith('JML') ? 600 : 400 }}>
                                            {m.mutu_label}
                                          </td>
                                          <td style={{ ...TD_MUTU, textAlign: 'right', color: '#f0f0f0' }}>{fmt(m.btg)}</td>
                                          <td style={{ ...TD_MUTU, textAlign: 'right', color: '#379165' }}>{fmt(m.m3, 3)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ))
                            }
                            {mutuRows.length === 0 && (
                              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>Tidak ada rincian mutu.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}
