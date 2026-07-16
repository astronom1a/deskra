import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { computeTotalUK } from '../../lib/rekapPekerjaan'
import { Building2, CheckCircle2, XCircle, CalendarDays, ChevronRight } from 'lucide-react'
import { gsap } from 'gsap'
import { TableSkeleton } from '../../components/ui/LoadingState'

// Angka acak cepat selama ~650 ms, lalu count-up smooth ke nilai asli.
// `delay` (detik) memungkinkan stagger antar card.
function ScrambleNumber({ value, delay = 0 }) {
  const [display, setDisplay] = useState('—')

  useEffect(() => {
    if (value == null) { setDisplay('—'); return }

    const SCRAMBLE_MS = 650  // durasi fase acak
    let tween = null

    const timer = setTimeout(() => {
      const obj      = { n: 0 }
      const startTime = Date.now()

      tween = gsap.to(obj, {
        n: value,
        duration: 1.1,
        ease: 'power2.out',
        onUpdate() {
          const elapsed = Date.now() - startTime
          if (elapsed < SCRAMBLE_MS) {
            // Fase scramble: angka acak dalam rentang ~4× nilai asli
            setDisplay(Math.floor(Math.random() * Math.max(value * 4, 20)))
          } else {
            // Fase settle: tampilkan progress count-up
            setDisplay(Math.round(obj.n))
          }
        },
        onComplete() { setDisplay(value) },
      })
    }, delay * 1000)

    return () => {
      clearTimeout(timer)
      tween?.kill()
    }
  }, [value, delay])

  return <>{display}</>
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [tpkList, setTpkList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [
          { data: tpkData, error: tpkErr },
          { data: periodeData, error: periodeErr },
          { data: profileData, error: profileErr },
        ] = await Promise.all([
          supabase.from('tabel_tpk').select('id, namatpk, kode_tpk, aktif, created_at').order('created_at'),
          supabase.from('tabel_periode').select('id, tpk_id, periode, status'),
          supabase.from('profiles').select('tpk_id').not('tpk_id', 'is', null),
        ])

        if (tpkErr) throw tpkErr
        if (periodeErr) throw periodeErr
        if (profileErr) throw profileErr

        const periodeList = periodeData || []
        const liveTotals = await Promise.all(
          periodeList.map(p => computeTotalUK(p.id, p.periode, { tpkId: p.tpk_id }))
        )

        const periodeByTpk = periodeList.reduce((acc, p, i) => {
          if (!acc[p.tpk_id]) acc[p.tpk_id] = { count: 0, totalUk: 0 }
          acc[p.tpk_id].count++
          acc[p.tpk_id].totalUk += liveTotals[i] || 0
          return acc
        }, {})

        const operatorByTpk = (profileData || []).reduce((acc, p) => {
          acc[p.tpk_id] = (acc[p.tpk_id] || 0) + 1
          return acc
        }, {})

        const enriched = (tpkData || []).map(t => ({
          ...t,
          periodeCount: periodeByTpk[t.id]?.count || 0,
          totalUk: periodeByTpk[t.id]?.totalUk || 0,
          operatorCount: operatorByTpk[t.id] || 0,
        })).sort((a, b) => b.totalUk - a.totalUk)

        setTpkList(enriched)
        setStats({
          total: enriched.length,
          aktif: enriched.filter(t => t.aktif).length,
          totalPeriode: (periodeData || []).length,
        })
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const fmt = v => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(Math.round(v || 0))

  const statCards = [
    { label: 'Total TPK', value: stats?.total, icon: Building2, color: '#00ff88', delay: 0 },
    { label: 'TPK Aktif', value: stats?.aktif, icon: CheckCircle2, color: '#34d399', delay: 0.12 },
    { label: 'Total Periode', value: stats?.totalPeriode, icon: CalendarDays, color: '#60a5fa', delay: 0.24 },
  ]

  return (
    <div className="ds-page" style={{ minHeight: '100%', background: '#0a0a0a', color: '#f0f0f0' }}>
      <div className="mx-auto" style={{ width: '100%', maxWidth: 'min(96vw, 1180px)' }}>
        <div className="mb-8">
          <p className="text-xs font-mono tracking-widest uppercase mb-2" style={{ color: '#00ff88' }}>— superadmin</p>
          <h1 className="text-2xl font-bold" style={{ color: '#f0f0f0' }}>Dashboard Admin</h1>
          <p className="text-sm mt-1 font-mono" style={{ color: 'rgba(255,255,255,0.32)' }}>Ringkasan seluruh TPK yang terdaftar di sistem.</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {statCards.map(s => (
            <div key={s.label} className="p-5 flex items-center gap-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
              <div style={{ width: 40, height: 40, borderRadius: 3, background: `${s.color}14`, border: `1px solid ${s.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <s.icon size={18} style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums font-mono" style={{ color: '#f0f0f0' }}>
                  {loading
                    ? <span className="inline-block w-6 h-6" style={{ borderRadius: 3, background: 'rgba(255,255,255,0.08)' }} />
                    : <ScrambleNumber value={s.value} delay={s.delay} />
                  }
                </p>
                <p className="text-xs font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* TPK list */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-mono tracking-widest uppercase" style={{ color: '#00ff88' }}>— semua tpk</h2>
            <button
              onClick={() => navigate('/admin/tpk')}
              className="flex items-center gap-1 font-mono"
              style={{ fontSize: 11, color: 'rgba(0,255,136,0.9)' }}
            >
              Lihat semua <ChevronRight size={13} />
            </button>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
            {loading ? (
              <TableSkeleton rows={5} columns={6} />
            ) : error ? (
              <div className="p-6 text-sm font-mono" style={{ color: '#ff6b6b' }}>{error}</div>
            ) : tpkList.length === 0 ? (
              <div className="p-8 text-center text-sm font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>Belum ada TPK terdaftar.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
              <table className="w-full text-sm" style={{ minWidth: 640 }}>
                <thead style={{ background: 'rgba(255,255,255,0.015)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <tr>
                    {['Lokasi TPK','Kode','Operator','Periode','Total UK','Status'].map((h, i) => (
                      <th key={h} className={`px-5 py-3 font-mono text-xs ${i >= 2 && i <= 3 ? 'text-center' : i === 4 ? 'text-right' : 'text-left'}`} style={{ color: 'rgba(255,255,255,0.35)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tpkList.map(t => (
                    <tr
                      key={t.id}
                      onClick={() => navigate(`/admin/tpk/${t.id}`)}
                      className="cursor-pointer transition-colors"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <td className="px-5 py-3.5 font-medium" style={{ color: '#f0f0f0' }}>{t.namatpk}</td>
                      <td className="px-5 py-3.5 font-mono text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{t.kode_tpk || '—'}</td>
                      <td className="px-5 py-3.5 text-center font-mono" style={{ color: 'rgba(255,255,255,0.45)' }}>{t.operatorCount}</td>
                      <td className="px-5 py-3.5 text-center font-mono" style={{ color: 'rgba(255,255,255,0.45)' }}>{t.periodeCount}</td>
                      <td className="px-5 py-3.5 text-right font-semibold font-mono" style={{ color: '#00ff88' }}>
                        {fmt(t.totalUk)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {t.aktif ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-medium" style={{ borderRadius: 3, background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.22)', color: '#00ff88' }}>
                            <CheckCircle2 size={10} /> Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-medium" style={{ borderRadius: 3, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)' }}>
                            <XCircle size={10} /> Nonaktif
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
