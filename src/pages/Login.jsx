import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TreePine, LogIn, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { version as appVersion } from '../../package.json'

const SHAPES = [
  { id: 1,  type: 'triangle', size: 60, pos: { top: '8%',  left: '6%'   }, opacity: 0.18, dur: '9s',   del: '0s',   anim: 'geo-float', color: '#277350' },
  { id: 2,  type: 'hexagon',  size: 44, pos: { top: '5%',  right: '9%'  }, opacity: 0.14, dur: '12s',  del: '1.5s', anim: 'geo-drift', color: '#5aad83' },
  { id: 3,  type: 'diamond',  size: 34, pos: { top: '56%', left: '4%'   }, opacity: 0.20, dur: '8s',   del: '3s',   anim: 'geo-float', color: '#379165' },
  { id: 4,  type: 'circle',   size: 20, pos: { top: '72%', left: '17%'  }, opacity: 0.22, dur: '7s',   del: '0.5s', anim: 'geo-drift', color: '#8dcaaa' },
  { id: 5,  type: 'square',   size: 26, pos: { top: '20%', right: '6%'  }, opacity: 0.15, dur: '10s',  del: '2s',   anim: 'geo-float', color: '#277350' },
  { id: 6,  type: 'triangle', size: 18, pos: { top: '82%', right: '13%' }, opacity: 0.14, dur: '7.5s', del: '4s',   anim: 'geo-drift', color: '#5aad83' },
  { id: 7,  type: 'ring',     size: 56, pos: { top: '40%', right: '4%'  }, opacity: 0.12, dur: '20s',  del: '0s',   anim: 'geo-spin',  color: '#379165' },
  { id: 8,  type: 'hexagon',  size: 28, pos: { top: '62%', right: '22%' }, opacity: 0.12, dur: '13s',  del: '2.5s', anim: 'geo-float', color: '#1c4a35' },
  { id: 9,  type: 'diamond',  size: 16, pos: { top: '16%', left: '27%'  }, opacity: 0.16, dur: '8.5s', del: '1s',   anim: 'geo-drift', color: '#8dcaaa' },
  { id: 10, type: 'square',   size: 44, pos: { top: '87%', left: '36%'  }, opacity: 0.09, dur: '14s',  del: '3.5s', anim: 'geo-float', color: '#277350' },
  { id: 11, type: 'circle',   size: 14, pos: { top: '46%', left: '11%'  }, opacity: 0.16, dur: '6s',   del: '2s',   anim: 'geo-drift', color: '#5aad83' },
  { id: 12, type: 'triangle', size: 38, pos: { top: '30%', left: '50%'  }, opacity: 0.07, dur: '16s',  del: '0.5s', anim: 'geo-float', color: '#379165' },
  { id: 13, type: 'ring',     size: 32, pos: { top: '15%', left: '42%'  }, opacity: 0.10, dur: '14s',  del: '3s',   anim: 'geo-spin',  color: '#5aad83' },
  { id: 14, type: 'hexagon',  size: 20, pos: { top: '90%', right: '35%' }, opacity: 0.13, dur: '9s',   del: '1s',   anim: 'geo-drift', color: '#277350' },
]

const CLIP = {
  triangle: 'polygon(50% 0%, 0% 100%, 100% 100%)',
  hexagon:  'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
  diamond:  'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
  square:   'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
}

