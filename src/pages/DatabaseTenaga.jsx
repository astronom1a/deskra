import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Pencil, Trash2, X, CheckCircle2, AlertCircle } from 'lucide-react'

const POSISI_OPTIONS = [
  { value: 'TENAGA_BANTU', label: 'Tenaga Bantu' },
  { value: 'TENAGA_KAPLING', label: 'Tenaga Kapling' },
]

const emptyForm = {
  nama: '',
  nik: '',
  alamat: '',
  posisi: 'TENAGA_BANTU',
  aktif: true,
}

function posisiLabel(v) {
  return POSISI_OPTIONS.find(x => x.value === v)?.label || v || '-'
}

export default function DatabaseTenaga() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('tabel_tenaga_kerja')
      .select('*')
      .order('posisi', { ascending: true })
      .order('nama', { ascending: true })
    setData(data || [])
    setLoading(false)
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function openAdd() {
    setForm(emptyForm)
    setEditId(null)
    setShowForm(true)
  }

  function openEdit(row) {
    setForm({
      nama: row.nama || '',
      nik: row.nik || '',
      alamat: row.alamat || '',
      posisi: row.posisi || 'TENAGA_BANTU',
      aktif: row.aktif ?? true,
    })
    setEditId(row.id)
    setShowForm(true)
  }

  function normalizeNik(v) {
    return (v || '').trim()
  }
  function toUpperTrim(v) {
    return (v || '').trim().toUpperCase()
  }

  async function handleSubmit() {
    if (!form.nama.trim()) return showToast('Nama wajib diisi', 'error')
    if (!form.posisi) return showToast('Posisi wajib dipilih', 'error')

    const payload = {
      nama: toUpperTrim(form.nama),
      nik: toUpperTrim(normalizeNik(form.nik)),
      alamat: toUpperTrim(form.alamat),
      posisi: form.posisi,
      aktif: !!form.aktif,
    }

    if (editId) {
      const { error } = await supabase.from('tabel_tenaga_kerja').update(payload).eq('id', editId)
      if (error) return showToast(error.message, 'error')
      showToast('Data tenaga diperbarui')
    } else {
      const { error } = await supabase.from('tabel_tenaga_kerja').insert(payload)
      if (error) return showToast(error.message, 'error')
      showToast('Tenaga kerja berhasil ditambahkan')
    }

    setShowForm(false)
    fetchData()
  }

  async function handleDelete(id) {
    if (!confirm('Hapus data tenaga kerja ini?')) return
    const { error } = await supabase.from('tabel_tenaga_kerja').delete().eq('id', id)
    if (error) return showToast(error.message, 'error')
    showToast('Data berhasil dihapus')
    fetchData()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-primary-600'}`}>
          {toast.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Database Tenaga Kerja</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola data tenaga bantu dan tenaga kapling</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors">
          <Plus size={15} /> Tambah Tenaga
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-primary-200 rounded-xl p-5 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-gray-700">{editId ? 'Edit Tenaga Kerja' : 'Tambah Tenaga Kerja Baru'}</p>
            <button onClick={() => setShowForm(false)}><X size={16} className="text-gray-400 hover:text-gray-600" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Nama</label>
              <input
                value={form.nama}
                onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                placeholder="Contoh: MISNOTO"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">NIK / Nomor Induk Kependudukan</label>
              <input
                value={form.nik}
                onChange={e => setForm(f => ({ ...f, nik: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                placeholder="Contoh: 3510180508720007"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Alamat</label>
              <textarea
                value={form.alamat}
                onChange={e => setForm(f => ({ ...f, alamat: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                rows={2}
                placeholder="Contoh: Dusun Sumbermulyo, Wongsorejo, Banyuwangi"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Posisi</label>
              <select
                value={form.posisi}
                onChange={e => setForm(f => ({ ...f, posisi: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
              >
                {POSISI_OPTIONS.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <input type="checkbox" id="aktif-tenaga" checked={form.aktif}
              onChange={e => setForm(f => ({ ...f, aktif: e.target.checked }))}
              className="accent-primary-600" />
            <label htmlFor="aktif-tenaga" className="text-sm text-gray-600">Aktif</label>
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
          <div className="p-8 text-center text-gray-400 text-sm">Belum ada data tenaga kerja.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['No', 'Nama', 'NIK', 'Alamat', 'Posisi', 'Status', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((row, i) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5 text-gray-400 text-xs">{i + 1}</td>
                  <td className="px-5 py-3.5 font-medium text-gray-800">{row.nama}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{row.nik || '-'}</td>
                  <td className="px-5 py-3.5 text-gray-600">{row.alamat || '-'}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {posisiLabel(row.posisi)}
                    </span>
                  </td>
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
