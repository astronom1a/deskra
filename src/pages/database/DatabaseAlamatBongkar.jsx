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
const PAGE_SIZE  = 20

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
  const [importPreview, setImportPreview] = useState(null) // { rows, failed, fileName }
  const [importing, setImporting]         = useState(false)
  const [previewPage, setPreviewPage]     = useState(1)
  const [contextMenu, setContextMenu]     = useState(null) // { x, y, row }
  const [page, setPage]                   = useState(1)
  const [searchTerm, setSearchTerm]       = useState('')
  const fileRef = useRef()

  // Tutup context menu saat klik di luar atau tekan Escape
  useEffect(() => {
    if (!contextMenu) return
    function close(e) {
      if (e.key === 'Escape') { setContextMenu(null); return }
      setContextMenu(null)
    }
    document.addEventListener('keydown', close)
    document.addEventListener('mousedown', close)
    return () => {
      document.removeEventListener('keydown', close)
      document.removeEventListener('mousedown', close)
    }
  }, [contextMenu])

  useEffect(() => { setPage(1) }, [searchTerm])

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
      const wb = XLSX.read(evt.target.result, { type: 'binary' })
      const rows = [], failed = []
      for (const sheetName of wb.SheetNames) {
        const ws  = wb.Sheets[sheetName]
        // Baca sebagai array 2D — format asli: tiap baris punya 1 kolom berisi string penuh
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        for (const row of raw) {
          for (const cell of row) {
            const str    = String(cell ?? '').trim()
            const parsed = parseAlamatLine(str)
            if (parsed) rows.push(parsed)
            else if (str && !/^alamat$/i.test(str)) failed.push(str)
          }
        }
      }
      if (!rows.length) {
        showToast('Tidak ada data valid di file.', 'error')
        return
      }
      setPreviewPage(1)
      setImportPreview({ rows, failed, fileName: file.name })
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

  const filteredData = searchTerm.trim()
    ? data.filter(r =>
        (r.label        || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.kota         || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.alamat_lengkap || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : data
  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE))
  const safePage   = Math.min(Math.max(page, 1), totalPages)
  const pageData   = filteredData.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace' }}>Database Alamat Bongkar</h1>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3, fontFamily: 'monospace' }}>Kelola daftar alamat bongkar/tujuan yang sering digunakan</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
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

      {/* Toolbar — search + info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="cari label / kota / alamat..."
            style={{ ...INP, width: 260, paddingRight: searchTerm ? 28 : 10 }}
            className="dab-inp"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')}
              style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', lineHeight: 0, padding: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = '#f0f0f0'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
            ><X size={12}/></button>
          )}
        </div>
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>
          {searchTerm
            ? `${filteredData.length} dari ${data.length} alamat`
            : `${data.length} alamat`}
        </span>
      </div>

      {/* Form — modal popup */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false) }}
        >
          <div style={{ background: '#111', border: '1px solid rgba(0,255,136,0.18)', borderRadius: 4, width: '100%', maxWidth: 480, padding: 24 }}
            onMouseDown={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <p style={{ fontFamily: 'monospace', fontSize: 13, color: '#00ff88', fontWeight: 700 }}>
                {editId ? 'edit alamat' : 'tambah alamat baru'}
              </p>
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
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(0,255,136,0.7)', display: 'block', marginBottom: 4 }}>Alamat Lengkap (untuk QR)</label>
              <textarea rows={3} value={form.alamat_lengkap} onChange={e => setForm(f => ({ ...f, alamat_lengkap: e.target.value }))}
                style={{ ...INP, resize: 'vertical' }} className="dab-inp"
                placeholder="Nama, Jl. Joyoboyo RT/RW 001/001, Ds. Kalipuro, Kec. Kalipuro"/>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSubmit}
                style={{ flex: 1, padding: '8px 16px', background: '#00ff88', color: '#0a0a0a', borderRadius: 3, border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>
                {editId ? 'perbarui' : 'simpan'}
              </button>
              <button onClick={() => setShowForm(false)}
                style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, color: 'rgba(255,255,255,0.65)', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }}>
                batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import preview — modal */}
      {importPreview && (() => {
        const totalPages = Math.ceil(importPreview.rows.length / PAGE_SIZE)
        const safePage   = Math.min(Math.max(previewPage, 1), totalPages)
        const pageRows   = importPreview.rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
        const hasFailed  = importPreview.failed && importPreview.failed.length > 0
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, width: '100%', maxWidth: 820, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              {/* Modal header */}
              <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
                <div>
                  <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#f0f0f0', fontWeight: 600, marginBottom: 6 }}>
                    preview import — <span style={{ color: 'rgba(255,255,255,0.45)' }}>{importPreview.fileName}</span>
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 3, fontSize: 10, fontFamily: 'monospace', fontWeight: 700, background: 'rgba(0,255,136,0.1)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.22)' }}>
                      ✓ {importPreview.rows.length} siap diimpor
                    </span>
                    {hasFailed && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 3, fontSize: 10, fontFamily: 'monospace', fontWeight: 700, background: 'rgba(255,107,107,0.1)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.22)' }}>
                        ✗ {importPreview.failed.length} gagal diparse
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => setImportPreview(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', lineHeight: 0, flexShrink: 0 }}
                  onMouseEnter={e => e.currentTarget.style.color = '#f0f0f0'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                ><X size={15}/></button>
              </div>

              {/* Scrollable body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 8px' }}>

                {/* Data table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'monospace' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#111', zIndex: 1 }}>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600, width: 40 }}>#</th>
                      {['Label', 'End User', 'Alamat Lengkap', 'Kota'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, color: 'rgba(0,255,136,0.7)', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '6px 12px', color: 'rgba(255,255,255,0.2)', textAlign: 'right', fontSize: 10 }}>{(safePage - 1) * PAGE_SIZE + i + 1}</td>
                        <td style={{ padding: '6px 12px', color: '#f0f0f0', fontWeight: 500 }}>{r.label}</td>
                        <td style={{ padding: '6px 12px', color: 'rgba(255,255,255,0.5)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.end_user || '—'}</td>
                        <td style={{ padding: '6px 12px', color: 'rgba(255,255,255,0.4)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.alamat_lengkap || '—'}</td>
                        <td style={{ padding: '6px 12px', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>{r.kota || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Failed rows */}
                {hasFailed && (
                  <div style={{ margin: '12px 0 4px', borderTop: '1px solid rgba(255,107,107,0.15)' }}>
                    <p style={{ fontFamily: 'monospace', fontSize: 10, color: '#ff6b6b', fontWeight: 600, padding: '10px 14px 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Baris yang tidak berhasil di-parse ({importPreview.failed.length})
                    </p>
                    <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                      {importPreview.failed.map((f, i) => (
                        <div key={i} style={{ padding: '4px 14px', fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,107,107,0.7)', borderBottom: '1px solid rgba(255,107,107,0.06)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,107,107,0.02)' }}>
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Pagination + footer */}
              <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0, flexWrap: 'wrap' }}>
                {/* Pagination */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => setPreviewPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}
                    style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, color: safePage <= 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', cursor: safePage <= 1 ? 'default' : 'pointer', fontFamily: 'monospace', fontSize: 11 }}>
                    ← prev
                  </button>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.4)', minWidth: 90, textAlign: 'center' }}>
                    halaman {safePage} / {totalPages}
                  </span>
                  <button onClick={() => setPreviewPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
                    style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, color: safePage >= totalPages ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', cursor: safePage >= totalPages ? 'default' : 'pointer', fontFamily: 'monospace', fontSize: 11 }}>
                    next →
                  </button>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setImportPreview(null)}
                    style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, color: 'rgba(255,255,255,0.65)', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }}>
                    batal
                  </button>
                  <button onClick={handleImport} disabled={importing}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', background: importing ? 'rgba(0,255,136,0.3)' : '#00ff88', color: '#0a0a0a', borderRadius: 3, border: 'none', cursor: importing ? 'not-allowed' : 'pointer', fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}
                  >
                    {importing
                      ? <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#0a0a0a', display: 'inline-block' }} className="animate-spin" />
                      : <Upload size={12} />}
                    {importing ? 'mengimpor...' : `impor ${importPreview.rows.length} alamat`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Tabel */}
      <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        {loading ? (
          <TableSkeleton rows={5} columns={6} />
        ) : data.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', fontSize: 11, fontStyle: 'italic' }}>Belum ada data alamat bongkar.</div>
        ) : filteredData.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', fontSize: 11, fontStyle: 'italic' }}>Tidak ada hasil untuk "{searchTerm}".</div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' }}>
              <thead>
                <tr>
                  {['No','Label','End User','Alamat Lengkap','Kota',''].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageData.map((row, i) => (
                  <tr key={row.id} className="dab-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, row }) }}
                  >
                    <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.25)', fontSize: 11, width: 40 }}>
                      {(safePage - 1) * PAGE_SIZE + i + 1}
                    </td>
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

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                  {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredData.length)} dari {filteredData.length}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={() => setPage(1)} disabled={safePage <= 1}
                    style={{ padding: '3px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, color: safePage <= 1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.55)', cursor: safePage <= 1 ? 'default' : 'pointer', fontFamily: 'monospace', fontSize: 11 }}>«</button>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}
                    style={{ padding: '3px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, color: safePage <= 1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.55)', cursor: safePage <= 1 ? 'default' : 'pointer', fontFamily: 'monospace', fontSize: 11 }}>← prev</button>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.45)', padding: '0 6px', minWidth: 80, textAlign: 'center' }}>
                    {safePage} / {totalPages}
                  </span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
                    style={{ padding: '3px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, color: safePage >= totalPages ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.55)', cursor: safePage >= totalPages ? 'default' : 'pointer', fontFamily: 'monospace', fontSize: 11 }}>next →</button>
                  <button onClick={() => setPage(totalPages)} disabled={safePage >= totalPages}
                    style={{ padding: '3px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, color: safePage >= totalPages ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.55)', cursor: safePage >= totalPages ? 'default' : 'pointer', fontFamily: 'monospace', fontSize: 11 }}>»</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{
            position: 'fixed', zIndex: 2000,
            top: contextMenu.y, left: contextMenu.x,
            background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 4, padding: '4px 0', minWidth: 140,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ padding: '3px 8px 5px 12px', fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.25)', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 3 }}>
            {contextMenu.row.label}
          </div>
          <button
            onClick={() => { openEdit(contextMenu.row); setContextMenu(null) }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 14px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.75)', fontFamily: 'monospace', fontSize: 12, textAlign: 'left' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,255,136,0.07)'; e.currentTarget.style.color = '#00ff88' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)' }}
          >
            <Pencil size={12}/> Edit
          </button>
          <button
            onClick={() => { setDeleteRow(contextMenu.row); setContextMenu(null) }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 14px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.75)', fontFamily: 'monospace', fontSize: 12, textAlign: 'left' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.07)'; e.currentTarget.style.color = '#ff6b6b' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)' }}
          >
            <Trash2 size={12}/> Hapus
          </button>
        </div>
      )}
    </div>
  )
}
