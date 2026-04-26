import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Pencil, Trash2, X, CheckCircle2, AlertCircle } from 'lucide-react'

const emptyForm = { kode_rek: '', uraian: '', satuan: '', tarif: '', aktif: true }

function formatRupiah(val) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(val || 0))
}

export default function DatabaseTarif() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase.from('tabel_tarif').select('*').order('uraian')
    setData(data || [])
    setLoading(false)
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function openAdd() { setForm(emptyForm); setEditId(null); setShowForm(true) }
  function openEdit(row) {
    setForm({ kode_rek: row.kode_rek || '', uraian: row.uraian, satuan: row.satuan || '', tarif: row.tarif, aktif: row.aktif })
    setEditId(row.id)
    setShowForm(true)
  }

  async function handleSubmit() {
    if (!form.uraian || !form.tarif) return showToast('Uraian dan tarif wajib diisi', 'error')
    const payload = { ...form, tarif: parseFloat(form.tarif) }
    if (editId) {
      const { error } = await supabase.from('tabel_tarif').update(payload).eq('id', editId)
      if (error) return showToast(error.message, 'error')
      showToast('Tarif berhasil diperbarui')
    } else {
      const { error } = await supabase.from('tabel_tarif').insert(payload)
      if (error) return showToast(error.message, 'error')
      showToast('Tarif berhasil ditambahkan')
    }
    setShowForm(false)
    fetchData()
  }

  async function handleDelete(id) {
    if (!confirm('Hapus data tarif ini?')) return
    const { error } = await supabase.from('tabel_tarif').delete().eq('id', id)
    if (error) return showToast(error.message, 'error')
    showToast('Tarif berhasil dihapus')
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
          <h1 className="text-2xl font-bold text-gray-800">Database Tarif</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola tarif pekerjaan — digunakan sebagai referensi di Main Link</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors">
          <Plus size={15} /> Tambah Tarif
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-primary-200 rounded-xl p-5 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-gray-700">{editId ? 'Edit Tarif' : 'Tambah Tarif Baru'}</p>
            <button onClick={() => setShowForm(false)}><X size={16} className="text-gray-400 hover:text-gray-600" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Uraian Pekerjaan</label>
              <input
                value={form.uraian}
                onChange={e => setForm(f => ({ ...f, uraian: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                placeholder="Contoh: PENOMORAN KAPLING"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Kode Rekening</label>
              <input
                value={form.kode_rek}
                onChange={e => setForm(f => ({ ...f, kode_rek: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                placeholder="Contoh: 51.69.43"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Satuan</label>
              <input
                value={form.satuan}
                onChange={e => setForm(f => ({ ...f, satuan: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                placeholder="Contoh: M3"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Tarif (Rp)</label>
              <input
                type="number"
                value={form.tarif}
                onChange={e => setForm(f => ({ ...f, tarif: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                placeholder="0"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <input type="checkbox" id="aktif-tarif" checked={form.aktif} onChange={e => setForm(f => ({ ...f, aktif: e.target.checked }))} className="accent-primary-600" />
            <label htmlFor="aktif-tarif" className="text-sm text-gray-600">Aktif (muncul sebagai referensi di Main Link)</label>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSubmit} className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700">
              {editId ? 'Perbarui' : 'Simpan'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200">Batal</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Memuat...</div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Belum ada data tarif.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['No','Uraian','Kode Rek','Satuan','Tarif','Status',''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((row, i) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5 text-gray-400 text-xs">{i + 1}</td>
                  <td className="px-5 py-3.5 font-medium text-gray-800">{row.uraian}</td>
                  <td className="px-5 py-3.5 text-gray-500 font-mono text-xs">{row.kode_rek || '—'}</td>
                  <td className="px-5 py-3.5 text-gray-500">{row.satuan || '—'}</td>
                  <td className="px-5 py-3.5 font-semibold text-primary-700">{formatRupiah(row.tarif)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${row.aktif ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {row.aktif ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(row)} className="text-gray-400 hover:text-primary-600 transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(row.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
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
