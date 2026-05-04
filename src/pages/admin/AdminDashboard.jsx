import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Building2, CheckCircle2, XCircle, CalendarDays, ChevronRight } from 'lucide-react'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [tpkList, setTpkList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [{ data: tpkData, error: tpkErr }, { data: periodeData, error: periodeErr }] = await Promise.all([
          supabase.from('tabel_tpk').select('id, nama_tpk, kode_tpk, aktif, created_at').order('created_at'),
          supabase.from('tabel_periode').select('id, tpk_id, total_uk, status'),
        ])

        if (tpkErr) throw tpkErr
        if (periodeErr) throw periodeErr

        const periodeByTpk = (periodeData || []).reduce((acc, p) => {
          if (!acc[p.tpk_id]) acc[p.tpk_id] = { count: 0, totalUk: 0 }
          acc[p.tpk_id].count++
          acc[p.tpk_id].totalUk += p.total_uk || 0
          return acc
        }, {})

        const enriched = (tpkData || []).map(t => ({
          ...t,
          periodeCount: periodeByTpk[t.id]?.count || 0,
          totalUk: periodeByTpk[t.id]?.totalUk || 0,
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

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Dashboard Admin</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Ringkasan seluruh TPK yang terdaftar di sistem.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total TPK', value: loading ? '—' : stats?.total, icon: Building2, color: 'text-primary-600' },
          { label: 'TPK Aktif', value: loading ? '—' : stats?.aktif, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Total Periode', value: loading ? '—' : stats?.totalPeriode, icon: CalendarDays, color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900">
              <s.icon size={20} className={s.color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* TPK list */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Semua TPK</h2>
          <button
            onClick={() => navigate('/admin/tpk')}
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
          >
            Lihat semua <ChevronRight size={13} />
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Memuat data...</div>
          ) : error ? (
            <div className="p-6 text-red-500 text-sm">{error}</div>
          ) : tpkList.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Belum ada TPK terdaftar.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Nama TPK</th>
                  <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Kode</th>
                  <th className="text-center px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Periode</th>
                  <th className="text-right px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Total UK</th>
                  <th className="text-center px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {tpkList.map(t => (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/admin/tpk/${t.id}`)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5 font-medium text-gray-800 dark:text-gray-100">{t.nama_tpk}</td>
                    <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 font-mono text-xs">{t.kode_tpk || '—'}</td>
                    <td className="px-5 py-3.5 text-center text-gray-500 dark:text-gray-400">{t.periodeCount}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-primary-700 dark:text-primary-400">
                      {fmt(t.totalUk)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {t.aktif ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle2 size={10} /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                          <XCircle size={10} /> Nonaktif
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}
