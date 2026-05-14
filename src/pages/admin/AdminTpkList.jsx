import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { computeTotalUK } from '../../lib/rekapPekerjaan'
import { Plus, CheckCircle2, XCircle, Search, ChevronRight } from 'lucide-react'

export default function AdminTpkList() {
  const navigate = useNavigate()
  const [tpkList, setTpkList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [
          { data: tpkData, error: tpkErr },
          { data: periodeData, error: periodeErr },
          { data: profileData, error: profileErr },
        ] = await Promise.all([
          supabase.from('tabel_tpk').select('*').order('namatpk'),
          supabase.from('tabel_periode').select('id, tpk_id, periode'),
          supabase.from('profiles').select('tpk_id').not('tpk_id', 'is', null),
        ])
        if (tpkErr) throw tpkErr
        if (periodeErr) throw periodeErr
        if (profileErr) throw profileErr

        const periodeList = periodeData || []
        const liveTotals = await Promise.all(
          periodeList.map(p => computeTotalUK(p.id, p.periode, { tpkId: p.tpk_id }))
        )

        const byTpk = periodeList.reduce((acc, p, i) => {
          if (!acc[p.tpk_id]) acc[p.tpk_id] = { count: 0, totalUk: 0 }
          acc[p.tpk_id].count++
          acc[p.tpk_id].totalUk += liveTotals[i] || 0
          return acc
        }, {})

        const operatorByTpk = (profileData || []).reduce((acc, p) => {
          acc[p.tpk_id] = (acc[p.tpk_id] || 0) + 1
          return acc
        }, {})

        setTpkList((tpkData || []).map(t => ({
          ...t,
          periodeCount: byTpk[t.id]?.count || 0,
          totalUk: byTpk[t.id]?.totalUk || 0,
          operatorCount: operatorByTpk[t.id] || 0,
        })))
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

  const filtered = tpkList.filter(t =>
    t.namatpk.toLowerCase().includes(search.toLowerCase()) ||
    (t.kode_tpk || '').includes(search)
  )

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Manajemen TPK</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Kelola semua TPK yang terdaftar di sistem.</p>
        </div>
        <button
          onClick={() => navigate('/admin/tpk/buat')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
        >
          <Plus size={15} /> Tambah TPK
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama atau kode TPK..."
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Memuat data...</div>
        ) : error ? (
          <div className="p-6 text-red-500 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            {search ? 'Tidak ada TPK yang cocok.' : 'Belum ada TPK terdaftar.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Lokasi TPK</th>
                <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Kode</th>
                <th className="text-center px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Operator</th>
                <th className="text-center px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Periode</th>
                <th className="text-right px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Total UK</th>
                <th className="text-center px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {filtered.map(t => (
                <tr
                  key={t.id}
                  onClick={() => navigate(`/admin/tpk/${t.id}`)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3.5 font-medium text-gray-800 dark:text-gray-100">{t.namatpk}</td>
                  <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 font-mono text-xs">{t.kode_tpk || '—'}</td>
                  <td className="px-5 py-3.5 text-center text-gray-500 dark:text-gray-400">{t.operatorCount}</td>
                  <td className="px-5 py-3.5 text-center text-gray-500 dark:text-gray-400">{t.periodeCount}</td>
                  <td className="px-5 py-3.5 text-right font-semibold text-primary-700 dark:text-primary-400">{fmt(t.totalUk)}</td>
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
                  <td className="px-5 py-3.5 text-right">
                    <ChevronRight size={15} className="text-gray-400 ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
