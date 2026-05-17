import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthProvider'
import { getEffectiveTpkId } from '../lib/effectiveTpk'
import ConfirmDialog from '../components/ConfirmDialog'
import TpkRequiredState from '../components/TpkRequiredState'
import Toast from '../components/Toast'
import { TableSkeleton } from '../components/LoadingState'
import { Plus, Pencil, Trash2, X } from 'lucide-react'

const emptyForm = { kode_rek: '', uraian: '', satuan: '', tarif: '', aktif: true }

function formatRupiah(val) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(val || 0))
}

export default function DatabaseTarif() {
  const { profile, activeTpkId } = useAuth()
  const tpkId = getEffectiveTpkId({ activeTpkId, profile })
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState(null)
  const [deleteRow, setDeleteRow] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (tpkId) fetchData()
    else {
      setData([])
      setLoading(false)
    }
  }, [tpkId])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase.from('tabel_tarif').select('*').eq('tpk_id', tpkId).order('uraian')
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
    if (!tpkId) return showToast('TPK aktif tidak ditemukan. Coba pilih TPK atau login ulang.', 'error')
    if (!form.uraian || !form.tarif) return showToast('Uraian dan tarif wajib diisi', 'error')
    const payload = { ...form, tarif: parseFloat(form.tarif) }
    if (editId) {
      const { error } = await supabase.from('tabel_tarif').update(payload).eq('tpk_id', tpkId).eq('id', editId)
      if (error) return showToast(error.message, 'error')
      showToast('Tarif berhasil diperbarui')
    } else {
      const { error } = await supabase.from('tabel_tarif').insert({ ...payload, tpk_id: tpkId })
      if (error) return showToast(error.message, 'error')
      showToast('Tarif berhasil ditambahkan')
    }
    setShowForm(false)
    fetchData()
  }

  async function handleDelete() {
    if (!tpkId) return showToast('TPK aktif tidak ditemukan. Coba pilih TPK atau login ulang.', 'error')
    if (!deleteRow) return
    setDeleting(true)
    const { error } = await supabase.from('tabel_tarif').delete().eq('tpk_id', tpkId).eq('id', deleteRow.id)
    setDeleting(false)
    if (error) return showToast(error.message, 'error')
    setDeleteRow(null)
    showToast('Tarif berhasil dihapus')
    fetchData()
  }

  const INP = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f0', borderRadius: 3, outline: 'none', fontFamily: 'monospace', fontSize: 12, padding: '7px 10px', width: '100%', boxSizing: 'border-box' }

  if (!tpkId) return <TpkRequiredState />

  return (
    <div style={{ padding: 24, minHeight: '100%', background: '#0a0a0a', color: '#f0f0f0' }}>
      <style>{`
        .dt-row:hover td { background: rgba(255,255,255,0.02) !important; }
        .dt-inp:focus { border-color: rgba(0,255,136,0.5) !important; box-shadow: 0 0 0 2px rgba(0,255,136,0.07); }
        .dt-inp::placeholder { color: rgba(255,255,255,0.2); }
        .dt-inp option { background: #1a1a1a; color: #f0f0f0; }
        .dt-inp[type=number] { -moz-appearance: textfield; }
        .dt-inp[type=number]::-webkit-inner-spin-button, .dt-inp[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .dt-cb { accent-color: #00ff88; }
      `}</style>

      <Toast toast={toast} />

      <ConfirmDialog
        open={!!deleteRow}
        title="Hapus Tarif?"
        message="Data tarif ini akan dihapus dari TPK aktif."
        detail={deleteRow?.uraian}
        loading={deleting}
        onCancel={() => setDeleteRow(null)}
        onConfirm={handleDelete}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace' }}>Database Tarif</h1>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3, fontFamily: 'monospace' }}>Kelola tarif pekerjaan — digunakan sebagai referensi di Main Link</p>
        </div>
        <button onClick={openAdd}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#00ff88', color: '#0a0a0a', borderRadius: 3, border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, flexShrink: 0 }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        ><Plus size={13}/> tambah tarif</button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 3, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#00ff88', fontWeight: 600 }}>{editId ? 'edit tarif' : 'tambah tarif baru'}</p>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', lineHeight: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = '#f0f0f0'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
            ><X size={15}/></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Uraian Pekerjaan', key: 'uraian', placeholder: 'PENOMORAN KAPLING' },
              { label: 'Kode Rekening',    key: 'kode_rek', placeholder: '51.69.43' },
              { label: 'Satuan',           key: 'satuan', placeholder: 'M3' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(0,255,136,0.7)', display: 'block', marginBottom: 4 }}>{label}</label>
                <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={INP} className="dt-inp" placeholder={placeholder}/>
              </div>
            ))}
            <div>
              <label style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(0,255,136,0.7)', display: 'block', marginBottom: 4 }}>Tarif (Rp)</label>
              <input type="number" value={form.tarif} onChange={e => setForm(f => ({ ...f, tarif: e.target.value }))}
                style={INP} className="dt-inp" placeholder="0"/>
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.aktif} onChange={e => setForm(f => ({ ...f, aktif: e.target.checked }))} className="dt-cb"/>
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Aktif (muncul sebagai referensi di Main Link)</span>
          </label>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={handleSubmit} style={{ padding: '7px 16px', background: '#00ff88', color: '#0a0a0a', borderRadius: 3, border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>
              {editId ? 'perbarui' : 'simpan'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, color: 'rgba(255,255,255,0.65)', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }}>batal</button>
          </div>
        </div>
      )}

      {/* Tabel */}
      <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        {loading ? (
          <TableSkeleton rows={5} columns={7} />
        ) : data.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', fontSize: 11, fontStyle: 'italic' }}>Belum ada data tarif.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' }}>
            <thead>
              <tr>
                {['No','Uraian','Kode Rek','Satuan','Tarif','Status',''].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={row.id} className="dt-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.25)', fontSize: 11, width: 40 }}>{i + 1}</td>
                  <td style={{ padding: '10px 12px', color: '#f0f0f0', fontWeight: 500 }}>{row.uraian}</td>
                  <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{row.kode_rek || '—'}</td>
                  <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.4)' }}>{row.satuan || '—'}</td>
                  <td style={{ padding: '10px 12px', color: '#00ff88', fontWeight: 600 }}>{formatRupiah(row.tarif)}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 3, fontSize: 10, fontWeight: 600, background: row.aktif ? 'rgba(0,255,136,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${row.aktif ? 'rgba(0,255,136,0.25)' : 'rgba(255,255,255,0.08)'}`, color: row.aktif ? '#00ff88' : 'rgba(255,255,255,0.3)' }}>
                      {row.aktif ? 'aktif' : 'nonaktif'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 10px', width: 60 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                      <button onClick={() => openEdit(row)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.2)', lineHeight: 0 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#00ff88'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
                      ><Pencil size={13}/></button>
                      <button onClick={() => setDeleteRow(row)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.2)', lineHeight: 0 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ff6b6b'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
                      ><Trash2 size={13}/></button>
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
