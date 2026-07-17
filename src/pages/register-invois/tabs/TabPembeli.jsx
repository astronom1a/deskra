import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, X, Search, Download } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { logActivity } from '../../../lib/activityLog'
import ConfirmDialog from '../../../components/ui/ConfirmDialog'
import { TableSkeleton } from '../../../components/ui/LoadingState'
import { parseInvois } from '../utils/parseInvois'
import { cleanPembeliName } from '../utils/cleanPembeliName'
import { SEG_COLORS, labelStyle, tdStyle, thStyle } from '../components/shared.jsx'

const EMPTY_FORM = { akun: '', pembeli: '' }

export default function TabPembeli({ invoisRows, loading, pembeliRows, profile, refetch, showToast, tpkId }) {
  const [search, setSearch]       = useState('')
  const [form, setForm]           = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving]       = useState(false)
  const [deleteRow, setDeleteRow] = useState(null)
  const [deleting, setDeleting]   = useState(false)
  const [pulling, setPulling]     = useState(false)
  // Tawaran isi pembeli invois se-akun yang masih kosong setelah nama didaftarkan
  const [fillOffer, setFillOffer] = useState(null)
  const [filling, setFilling]     = useState(false)

  // Jumlah invois per akun untuk kolom info
  const invoisCountByAkun = useMemo(() => {
    const map = {}
    invoisRows.forEach(r => {
      const akun = parseInvois(r.no_invois)?.akun
      if (akun) map[akun] = (map[akun] || 0) + 1
    })
    return map
  }, [invoisRows])

  const displayRows = useMemo(() => {
    const term = search.trim().toUpperCase()
    const filtered = term
      ? pembeliRows.filter(r => r.akun.includes(term) || r.pembeli.toUpperCase().includes(term))
      : pembeliRows
    return [...filtered].sort((a, b) => (Number(a.akun) || 0) - (Number(b.akun) || 0))
  }, [pembeliRows, search])

  function handleEdit(row) {
    setEditingId(row.id)
    setForm({ akun: row.akun, pembeli: row.pembeli })
  }

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  function offerFillEmpty(akun, pembeli) {
    const emptyIds = invoisRows
      .filter(r => !(r.pembeli || '').trim() && parseInvois(r.no_invois)?.akun === akun)
      .map(r => r.id)
    if (emptyIds.length > 0) setFillOffer({ akun, pembeli, ids: emptyIds })
  }

  async function handleSave() {
    const akun    = form.akun.trim()
    const pembeli = cleanPembeliName(form.pembeli).toUpperCase()
    if (!/^\d{3,5}$/.test(akun)) { showToast('No. akun harus 3-5 digit angka.', 'error'); return }
    if (!pembeli) { showToast('Nama pembeli wajib diisi.', 'error'); return }
    if (!tpkId)   { showToast('Profil TPK tidak ditemukan. Coba login ulang.', 'error'); return }

    setSaving(true)
    let error
    if (editingId) {
      ;({ error } = await supabase
        .from('tabel_pembeli')
        .update({ akun, pembeli })
        .eq('id', editingId)
        .eq('tpk_id', tpkId))
    } else {
      ;({ error } = await supabase
        .from('tabel_pembeli')
        .insert({ tpk_id: tpkId, akun, pembeli }))
    }
    setSaving(false)

    if (error) {
      showToast(error.code === '23505' ? `Akun ${akun} sudah terdaftar.` : error.message, 'error')
      return
    }
    logActivity({ action: editingId ? 'update' : 'create', entityType: 'pembeli', entityId: editingId, entityLabel: `${akun} — ${pembeli}`, tpkId, profile })
    showToast(editingId ? 'Pembeli diperbarui.' : 'Pembeli terdaftar.', 'success')
    resetForm()
    refetch()
    offerFillEmpty(akun, pembeli)
  }

  async function handleFillEmpty() {
    if (!fillOffer || !tpkId) return
    setFilling(true)
    const { error } = await supabase
      .from('tabel_invois')
      .update({ pembeli: fillOffer.pembeli })
      .in('id', fillOffer.ids)
      .eq('tpk_id', tpkId)
    setFilling(false)
    if (error) { showToast(error.message, 'error'); return }
    showToast(`${fillOffer.ids.length} invois akun ${fillOffer.akun} terisi pembeli ${fillOffer.pembeli}.`, 'success')
    setFillOffer(null)
    refetch()
  }

  // Tarik akun→pembeli dari invois terdaftar yang akunnya belum ada di master.
  // Nama diambil dari invois terbaru per akun (sort tanggal+jam desc).
  async function handlePull() {
    if (!tpkId) return
    const known = new Set(pembeliRows.map(p => p.akun))
    const candidates = {}
    const sorted = [...invoisRows]
      .map(r => ({ ...r, parsed: parseInvois(r.no_invois) }))
      .filter(r => r.parsed && (r.pembeli || '').trim())
      .sort((a, b) => `${b.parsed.tanggal}${b.parsed.jamRaw}`.localeCompare(`${a.parsed.tanggal}${a.parsed.jamRaw}`))
    for (const r of sorted) {
      const akun = r.parsed.akun
      if (known.has(akun) || candidates[akun]) continue
      const nama = cleanPembeliName(r.pembeli).toUpperCase()
      if (nama) candidates[akun] = nama
    }
    const inserts = Object.entries(candidates).map(([akun, pembeli]) => ({ tpk_id: tpkId, akun, pembeli }))
    if (!inserts.length) { showToast('Semua akun dari invois sudah terdaftar.', 'success'); return }

    setPulling(true)
    const { error } = await supabase.from('tabel_pembeli').insert(inserts)
    setPulling(false)
    if (error) { showToast(error.message, 'error'); return }
    logActivity({ action: 'create', entityType: 'pembeli', entityLabel: `${inserts.length} pembeli (tarik dari invois)`, tpkId, profile })
    showToast(`${inserts.length} pembeli terdaftar dari register invois.`, 'success')
    refetch()
  }

  async function handleDelete() {
    if (!deleteRow || !tpkId) return
    setDeleting(true)
    const { error } = await supabase
      .from('tabel_pembeli')
      .delete()
      .eq('id', deleteRow.id)
      .eq('tpk_id', tpkId)
    setDeleting(false)
    if (error) { showToast(error.message, 'error'); return }
    logActivity({ action: 'delete', entityType: 'pembeli', entityId: deleteRow.id, entityLabel: `${deleteRow.akun} — ${deleteRow.pembeli}`, tpkId, profile })
    showToast('Pembeli dihapus.', 'success')
    setDeleteRow(null)
    if (editingId === deleteRow.id) resetForm()
    refetch()
  }

  return (
    <>
      {/* Form tambah/edit */}
      <div style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${editingId ? 'rgba(255,170,0,0.25)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 3, padding: '16px 20px', marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: editingId ? '#ffaa00' : 'rgba(255,255,255,0.35)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          {editingId ? 'edit pembeli' : 'daftarkan pembeli baru'}
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '0 1 160px', minWidth: 120 }}>
            <label style={labelStyle}>no. akun</label>
            <input
              className="rk-input"
              value={form.akun}
              onChange={e => setForm(f => ({ ...f, akun: e.target.value.replace(/\D/g, '').slice(0, 5) }))}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="mis. 4431"
              style={{ width: '100%', padding: '8px 10px' }}
            />
          </div>
          <div style={{ flex: '1 1 240px', minWidth: 200 }}>
            <label style={labelStyle}>nama pembeli</label>
            <input
              className="rk-input"
              value={form.pembeli}
              onChange={e => setForm(f => ({ ...f, pembeli: e.target.value.toUpperCase() }))}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="nama pembeli (tanpa email dll)"
              style={{ width: '100%', padding: '8px 10px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleSave} disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, background: 'rgba(0,255,136,0.12)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: 3, color: '#00ff88', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.55 : 1 }}
            ><Plus size={13} /> {saving ? 'menyimpan...' : editingId ? 'simpan' : 'daftarkan'}</button>
            {editingId && (
              <button onClick={resetForm}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', fontSize: 12, fontFamily: 'monospace', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}
              ><X size={13} /> batal</button>
            )}
          </div>
        </div>
      </div>

      {/* Stats + search + tarik dari invois */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 320 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)' }} />
          <input
            className="rk-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="cari akun / nama pembeli..."
            style={{ width: '100%', padding: '7px 10px 7px 30px' }}
          />
        </div>
        <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)' }}>
          {pembeliRows.length.toLocaleString('id')} pembeli terdaftar
        </span>
        <button onClick={handlePull} disabled={pulling}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: 11, fontFamily: 'monospace', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 3, color: '#38bdf8', cursor: pulling ? 'not-allowed' : 'pointer', opacity: pulling ? 0.55 : 1, marginLeft: 'auto' }}
        ><Download size={12} /> {pulling ? 'menarik...' : 'tarik dari register invois'}</button>
      </div>

      {/* Tabel */}
      {loading ? (
        <TableSkeleton rows={6} columns={4} />
      ) : displayRows.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', fontSize: 11, fontStyle: 'italic', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
          {search ? 'Tidak ada pembeli yang cocok.' : 'Belum ada pembeli terdaftar. Pakai tombol "tarik dari register invois" untuk mengisi otomatis.'}
        </div>
      ) : (
        <div className="rk-table-scroll" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '1%' }}>#</th>
                <th style={{ ...thStyle, width: '1%' }}>no. akun</th>
                <th style={thStyle}>nama pembeli</th>
                <th style={{ ...thStyle, width: '1%' }}>invois</th>
                <th style={{ ...thStyle, width: '1%' }}></th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, i) => (
                <tr key={row.id} className="rk-row">
                  <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.25)', textAlign: 'right' }}>{i + 1}</td>
                  <td style={{ ...tdStyle, color: SEG_COLORS.akun, fontWeight: 700 }}>{row.akun}</td>
                  <td style={{ ...tdStyle, color: '#f0f0f0' }}>{row.pembeli}</td>
                  <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.4)', textAlign: 'right' }}>{(invoisCountByAkun[row.akun] || 0).toLocaleString('id')}</td>
                  <td style={tdStyle}>
                    <span className="rk-actions" style={{ display: 'inline-flex', gap: 4, opacity: 0.35, transition: 'opacity 0.15s' }}>
                      <button onClick={() => handleEdit(row)} title="Edit"
                        style={{ padding: 4, background: 'transparent', border: 'none', color: '#00ff88', cursor: 'pointer', display: 'flex' }}
                      ><Pencil size={13} /></button>
                      <button onClick={() => setDeleteRow(row)} title="Hapus"
                        style={{ padding: 4, background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer', display: 'flex' }}
                      ><Trash2 size={13} /></button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteRow)}
        title="Hapus pembeli?"
        message="Data invois dan register kapling tidak ikut terhapus."
        detail={deleteRow ? `${deleteRow.akun} — ${deleteRow.pembeli}` : ''}
        loading={deleting}
        onCancel={() => setDeleteRow(null)}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={Boolean(fillOffer)}
        tone="info"
        title="Isi invois yang pembelinya kosong?"
        message={fillOffer ? `${fillOffer.ids.length} invois akun ${fillOffer.akun} belum punya pembeli.` : ''}
        detail={fillOffer?.pembeli}
        confirmLabel="Isi otomatis"
        loading={filling}
        onCancel={() => setFillOffer(null)}
        onConfirm={handleFillEmpty}
      />
    </>
  )
}