function GeoShape({ type, size, pos, opacity, dur, del, anim, color }) {
  const base = {
    position: 'absolute',
    width: size,
    height: type === 'triangle' ? Math.round(size * 0.87) : size,
    ...pos,
    animation: `${anim} ${dur} ease-in-out ${del} infinite`,
    pointerEvents: 'none',
    willChange: 'transform',
  }

  if (type === 'ring') return (
    <div style={{ ...base, borderRadius: '50%', border: `2px solid ${color}`, opacity }} />
  )
  if (type === 'circle') return (
    <div style={{ ...base, borderRadius: '50%', backgroundColor: color, opacity }} />
  )
  return (
    <div style={{ ...base, backgroundColor: color, clipPath: CLIP[type], opacity }} />
  )
}

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

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email atau password salah. Silakan coba lagi.')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    navigate(profile?.role === 'admin' ? '/admin' : '/dashboard', { replace: true })
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid rgba(39,115,80,0.3)',
    background: 'rgba(6,20,12,0.6)',
    color: '#e2f0ea',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  }

  const canSubmit = !loading && email && password

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #060e0a 0%, #0b1c12 50%, #060d08 100%)' }}
    >
      {/* Ambient glow orbs */}
      <div style={{
        position: 'absolute', top: '-10%', right: '-8%',
        width: 520, height: 520, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(39,115,80,0.18) 0%, transparent 70%)',
        animation: 'orb-breathe 9s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-15%', left: '-10%',
        width: 480, height: 480, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(55,145,101,0.14) 0%, transparent 70%)',
        animation: 'orb-breathe 11s ease-in-out 2s infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '35%', left: '22%',
        width: 320, height: 320, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(28,74,53,0.12) 0%, transparent 70%)',
        animation: 'orb-breathe 13s ease-in-out 4s infinite',
        pointerEvents: 'none',
      }} />

      {/* Dot grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(39,115,80,0.18) 1px, transparent 1px)',
        backgroundSize: '30px 30px',
        pointerEvents: 'none',
        opacity: 0.5,
      }} />

      {/* Geometric shapes */}
      {SHAPES.map(s => <GeoShape key={s.id} {...s} />)}

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm" style={{ animation: 'card-enter 0.6s ease-out both' }}>

        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3.5 rounded-2xl mb-4" style={{
            background: 'linear-gradient(135deg, #277350, #1c4a35)',
            boxShadow: '0 0 28px rgba(39,115,80,0.45), 0 0 60px rgba(39,115,80,0.15)',
          }}>
            <TreePine size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#e8f5ee' }}>Deskra</h1>
          <p className="text-sm mt-1" style={{ color: '#8dcaaa' }}>Sistem Administrasi Kantor</p>
          <span className="mt-2 px-2 py-0.5 rounded-md text-[10px] font-mono" style={{
            background: 'rgba(39,115,80,0.15)',
            color: '#5aad83',
            border: '1px solid rgba(39,115,80,0.25)',
          }}>
            v{appVersion}
          </span>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(6,18,11,0.78)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(39,115,80,0.22)',
          borderRadius: 20,
          padding: 24,
          boxShadow: '0 30px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(141,202,170,0.06)',
        }}>
          <h2 className="font-semibold mb-5" style={{ color: '#d1ead9', fontSize: 15 }}>
            Masuk ke akun Anda
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#8dcaaa' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nama@email.com"
                required
                autoComplete="email"
                style={inputStyle}
                onFocus={e => {
                  e.target.style.borderColor = 'rgba(39,115,80,0.7)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(39,115,80,0.15)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(39,115,80,0.3)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#8dcaaa' }}>
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
                  style={{ ...inputStyle, paddingRight: 40 }}
                  onFocus={e => {
                    e.target.style.borderColor = 'rgba(39,115,80,0.7)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(39,115,80,0.15)'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'rgba(39,115,80,0.3)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#5aad83' }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs rounded-lg px-3 py-2" style={{
                color: '#fca5a5',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full flex items-center justify-center gap-2 text-sm font-medium text-white transition-all mt-1"
              style={{
                padding: '10px 16px',
                borderRadius: 10,
                border: 'none',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                background: canSubmit
                  ? 'linear-gradient(135deg, #277350 0%, #379165 100%)'
                  : 'rgba(39,115,80,0.3)',
                boxShadow: canSubmit ? '0 4px 20px rgba(39,115,80,0.4)' : 'none',
                opacity: canSubmit ? 1 : 0.6,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                if (canSubmit) e.currentTarget.style.boxShadow = '0 6px 28px rgba(39,115,80,0.55)'
              }}
              onMouseLeave={e => {
                if (canSubmit) e.currentTarget.style.boxShadow = '0 4px 20px rgba(39,115,80,0.4)'
              }}
            >
              {loading
                ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <LogIn size={15} />}
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(141,202,170,0.35)' }}>
          Perum Perhutani · KPH Banyuwangi Utara
        </p>
      </div>
    </div>
  )
}
