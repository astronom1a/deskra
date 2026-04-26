import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { computeTotalUK } from '../lib/rekapPekerjaan'
import { Link2, Users, Layers, Package, Clock, TrendingUp, AlertCircle } from 'lucide-react'

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

export default function Dashboard() {
  const navigate = useNavigate()
  const [periodes, setPeriodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Selamat datang di Deskra — sistem administrasi uang kerja TPK Wongsorejo
        </p>
      </div>

      {/* Shortcuts */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Akses Cepat
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {shortcuts.map(s => (
            <button
              key={s.path}
              onClick={() => navigate(s.path)}
              className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:shadow-md hover:border-primary-300 transition-all text-left group"
            >
              <div className={`${s.color} p-2.5 rounded-lg shrink-0 group-hover:scale-105 transition-transform`}>
                <s.icon size={18} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{s.label}</p>
                <p className="text-gray-400 text-xs mt-0.5 leading-snug">{s.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Recent Periodes */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Riwayat Total Uang Kerja
          </h2>
          {periodes.length > 0 && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <TrendingUp size={12} />
              Total kumulatif: {formatRupiah(totalAll)}
            </span>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              Memuat data...
            </div>
          ) : error ? (
            <div className="p-6 flex items-center gap-3 text-red-500 text-sm">
              <AlertCircle size={16} />
              <span>Gagal memuat data: {error}</span>
            </div>
          ) : periodes.length === 0 ? (
            <div className="p-8 text-center">
              <Clock size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Belum ada data periode tersimpan.</p>
              <p className="text-gray-300 text-xs mt-1">
                Tambahkan periode pertama di halaman Main Link.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Periode</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Tanggal</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">Total UK</th>
                  <th className="text-center px-5 py-3 text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {periodes.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-700">{p.periode}</td>
                    <td className="px-5 py-3.5 text-gray-500">
                      {p.tgl_awal && p.tgl_akhir
                        ? `${new Date(p.tgl_awal).toLocaleDateString('id-ID')} – ${new Date(p.tgl_akhir).toLocaleDateString('id-ID')}`
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-primary-700">
                      {formatRupiah(p.total_uk)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        p.status === 'aktif'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
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
