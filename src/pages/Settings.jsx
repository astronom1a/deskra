import { useState } from 'react'
import { Sun, Moon, Monitor, UserCog, Save, Check } from 'lucide-react'
import { useTheme } from '../lib/useTheme'
import { useAuth } from '../lib/AuthProvider'

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const { profile, tpk, updateProfile } = useAuth()

  const [namaOperator, setNamaOperator] = useState(profile?.nama_operator || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const dirty = namaOperator.trim() !== (profile?.nama_operator || '')
  const canSave = dirty && namaOperator.trim().length > 0 && !saving

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError('')
    const { error } = await updateProfile({ nama_operator: namaOperator.trim() })
    if (error) {
      setError(typeof error === 'string' ? error : error.message || 'Gagal menyimpan.')
    } else {
      setSaved(true)
    }
    setSaving(false)
  }

  const options = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark',  label: 'Dark',  icon: Moon },
  ]

  const inputCls = 'w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">Settings</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Atur preferensi aplikasi dan data akun.</p>

      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 mb-5">
        <div className="flex items-center gap-3 mb-4">
          <UserCog size={18} className="text-primary-600 dark:text-primary-300" />
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Akun</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Identitas operator dan TPK.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Nama Operator</label>
            <input
              type="text"
              value={namaOperator}
              onChange={e => { setNamaOperator(e.target.value); setSaved(false) }}
              placeholder="cth. Budi Santoso"
              className={`${inputCls} border-gray-200 dark:border-gray-600`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Lokasi TPK</label>
            <input
              type="text"
              value={tpk?.namatpk || '—'}
              disabled
              className={`${inputCls} border-gray-200 dark:border-gray-600 opacity-60 cursor-not-allowed`}
            />
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Dikelola oleh admin.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Kode TPK</label>
            <input
              type="text"
              value={tpk?.kode_tpk || '—'}
              disabled
              className={`${inputCls} border-gray-200 dark:border-gray-600 opacity-60 cursor-not-allowed`}
            />
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Dikelola oleh admin.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:bg-gray-300 disabled:dark:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {saving
              ? <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Save size={15} />}
            Simpan
          </button>
          {saved && !dirty && (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <Check size={14} /> Tersimpan di sistem
            </span>
          )}
          {dirty && !saving && (
            <span className="text-xs text-amber-600 dark:text-amber-400">Perubahan belum disimpan</span>
          )}
          {error && (
            <span className="text-xs text-red-500">{error}</span>
          )}
        </div>
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center gap-3 mb-4">
          <Monitor size={18} className="text-primary-600 dark:text-primary-300" />
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Tampilan</h2>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Mode Tema</p>
        <div className="relative inline-flex p-1 rounded-xl bg-gray-100 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700">
          <span
            aria-hidden
            className="absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-primary-600 shadow-sm transition-transform duration-300 ease-out"
            style={{ transform: `translateX(${theme === 'dark' ? '100%' : '0%'})` }}
          />
          {options.map(opt => {
            const Icon = opt.icon
            const active = theme === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`relative z-10 flex items-center justify-center gap-2 w-28 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-300 ${
                  active ? 'text-white' : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                }`}
              >
                <Icon size={16} className={`transition-transform duration-300 ${active ? 'rotate-0 scale-100' : 'scale-90'}`} />
                {opt.label}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
