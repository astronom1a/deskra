import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TreePine, LogIn, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { version as appVersion } from '../../package.json'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email atau password salah. Silakan coba lagi.')
      setLoading(false)
      return
    }

    navigate('/dashboard', { replace: true })
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary-800 dark:bg-primary-900 p-3.5 rounded-2xl shadow-lg mb-4">
            <TreePine size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Deskra</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sistem Administrasi Kantor TPK</p>
          <span className="mt-2 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 text-[10px] font-mono">
            v{appVersion}
          </span>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-5">Masuk ke akun Anda</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nama@email.com"
                required
                autoComplete="email"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
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
            </div>

            {error && (
              <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn size={15} />
              )}
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
          Perum Perhutani · KPH Banyuwangi Utara
        </p>
      </div>
    </div>
  )
}
