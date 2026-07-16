import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { computeTotalUK } from '../lib/rekapPekerjaan'
import {
  Clock, TrendingUp, AlertCircle, Eye, EyeOff, ArrowRight, CalendarPlus,
} from 'lucide-react'
import { useAccount } from '../lib/hooks/useAccount'
import { useAuth } from '../lib/AuthProvider'
import { getEffectiveTpkId } from '../lib/effectiveTpk'
import TpkRequiredState from '../components/layout/TpkRequiredState'
import { TableSkeleton } from '../components/ui/LoadingState'
import { useIsMobile } from '../lib/hooks/useIsMobile'
import DataCard from '../components/ui/responsive/DataCard'

const SORTIMENS = ['AI', 'AII', 'AIII']

function formatRupiah(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(Math.round(value || 0))
}

function useDateTime() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

export default function Dashboard() {
  const now       = useDateTime()
  const isMobile  = useIsMobile()
  const { account } = useAccount()
  const { profile, tpk, activeTpkId } = useAuth()
  const tpkId     = getEffectiveTpkId({ activeTpkId, profile })
  const [activeTpkName, setActiveTpkName] = useState('')
  const namaTpk   = activeTpkName || tpk?.namatpk || 'TPK Wongsorejo'
  const [periodes,    setPeriodes]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [statsLoading,  setStatsLoading]  = useState(true)
  const [statsError,    setStatsError]    = useState(null)
  const [lastDkhpNo,   setLastDkhpNo]   = useState(null)
  const [lastDkhpPerni,setLastDkhpPerni] = useState(null)
  const [lastKapling,  setLastKapling]  = useState(null)
  const [kaplingRows,  setKaplingRows]  = useState([])
  const [hideAmount,  setHideAmount]  = useState(() => {
    try { return localStorage.getItem('deskra_dashboard_hide_amount') === '1' } catch { return false }
  })
  const navigate = useNavigate()

  function toggleHideAmount() {
    setHideAmount(prev => {
      const next = !prev
      try { localStorage.setItem('deskra_dashboard_hide_amount', next ? '1' : '0') } catch {}
      return next
    })
  }

  const maskRupiah = v => hideAmount ? '••••••' : formatRupiah(v)

  useEffect(() => {
    if (!tpkId) return
    if (tpkId === tpk?.id) {
      setActiveTpkName('')
      return
    }
    supabase
      .from('tabel_tpk')
      .select('namatpk')
      .eq('id', tpkId)
      .maybeSingle()
      .then(({ data }) => setActiveTpkName(data?.namatpk || ''))
  }, [tpkId, tpk?.id])

  useEffect(() => {
    if (!tpkId) { setLoading(false); return }
    async function fetchPeriodes() {
      try {
        const { data, error } = await supabase
          .from('tabel_periode')
          .select('*')
          .eq('tpk_id', tpkId)
          .order('created_at', { ascending: false })
          .limit(5)
        if (error) throw error
        const list   = data || []
        const totals = await Promise.all(list.map(p => computeTotalUK(p.id, p.periode, { tpkId })))
        setPeriodes(list.map((p, i) => ({ ...p, total_uk: totals[i] })))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchPeriodes()
  }, [tpkId])

  useEffect(() => {
    if (!tpkId) { setStatsLoading(false); return }
    async function fetchStats() {
      try {
        const PAGE = 1000
        const all = []
        for (let from = 0; ; from += PAGE) {
          const { data } = await supabase
            .from('tabel_register_kapling')
            .select('no_kapling, sortimen, batang, volume, no_invois')
            .eq('tpk_id', tpkId)
            .order('no_kapling', { ascending: true })
            .range(from, from + PAGE - 1)
          if (!data || data.length === 0) break
          all.push(...data)
          if (data.length < PAGE) break
        }
        setKaplingRows(all)
        if (all.length > 0) {
          const sorted = [...all].sort((a, b) => {
            const an = parseInt(a.no_kapling) || 0
            const bn = parseInt(b.no_kapling) || 0
            return bn - an
          })
          setLastKapling(sorted[0].no_kapling)
        }

        const [dkhpNoRes, dkhpPerniRes] = await Promise.all([
          supabase
            .from('tabel_dkhp_skshhk')
            .select('no_dkhp, tanggal')
            .eq('tpk_id', tpkId)
            .not('no_dkhp', 'ilike', '%perni%'),
          supabase
            .from('tabel_dkhp_skshhk')
            .select('no_dkhp, tanggal')
            .eq('tpk_id', tpkId)
            .ilike('no_dkhp', '%perni%')
            .order('tanggal', { ascending: false })
            .order('id', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ])
        if (dkhpNoRes.data && dkhpNoRes.data.length > 0) {
          const maxRow = dkhpNoRes.data.reduce((best, row) => {
            const n = parseInt(row.no_dkhp) || 0
            const b = parseInt(best.no_dkhp) || 0
            return n > b ? row : best
          })
          setLastDkhpNo(maxRow)
        }
        if (dkhpPerniRes.data) setLastDkhpPerni(dkhpPerniRes.data)
      } catch (err) {
        setStatsError(err.message)
      } finally {
        setStatsLoading(false)
      }
    }
    fetchStats()
  }, [tpkId])

  const totalKapling = kaplingRows.length
  const totalBatang  = kaplingRows.reduce((s, r) => s + (r.batang || 0), 0)
  const totalVolume  = kaplingRows.reduce((s, r) => s + Number(r.volume || 0), 0)
  const sortBatang   = Object.fromEntries(SORTIMENS.map(m => [m, kaplingRows.filter(r => (r.sortimen || '').toUpperCase() === m).reduce((s, r) => s + (r.batang || 0), 0)]))
  const sortVolume   = Object.fromEntries(SORTIMENS.map(m => [m, kaplingRows.filter(r => (r.sortimen || '').toUpperCase() === m).reduce((s, r) => s + Number(r.volume || 0), 0)]))
  const unsoldRows        = kaplingRows.filter(r => !r.no_invois)
  const unsoldBatang      = unsoldRows.reduce((s, r) => s + (r.batang || 0), 0)
  const unsoldVolume      = unsoldRows.reduce((s, r) => s + Number(r.volume || 0), 0)
  const unsoldSortBatang  = Object.fromEntries(SORTIMENS.map(m => [m, unsoldRows.filter(r => (r.sortimen || '').toUpperCase() === m).reduce((s, r) => s + (r.batang || 0), 0)]))
  const unsoldSortVolume  = Object.fromEntries(SORTIMENS.map(m => [m, unsoldRows.filter(r => (r.sortimen || '').toUpperCase() === m).reduce((s, r) => s + Number(r.volume || 0), 0)]))

  const totalAll = periodes.reduce((sum, p) => sum + (p.total_uk || 0), 0)

  const h    = now.getHours() % 12 || 12
  const mm   = String(now.getMinutes()).padStart(2, '0')
  const ss   = String(now.getSeconds()).padStart(2, '0')
  const ampm = now.getHours() >= 12 ? 'PM' : 'AM'
  const hour = now.getHours()
  const greeting = hour >= 4 && hour < 10 ? 'selamat pagi'
    : hour >= 10 && hour < 15 ? 'selamat siang'
    : hour >= 15 && hour < 18 ? 'selamat sore'
    : 'selamat malam'

  if (!tpkId) return <TpkRequiredState />

  return (
    <div style={{ minHeight: '100%', background: '#0a0a0a', position: 'relative', overflow: 'hidden' }}>

      <style>{`
        @media (max-width: 480px) {
          .db-clock { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
          .db-clock .db-clock-date { margin-top: 0 !important; }
          .db-kapling-split { flex-direction: column; }
          .db-kapling-right { border-left: none !important; padding-left: 0 !important; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 12px; }
        }
      `}</style>

      {/* Dot grid */}
      <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <defs>
          <pattern id="db-dots" width="56" height="56" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.8" fill="white" opacity="0.08"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#db-dots)"/>
      </svg>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="relative z-10 ds-page mx-auto" style={{ width: '100%', maxWidth: 'min(96vw, 1440px)' }}>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-mono tracking-widest uppercase mb-2.5" style={{ color: '#00ff88' }}>
              — dashboard
            </p>
            <h1 className="text-2xl font-bold" style={{ color: '#f0f0f0', letterSpacing: '-0.02em' }}>
              {greeting}, {profile?.nama_operator || 'Operator'}
            </h1>
            <p className="text-sm mt-1 font-mono" style={{ color: '#4a4a4a' }}>
              {tpk?.kode_tpk ? `${tpk.kode_tpk} · ${namaTpk}` : namaTpk}
            </p>
          </div>

          {/* Clock */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 4,
            padding: '14px 18px',
          }} className="shrink-0 sm:text-right db-clock">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
              <p className="font-bold font-mono tabular-nums" style={{ color: '#00ff88', lineHeight: 1, fontSize: 26 }}>
                {h}:{mm}:{ss}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center', lineHeight: 1 }}>
                {['AM', 'PM'].map(label => {
                  const active = ampm === label
                  return (
                    <span key={label} style={{
                      minWidth: 22,
                      padding: '1px 2px',
                      borderRadius: 2,
                      textAlign: 'center',
                      fontFamily: 'monospace',
                      fontSize: 13,
                      fontWeight: active ? 800 : 600,
                      color: active ? '#00ff88' : 'rgba(255,255,255,0.22)',
                      background: 'transparent',
                    }}>
                      {label}
                    </span>
                  )
                })}
              </div>
            </div>
            <p className="font-mono db-clock-date" style={{ color: '#4a4a4a', marginTop: 7, fontSize: 12 }}>
              {now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* statistik */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <p className="text-xs font-mono tracking-widest uppercase" style={{ color: '#00ff88' }}>
              — statistik
            </p>
            <Link
              to="/register-kapling"
              className="text-xs font-mono transition-colors"
              style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#00ff88' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)' }}
            >
              lihat statistik lengkap →
            </Link>
          </div>
          {statsLoading ? (
            <TableSkeleton rows={3} columns={3} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, alignItems: 'stretch' }}>

              {/* DKHP */}
              <div
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease', cursor: 'default' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>DKHP TERAKHIR</p>
                    <p style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace', lineHeight: 1 }}>
                      {lastDkhpNo?.no_dkhp ?? <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>}
                    </p>
                  </div>
                  <div style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: 12 }}>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>PERNI TERAKHIR</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.75)', fontFamily: 'monospace', lineHeight: 1.3 }}>
                      {lastDkhpPerni?.no_dkhp ?? <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                    {lastDkhpNo?.tanggal
                      ? new Date(lastDkhpNo.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                      : ' '}
                  </p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', fontFamily: 'monospace', textTransform: 'uppercase', paddingLeft: 12, borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
                    {lastDkhpPerni?.tanggal
                      ? new Date(lastDkhpPerni.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                      : ' '}
                  </p>
                </div>
              </div>

              {/* Total Kapling */}
              <div
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 0, transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
              >
                <div className="db-kapling-split" style={{ display: 'flex', gap: 16 }}>
                  <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>TOTAL KAPLING</p>
                    <div>
                      <p style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace', lineHeight: 1 }}>{totalVolume.toFixed(3)} <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>m³</span></p>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', marginTop: 4 }}>{totalBatang.toLocaleString('id')} btg</p>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>KAPLING TERAKHIR</p>
                      {lastKapling && <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace', marginTop: 2 }}>{lastKapling}</p>}
                    </div>
                  </div>
                  <div className="db-kapling-right" style={{ flex: 1, borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
                    {SORTIMENS.map(m => (
                      <div key={m} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', minWidth: 24, paddingTop: 1 }}>{m}</span>
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.65)', fontFamily: 'monospace', lineHeight: 1 }}>{sortVolume[m].toFixed(3)} <span style={{ fontSize: 9, fontWeight: 400, color: 'rgba(255,255,255,0.25)' }}>m³</span></p>
                          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', marginTop: 2 }}>{sortBatang[m].toLocaleString('id')} btg</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sisa Persediaan */}
              <div
                style={{ background: 'rgba(255,170,0,0.04)', border: '1px solid rgba(255,170,0,0.15)', borderRadius: 4, padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,170,0,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,170,0,0.28)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'rgba(255,170,0,0.15)' }}
              >
                <div>
                  <p style={{ fontSize: 10, color: 'rgba(255,170,0,0.55)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>SISA PERSEDIAAN</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: '#ffaa00', fontFamily: 'monospace', lineHeight: 1 }}>{unsoldVolume.toFixed(3)} <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,170,0,0.45)' }}>m³</span></p>
                  <p style={{ fontSize: 10, color: 'rgba(255,170,0,0.45)', fontFamily: 'monospace', marginTop: 4 }}>{unsoldBatang.toLocaleString('id')} btg</p>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,170,0,0.12)', marginTop: 12, paddingTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {SORTIMENS.map(m => (
                    <div key={m}>
                      <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,170,0,0.4)', fontFamily: 'monospace', marginBottom: 4 }}>{m}</p>
                      <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,170,0,0.75)', fontFamily: 'monospace', lineHeight: 1 }}>{unsoldSortVolume[m].toFixed(3)} <span style={{ fontSize: 9, fontWeight: 400, color: 'rgba(255,170,0,0.35)' }}>m³</span></p>
                      <p style={{ fontSize: 10, color: 'rgba(255,170,0,0.45)', fontFamily: 'monospace', marginTop: 2 }}>{unsoldSortBatang[m].toLocaleString('id')} btg</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </section>

        {/* History Uang Kerja */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <p className="text-xs font-mono tracking-widest uppercase" style={{ color: '#00ff88' }}>
                — history uang kerja
              </p>
              <button
                onClick={toggleHideAmount}
                title={hideAmount ? 'Tampilkan nominal' : 'Sembunyikan nominal'}
                className="p-1 rounded transition-opacity"
                style={{ color: 'rgba(255,255,255,0.25)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.25)' }}
              >
                {hideAmount ? <EyeOff size={13}/> : <Eye size={13}/>}
              </button>
            </div>
            <div className="flex items-center gap-4">
              {periodes.length > 0 && (
                <span className="text-xs font-mono flex items-center gap-1.5" style={{ color: '#4a4a4a' }}>
                  <TrendingUp size={11}/>
                  {maskRupiah(totalAll)}
                </span>
              )}
              <Link
                to="/main-link"
                className="text-xs font-mono transition-colors"
                style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#00ff88' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)' }}
              >
                kelola periode →
              </Link>
            </div>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 4,
            overflow: 'hidden',
          }}>
            <div>
            {loading ? (
              <TableSkeleton rows={6} columns={4} />
            ) : error ? (
              <div className="p-6 flex items-center gap-3 text-sm font-mono" style={{ color: '#ff6b6b' }}>
                <AlertCircle size={15}/> {error}
              </div>
            ) : periodes.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.12)',
                  marginBottom: 16,
                }}>
                  <CalendarPlus size={22} style={{ color: 'rgba(0,255,136,0.5)' }} />
                </div>
                <p className="font-mono font-semibold" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginBottom: 6 }}>
                  Belum ada periode
                </p>
                <p className="font-mono" style={{ color: 'rgba(255,255,255,0.22)', fontSize: 12, marginBottom: 20, maxWidth: 320, margin: '0 auto 20px' }}>
                  Buat periode pertama untuk mulai mencatat uang kerja dan data operasional TPK.
                </p>
                <button
                  onClick={() => navigate('/main-link')}
                  className="inline-flex items-center gap-2 font-mono font-semibold transition-colors"
                  style={{
                    padding: '8px 16px', borderRadius: 3,
                    background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.22)',
                    color: '#00ff88', fontSize: 12, cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,255,136,0.18)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,255,136,0.1)' }}
                >
                  Buat Periode Pertama <ArrowRight size={13} />
                </button>
              </div>
            ) : isMobile ? (
              <div className="ds-card-list" style={{ padding: 10 }}>
                {periodes.map(p => (
                  <DataCard
                    key={p.id}
                    title={p.periode}
                    right={maskRupiah(p.total_uk)}
                    badge={
                      <span
                        className="inline-flex items-center px-2 py-0.5 text-xs font-mono"
                        style={{
                          borderRadius: 2, flexShrink: 0,
                          background: p.status === 'aktif' ? 'rgba(0,255,136,0.08)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${p.status === 'aktif' ? 'rgba(0,255,136,0.2)' : 'rgba(255,255,255,0.08)'}`,
                          color: p.status === 'aktif' ? '#00ff88' : '#4a4a4a',
                        }}
                      >
                        {p.status}
                      </span>
                    }
                    fields={[{
                      label: 'tanggal',
                      value: p.tgl_awal && p.tgl_akhir
                        ? `${new Date(p.tgl_awal).toLocaleDateString('id-ID')} – ${new Date(p.tgl_akhir).toLocaleDateString('id-ID')}`
                        : '—',
                    }]}
                  />
                ))}
              </div>
            ) : (
              <table className="w-full">
                <thead style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-mono tracking-widest" style={{ color: '#3a3a3a' }}>PERIODE</th>
                    <th className="hidden sm:table-cell text-left px-5 py-3 text-xs font-mono tracking-widest" style={{ color: '#3a3a3a' }}>TANGGAL</th>
                    <th className="text-right px-5 py-3 text-xs font-mono tracking-widest whitespace-nowrap" style={{ color: '#3a3a3a', width: '1%' }}>TOTAL UK</th>
                    <th className="text-center px-5 py-3 text-xs font-mono tracking-widest whitespace-nowrap" style={{ color: '#3a3a3a', width: '1%' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {periodes.map((p, i) => (
                    <tr
                      key={p.id}
                      style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none', transition: 'background 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <td className="px-5 py-3.5 font-mono font-medium text-sm align-middle" style={{ color: '#f0f0f0' }}>{p.periode}</td>
                      <td className="hidden sm:table-cell px-5 py-3.5 font-mono text-xs align-middle" style={{ color: '#4a4a4a' }}>
                        {p.tgl_awal && p.tgl_akhir
                          ? `${new Date(p.tgl_awal).toLocaleDateString('id-ID')} – ${new Date(p.tgl_akhir).toLocaleDateString('id-ID')}`
                          : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-semibold text-sm align-middle" style={{ color: '#00ff88' }}>
                        {maskRupiah(p.total_uk)}
                      </td>
                      <td className="inline-flex px-5 py-3.5 text-center align-middle">
                        <span
                          className="inline-flex items-center px-2 py-0.5 text-xs font-mono"
                          style={{
                            borderRadius: 2,
                            background: p.status === 'aktif' ? 'rgba(0,255,136,0.08)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${p.status === 'aktif' ? 'rgba(0,255,136,0.2)' : 'rgba(255,255,255,0.08)'}`,
                            color: p.status === 'aktif' ? '#00ff88' : '#4a4a4a',
                          }}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
