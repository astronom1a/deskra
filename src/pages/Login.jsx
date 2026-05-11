import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { version as appVersion } from '../../package.json'
import { gsap } from 'gsap'

export default function Login() {
  const navigate = useNavigate()
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')

  const rootRef = useRef(null)

  // ── GSAP entrance ─────────────────────────────────────────────────────────
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from('[data-logo]',        { scale: 0.5, opacity: 0, duration: 0.8, ease: 'back.out(2.5)' })
        .from('[data-brand-label]', { y: 10, opacity: 0, duration: 0.4 }, '-=0.35')
        .from('[data-brand-title]', { y: 12, opacity: 0, duration: 0.45 }, '-=0.3')
        .from('[data-brand-sub]',   { y: 8,  opacity: 0, duration: 0.35 }, '-=0.25')
        .from('[data-card]',        { y: 32, opacity: 0, scale: 0.97, duration: 0.65, ease: 'power4.out' }, '-=0.25')
        .from('[data-field]',       { x: -14, opacity: 0, stagger: 0.09, duration: 0.38 }, '-=0.35')
    }, rootRef)
    return () => ctx.revert()
  }, [])

  // ── Auth ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email atau password salah. Silakan coba lagi.')
      setLoading(false)
      gsap.timeline()
        .to('[data-card]', { x: -8, duration: 0.07, ease: 'power2.out' })
        .to('[data-card]', { x:  8, duration: 0.07 })
        .to('[data-card]', { x: -5, duration: 0.06 })
        .to('[data-card]', { x:  5, duration: 0.06 })
        .to('[data-card]', { x:  0, duration: 0.05, clearProps: 'transform' })
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    navigate(profile?.role === 'admin' ? '/admin' : '/dashboard', { replace: true })
  }

  const canSubmit = !loading && email && password

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      ref={rootRef}
      className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden"
      style={{ background: '#0a0a0a', color: '#f0f0f0' }}
    >
      {/* CSS keyframes */}
      <style>{`
        @keyframes geo-rotate-cw  { to { transform: rotate(360deg);  } }
        @keyframes geo-rotate-ccw { to { transform: rotate(-360deg); } }
        @keyframes geo-float {
          0%,100% { transform: translate(-50%,-50%) translateY(0px);   }
          50%      { transform: translate(-50%,-50%) translateY(-18px); }
        }
        @keyframes geo-pulse {
          0%,100% { opacity: 0.05; }
          50%      { opacity: 0.14; }
        }
        @keyframes mark-orbit { to { transform: rotate(360deg); } }
        @keyframes mark-pulse { 0%,100%{opacity:.35} 50%{opacity:.9} }
        .mark-spin  { transform-origin: 50% 50%; animation: mark-orbit 18s linear infinite; }
        .mark-pulse { animation: mark-pulse 2.4s ease-in-out infinite; }
        .login-input::placeholder { color: rgba(255,255,255,0.2); }
        .login-input:focus {
          outline: none;
          border-color: rgba(0,255,136,0.5);
          box-shadow: 0 0 0 3px rgba(0,255,136,0.08);
        }
      `}</style>

      {/* Dot grid */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
        <defs>
          <pattern id="dots" width="56" height="56" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.8" fill="white" opacity="0.10" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>

      {/* Hexagon — top right, slow CW */}
      <div className="absolute pointer-events-none" style={{ top: '2%', right: '2%', animation: 'geo-rotate-cw 70s linear infinite' }}>
        <svg width="320" height="320" viewBox="-160 -160 320 320">
          <polygon points="0,-110 95.3,-55 95.3,55 0,110 -95.3,55 -95.3,-55"
            fill="none" stroke="#00ff88" strokeWidth="0.7" opacity="0.25" />
          <polygon points="0,-70 60.6,-35 60.6,35 0,70 -60.6,35 -60.6,-35"
            fill="none" stroke="#00ff88" strokeWidth="0.3" opacity="0.15" />
        </svg>
      </div>

      {/* Triangle — bottom left, slow CCW */}
      <div className="absolute pointer-events-none" style={{ bottom: '3%', left: '2%', animation: 'geo-rotate-ccw 90s linear infinite' }}>
        <svg width="260" height="260" viewBox="-130 -130 260 260">
          <polygon points="0,-100 86.6,50 -86.6,50"
            fill="none" stroke="white" strokeWidth="0.6" opacity="0.12" />
          <polygon points="0,-58 50.2,29 -50.2,29"
            fill="none" stroke="#00ff88" strokeWidth="0.4" opacity="0.10" />
        </svg>
      </div>

      {/* Cross lines — center, float */}
      <div className="absolute pointer-events-none" style={{ top: '46%', left: '50%', animation: 'geo-float 14s ease-in-out infinite' }}>
        <svg width="200" height="200" viewBox="-100 -100 200 200">
          <line x1="-80" y1="0" x2="80" y2="0" stroke="white" strokeWidth="0.4" opacity="0.06" />
          <line x1="0" y1="-80" x2="0" y2="80" stroke="white" strokeWidth="0.4" opacity="0.06" />
          <line x1="-56" y1="-56" x2="56" y2="56" stroke="#00ff88" strokeWidth="0.4" opacity="0.06" />
          <line x1="56" y1="-56" x2="-56" y2="56" stroke="#00ff88" strokeWidth="0.4" opacity="0.06" />
          <circle cx="0" cy="0" r="4" fill="none" stroke="#00ff88" strokeWidth="0.5" opacity="0.12" />
        </svg>
      </div>

      {/* Square — right mid, CW */}
      <div className="absolute pointer-events-none" style={{ top: '45%', right: '5%', animation: 'geo-rotate-cw 35s linear infinite' }}>
        <svg width="100" height="100" viewBox="-50 -50 100 100">
          <rect x="-38" y="-38" width="76" height="76" fill="none" stroke="white"    strokeWidth="0.5" opacity="0.09" />
          <rect x="-22" y="-22" width="44" height="44" fill="none" stroke="#00ff88" strokeWidth="0.4" opacity="0.09" />
        </svg>
      </div>

      {/* Diamond — top left, pulse */}
      <div className="absolute pointer-events-none" style={{ top: '18%', left: '5%', animation: 'geo-pulse 8s ease-in-out infinite' }}>
        <svg width="80" height="80" viewBox="-40 -40 80 80">
          <polygon points="0,-34 34,0 0,34 -34,0"
            fill="none" stroke="#00ff88" strokeWidth="0.6" opacity="0.45" />
        </svg>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-sm">

        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          {/* Orbital mark */}
          <div data-logo className="mb-5">
            <svg viewBox="0 0 100 100" width="64" height="64" fill="none" aria-hidden="true">
              <g className="mark-spin">
                <ellipse cx="50" cy="50" rx="42" ry="14" stroke="#1a2a1a" strokeWidth="1.2"/>
                <ellipse cx="50" cy="50" rx="42" ry="14" stroke="#1a2a1a" strokeWidth="1.2" transform="rotate(60 50 50)"/>
                <ellipse cx="50" cy="50" rx="42" ry="14" stroke="#1a2a1a" strokeWidth="1.2" transform="rotate(120 50 50)"/>
                <circle r="2.4" fill="#f0f0f0">
                  <animateMotion dur="8s" repeatCount="indefinite" rotate="none"
                    path="M 92,50 A 42,14 0 0,1 8,50 A 42,14 0 0,1 92,50"/>
                </circle>
              </g>
              <circle cx="50" cy="50" r="11" stroke="#00ff88" strokeWidth="1.2" opacity=".5" className="mark-pulse"/>
              <circle cx="50" cy="50" r="6" fill="#00ff88"/>
            </svg>
          </div>

          <h1 data-brand-title className="text-3xl font-bold tracking-tight" style={{ color: '#f0f0f0', letterSpacing: '-0.02em' }}>
            Deskra
          </h1>
          <p data-brand-label className="text-xs font-mono tracking-widest uppercase mt-2" style={{ color: '#00ff88' }}>
            sistem administrasi
          </p>
        </div>

        {/* Card */}
        <div data-card style={{
          background: 'rgba(255,255,255,0.025)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 4,
          padding: '28px 28px 24px',
        }}>
          <p className="text-xs font-mono mb-5" style={{ color: '#666666' }}>
            — masuk ke akun anda
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div data-field>
              <label className="block text-xs font-mono mb-1.5 tracking-wide" style={{ color: '#00ff88' }}>
                email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nama@email.com"
                required
                autoComplete="email"
                className="login-input w-full text-sm transition-all"
                style={{
                  padding: '10px 12px',
                  borderRadius: 3,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.03)',
                  color: '#f0f0f0',
                  fontSize: 14,
                }}
              />
            </div>

            <div data-field>
              <label className="block text-xs font-mono mb-1.5 tracking-wide" style={{ color: '#00ff88' }}>
                password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="login-input w-full text-sm transition-all"
                  style={{
                    padding: '10px 40px 10px 12px',
                    borderRadius: 3,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.03)',
                    color: '#f0f0f0',
                    fontSize: 14,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-100"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  {showPassword ? <EyeOff size={14}/> : <Eye size={14}/>}
                </button>
              </div>
            </div>

            {error && (
              <div data-field className="text-xs font-mono px-3 py-2" style={{
                color: '#ff6b6b',
                background: 'rgba(255,107,107,0.08)',
                border: '1px solid rgba(255,107,107,0.15)',
                borderRadius: 3,
              }}>
                {error}
              </div>
            )}

            <div data-field className="pt-1">
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold font-mono transition-all"
                style={{
                  padding: '10px 16px',
                  borderRadius: 3,
                  border: 'none',
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                  background: canSubmit ? '#00ff88' : 'rgba(0,255,136,0.15)',
                  color: canSubmit ? '#0a0a0a' : 'rgba(0,255,136,0.4)',
                  letterSpacing: '0.04em',
                }}
              >
                {loading
                  ? <span className="inline-block w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(0,0,0,0.2)', borderTopColor: '#0a0a0a' }}/>
                  : null}
                {loading ? 'memproses...' : 'masuk'}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.15)' }}>
            v{appVersion}
          </p>
          <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.15)' }}>
            ©{' '}
            <a
              href="https://astrolabs.site"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'rgba(0,255,136,0.35)', transition: 'color 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#00ff88' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(0,255,136,0.35)' }}
            >
              AstroLabs Studio
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
