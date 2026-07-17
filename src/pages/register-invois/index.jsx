import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Receipt, Plus, Pencil, Trash2, X, Search, BarChart3, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthProvider'
import { getEffectiveTpkId } from '../../lib/effectiveTpk'
import { logActivity } from '../../lib/activityLog'
import Toast, { useToast } from '../../components/ui/Toast'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import TpkRequiredState from '../../components/layout/TpkRequiredState'
import { TableSkeleton } from '../../components/ui/LoadingState'
import RegisterKaplingStyles from '../register-kapling/components/RegisterKaplingStyles.jsx'
import { INVOIS_PREFIX_MAP, RK_BADGE_BASE } from '../register-kapling/utils/registerKaplingConstants'
import { parseInvois, formatTanggalInvois } from './utils/parseInvois'

const EMPTY_FORM = { no_invois: '', pembeli: '' }

// Segmen nomor invois diberi warna sesuai bagiannya agar pattern-nya terlihat
const SEG_COLORS = {
  prefix: 'rgba(255,255,255,0.4)',
  akun:   '#38bdf8',
  tgl:    '#00ff88',
  jam:    '#ffaa00',
}

function InvoisSegments({ noInvois }) {
  const parsed = parseInvois(noInvois)
  if (!parsed) return <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#f0f0f0' }}>{noInvois}</span>
  return (
    <span style={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'nowrap' }}>
      {parsed.prefix && <span style={{ color: SEG_COLORS.prefix }}>{parsed.prefix}</span>}
      <span style={{ color: SEG_COLORS.akun }}>{parsed.akun}</span>
      <span style={{ color: SEG_COLORS.tgl }}>{parsed.tglRaw}</span>
      <span style={{ color: SEG_COLORS.jam }}>{parsed.jamRaw}</span>
    </span>
  )
}

export default function RegisterInvois() {
  const { profile, activeTpkId } = useAuth()
  const tpkId = getEffectiveTpkId({ activeTpkId, profile })

  const [rows, setRows]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [form, setForm]         = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [deleteRow, setDeleteRow] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const { toast, showToast } = useToast(3500)

  async function fetchData() {
    if (!tpkId) { setRows([]); setLoading(false); return }
    setLoading(true)
    const PAGE = 1000
    const all = []
    let fetchError = null
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from('tabel_invois')
        .select('id,no_invois,pembeli,created_at')
        .eq('tpk_id', tpkId)
        .order('no_invois', { ascending: true })
        .range(from, from + PAGE - 1)
      if (error) { fetchError = error; break }
      if (!data || data.length === 0) break
      all.push(...data)
      if (data.length < PAGE) break
    }
    if (fetchError) showToast(fetchError.message, 'error')
    else setRows(all)
    setLoading(false)
  }
  useEffect(() => { fetchData() }, [tpkId])

  const parsedForm = useMemo(() => parseInvois(form.no_invois), [form.no_invois])

  // Saran pembeli dari invois lain dengan nomor akun sama
  const akunSuggestion = useMemo(() => {
    if (!parsedForm) return null
    const match = rows.find(r =>
      r.id !== editingId &&
      (r.pembeli || '').trim() &&
      parseInvois(r.no_invois)?.akun === parsedForm.akun
    )
    return match ? match.pembeli : null
  }, [parsedForm, rows, editingId])

  const displayRows = useMemo(() => {
    const term = search.trim().toUpperCase()
    const withParsed = rows.map(r => ({ ...r, parsed: parseInvois(r.no_invois) }))
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
  }, [rows, search])

  const stats = useMemo(() => ({
    total: rows.length,
    akun: new Set(rows.map(r => parseInvois(r.no_invois)?.akun).filter(Boolean)).size,
    tanpaPembeli: rows.filter(r => !(r.pembeli || '').trim()).length,
  }), [rows])

  function handleEdit(row) {
    setEditingId(row.id)
    setForm({ no_invois: row.no_invois, pembeli: row.pembeli || '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  async function handleSave() {
    const noInvois = form.no_invois.trim().toUpperCase()
    const pembeli  = form.pembeli.trim().toUpperCase()
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
    setSaving(false)

    if (error) {
      showToast(error.code === '23505' ? `Invois ${noInvois} sudah terdaftar.` : error.message, 'error')
      return
    }
    logActivity({ action: editingId ? 'update' : 'create', entityType: 'invois', entityId: editingId, entityLabel: noInvois, tpkId, profile })
    showToast(editingId ? 'Invois diperbarui.' : 'Invois terdaftar.', 'success')
    resetForm()
    fetchData()
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
    fetchData()
  }

  if (!tpkId) return <TpkRequiredState />

  const labelStyle = { fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5, display: 'block' }
  const thStyle    = { padding: '8px 12px', fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' }
  const tdStyle    = { padding: '7px 12px', fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)', borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'middle', whiteSpace: 'nowrap' }

  return (
    <div className="ds-page" style={{ minHeight: '100%', background: '#0a0a0a', color: '#f0f0f0' }}>
      <RegisterKaplingStyles />
      <Toast toast={toast} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Receipt size={18} style={{ color: '#00ff88' }} />
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace' }}>Register Invois</h1>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3, fontFamily: 'monospace' }}>
            daftar invois & pembelinya — pembeli otomatis tersinkron ke register kapling
          </p>
        </div>
        <Link to="/register-kapling"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', textDecoration: 'none', flexShrink: 0 }}
        ><BarChart3 size={13} /> statistik kapling</Link>
      </div>

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
                    <td style={{ ...tdStyle, color: (row.pembeli || '').trim() ? '#f0f0f0' : 'rgba(255,170,0,0.5)' }}>
                      {(row.pembeli || '').trim() || 'belum diisi'}
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
    </div>
  )
}
