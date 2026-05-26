import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Eye, EyeOff, CheckCircle2, Copy, Check } from 'lucide-react'

export default function AdminTpkBuat() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ namatpk: '', kode_tpk: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const text = `Email: ${form.email}\nPassword: ${form.password}`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const kodeErr = form.kode_tpk !== '' && !/^\d{7}$/.test(form.kode_tpk)
  const canSubmit = form.namatpk.trim() && form.email.trim() &&
    form.password.length >= 8 && !kodeErr && !loading

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { data: fnUrl } = supabase.functions.url ? {} :
        { data: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-tpk-user` }

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-tpk-user`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          namatpk: /^tpk\s/i.test(form.namatpk.trim()) ? form.namatpk.trim() : `TPK ${form.namatpk.trim()}`,
          kode_tpk: form.kode_tpk || null,
          email: form.email.trim(),
          password: form.password,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Terjadi kesalahan')

      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'

  if (success) {
    const namaFinal = /^tpk\s/i.test(form.namatpk.trim()) ? form.namatpk.trim() : `TPK ${form.namatpk.trim()}`
    return (
      <div className="p-6 max-w-lg mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 size={28} className="text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1 text-center">
            {namaFinal} berhasil dibuat
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 text-center">
            Akun operator sudah aktif dan bisa login.
          </p>

          {/* Kotak kredensial */}
          <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 mb-5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Kredensial login operator</p>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-mono text-gray-800 dark:text-gray-100 truncate">{form.email}</p>
                <p className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-0.5">{'•'.repeat(Math.min(form.password.length, 12))}</p>
              </div>
              <button
                onClick={handleCopy}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: copied ? 'rgb(220,252,231)' : 'rgb(243,244,246)',
                  color: copied ? 'rgb(22,101,52)' : 'rgb(75,85,99)',
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Tersalin' : 'Salin'}
              </button>
            </div>
          </div>

          {/* Checklist langkah selanjutnya */}
          <div className="mb-6">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Langkah selanjutnya</p>
            <ol className="space-y-2">
              {[
                'Kirim email & password ke operator kantor',
                'Buka data TPK → tambah pejabat yang aktif',
                'Minta operator login dan buat periode pertama',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/admin/tpk')}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Lihat Daftar TPK
            </button>
            <button
              onClick={() => { setSuccess(false); setCopied(false); setForm({ namatpk: '', kode_tpk: '', email: '', password: '' }) }}
              className="flex-1 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
            >
              Tambah TPK Lain
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <button
        onClick={() => navigate('/admin/tpk')}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6 transition-colors"
      >
        <ArrowLeft size={15} /> Kembali
      </button>

      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">Tambah TPK Baru</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Buat akun operator dan data TPK baru.</p>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">Lokasi TPK</label>
              <input
                type="text"
                value={form.namatpk}
                onChange={e => setField('namatpk', e.target.value)}
                placeholder="cth. TPK Wongsorejo"
                required
                className={inputCls}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                Kode TPK <span className="text-gray-400 font-normal">(opsional)</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={7}
                value={form.kode_tpk}
                onChange={e => setField('kode_tpk', e.target.value.replace(/\D/g, '').slice(0, 7))}
                placeholder="7 digit angka"
                className={`${inputCls} ${kodeErr ? 'border-red-400 focus:ring-red-500' : ''}`}
              />
              {kodeErr && <p className="text-[11px] text-red-500 mt-1">Harus 7 digit angka.</p>}
            </div>
          </div>

          <hr className="border-gray-100 dark:border-gray-700" />

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">Email Login Operator</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setField('email', e.target.value)}
              placeholder="operator@email.com"
              required
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">Password Awal</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => setField('password', e.target.value)}
                placeholder="Min. 8 karakter"
                required
                minLength={8}
                className={`${inputCls} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {form.password && form.password.length < 8 && (
              <p className="text-[11px] text-red-500 mt-1">Password minimal 8 karakter.</p>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : null}
            {loading ? 'Membuat akun...' : 'Buat Akun TPK'}
          </button>
        </form>
      </div>
    </div>
  )
}
