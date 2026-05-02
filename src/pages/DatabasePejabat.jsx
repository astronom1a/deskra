import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Pencil, Trash2, X, CheckCircle2, AlertCircle } from 'lucide-react'

const emptyForm = { npk: '', nama: '', jabatan: '', aktif: true }

export default function DatabasePejabat() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase.from('tabel_pejabat').select('*').order('jabatan')
    setData(data || [])
    setLoading(false)
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function openAdd() { setForm(emptyForm); setEditId(null); setShowForm(true) }
  function openEdit(row) {
    setForm({ npk: row.npk || '', nama: row.nama, jabatan: row.jabatan, aktif: row.aktif })
    setEditId(row.id)
    setShowForm(true)
  }

  async function handleSubmit() {
    if (!form.nama || !form.jabatan) return showToast('Nama dan jabatan wajib diisi', 'error')
    if (editId) {
      const { error } = await supabase.from('tabel_pejabat').update(form).eq('id', editId)
      if (error) return showToast(error.message, 'error')
      showToast('Data pejabat diperbarui')
    } else {
      const { error } = await supabase.from('tabel_pejabat').insert(form)
      if (error) return showToast(error.message, 'error')
      showToast('Pejabat berhasil ditambahkan')
    }
    setShowForm(false)
    fetchData()
  }

  async function handleDelete(id) {
    if (!confirm('Hapus data pejabat ini?')) return
    const { error } = await supabase.from('tabel_pejabat').delete().eq('id', id)
    if (error) return showToast(error.message, 'error')
    showToast('Data berhasil dihapus')
    fetchData()
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-primary-600'}`}>
          {toast.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Database Pejabat</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Kelola data nama, NPK & jabatan pejabat aktif</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors">
          <Plus size={15} /> Tambah Pejabat
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 border border-primary-200 rounded-xl p-5 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-gray-700 dark:text-gray-200">{editId ? 'Edit Pejabat' : 'Tambah Pejabat Baru'}</p>
            <button onClick={() => setShowForm(false)}><X size={16} className="text-gray-400 dark:text-gray-500 hover:text-gray-600" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">NPK / No. Pegawai</label>
              <input
                value={form.npk}
                onChange={e => setForm(f => ({ ...f, npk: e.target.value }))}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                placeholder="Contoh: 3510180508720007"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Nama Lengkap</label>
              <input
                value={form.nama}
                onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                placeholder="Contoh: MISNOTO"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Jabatan</label>
              <input
                value={form.jabatan}
                onChange={e => setForm(f => ({ ...f, jabatan: e.target.value }))}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                placeholder="Contoh: KEPALA TPK WONGSOREJO"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <input type="checkbox" id="aktif" checked={form.aktif}
              onChange={e => setForm(f => ({ ...f, aktif: e.target.checked }))}
              className="accent-primary-600" />
            <label htmlFor="aktif" className="text-sm text-gray-600 dark:text-gray-300">Aktif</label>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSubmit} className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700">
              {editId ? 'Perbarui' : 'Simpan'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">Batal</button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">Memuat...</div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">Belum ada data pejabat.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
              <tr>
                {['No', 'NPK', 'Nama', 'Jabatan', 'Status', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((row, i) => (
                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-5 py-3.5 text-gray-400 dark:text-gray-500 text-xs">{i + 1}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-gray-500 dark:text-gray-400">{row.npk || '—'}</td>
                  <td className="px-5 py-3.5 font-medium text-gray-800 dark:text-gray-100">{row.nama}</td>
                  <td className="px-5 py-3.5 text-gray-600 dark:text-gray-300">{row.jabatan}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${row.aktif ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                      {row.aktif ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(row)} className="text-gray-400 dark:text-gray-500 hover:text-primary-600 transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(row.id)} className="text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </div>
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
