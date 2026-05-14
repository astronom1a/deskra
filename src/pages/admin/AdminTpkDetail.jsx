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

const TABS = [
  { id: 'info',  label: 'Info',  icon: Info },
  { id: 'data',  label: 'Data',  icon: Database },
  { id: 'akun',  label: 'Akun',  icon: UserCog },
]

export default function AdminTpkDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { setActiveTpkId } = useAuth()
  const [tab, setTab] = useState('info')
  const [tpk, setTpk] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Info tab state
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Data tab state
  const [periodes, setPeriodes] = useState([])
  const [periodeLoading, setPeriodeLoading] = useState(false)

  // Akun tab state
  const [operators, setOperators] = useState(null) // null = loading, [] = kosong
  const [resetSent, setResetSent] = useState({}) // { email: true }
  const [resetting, setResetting] = useState({})
  const [operatorError, setOperatorError] = useState('')

  // Modal tambah operator
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ email: '', password: '' })
  const [addShowPass, setAddShowPass] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  // Hapus operator
  const [confirmDelete, setConfirmDelete] = useState(null) // user_id yang dikonfirmasi
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('tabel_tpk')
          .select('*')
          .eq('id', id)
          .single()
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
    if (tab === 'data' && periodes.length === 0) {
      setPeriodeLoading(true)
      supabase
        .from('tabel_periode')
        .select('id, periode, tgl_awal, tgl_akhir, status')
        .eq('tpk_id', id)
        .order('created_at', { ascending: false })
        .then(async ({ data }) => {
          const list = data || []
          const totals = await Promise.all(list.map(p => computeTotalUK(p.id, p.periode, { tpkId: p.tpk_id || id })))
          setPeriodes(list.map((p, i) => ({ ...p, total_uk: totals[i] })))
          setPeriodeLoading(false)
        })
    }
  }, [tab, id])

  useEffect(() => {
    if (tab === 'akun') {
      setOperators(null)
      supabase
        .rpc('get_tpk_user_emails', { p_tpk_id: id })
        .then(({ data }) => setOperators(data || []))
    }
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
    }
    setSaving(false)
  }

  const handleAddOperator = async (e) => {
    e.preventDefault()
    setAddError('')
    setAdding(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/add-tpk-operator`
      const res = await fetch(url, {
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
      // Refresh daftar operator
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

  const fmt = v => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(Math.round(v || 0))

  const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'

  if (loading) return <div className="p-6 text-gray-400 text-sm">Memuat...</div>
  if (error) return <div className="p-6 text-red-500 text-sm">{error}</div>

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button
        onClick={() => navigate('/admin/tpk')}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6 transition-colors"
      >
        <ArrowLeft size={15} /> Kembali ke Daftar TPK
      </button>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{tpk.namatpk}</h1>
        {tpk.aktif ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 size={10} /> Aktif
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            <XCircle size={10} /> Nonaktif
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6">
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                active
                  ? 'border-primary-600 text-primary-700 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <Icon size={14} /> {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab: Info */}
      {tab === 'info' && draft && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">Lokasi TPK</label>
              <input
                type="text"
                value={draft.namatpk}
                onChange={e => setDraft(d => ({ ...d, namatpk: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">Kode TPK</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={7}
                value={draft.kode_tpk}
                onChange={e => setDraft(d => ({ ...d, kode_tpk: e.target.value.replace(/\D/g, '').slice(0, 7) }))}
                placeholder="7 digit angka"
                className={`${inputCls} ${kodeErr ? 'border-red-400 focus:ring-red-500' : ''}`}
              />
              {kodeErr && <p className="text-[11px] text-red-500 mt-1">Harus 7 digit angka.</p>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Status Aktif</label>
            <button
              onClick={() => setDraft(d => ({ ...d, aktif: !d.aktif }))}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${draft.aktif ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${draft.aktif ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">{draft.aktif ? 'Aktif' : 'Nonaktif'}</span>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save size={14} /> Simpan
            </button>
            {saved && !dirty && (
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <Check size={13} /> Tersimpan
              </span>
            )}
            {dirty && <span className="text-xs text-amber-500">Perubahan belum disimpan</span>}
          </div>
        </div>
      )}

      {/* Tab: Data */}
      {tab === 'data' && (
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Mode Edit Data TPK</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Kamu bisa membuka semua halaman operasional (Main Link, Register Kapling, dll) dalam konteks TPK ini.
                Semua perubahan yang kamu buat akan tersimpan ke data {tpk.namatpk}.
              </p>
              <button
                onClick={handleBrowseData}
                className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition-colors"
              >
                Buka Data {tpk.namatpk}
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Riwayat Periode</h3>
            </div>
            {periodeLoading ? (
              <div className="p-6 text-gray-400 text-sm text-center">Memuat...</div>
            ) : periodes.length === 0 ? (
              <div className="p-6 text-gray-400 text-sm text-center">Belum ada periode.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Periode</th>
                    <th className="text-right px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Total UK</th>
                    <th className="text-center px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {periodes.map(p => (
                    <tr key={p.id}>
                      <td className="px-5 py-3 font-medium text-gray-800 dark:text-gray-100">{p.periode}</td>
                      <td className="px-5 py-3 text-right font-semibold text-primary-700 dark:text-primary-400">{fmt(p.total_uk)}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.status === 'aktif'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                        }`}>{p.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab: Akun */}
      {tab === 'akun' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Email Operator</label>
            <button
              onClick={() => { setShowAddModal(true); setAddError(''); setAddForm({ email: '', password: '' }) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium transition-colors"
            >
              <UserPlus size={13} /> Tambah Operator
            </button>
          </div>

          {operatorError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{operatorError}</span>
            </div>
          )}

          {operators === null ? (
            <div className="text-sm text-gray-400 py-2">Memuat...</div>
          ) : operators.length === 0 ? (
            <div className="text-sm text-gray-400 py-2">Belum ada akun terdaftar.</div>
          ) : (
            operators.map(({ user_id, email }) => (
              <div key={user_id} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 min-w-0">
                    <Mail size={14} className="text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{email}</span>
                  </div>
                  {resetSent[email] ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 whitespace-nowrap shrink-0">
                      <Check size={13} /> Terkirim
                    </span>
                  ) : (
                    <button
                      onClick={() => handleResetPassword(email)}
                      disabled={resetting[email]}
                      title="Kirim email reset password"
                      className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      <RefreshCw size={13} className={resetting[email] ? 'animate-spin' : ''} />
                      Reset Password
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmDelete(user_id)}
                    title="Hapus operator"
                    className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-400 hover:text-red-500 hover:border-red-300 dark:hover:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {confirmDelete === user_id && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <span className="text-xs text-red-600 dark:text-red-400 flex-1">Hapus operator ini? Akun tidak bisa dipulihkan.</span>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-1 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => handleDeleteOperator(user_id)}
                      disabled={deleting === user_id}
                      className="flex items-center gap-1 text-xs text-white bg-red-600 hover:bg-red-700 px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
                    >
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

      {/* Modal: Tambah Operator */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Tambah Operator</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleAddOperator} className="p-5 space-y-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Operator baru akan ditambahkan ke <span className="font-medium text-gray-700 dark:text-gray-200">{tpk.namatpk}</span>.
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="operator@email.com"
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">Password Awal</label>
                <div className="relative">
                  <input
                    type={addShowPass ? 'text' : 'password'}
                    value={addForm.password}
                    onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Min. 8 karakter"
                    required
                    minLength={8}
                    className={`${inputCls} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setAddShowPass(v => !v)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {addShowPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {addForm.password && addForm.password.length < 8 && (
                  <p className="text-[11px] text-red-500 mt-1">Password minimal 8 karakter.</p>
                )}
              </div>
              {addError && (
                <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg px-3 py-2">
                  {addError}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={adding || !addForm.email.trim() || addForm.password.length < 8}
                  className="flex-1 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {adding && <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {adding ? 'Menyimpan...' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
