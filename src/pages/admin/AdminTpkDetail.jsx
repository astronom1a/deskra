import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthProvider'
import { computeTotalUK } from '../../lib/rekapPekerjaan'
import {
  ArrowLeft, Save, Check, Info, Database, UserCog,
  CheckCircle2, XCircle, Mail, RefreshCw, AlertCircle,
  UserPlus, Eye, EyeOff, X, Trash2,
} from 'lucide-react'
import { InlineLoader, PageLoader, TableSkeleton } from '../../components/ui/LoadingState'

const TABS = [
  { id: 'info', label: 'Info', icon: Info },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'akun', label: 'Akun', icon: UserCog },
]

const panelStyle = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }
const labelStyle = { display: 'block', fontFamily: 'monospace', fontSize: 10, color: 'rgba(0,255,136,0.72)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }
const inputStyle = { width: '100%', padding: '9px 11px', borderRadius: 3, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#f0f0f0', fontSize: 12, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }
const ghostButton = { borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.62)', fontFamily: 'monospace', fontSize: 12, cursor: 'pointer' }
const primaryButton = { borderRadius: 3, border: 'none', background: '#00ff88', color: '#0a0a0a', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, cursor: 'pointer' }

function StatusBadge({ aktif }) {
  return aktif ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-medium" style={{ borderRadius: 3, background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.22)', color: '#00ff88' }}>
      <CheckCircle2 size={10} /> Aktif
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-medium" style={{ borderRadius: 3, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)' }}>
      <XCircle size={10} /> Nonaktif
    </span>
  )
}

export default function AdminTpkDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { setActiveTpkId } = useAuth()
  const [tab, setTab] = useState('info')
  const [tpk, setTpk] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [periodes, setPeriodes] = useState([])
  const [periodeLoading, setPeriodeLoading] = useState(false)

  const [operators, setOperators] = useState(null)
  const [resetSent, setResetSent] = useState({})
  const [resetting, setResetting] = useState({})
  const [operatorError, setOperatorError] = useState('')

  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ email: '', password: '' })
  const [addShowPass, setAddShowPass] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase.from('tabel_tpk').select('*').eq('id', id).single()
        if (error) throw error
        setTpk(data)
        setDraft({ namatpk: data.namatpk, kode_tpk: data.kode_tpk || '', aktif: data.aktif })
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  useEffect(() => {
    if (tab !== 'data' || periodes.length > 0) return
    setPeriodeLoading(true)
    supabase
      .from('tabel_periode')
      .select('id, periode, tgl_awal, tgl_akhir, status')
      .eq('tpk_id', id)
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        const list = data || []
        const totals = await Promise.all(list.map(p => computeTotalUK(p.id, p.periode, { tpkId: id })))
        setPeriodes(list.map((p, i) => ({ ...p, total_uk: totals[i] })))
        setPeriodeLoading(false)
      })
  }, [tab, id, periodes.length])

  useEffect(() => {
    if (tab !== 'akun') return
    setOperators(null)
    supabase.rpc('get_tpk_user_emails', { p_tpk_id: id }).then(({ data }) => setOperators(data || []))
  }, [tab, id])

  const dirty = draft && tpk && (
    draft.namatpk.trim() !== tpk.namatpk ||
    draft.kode_tpk !== (tpk.kode_tpk || '') ||
    draft.aktif !== tpk.aktif
  )
  const kodeErr = draft?.kode_tpk !== '' && !/^\d{7}$/.test(draft?.kode_tpk || '')
  const canSave = dirty && !kodeErr && !saving

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    const rawNama = draft.namatpk.trim()
    const { error } = await supabase
      .from('tabel_tpk')
      .update({
        namatpk: /^tpk\s/i.test(rawNama) ? rawNama : `TPK ${rawNama}`,
        kode_tpk: draft.kode_tpk || null,
        aktif: draft.aktif,
      })
      .eq('id', id)

    if (!error) {
      setTpk(t => ({ ...t, ...draft, kode_tpk: draft.kode_tpk || null }))
      setSaved(true)
    } else {
      setError(error.message)
    }
    setSaving(false)
  }

  const handleAddOperator = async (e) => {
    e.preventDefault()
    setAddError('')
    setAdding(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/add-tpk-operator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ tpk_id: id, email: addForm.email.trim(), password: addForm.password }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Terjadi kesalahan')
      setOperators(null)
      supabase.rpc('get_tpk_user_emails', { p_tpk_id: id }).then(({ data }) => setOperators(data || []))
      setShowAddModal(false)
      setAddForm({ email: '', password: '' })
    } catch (err) {
      setAddError(err.message)
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteOperator = async (user_id) => {
    setDeleting(user_id)
    setOperatorError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/remove-tpk-operator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ user_id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Terjadi kesalahan')
      setOperators(ops => ops.filter(o => o.user_id !== user_id))
    } catch (err) {
      setOperatorError(err.message)
    } finally {
      setDeleting(null)
      setConfirmDelete(null)
    }
  }

  const handleResetPassword = async (email) => {
    setResetting(r => ({ ...r, [email]: true }))
    await supabase.auth.resetPasswordForEmail(email)
    setResetSent(s => ({ ...s, [email]: true }))
    setResetting(r => ({ ...r, [email]: false }))
  }

  const handleBrowseData = () => {
    setActiveTpkId(id)
    navigate('/dashboard')
  }

  const fmt = v => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Math.round(v || 0))
  const formatTanggal = s => s ? new Date(s).toLocaleDateString('id-ID') : '-'

  if (loading) return <PageLoader />
  if (error && !tpk) return <div style={{ minHeight: '100%', background: '#0a0a0a', color: '#ff6b6b', padding: 24, fontFamily: 'monospace', fontSize: 12 }}>{error}</div>

  return (
    <div className="ds-page" style={{ minHeight: '100%', background: '#0a0a0a', color: '#f0f0f0' }}>
      <div className="mx-auto" style={{ width: '100%', maxWidth: 'min(96vw, 980px)' }}>
        <button
          onClick={() => navigate('/admin/tpk')}
          className="flex items-center gap-2 mb-6 transition-colors"
          style={{ background: 'none', border: 'none', padding: 0, color: 'rgba(255,255,255,0.42)', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }}
        >
          <ArrowLeft size={14} /> Kembali ke Daftar TPK
        </button>

        <div className="flex items-center gap-3 mb-7">
          <h1 className="text-2xl font-bold" style={{ color: '#f0f0f0' }}>{tpk.namatpk}</h1>
          <StatusBadge aktif={tpk.aktif} />
        </div>

        <div className="flex gap-1 mb-6 flex-wrap" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {TABS.map(t => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-2 px-4 py-2.5 transition-colors"
                style={{ border: 'none', borderBottom: `2px solid ${active ? '#00ff88' : 'transparent'}`, background: 'transparent', color: active ? '#00ff88' : 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12, fontWeight: active ? 700 : 500 }}
              >
                <Icon size={14} /> {t.label}
              </button>
            )
          })}
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 px-3 py-2 font-mono text-xs" style={{ borderRadius: 3, border: '1px solid rgba(255,107,107,0.22)', background: 'rgba(255,107,107,0.1)', color: '#ff6b6b' }}>
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {tab === 'info' && draft && (
          <div style={{ ...panelStyle, padding: 24 }}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label style={labelStyle}>Lokasi TPK</label>
                <input type="text" value={draft.namatpk} onChange={e => setDraft(d => ({ ...d, namatpk: e.target.value }))} style={inputStyle} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label style={labelStyle}>Kode TPK</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={7}
                  value={draft.kode_tpk}
                  onChange={e => setDraft(d => ({ ...d, kode_tpk: e.target.value.replace(/\D/g, '').slice(0, 7) }))}
                  placeholder="7 digit angka"
                  style={{ ...inputStyle, borderColor: kodeErr ? 'rgba(255,107,107,0.45)' : 'rgba(255,255,255,0.1)' }}
                />
                {kodeErr && <p className="mt-1" style={{ color: '#ff6b6b', fontSize: 11, fontFamily: 'monospace' }}>Harus 7 digit angka.</p>}
              </div>
            </div>

            <div className="flex items-center gap-3" style={{ marginTop: 18 }}>
              <label style={{ color: 'rgba(255,255,255,0.72)', fontSize: 12, fontFamily: 'monospace' }}>Status Aktif</label>
              <button
                onClick={() => setDraft(d => ({ ...d, aktif: !d.aktif }))}
                className="relative inline-flex h-5 w-9 items-center transition-colors duration-200"
                style={{ border: 'none', borderRadius: 99, background: draft.aktif ? 'rgba(0,255,136,0.55)' : 'rgba(255,255,255,0.12)', cursor: 'pointer' }}
              >
                <span className={`inline-block h-3.5 w-3.5 rounded-full transition-transform ${draft.aktif ? 'translate-x-5' : 'translate-x-1'}`} style={{ background: '#f0f0f0' }} />
              </button>
              <span style={{ color: draft.aktif ? '#00ff88' : 'rgba(255,255,255,0.35)', fontSize: 12, fontFamily: 'monospace' }}>{draft.aktif ? 'Aktif' : 'Nonaktif'}</span>
            </div>

            <div className="flex items-center gap-3 pt-4 mt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button onClick={handleSave} disabled={!canSave} className="flex items-center gap-2 px-4 py-2 transition-colors" style={{ ...primaryButton, opacity: canSave ? 1 : 0.45, cursor: canSave ? 'pointer' : 'not-allowed' }}>
                <Save size={14} /> Simpan
              </button>
              {saved && !dirty && <span className="flex items-center gap-1 text-xs font-mono" style={{ color: '#00ff88' }}><Check size={13} /> Tersimpan</span>}
              {dirty && <span className="text-xs font-mono" style={{ color: '#ffaa00' }}>Perubahan belum disimpan</span>}
            </div>
          </div>
        )}

        {tab === 'data' && (
          <div className="space-y-4">
            <div className="p-4 flex items-start gap-3" style={{ borderRadius: 3, background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.18)' }}>
              <AlertCircle size={16} className="shrink-0 mt-0.5" style={{ color: '#ffaa00' }} />
              <div>
                <p className="text-sm font-mono font-semibold" style={{ color: '#ffaa00' }}>Mode Edit Data TPK</p>
                <p className="text-xs font-mono mt-1" style={{ color: 'rgba(255,170,0,0.72)' }}>
                  Buka halaman operasional dalam konteks {tpk.namatpk}. Semua perubahan akan tersimpan ke TPK ini.
                </p>
                <button onClick={handleBrowseData} className="mt-3 flex items-center gap-2 px-3 py-1.5 transition-colors" style={{ borderRadius: 3, border: '1px solid rgba(255,170,0,0.3)', background: 'rgba(255,170,0,0.15)', color: '#ffaa00', fontFamily: 'monospace', fontSize: 11, fontWeight: 700 }}>
                  Buka Data {tpk.namatpk}
                </button>
              </div>
            </div>

            <div style={{ ...panelStyle, overflow: 'hidden' }}>
              <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 className="text-sm font-mono font-semibold" style={{ color: '#f0f0f0' }}>Riwayat Periode</h3>
              </div>
              {periodeLoading ? (
                <TableSkeleton rows={4} columns={4} />
              ) : periodes.length === 0 ? (
                <div className="p-6 text-sm text-center font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>Belum ada periode.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                <table className="w-full text-sm" style={{ minWidth: 520 }}>
                  <thead style={{ background: 'rgba(255,255,255,0.015)' }}>
                    <tr>
                      <th className="text-left px-5 py-3 font-mono text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Periode</th>
                      <th className="text-left px-5 py-3 font-mono text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Tanggal</th>
                      <th className="text-right px-5 py-3 font-mono text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Total UK</th>
                      <th className="text-center px-5 py-3 font-mono text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodes.map(p => (
                      <tr key={p.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        <td className="px-5 py-3 font-mono font-medium" style={{ color: '#f0f0f0' }}>{p.periode}</td>
                        <td className="px-5 py-3 font-mono text-xs" style={{ color: 'rgba(255,255,255,0.38)' }}>{formatTanggal(p.tgl_awal)} - {formatTanggal(p.tgl_akhir)}</td>
                        <td className="px-5 py-3 text-right font-mono font-semibold" style={{ color: '#00ff88' }}>{fmt(p.total_uk)}</td>
                        <td className="px-5 py-3 text-center"><StatusBadge aktif={p.status === 'aktif'} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'akun' && (
          <div className="p-6 space-y-3" style={panelStyle}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="block font-mono text-xs" style={{ color: 'rgba(0,255,136,0.72)' }}>Email Operator</label>
              <button onClick={() => { setShowAddModal(true); setAddError(''); setAddForm({ email: '', password: '' }) }} className="flex items-center gap-1.5 px-3 py-1.5 transition-colors" style={primaryButton}>
                <UserPlus size={13} /> Tambah Operator
              </button>
            </div>

            {operatorError && (
              <div className="flex items-start gap-2 px-3 py-2 font-mono text-xs" style={{ borderRadius: 3, border: '1px solid rgba(255,107,107,0.22)', background: 'rgba(255,107,107,0.1)', color: '#ff6b6b' }}>
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{operatorError}</span>
              </div>
            )}

            {operators === null ? (
              <div className="py-2"><InlineLoader /></div>
            ) : operators.length === 0 ? (
              <div className="text-sm font-mono py-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Belum ada akun terdaftar.</div>
            ) : (
              operators.map(({ user_id, email }) => (
                <div key={user_id} className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex flex-1 items-center gap-2 px-3 py-2.5 min-w-0" style={{ borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.025)' }}>
                      <Mail size={14} className="shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
                      <span className="text-sm font-mono truncate" style={{ color: 'rgba(255,255,255,0.68)' }}>{email}</span>
                    </div>
                    {resetSent[email] ? (
                      <span className="flex items-center gap-1 text-xs font-mono whitespace-nowrap shrink-0" style={{ color: '#00ff88' }}><Check size={13} /> Terkirim</span>
                    ) : (
                      <button onClick={() => handleResetPassword(email)} disabled={resetting[email]} title="Kirim email reset password" className="flex items-center gap-1.5 px-3 py-2.5 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0" style={ghostButton}>
                        <RefreshCw size={13} className={resetting[email] ? 'animate-spin' : ''} /> Reset Password
                      </button>
                    )}
                    <button onClick={() => setConfirmDelete(user_id)} title="Hapus operator" className="p-2.5 transition-colors shrink-0" style={{ borderRadius: 3, border: '1px solid rgba(255,107,107,0.18)', background: 'rgba(255,107,107,0.08)', color: '#ff6b6b', cursor: 'pointer' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {confirmDelete === user_id && (
                    <div className="flex items-center gap-2 px-3 py-2" style={{ borderRadius: 3, background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.22)' }}>
                      <span className="text-xs font-mono flex-1" style={{ color: '#ff6b6b' }}>Hapus operator ini? Akun tidak bisa dipulihkan.</span>
                      <button onClick={() => setConfirmDelete(null)} className="text-xs font-mono px-2 py-1 transition-colors" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>Batal</button>
                      <button onClick={() => handleDeleteOperator(user_id)} disabled={deleting === user_id} className="flex items-center gap-1 text-xs font-mono px-2.5 py-1 transition-colors disabled:opacity-50" style={{ borderRadius: 3, background: 'rgba(255,107,107,0.15)', border: '1px solid rgba(255,107,107,0.3)', color: '#ff6b6b', cursor: deleting === user_id ? 'not-allowed' : 'pointer' }}>
                        {deleting === user_id && <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        Hapus
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.72)' }}>
            <div className="w-full max-w-sm" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, boxShadow: '0 24px 80px rgba(0,0,0,0.55)' }}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 className="text-sm font-mono font-semibold" style={{ color: '#f0f0f0' }}>Tambah Operator</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 transition-colors" style={{ borderRadius: 3, background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}><X size={15} /></button>
              </div>
              <form onSubmit={handleAddOperator} className="p-5 space-y-4">
                <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.42)' }}>Operator baru akan ditambahkan ke <span style={{ color: '#00ff88', fontWeight: 700 }}>{tpk.namatpk}</span>.</p>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} placeholder="operator@email.com" required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Password Awal</label>
                  <div className="relative">
                    <input type={addShowPass ? 'text' : 'password'} value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 8 karakter" required minLength={8} style={{ ...inputStyle, paddingRight: 40 }} />
                    <button type="button" onClick={() => setAddShowPass(v => !v)} tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>{addShowPass ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                  </div>
                  {addForm.password && addForm.password.length < 8 && <p className="text-[11px] text-red-500 mt-1">Password minimal 8 karakter.</p>}
                </div>
                {addError && <p className="text-xs font-mono px-3 py-2" style={{ color: '#ff6b6b', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.22)', borderRadius: 3 }}>{addError}</p>}
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 transition-colors" style={ghostButton}>Batal</button>
                  <button type="submit" disabled={adding || !addForm.email.trim() || addForm.password.length < 8} className="flex-1 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" style={primaryButton}>
                    {adding && <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {adding ? 'Menyimpan...' : 'Tambah'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
