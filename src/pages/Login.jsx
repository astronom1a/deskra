import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { version as appVersion } from '../../package.json'
import { latestChangelog } from '../changelog.js'
import { gsap } from 'gsap'

export default function Login() {
  const navigate = useNavigate()
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [showChangelog, setShowChangelog] = useState(false)

  const rootRef = useRef(null)
  const changelogRef = useRef(null)

  // ── GSAP entrance ─────────────────────────────────────────────────────────
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from('[data-panel-brand]', { x: -24, opacity: 0, duration: 0.6 })
        .from('[data-brand-line]',  { y: 16, opacity: 0, stagger: 0.08, duration: 0.5 }, '-=0.35')
        .from('[data-form-head]',   { y: 14, opacity: 0, duration: 0.45 }, '-=0.4')
        .from('[data-field]',       { y: 12, opacity: 0, stagger: 0.08, duration: 0.4 }, '-=0.3')
    }, rootRef)
    return () => ctx.revert()
  }, [])

  // ── Click-outside handler for changelog popup ──────────────────────────────
  useEffect(() => {
    if (!showChangelog) return
    const handleClickOutside = (e) => {
      if (changelogRef.current && !changelogRef.current.contains(e.target)) {
        setShowChangelog(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showChangelog])

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
        .to('[data-form]', { x: -8, duration: 0.07, ease: 'power2.out' })
        .to('[data-form]', { x:  8, duration: 0.07 })
        .to('[data-form]', { x: -5, duration: 0.06 })
        .to('[data-form]', { x:  5, duration: 0.06 })
        .to('[data-form]', { x:  0, duration: 0.05, clearProps: 'transform' })
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
      className="relative min-h-screen flex overflow-hidden"
      style={{ background: '#0a0a0a', color: '#f0f0f0', minHeight: '100dvh' }}
    >
      {/* CSS keyframes */}
      <style>{`
        @keyframes cursor-blink { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }
        @keyframes scan-move { from { transform: translateY(-100%) } to { transform: translateY(100vh) } }
        .login-cursor { animation: cursor-blink 1.1s step-end infinite; }
        @keyframes dot-blink { 0%,60%,100% { opacity: 0.15 } 30% { opacity: 1 } }
        .loading-dot { animation: dot-blink 1.2s infinite; }
        .loading-dot:nth-child(2) { animation-delay: 0.2s; }
        .loading-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes btn-sweep { from { left: -40% } to { left: 110% } }
        .btn-sweep {
          position: absolute;
          top: 0; bottom: 0;
          width: 30%;
          background: linear-gradient(90deg, transparent, rgba(0,255,136,0.12), transparent);
          animation: btn-sweep 1.4s ease-in-out infinite;
          pointer-events: none;
        }
        .login-input::placeholder { color: rgba(255,255,255,0.2); }
        .login-input {
          border: none;
          border-bottom: 1px solid rgba(255,255,255,0.12);
          background: transparent;
          border-radius: 0;
        }
        .login-input:focus {
          outline: none;
          border-bottom-color: #00ff88;
        }
        .login-submit:not(:disabled):hover {
          background: #00ff88 !important;
          color: #0a0a0a !important;
        }
        .login-submit:not(:disabled):hover .submit-arrow { transform: translateX(4px); }
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

      {/* Scanline halus melintasi layar */}
      <div
        className="absolute inset-x-0 pointer-events-none"
        aria-hidden="true"
        style={{
          height: 120,
          background: 'linear-gradient(to bottom, transparent, rgba(0,255,136,0.03), transparent)',
          animation: 'scan-move 9s linear infinite',
        }}
      />

      {/* Changelog badge — fixed bottom left of viewport */}
      <div ref={changelogRef} style={{ position: 'fixed', bottom: 16, left: 16, zIndex: 50 }}>
        <button
          onClick={() => setShowChangelog(v => !v)}
          className="text-xs font-mono"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            background: 'none',
            border: 'none',
            padding: 0,
            color: showChangelog ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
          onMouseLeave={e => { if (!showChangelog) e.currentTarget.style.color = 'rgba(255,255,255,0.2)' }}
        >
          <span style={{ width: 24, height: 1, background: 'rgba(0,255,136,0.4)', display: 'inline-block' }} />
          v{appVersion}
        </button>

        {showChangelog && (
          <div style={{
            position: 'absolute',
            bottom: 40,
            left: 0,
            width: 260,
            background: '#161616',
            border: '1px solid rgba(0,255,136,0.2)',
            borderRadius: 8,
            padding: 16,
            boxShadow: '0 12px 40px rgba(0,0,0,0.75)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: '#00ff88' }}>
                What's new
              </span>
              <span style={{
                fontSize: 10,
                background: 'rgba(0,255,136,0.1)',
                border: '1px solid rgba(0,255,136,0.25)',
                color: '#00ff88',
                padding: '2px 8px',
                borderRadius: 10,
              }}>
                v{appVersion}
              </span>
            </div>

            {latestChangelog.items.map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                padding: '7px 0',
                borderBottom: i < latestChangelog.items.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                fontSize: 12,
                color: 'rgba(255,255,255,0.8)',
                lineHeight: 1.55,
              }}>
                <span style={{
                  flexShrink: 0,
                  fontWeight: 700,
                  width: 14,
                  textAlign: 'center',
                  color: item.type === 'feat' ? '#00ff88' : 'rgba(255,255,255,0.35)',
                  marginTop: 1,
                }}>
                  {item.type === 'feat' ? '+' : '✦'}
                </span>
                <span>
                  {item.text}
                  {item.type === 'fix' && (
                    <span style={{
                      display: 'inline-block',
                      fontSize: 9,
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: 'rgba(255,255,255,0.5)',
                      padding: '0 5px',
                      borderRadius: 2,
                      marginLeft: 5,
                      verticalAlign: 'middle',
                      letterSpacing: '0.5px',
                    }}>
                      FIX
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Panel brand (desktop) ───────────────────────────────────────────── */}
      <div
        data-panel-brand
        className="relative z-10 hidden lg:flex flex-col justify-between w-[45%] p-12"
        style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div data-brand-line className="text-xs font-mono tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
          [ deskra ]
        </div>

        <div>
          <h1 data-brand-line className="font-bold" style={{ fontSize: 'clamp(48px, 6vw, 84px)', letterSpacing: '-0.03em', lineHeight: 1.05, color: '#f0f0f0' }}>
            Deskra
            <span className="login-cursor" style={{ color: '#00ff88' }}>_</span>
          </h1>
          <p data-brand-line className="text-sm font-mono tracking-widest uppercase mt-4" style={{ color: '#00ff88' }}>
            sistem administrasi
          </p>
          <p data-brand-line className="text-sm mt-6 max-w-xs" style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
            Pengelolaan register kapling, DKHP, SKSHHK, dan administrasi TPK dalam satu tempat.
          </p>
        </div>

        <div />
      </div>

      {/* ── Panel form ──────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div data-form className="w-full max-w-sm">

          {/* Wordmark — hanya tampil di mobile/tablet (panel brand tersembunyi) */}
          <div data-form-head className="lg:hidden mb-10">
            <h1 className="text-4xl font-bold" style={{ letterSpacing: '-0.03em', color: '#f0f0f0' }}>
              Deskra<span className="login-cursor" style={{ color: '#00ff88' }}>_</span>
            </h1>
            <p className="text-xs font-mono tracking-widest uppercase mt-2" style={{ color: '#00ff88' }}>
              sistem administrasi
            </p>
          </div>

          <div data-form-head className="mb-8 hidden lg:block">
            <p className="text-xs font-mono tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
              // autentikasi
            </p>
            <h2 className="text-2xl font-bold mt-2" style={{ letterSpacing: '-0.02em' }}>
              Masuk ke akun anda
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-7">
            <div data-field>
              <label className="block text-xs font-mono mb-2 tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
                email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nama@email.com"
                required
                autoComplete="email"
                className="login-input w-full text-sm transition-colors"
                style={{ padding: '10px 2px', color: '#f0f0f0', fontSize: 15 }}
              />
            </div>

            <div data-field>
              <label className="block text-xs font-mono mb-2 tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
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
                  className="login-input w-full text-sm transition-colors"
                  style={{ padding: '10px 36px 10px 2px', color: '#f0f0f0', fontSize: 15 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  className="absolute right-1 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-100"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  {showPassword ? <EyeOff size={15}/> : <Eye size={15}/>}
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

            <div data-field className="pt-2">
              <button
                type="submit"
                disabled={!canSubmit}
                className="login-submit w-full flex items-center justify-between text-sm font-semibold font-mono transition-all"
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  padding: '13px 18px',
                  borderRadius: 3,
                  border: '1px solid rgba(0,255,136,0.4)',
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                  background: 'transparent',
                  color: canSubmit ? '#00ff88' : 'rgba(0,255,136,0.35)',
                  letterSpacing: '0.06em',
                }}
              >
                {loading && <span className="btn-sweep" aria-hidden="true" />}
                <span>
                  {loading ? 'memproses' : 'masuk'}
                  {loading && (
                    <span aria-hidden="true">
                      <span className="loading-dot">.</span>
                      <span className="loading-dot">.</span>
                      <span className="loading-dot">.</span>
                    </span>
                  )}
                </span>
                {!loading && <ArrowRight size={16} className="submit-arrow transition-transform" />}
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-10">
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
    </div>
  )
}
