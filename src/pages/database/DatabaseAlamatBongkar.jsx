import { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthProvider'
import { getEffectiveTpkId } from '../../lib/effectiveTpk'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import TpkRequiredState from '../../components/layout/TpkRequiredState'
import Toast from '../../components/ui/Toast'
import { TableSkeleton } from '../../components/ui/LoadingState'
import { Plus, Pencil, Trash2, Upload, X } from 'lucide-react'

const emptyForm = { label: '', end_user: '', alamat_lengkap: '', kota: '' }

export default function DatabaseAlamatBongkar() {
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
  const [importPreview, setImportPreview] = useState(null) // { rows, fileName }
  const [importing, setImporting] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    if (tpkId) fetchData()
    else {
      setData([])
      setLoading(false)
    }
  }, [tpkId])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('tabel_alamat_bongkar')
      .select('*')
      .eq('tpk_id', tpkId)
      .order('label')
    setData(data || [])
    setLoading(false)
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function openAdd() { setForm(emptyForm); setEditId(null); setShowForm(true) }
  function openEdit(row) {
    setForm({ label: row.label, end_user: row.end_user || '', alamat_lengkap: row.alamat_lengkap || '', kota: row.kota || '' })
    setEditId(row.id)
    setShowForm(true)
  }

  async function handleSubmit() {
    if (!tpkId) return showToast('TPK aktif tidak ditemukan.', 'error')
    if (!form.label.trim()) return showToast('Label wajib diisi', 'error')
    if (editId) {
      const { error } = await supabase
        .from('tabel_alamat_bongkar')
        .update(form)
        .eq('tpk_id', tpkId)
        .eq('id', editId)
      if (error) return showToast(error.message, 'error')
      showToast('Data alamat diperbarui')
    } else {
      const { error } = await supabase
        .from('tabel_alamat_bongkar')
        .insert({ ...form, tpk_id: tpkId })
      if (error) return showToast(error.message, 'error')
      showToast('Alamat berhasil ditambahkan')
    }
    setShowForm(false)
    fetchData()
  }

  async function handleDelete() {
    if (!tpkId || !deleteRow) return
    setDeleting(true)
    const { error } = await supabase
      .from('tabel_alamat_bongkar')
      .delete()
      .eq('tpk_id', tpkId)
      .eq('id', deleteRow.id)
    setDeleting(false)
    if (error) return showToast(error.message, 'error')
    setDeleteRow(null)
    showToast('Data berhasil dihapus')
    fetchData()
  }

  // Parse satu baris teks: "NAMA. alamat, ..., KOTA" → { label, end_user, alamat_lengkap, kota }
  function parseAlamatLine(raw) {
    const str = String(raw ?? '').trim()
    if (!str || /^alamat$/i.test(str)) return null

    // label = sebelum titik pertama (harus ada huruf, tidak boleh mengandung koma)
    const dotIdx = str.indexOf('.')
    if (dotIdx === -1) return null
    const label = str.slice(0, dotIdx).trim()
    if (!label || label.includes(',') || !/[A-Za-z]/.test(label)) return null

    // kota = setelah koma paling kanan
    const lastComma = str.lastIndexOf(',')
    const kota = lastComma !== -1 ? str.slice(lastComma + 1).trim() : ''

    // alamat_lengkap = antara titik pertama dan koma paling kanan
    const alamat_lengkap = lastComma > dotIdx
      ? str.slice(dotIdx + 1, lastComma).trim()
      : str.slice(dotIdx + 1).trim()

    // end_user: PT/CV/UD → pakai label apa adanya; selainnya → "END USER [kota]"
    const isBadan = /^(PT|CV|UD)\b/i.test(label)
    const end_user = isBadan ? label : `END USER ${kota}`

    return { label, end_user, alamat_lengkap, kota }
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = evt => {
      const wb   = XLSX.read(evt.target.result, { type: 'binary' })
      const rows = []
      for (const sheetName of wb.SheetNames) {
        const ws  = wb.Sheets[sheetName]
        // Baca sebagai array 2D — format asli: tiap baris punya 1 kolom berisi string penuh
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        for (const row of raw) {
          for (const cell of row) {
            const parsed = parseAlamatLine(cell)
            if (parsed) rows.push(parsed)
          }
        }
      }
      if (!rows.length) {
        showToast('Tidak ada data valid di file.', 'error')
        return
      }
      setImportPreview({ rows, fileName: file.name })
    }
    reader.readAsBinaryString(file)
  }

  async function handleImport() {
    if (!importPreview || !tpkId) return
    setImporting(true)
    const payload = importPreview.rows.map(r => ({ ...r, tpk_id: tpkId }))
    const { error } = await supabase.from('tabel_alamat_bongkar').insert(payload)
    setImporting(false)
    if (error) { showToast(error.message, 'error'); return }
    showToast(`${payload.length} alamat berhasil diimpor`)
    setImportPreview(null)
    fetchData()
  }

  const INP = {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#f0f0f0', borderRadius: 3, outline: 'none', fontFamily: 'monospace',
    fontSize: 12, padding: '7px 10px', width: '100%', boxSizing: 'border-box',
  }

  if (!tpkId) return <TpkRequiredState />

  return (
    <div style={{ padding: 24, minHeight: '100%', background: '#0a0a0a', color: '#f0f0f0' }}>
      <style>{`
        .dab-row:hover td { background: rgba(255,255,255,0.02) !important; }
        .dab-inp:focus { border-color: rgba(0,255,136,0.5) !important; box-shadow: 0 0 0 2px rgba(0,255,136,0.07); }
        .dab-inp::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>

      <Toast toast={toast} />

      <ConfirmDialog
        open={!!deleteRow}
        title="Hapus Alamat?"
        message="Data alamat bongkar ini akan dihapus dari database."
        detail={deleteRow?.label}
        loading={deleting}
        onCancel={() => setDeleteRow(null)}
        onConfirm={handleDelete}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace' }}>Database Alamat Bongkar</h1>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3, fontFamily: 'monospace' }}>Kelola daftar alamat bongkar/tujuan yang sering digunakan</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => fileRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', borderRadius: 3, cursor: 'pointer', fontFamily: 'monospace', fontSize: 12, flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,255,136,0.07)'; e.currentTarget.style.color = '#00ff88'; e.currentTarget.style.borderColor = 'rgba(0,255,136,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
          ><Upload size={13}/> import excel</button>
          <button onClick={openAdd}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#00ff88', color: '#0a0a0a', borderRadius: 3, border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          ><Plus size={13}/> tambah alamat</button>
        </div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 3, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#00ff88', fontWeight: 600 }}>{editId ? 'edit alamat' : 'tambah alamat baru'}</p>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', lineHeight: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = '#f0f0f0'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
            ><X size={15}/></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(0,255,136,0.7)', display: 'block', marginBottom: 4 }}>Label / Nama Singkat *</label>
              <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                style={INP} className="dab-inp" placeholder="mis. Pak Eko - Kalipuro"/>
            </div>
            <div>
              <label style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(0,255,136,0.7)', display: 'block', marginBottom: 4 }}>Kota / Kabupaten</label>
              <input value={form.kota} onChange={e => setForm(f => ({ ...f, kota: e.target.value }))}
                style={INP} className="dab-inp" placeholder="BANYUWANGI"/>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(0,255,136,0.7)', display: 'block', marginBottom: 4 }}>End User (untuk QR)</label>
            <input value={form.end_user} onChange={e => setForm(f => ({ ...f, end_user: e.target.value }))}
              style={INP} className="dab-inp" placeholder="END USER KAB. BANYUWANGI atau CV MAJU JAYA"/>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(0,255,136,0.7)', display: 'block', marginBottom: 4 }}>Alamat Lengkap (untuk QR)</label>
            <textarea rows={2} value={form.alamat_lengkap} onChange={e => setForm(f => ({ ...f, alamat_lengkap: e.target.value }))}
              style={{ ...INP, resize: 'vertical' }} className="dab-inp"
              placeholder="Nama, Jl. Joyoboyo RT/RW 001/001, Ds. Kalipuro, Kec. Kalipuro"/>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSubmit} style={{ padding: '7px 16px', background: '#00ff88', color: '#0a0a0a', borderRadius: 3, border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>
              {editId ? 'perbarui' : 'simpan'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, color: 'rgba(255,255,255,0.65)', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }}>batal</button>
          </div>
        </div>
      )}

      {/* Import preview */}
      {importPreview && (
        <div style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.18)', borderRadius: 3, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#00ff88', fontWeight: 600 }}>
                preview import — {importPreview.fileName}
              </p>
              <p style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>
                {importPreview.rows.length} baris valid ditemukan
              </p>
            </div>
            <button onClick={() => setImportPreview(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', lineHeight: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = '#f0f0f0'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
            ><X size={15}/></button>
          </div>

          <div style={{ overflowX: 'auto', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'monospace' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(0,255,136,0.15)' }}>
                  {['Label', 'End User', 'Alamat Lengkap', 'Kota'].map(h => (
                    <th key={h} style={{ padding: '5px 10px', textAlign: 'left', fontSize: 10, color: 'rgba(0,255,136,0.7)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {importPreview.rows.slice(0, 5).map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '5px 10px', color: '#f0f0f0', fontWeight: 500 }}>{r.label}</td>
                    <td style={{ padding: '5px 10px', color: 'rgba(255,255,255,0.55)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.end_user || '—'}</td>
                    <td style={{ padding: '5px 10px', color: 'rgba(255,255,255,0.45)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.alamat_lengkap || '—'}</td>
                    <td style={{ padding: '5px 10px', color: 'rgba(255,255,255,0.4)' }}>{r.kota || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {importPreview.rows.length > 5 && (
              <p style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.25)', padding: '6px 10px' }}>
                ... dan {importPreview.rows.length - 5} baris lainnya
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleImport} disabled={importing}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', background: importing ? 'rgba(0,255,136,0.3)' : '#00ff88', color: '#0a0a0a', borderRadius: 3, border: 'none', cursor: importing ? 'not-allowed' : 'pointer', fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}
            >
              {importing
                ? <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#0a0a0a', display: 'inline-block' }} className="animate-spin" />
                : <Upload size={12} />}
              {importing ? 'mengimpor...' : `impor ${importPreview.rows.length} alamat`}
            </button>
            <button onClick={() => setImportPreview(null)}
              style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, color: 'rgba(255,255,255,0.65)', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }}>batal</button>
          </div>
        </div>
      )}

      {/* Tabel */}
      <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        {loading ? (
          <TableSkeleton rows={5} columns={6} />
        ) : data.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', fontSize: 11, fontStyle: 'italic' }}>Belum ada data alamat bongkar.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' }}>
            <thead>
              <tr>
                {['No','Label','End User','Alamat Lengkap','Kota',''].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={row.id} className="dab-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.25)', fontSize: 11, width: 40 }}>{i + 1}</td>
                  <td style={{ padding: '10px 12px', color: '#f0f0f0', fontWeight: 500 }}>{row.label}</td>
                  <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.5)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.end_user || '—'}</td>
                  <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.45)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.alamat_lengkap || '—'}</td>
                  <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.35)' }}>{row.kota || '—'}</td>
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
