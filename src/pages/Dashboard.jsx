import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { computeTotalUK } from '../lib/rekapPekerjaan'
import { Link2, Users, Layers, Package, Clock, TrendingUp, AlertCircle, Eye, EyeOff, FileText, BookOpen } from 'lucide-react'

const shortcuts = [
  {
    label: 'Main Link',
    desc: 'Rekap uang kerja otomatis per periode',
    icon: Link2,
    path: '/main-link',
    color: 'bg-primary-600',
  },
  {
    label: 'Tumpuk Kapling',
    desc: 'Input volume per jenis & sortimen kapling',
    icon: Layers,
    path: '/tumpuk-kapling',
    color: 'bg-emerald-600',
  },
  {
    label: 'Detail Pekerjaan',
    desc: 'Tanda Laku, Barcode, Tenaga Bantu, dan lainnya',
    icon: Package,
    path: '/detail-pekerjaan',
    color: 'bg-blue-600',
  },
  {
    label: 'DKHP SKSHHK',
    desc: 'Arsip dokumen DKHP SKSHHK',
    icon: FileText,
    path: '/dkhp-skshhk',
    color: 'bg-rose-600',
  },
  {
    label: 'Register Kapling',
    desc: 'Kelola register kapling',
    icon: BookOpen,
    path: '/register-kapling',
    color: 'bg-indigo-600',
  },
  {
    label: 'Database Pejabat',
    desc: 'Kelola data nama & jabatan pejabat',
    icon: Users,
    path: '/database/pejabat',
    color: 'bg-amber-500',
  },
]

function formatRupiah(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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
  const navigate = useNavigate()
  const now = useDateTime()
  const [periodes, setPeriodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hideAmount, setHideAmount] = useState(() => {
    try { return localStorage.getItem('deskra_dashboard_hide_amount') === '1' }
    catch { return false }
  })

  function toggleHideAmount() {
    setHideAmount(prev => {
      const next = !prev
      try { localStorage.setItem('deskra_dashboard_hide_amount', next ? '1' : '0') } catch {}
      return next
    })
  }

  const maskRupiah = v => hideAmount ? 'Rp ••••••••' : formatRupiah(v)

  useEffect(() => {
    async function fetchPeriodes() {
      try {
        const { data, error } = await supabase
          .from('tabel_periode')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5)
        if (error) throw error
        const list = data || []
        // Hitung total UK live dari sumber tunggal (sama dengan Main Link)
        const totals = await Promise.all(
          list.map(p => computeTotalUK(p.id, p.periode))
        )
        setPeriodes(list.map((p, i) => ({ ...p, total_uk: totals[i] })))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchPeriodes()
  }, [])

  const totalAll = periodes.reduce((sum, p) => sum + (p.total_uk || 0), 0)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Selamat datang di Deskra — Sistem Administrasi Kantor TPK Wongsorejo
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-3.5 text-right shrink-0">
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 tabular-nums">
            {(() => {
              const h = now.getHours() % 12 || 12
              const m = String(now.getMinutes()).padStart(2, '0')
              const s = String(now.getSeconds()).padStart(2, '0')
              const ampm = now.getHours() >= 12 ? 'PM' : 'AM'
              return `${h}:${m}:${s} ${ampm}`
            })()}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Shortcuts */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Quick Access
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {shortcuts.map(s => (
            <button
              key={s.path}
              onClick={() => navigate(s.path)}
              className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-primary-300 transition-all text-left group"
            >
              <div className={`${s.color} p-2.5 rounded-lg shrink-0 group-hover:scale-105 transition-transform`}>
                <s.icon size={18} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{s.label}</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5 leading-snug">{s.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Recent Periodes */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              History Uang Kerja
            </h2>
            <button
              onClick={toggleHideAmount}
              title={hideAmount ? 'Tampilkan nominal' : 'Sembunyikan nominal'}
              className="p-1 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {hideAmount ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {periodes.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <TrendingUp size={12} />
              Total kumulatif: {maskRupiah(totalAll)}
            </span>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">
              Memuat data...
            </div>
          ) : error ? (
            <div className="p-6 flex items-center gap-3 text-red-500 text-sm">
              <AlertCircle size={16} />
              <span>Gagal memuat data: {error}</span>
            </div>
          ) : periodes.length === 0 ? (
            <div className="p-8 text-center">
              <Clock size={32} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400 dark:text-gray-500 text-sm">Belum ada data periode tersimpan.</p>
              <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">
                Tambahkan periode pertama di halaman Main Link.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Periode</th>
                  <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Tanggal</th>
                  <th className="text-right px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Total UK</th>
                  <th className="text-center px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {periodes.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-700 dark:text-gray-200">{p.periode}</td>
                    <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400">
                      {p.tgl_awal && p.tgl_akhir
                        ? `${new Date(p.tgl_awal).toLocaleDateString('id-ID')} – ${new Date(p.tgl_akhir).toLocaleDateString('id-ID')}`
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-primary-700">
                      {maskRupiah(p.total_uk)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        p.status === 'aktif'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                      }`}>
                        {p.status}
                      </span>
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
