import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthProvider'
import { getEffectiveTpkId } from '../../lib/effectiveTpk'
import { logActivity, buildDiff } from '../../lib/activityLog'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import TpkRequiredState from '../../components/layout/TpkRequiredState'
import Toast from '../../components/ui/Toast'
import { TableSkeleton } from '../../components/ui/LoadingState'
import { Plus, Pencil, Trash2, X } from 'lucide-react'

const JABATAN_OPTIONS = [
  { label: 'Administratur Utama',       short: 'ADM'  },
  { label: 'Wakil Administratur Utama', short: 'WAKA' },
  { label: 'Bendahara Umum',            short: 'BU'   },
  { label: 'Kepala TPK',                short: 'KA'   },
  { label: 'Pelaksana TPK',             short: 'PLK'  },
  { label: 'TU TPK',                    short: 'TU'   },
  { label: 'Penerbit TPK',              short: 'PNB'  },
]

const emptyForm = { npk: '', nama: '', jabatan: '', aktif: true }

export default function DatabasePejabat() {
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
    const { data } = await supabase.from('tabel_pejabat').select('*').eq('tpk_id', tpkId).order('jabatan')
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
    if (!tpkId) return showToast('TPK aktif tidak ditemukan. Coba pilih TPK atau login ulang.', 'error')
    if (!form.nama || !form.jabatan) return showToast('Nama dan jabatan wajib diisi', 'error')
    if (editId) {
      const oldRow = data.find(r => r.id === editId)
      const { error } = await supabase.from('tabel_pejabat').update(form).eq('tpk_id', tpkId).eq('id', editId)
      if (error) return showToast(error.message, 'error')
      showToast('Data pejabat diperbarui')
      logActivity({
        action: 'update', entityType: 'pejabat', entityId: editId, entityLabel: form.nama,
        diff: oldRow ? buildDiff(oldRow, form, [
          { key: 'nama', label: 'Nama' }, { key: 'npk', label: 'NPK' },
          { key: 'jabatan', label: 'Jabatan' }, { key: 'aktif', label: 'Aktif' },
        ]) : null,
        tpkId, profile,
      })
    } else {
      const { error } = await supabase.from('tabel_pejabat').insert({ ...form, tpk_id: tpkId })
      if (error) return showToast(error.message, 'error')
      showToast('Pejabat berhasil ditambahkan')
      logActivity({ action: 'create', entityType: 'pejabat', entityLabel: form.nama, tpkId, profile })
    }
    setShowForm(false)
    fetchData()
  }

  async function handleDelete() {
    if (!tpkId) return showToast('TPK aktif tidak ditemukan. Coba pilih TPK atau login ulang.', 'error')
    if (!deleteRow) return
    const snapshot = { ...deleteRow }
    setDeleting(true)
    const { error } = await supabase.from('tabel_pejabat').delete().eq('tpk_id', tpkId).eq('id', deleteRow.id)
    setDeleting(false)
    if (error) return showToast(error.message, 'error')
    setDeleteRow(null)
    showToast('Data berhasil dihapus')
    logActivity({ action: 'delete', entityType: 'pejabat', entityId: snapshot.id, entityLabel: snapshot.nama, tpkId, profile })
    fetchData()
  }

  const INP = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f0', borderRadius: 3, outline: 'none', fontFamily: 'monospace', fontSize: 12, padding: '7px 10px', width: '100%', boxSizing: 'border-box' }

  if (!tpkId) return <TpkRequiredState />

  return (
    <div style={{ padding: 24, minHeight: '100%', background: '#0a0a0a', color: '#f0f0f0' }}>
      <style>{`
        .dp-row:hover td { background: rgba(255,255,255,0.02) !important; }
        .dp-inp:focus { border-color: rgba(0,255,136,0.5) !important; box-shadow: 0 0 0 2px rgba(0,255,136,0.07); }
        .dp-inp::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>

      <Toast toast={toast} />

      <ConfirmDialog
        open={!!deleteRow}
        title="Hapus Pejabat?"
        message="Data pejabat ini akan dihapus dari TPK aktif."
        detail={deleteRow?.nama}
        loading={deleting}
        onCancel={() => setDeleteRow(null)}
        onConfirm={handleDelete}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace' }}>Database Pejabat</h1>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3, fontFamily: 'monospace' }}>Kelola data nama, NPK & jabatan pejabat aktif</p>
        </div>
        <button onClick={openAdd}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#00ff88', color: '#0a0a0a', borderRadius: 3, border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, flexShrink: 0 }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        ><Plus size={13}/> tambah pejabat</button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 3, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#00ff88', fontWeight: 600 }}>{editId ? 'edit pejabat' : 'tambah pejabat baru'}</p>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', lineHeight: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = '#f0f0f0'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
            ><X size={15}/></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {[
              { label: 'NPK / No. Pegawai', key: 'npk',  placeholder: '3510180508720007' },
              { label: 'Nama Lengkap',       key: 'nama', placeholder: 'MISNOTO' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(0,255,136,0.7)', display: 'block', marginBottom: 4 }}>{label}</label>
                <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={INP} className="dp-inp" placeholder={placeholder}/>
              </div>
            ))}
          </div>
          <div>
            <label style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(0,255,136,0.7)', display: 'block', marginBottom: 6 }}>Jabatan</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {JABATAN_OPTIONS.map(({ label }) => {
                const active = form.jabatan === label
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, jabatan: active ? '' : label }))}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 3,
                      border: active ? '1px solid rgba(0,255,136,0.5)' : '1px solid rgba(255,255,255,0.1)',
                      background: active ? 'rgba(0,255,136,0.12)' : 'rgba(255,255,255,0.03)',
                      color: active ? '#00ff88' : 'rgba(255,255,255,0.45)',
                      fontFamily: 'monospace',
                      fontSize: 11,
                      fontWeight: active ? 700 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setForm(f => ({ ...f, aktif: !f.aktif }))}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 12,
              padding: '6px 10px',
              borderRadius: 3,
              border: `1px solid ${form.aktif ? 'rgba(0,255,136,0.25)' : 'rgba(255,255,255,0.08)'}`,
              background: form.aktif ? 'rgba(0,255,136,0.08)' : 'rgba(255,255,255,0.025)',
              color: form.aktif ? '#00ff88' : 'rgba(255,255,255,0.42)',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            <span style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: form.aktif ? '#00ff88' : 'rgba(255,255,255,0.1)',
              boxShadow: form.aktif ? '0 0 10px rgba(0,255,136,0.45)' : 'none',
            }}/>
            Aktif
          </button>
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
          <TableSkeleton rows={5} columns={6} />
        ) : data.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', fontSize: 11, fontStyle: 'italic' }}>Belum ada data pejabat.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' }}>
            <thead>
              <tr>
                {['No','NPK','Nama','Jabatan','Status',''].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={row.id} className="dp-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.25)', fontSize: 11, width: 40 }}>{i + 1}</td>
                  <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{row.npk || '—'}</td>
                  <td style={{ padding: '10px 12px', color: '#f0f0f0', fontWeight: 500 }}>{row.nama}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {row.jabatan ? (
                      <span
                        title={row.jabatan}
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 3,
                          fontSize: 10,
                          fontWeight: 600,
                          fontFamily: 'monospace',
                          background: 'rgba(0,255,136,0.06)',
                          border: '1px solid rgba(0,255,136,0.18)',
                          color: 'rgba(0,255,136,0.75)',
                          whiteSpace: 'nowrap',
                          cursor: 'default',
                        }}
                      >
                        {JABATAN_OPTIONS.find(j => j.label === row.jabatan)?.short ?? row.jabatan}
                      </span>
                    ) : <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}
                  </td>
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
