import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, X, Search, Sparkles } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { logActivity } from '../../../lib/activityLog'
import ConfirmDialog from '../../../components/ui/ConfirmDialog'
import { TableSkeleton } from '../../../components/ui/LoadingState'
import { INVOIS_PREFIX_MAP, RK_BADGE_BASE } from '../../register-kapling/utils/registerKaplingConstants'
import { parseInvois, formatTanggalInvois } from '../utils/parseInvois'
import { cleanPembeliName } from '../utils/cleanPembeliName'
import { SEG_COLORS, InvoisSegments, labelStyle, tdStyle, thStyle } from '../components/shared.jsx'

const EMPTY_FORM = { no_invois: '', pembeli: '' }

export default function TabInvois({ invoisRows, loading, pembeliRows, profile, refetch, showToast, tpkId }) {
  const [search, setSearch]       = useState('')
  const [form, setForm]           = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving]       = useState(false)
  const [deleteRow, setDeleteRow] = useState(null)
  const [deleting, setDeleting]   = useState(false)

  const parsedForm = useMemo(() => parseInvois(form.no_invois), [form.no_invois])

  // Saran pembeli: prioritas master tabel_pembeli, fallback histori invois se-akun
  const akunSuggestion = useMemo(() => {
    if (!parsedForm) return null
    const master = pembeliRows.find(p => p.akun === parsedForm.akun)
    if (master) return master.pembeli
    const match = invoisRows.find(r =>
      r.id !== editingId &&
      (r.pembeli || '').trim() &&
      parseInvois(r.no_invois)?.akun === parsedForm.akun
    )
    return match ? cleanPembeliName(match.pembeli) : null
  }, [parsedForm, pembeliRows, invoisRows, editingId])

  const displayRows = useMemo(() => {
    const term = search.trim().toUpperCase()
    const withParsed = invoisRows.map(r => ({ ...r, parsed: parseInvois(r.no_invois) }))
    const filtered = term
      ? withParsed.filter(r =>
          r.no_invois.toUpperCase().includes(term) ||
          (r.pembeli || '').toUpperCase().includes(term) ||
          (r.parsed?.akun || '').includes(term)
        )
      : withParsed
    // Terbaru di atas: sort by tanggal+jam parse desc, yang tak terparse di bawah
    return [...filtered].sort((a, b) => {
      const ka = a.parsed ? `${a.parsed.tanggal}${a.parsed.jamRaw}` : ''
      const kb = b.parsed ? `${b.parsed.tanggal}${b.parsed.jamRaw}` : ''
      if (ka && kb) return kb.localeCompare(ka)
      if (ka) return -1
      if (kb) return 1
      return a.no_invois.localeCompare(b.no_invois)
    })
  }, [invoisRows, search])

  const stats = useMemo(() => ({
    total: invoisRows.length,
    akun: new Set(invoisRows.map(r => parseInvois(r.no_invois)?.akun).filter(Boolean)).size,
    tanpaPembeli: invoisRows.filter(r => !(r.pembeli || '').trim()).length,
  }), [invoisRows])

  function handleEdit(row) {
    setEditingId(row.id)
    setForm({ no_invois: row.no_invois, pembeli: cleanPembeliName(row.pembeli) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  async function handleSave() {
    const noInvois = form.no_invois.trim().toUpperCase()
    const pembeli  = cleanPembeliName(form.pembeli).toUpperCase()
    if (!noInvois) { showToast('No. invois wajib diisi.', 'error'); return }
    if (!tpkId)    { showToast('Profil TPK tidak ditemukan. Coba login ulang.', 'error'); return }

    setSaving(true)
    let error
    if (editingId) {
      ;({ error } = await supabase
        .from('tabel_invois')
        .update({ no_invois: noInvois, pembeli: pembeli || null })
        .eq('id', editingId)
        .eq('tpk_id', tpkId))
    } else {
      ;({ error } = await supabase
        .from('tabel_invois')
        .insert({ tpk_id: tpkId, no_invois: noInvois, pembeli: pembeli || null }))
    }

    if (error) {
      setSaving(false)
      showToast(error.code === '23505' ? `Invois ${noInvois} sudah terdaftar.` : error.message, 'error')
      return
    }

    // Akun terparse yang belum terdaftar di master pembeli → daftarkan otomatis
    const parsed = parseInvois(noInvois)
    let pembeliBaru = false
    if (parsed && pembeli && !pembeliRows.some(p => p.akun === parsed.akun)) {
      const { error: pembeliError } = await supabase
        .from('tabel_pembeli')
        .insert({ tpk_id: tpkId, akun: parsed.akun, pembeli })
      pembeliBaru = !pembeliError
    }
    setSaving(false)

    logActivity({ action: editingId ? 'update' : 'create', entityType: 'invois', entityId: editingId, entityLabel: noInvois, tpkId, profile })
    showToast(
      pembeliBaru
        ? `Invois tersimpan. Pembeli baru terdaftar: ${pembeli} (akun ${parsed.akun}).`
        : editingId ? 'Invois diperbarui.' : 'Invois terdaftar.',
      'success'
    )
    resetForm()
    refetch()
  }

  async function handleDelete() {
    if (!deleteRow || !tpkId) return
    setDeleting(true)
    const { error } = await supabase
      .from('tabel_invois')
      .delete()
      .eq('id', deleteRow.id)
      .eq('tpk_id', tpkId)
    setDeleting(false)
    if (error) { showToast(error.message, 'error'); return }
    logActivity({ action: 'delete', entityType: 'invois', entityId: deleteRow.id, entityLabel: deleteRow.no_invois, tpkId, profile })
    showToast('Invois dihapus.', 'success')
    setDeleteRow(null)
    if (editingId === deleteRow.id) resetForm()
    refetch()
  }

  return (
    <>
      {/* Form tambah/edit */}
      <div style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${editingId ? 'rgba(255,170,0,0.25)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 3, padding: '16px 20px', marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: editingId ? '#ffaa00' : 'rgba(255,255,255,0.35)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          {editingId ? 'edit invois' : 'daftarkan invois baru'}
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 240px', minWidth: 200 }}>
            <label style={labelStyle}>no. invois</label>
            <input
              className="rk-input"
              value={form.no_invois}
              onChange={e => setForm(f => ({ ...f, no_invois: e.target.value.toUpperCase() }))}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="mis. 44312607121436"
              style={{ width: '100%', padding: '8px 10px' }}
            />
          </div>
          <div style={{ flex: '1 1 240px', minWidth: 200 }}>
            <label style={labelStyle}>pembeli</label>
            <input
              className="rk-input"
              value={form.pembeli}
              onChange={e => setForm(f => ({ ...f, pembeli: e.target.value.toUpperCase() }))}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="nama pembeli"
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

        {/* Preview hasil parse */}
        {form.no_invois.trim() && (
          <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
            {parsedForm ? (
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <InvoisSegments noInvois={form.no_invois} />
                <span style={{ fontSize: 11, fontFamily: 'monospace' }}>
                  <span style={{ color: SEG_COLORS.akun }}>akun {parsedForm.akun}</span>
                  <span style={{ color: 'rgba(255,255,255,0.25)' }}> · </span>
                  <span style={{ color: SEG_COLORS.tgl }}>{formatTanggalInvois(parsedForm.tanggal)}</span>
                  <span style={{ color: 'rgba(255,255,255,0.25)' }}> · </span>
                  <span style={{ color: SEG_COLORS.jam }}>{parsedForm.jam}</span>
                </span>
                {parsedForm.ambiguous && (
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#ffaa00' }}>⚠️ pembagian akun ambigu — cek kembali</span>
                )}
                {akunSuggestion && !form.pembeli.trim() && (
                  <button onClick={() => setForm(f => ({ ...f, pembeli: akunSuggestion }))}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', fontSize: 10, fontFamily: 'monospace', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 3, color: '#38bdf8', cursor: 'pointer' }}
                  ><Sparkles size={11} /> akun ini milik {akunSuggestion} — pakai</button>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,170,0,0.6)' }}>
                nomor tidak mengikuti pattern akun+tanggal+jam — tetap bisa didaftarkan
              </p>
            )}
          </div>
        )}
      </div>

      {/* Stats + search */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 320 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)' }} />
          <input
            className="rk-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="cari no. invois / pembeli / akun..."
            style={{ width: '100%', padding: '7px 10px 7px 30px' }}
          />
        </div>
        <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)' }}>
          {stats.total.toLocaleString('id')} invois · {stats.akun.toLocaleString('id')} akun
          {stats.tanpaPembeli > 0 && <span style={{ color: '#ffaa00' }}> · {stats.tanpaPembeli} tanpa pembeli</span>}
        </span>
      </div>

      {/* Tabel */}
      {loading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : displayRows.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', fontSize: 11, fontStyle: 'italic', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
          {search ? 'Tidak ada invois yang cocok.' : 'Belum ada invois terdaftar. Invois dari register kapling otomatis muncul di sini.'}
        </div>
      ) : (
        <div className="rk-table-scroll" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '1%' }}>#</th>
                <th style={thStyle}>no. invois</th>
                <th style={{ ...thStyle, width: '1%' }}>akun</th>
                <th style={{ ...thStyle, width: '1%' }}>tanggal</th>
                <th style={{ ...thStyle, width: '1%' }}>jam</th>
                <th style={thStyle}>pembeli</th>
                <th style={{ ...thStyle, width: '1%' }}></th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, i) => {
                const prefix = row.parsed?.prefix
                const pfx = prefix ? INVOIS_PREFIX_MAP[prefix] : null
                const nama = cleanPembeliName(row.pembeli)
                return (
                  <tr key={row.id} className="rk-row">
                    <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.25)', textAlign: 'right' }}>{i + 1}</td>
                    <td style={tdStyle}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {pfx && <span style={{ ...RK_BADGE_BASE, background: pfx.bg, color: pfx.color, border: `1px solid ${pfx.border}` }}>{prefix}</span>}
                        <InvoisSegments noInvois={row.no_invois} />
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: SEG_COLORS.akun }}>{row.parsed?.akun ?? '—'}</td>
                    <td style={{ ...tdStyle, color: SEG_COLORS.tgl }}>{row.parsed ? formatTanggalInvois(row.parsed.tanggal) : '—'}</td>
                    <td style={{ ...tdStyle, color: SEG_COLORS.jam }}>{row.parsed?.jam ?? '—'}</td>
                    <td style={{ ...tdStyle, color: nama ? '#f0f0f0' : 'rgba(255,170,0,0.5)' }}>
                      {nama || 'belum diisi'}
                    </td>
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
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteRow)}
        title="Hapus invois?"
        message="Data pembeli di register kapling tidak ikut terhapus."
        detail={deleteRow?.no_invois}
        loading={deleting}
        onCancel={() => setDeleteRow(null)}
        onConfirm={handleDelete}
      />
    </>
  )
}
