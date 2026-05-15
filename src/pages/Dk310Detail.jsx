import { Fragment, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileBarChart2, ChevronDown, ChevronRight, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Toast, { useToast } from '../components/Toast'

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
  { key: 'penambahan',          label: 'Penambahan' },
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
  const { toast, showToast } = useToast(3000)

  const [period,   setPeriod]   = useState(null)
  const [sbList,   setSbList]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState(new Set())

  useEffect(() => { fetchData() }, [id])

  async function fetchData() {
    setLoading(true)
    const [{ data: p, error: pe }, { data: sb, error: sbe }] = await Promise.all([
      supabase.from('tabel_dk310_periods').select('*').eq('id', id).single(),
      supabase
        .from('tabel_dk310_surat_bukti')
        .select('*, tabel_dk310_surat_bukti_mutu(*)')
        .eq('period_id', id)
        .order('urutan'),
    ])
    setLoading(false)
    if (pe) { showToast(pe.message, 'error'); return }
    if (sbe) { showToast(sbe.message, 'error'); return }
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

  if (loading) return (
    <div style={{ minHeight: '100%', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={20} style={{ color: 'rgba(255,255,255,0.3)' }} className="animate-spin" />
    </div>
  )

  if (!period) return (
    <div style={{ minHeight: '100%', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <AlertCircle size={16} style={{ color: 'rgba(255,255,255,0.3)', marginRight: 8 }} />
      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Data tidak ditemukan.</span>
    </div>
  )

  return (
    <div style={{ minHeight: '100%', background: '#0a0a0a' }}>
      <Toast toast={toast} />
      <div className="relative z-10 p-6 mx-auto" style={{ width: '100%', maxWidth: 'min(96vw, 1440px)' }}>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => navigate('/dk310')}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 28 }}>
          {CARDS.map(c => (
            <SummaryCard key={c.key} label={c.label} btg={period[c.key + '_btg']} m3={period[c.key + '_m3']} />
          ))}
        </div>

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
                      <tr>
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
