import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Pencil, Trash2, X, CheckCircle2, AlertCircle } from 'lucide-react'

const POSISI_OPTIONS = [
  { value: 'TENAGA_BANTU', label: 'Tenaga Bantu' },
  { value: 'TENAGA_KAPLING', label: 'Tenaga Kapling' },
  { value: 'KEBERSIHAN', label: 'Kebersihan' },
  { value: 'SLAGHAMMER', label: 'Slaghammer' },
  { value: 'BARCODE', label: 'Barcode' },
]

// Posisi disimpan sebagai comma-separated string di DB, dipakai sebagai array di UI.
function parsePosisi(v) {
  return (v || '').split(',').map(s => s.trim()).filter(Boolean)
}

const emptyForm = {
  nama: '',
  nik: '',
  alamat: '',
  posisi: [],
  aktif: true,
}

function posisiLabel(v) {
  return parsePosisi(v)
    .map(p => POSISI_OPTIONS.find(x => x.value === p)?.label || p)
    .join(', ') || '-'
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
      posisi: parsePosisi(row.posisi),
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

  function togglePosisi(value) {
    setForm(f => ({
      ...f,
      posisi: f.posisi.includes(value)
        ? f.posisi.filter(p => p !== value)
        : [...f.posisi, value],
    }))
  }

  async function handleSubmit() {
    if (!form.nama.trim()) return showToast('Nama wajib diisi', 'error')
    if (!form.posisi.length) return showToast('Posisi wajib dipilih minimal satu', 'error')

    const payload = {
      nama: toUpperTrim(form.nama),
      nik: toUpperTrim(normalizeNik(form.nik)),
      alamat: toUpperTrim(form.alamat),
      posisi: form.posisi.join(','),
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

  const INP = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f0', borderRadius: 3, outline: 'none', fontFamily: 'monospace', fontSize: 12, padding: '7px 10px', width: '100%', boxSizing: 'border-box' }

  const POSISI_COLORS = {
    TENAGA_BANTU:   { bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)',  color: '#60a5fa' },
    TENAGA_KAPLING: { bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)',  color: '#34d399' },
    KEBERSIHAN:     { bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.3)',  color: '#fb923c' },
    SLAGHAMMER:     { bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)', color: '#a78bfa' },
    BARCODE:        { bg: 'rgba(250,204,21,0.12)',  border: 'rgba(250,204,21,0.3)',  color: '#facc15' },
  }

  return (
    <div style={{ padding: 24, minHeight: '100%', background: '#0a0a0a', color: '#f0f0f0' }}>
      <style>{`
        .dtk-row:hover td { background: rgba(255,255,255,0.02) !important; }
        .dtk-inp:focus { border-color: rgba(0,255,136,0.5) !important; box-shadow: 0 0 0 2px rgba(0,255,136,0.07); }
        .dtk-inp::placeholder { color: rgba(255,255,255,0.2); }
        .dtk-cb { accent-color: #00ff88; }
        .dtk-pos-card:hover { transform: translateY(-1px); }
      `}</style>

      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 50, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 3, fontSize: 12, fontFamily: 'monospace', background: toast.type === 'error' ? 'rgba(255,107,107,0.12)' : 'rgba(0,255,136,0.10)', border: `1px solid ${toast.type === 'error' ? 'rgba(255,107,107,0.3)' : 'rgba(0,255,136,0.3)'}`, color: toast.type === 'error' ? '#ff6b6b' : '#00ff88' }}>
          {toast.type === 'error' ? <AlertCircle size={13}/> : <CheckCircle2 size={13}/>} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace' }}>Database Tenaga Kerja</h1>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3, fontFamily: 'monospace' }}>Kelola data tenaga bantu dan tenaga kapling</p>
        </div>
        <button onClick={openAdd}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#00ff88', color: '#0a0a0a', borderRadius: 3, border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, flexShrink: 0 }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        ><Plus size={13}/> tambah tenaga</button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 3, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#00ff88', fontWeight: 600 }}>{editId ? 'edit tenaga kerja' : 'tambah tenaga kerja baru'}</p>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', lineHeight: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = '#f0f0f0'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
            ><X size={15}/></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(0,255,136,0.7)', display: 'block', marginBottom: 4 }}>Nama</label>
              <input value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
                style={INP} className="dtk-inp" placeholder="MISNOTO"/>
            </div>
            <div>
              <label style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(0,255,136,0.7)', display: 'block', marginBottom: 4 }}>NIK / Nomor Induk Kependudukan</label>
              <input value={form.nik} onChange={e => setForm(f => ({ ...f, nik: e.target.value }))}
                style={INP} className="dtk-inp" placeholder="3510180508720007"/>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(0,255,136,0.7)', display: 'block', marginBottom: 4 }}>Alamat</label>
              <textarea value={form.alamat} onChange={e => setForm(f => ({ ...f, alamat: e.target.value }))}
                style={{ ...INP, resize: 'vertical', minHeight: 56 }} className="dtk-inp"
                rows={2} placeholder="Dusun Sumbermulyo, Wongsorejo, Banyuwangi"/>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(0,255,136,0.7)', display: 'block', marginBottom: 8 }}>
                Posisi <span style={{ color: 'rgba(255,255,255,0.25)' }}>(boleh pilih lebih dari satu)</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: 8 }}>
                {POSISI_OPTIONS.map(op => {
                  const active = form.posisi.includes(op.value)
                  const c = POSISI_COLORS[op.value] || { bg: 'rgba(0,255,136,0.1)', border: 'rgba(0,255,136,0.25)', color: '#00ff88' }
                  return (
                    <button
                      key={op.value}
                      type="button"
                      onClick={() => togglePosisi(op.value)}
                      className="dtk-pos-card"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        padding: '8px 10px',
                        borderRadius: 3,
                        border: `1px solid ${active ? c.border : 'rgba(255,255,255,0.08)'}`,
                        background: active ? c.bg : 'rgba(255,255,255,0.025)',
                        color: active ? c.color : 'rgba(255,255,255,0.48)',
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                        fontSize: 11,
                        fontWeight: active ? 700 : 500,
                        transition: 'transform 120ms ease, border-color 120ms ease, background 120ms ease, color 120ms ease',
                        textAlign: 'left',
                      }}
                      onMouseEnter={e => {
                        if (!active) {
                          e.currentTarget.style.borderColor = 'rgba(0,255,136,0.22)'
                          e.currentTarget.style.background = 'rgba(0,255,136,0.045)'
                          e.currentTarget.style.color = 'rgba(255,255,255,0.72)'
                        }
                      }}
                      onMouseLeave={e => {
                        if (!active) {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                          e.currentTarget.style.background = 'rgba(255,255,255,0.025)'
                          e.currentTarget.style.color = 'rgba(255,255,255,0.48)'
                        }
                      }}
                    >
                      <span>{op.label}</span>
                      <span style={{
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        border: `1px solid ${active ? c.color : 'rgba(255,255,255,0.18)'}`,
                        background: active ? c.color : 'rgba(255,255,255,0.025)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {active && <CheckCircle2 size={10} style={{ color: '#0a0a0a' }}/>}
                      </span>
                    </button>
                  )
                })}
              </div>
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
          <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', fontSize: 11 }}>Memuat...</div>
        ) : data.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', fontSize: 11, fontStyle: 'italic' }}>Belum ada data tenaga kerja.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' }}>
            <thead>
              <tr>
                {['No','Nama','NIK','Alamat','Posisi','Status',''].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={row.id} className="dtk-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.25)', fontSize: 11, width: 40 }}>{i + 1}</td>
                  <td style={{ padding: '10px 12px', color: '#f0f0f0', fontWeight: 500 }}>{row.nama}</td>
                  <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{row.nik || '—'}</td>
                  <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.4)', maxWidth: 200 }}>{row.alamat || '—'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {parsePosisi(row.posisi).map(p => {
                        const c = POSISI_COLORS[p] || { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' }
                        return (
                          <span key={p} style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 3, fontSize: 10, fontWeight: 600, background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
                            {POSISI_OPTIONS.find(x => x.value === p)?.label || p}
                          </span>
                        )
                      })}
                    </div>
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
                      <button onClick={() => handleDelete(row.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.2)', lineHeight: 0 }}
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
