import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import PageTransition from './PageTransition'
import {
  LayoutDashboard, Link2, Users, Users2, Layers, Package,
  ChevronDown, ChevronRight, ClipboardList, Wallet, ScrollText,
  Settings as SettingsIcon, Building2, ShieldCheck, LogOut,
  ArrowLeft,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAccount } from '../lib/useAccount'
import { useAuth } from '../lib/AuthProvider'
import { canUseOperatorRoutes } from '../lib/adminOperatorContext'
import { version as appVersion } from '../../package.json'
import { gsap } from 'gsap'

const operatorNavItems = [
  { label: 'Dashboard',       path: '/dashboard',       icon: LayoutDashboard },
  { label: 'Register Kapling',path: '/register-kapling',icon: ClipboardList },
  { label: 'DKHP SKSHHK',    path: '/dkhp-skshhk',     icon: ScrollText },
  {
    label: 'Uang Kerja', icon: Wallet,
    children: [
      { label: 'Main Link',        path: '/main-link',        icon: Link2 },
      { label: 'Tumpuk Kapling',   path: '/tumpuk-kapling',   icon: Layers },
      { label: 'Detail Pekerjaan', path: '/detail-pekerjaan', icon: Package },
    ],
  },
  {
    label: 'Database', icon: null,
    children: [
      { label: 'Pejabat',      path: '/database/pejabat', icon: Users },
      { label: 'Tenaga Kerja', path: '/database/tenaga',  icon: Users2 },
    ],
  },
]

const adminNavItems = [
  { label: 'Dashboard Admin', path: '/admin',     icon: LayoutDashboard },
  { label: 'Manajemen TPK',   path: '/admin/tpk', icon: Building2 },
]

// ── OrbitalMark ───────────────────────────────────────────────────────────────
function OrbitalMark({ size = 32 }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" aria-hidden="true">
      <style>{`
        @keyframes sb-orbit { to { transform: rotate(360deg); } }
        @keyframes sb-pulse { 0%,100%{opacity:.3} 50%{opacity:.85} }
        .sb-spin  { transform-origin: 50% 50%; animation: sb-orbit 18s linear infinite; }
        .sb-pulse { animation: sb-pulse 2.4s ease-in-out infinite; }
      `}</style>
      <g className="sb-spin">
        <ellipse cx="50" cy="50" rx="42" ry="14" stroke="#1a2a1a" strokeWidth="1.2"/>
        <ellipse cx="50" cy="50" rx="42" ry="14" stroke="#1a2a1a" strokeWidth="1.2" transform="rotate(60 50 50)"/>
        <ellipse cx="50" cy="50" rx="42" ry="14" stroke="#1a2a1a" strokeWidth="1.2" transform="rotate(120 50 50)"/>
        <circle r="2.2" fill="rgba(240,240,240,0.8)">
          <animateMotion dur="8s" repeatCount="indefinite" rotate="none"
            path="M 92,50 A 42,14 0 0,1 8,50 A 42,14 0 0,1 92,50"/>
        </circle>
      </g>
      <circle cx="50" cy="50" r="10" stroke="#00ff88" strokeWidth="1.2" opacity=".5" className="sb-pulse"/>
      <circle cx="50" cy="50" r="5.5" fill="#00ff88"/>
    </svg>
  )
}

// ── SidebarItem ───────────────────────────────────────────────────────────────
function SidebarItem({ item }) {
  const location = useLocation()
  const [open, setOpen] = useState(
    item.children?.some(c => location.pathname.startsWith(c.path))
  )
  const bodyRef = useRef(null)

  useEffect(() => {
    if (!bodyRef.current) return
    if (open) {
      gsap.fromTo(bodyRef.current,
        { height: 0, opacity: 0 },
        { height: 'auto', opacity: 1, duration: 0.28, ease: 'power2.out' }
      )
    } else {
      gsap.to(bodyRef.current,
        { height: 0, opacity: 0, duration: 0.22, ease: 'power2.in' }
      )
    }
  }, [open])

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono tracking-widest uppercase transition-colors sb-btn"
          style={{ color: open ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.22)' }}
        >
          <span className="flex items-center gap-2">
            {item.icon && <item.icon size={12} />}
            {item.label}
          </span>
          <span style={{ transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-flex' }}>
            <ChevronRight size={11} />
          </span>
        </button>
        <div ref={bodyRef} style={{ overflow: 'hidden', height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}>
          <div className="ml-2 mt-0.5 mb-1 space-y-0.5" style={{ borderLeft: '1px solid rgba(0,255,136,0.15)', paddingLeft: 10 }}>
            {item.children.map(child => (
              <SidebarItem key={child.path} item={child} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <NavLink
      to={item.path}
      end={item.path === '/admin'}
      className={({ isActive }) => `sb-link ${isActive ? 'sb-link-active' : ''}`}
    >
      {item.icon && <item.icon size={14} />}
      <span className="font-mono">{item.label}</span>
    </NavLink>
  )
}

// ── Layout ────────────────────────────────────────────────────────────────────
export default function Layout() {
  const navigate  = useNavigate()
  const sidebarRef = useRef(null)
  const [realtimeStatus, setRealtimeStatus] = useState('connecting')
  const { account } = useAccount()
  const { tpk, isAdmin, activeTpkId, setActiveTpkId, signOut } = useAuth()
  const namaTpk  = tpk?.namatpk || account.namaTpk || 'TPK Wongsorejo'
  const useOperatorContext = canUseOperatorRoutes({ isAdmin, activeTpkId })
  const navItems = useOperatorContext ? operatorNavItems : adminNavItems

  // entrance animation
  useEffect(() => {
    if (!sidebarRef.current) return
    const ctx = gsap.context(() => {
      gsap.from('[data-sb-item]', {
        x: -16, opacity: 0,
        stagger: 0.04, duration: 0.4, ease: 'power2.out',
        delay: 0.1,
      })
    }, sidebarRef)
    return () => ctx.revert()
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('sidebar_rt')
      .subscribe(status => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('connected')
        else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') setRealtimeStatus('disconnected')
        else setRealtimeStatus('connecting')
      })
    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0a0a0a' }}>
      <style>{`
        .sb-link { display:flex; align-items:center; gap:10px; padding:7px 12px; border-radius:3px; font-size:13px; text-decoration:none; transition:background 0.15s, color 0.15s, border-color 0.15s; border-left:2px solid transparent; color:rgba(255,255,255,0.38); }
        .sb-link:hover { color:#f0f0f0; background:rgba(255,255,255,0.04); }
        .sb-link-active { color:#00ff88 !important; background:rgba(0,255,136,0.07) !important; border-left-color:#00ff88 !important; padding-left:10px !important; }
        .sb-btn { transition:color 0.15s, background 0.15s; }
        .sb-btn:hover { color:rgba(255,255,255,0.5); }
        .sb-btn-danger:hover { color:#ff6b6b !important; background:rgba(255,107,107,0.07) !important; }
      `}</style>

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className="flex flex-col shrink-0"
        style={{
          width: 220,
          background: '#0d0d0d',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Brand */}
        <div data-sb-item className="flex items-center gap-3 px-4 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <OrbitalMark size={30} />
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-sm font-mono" style={{ color: '#f0f0f0', letterSpacing: '-0.01em' }}>
                deskra
              </p>
              <span className="text-[9px] font-mono px-1.5 py-0.5" style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 2,
                color: 'rgba(255,255,255,0.3)',
              }}>
                v{appVersion}
              </span>
              <span
                title={realtimeStatus === 'connected' ? 'Live' : realtimeStatus === 'disconnected' ? 'Offline' : 'Connecting'}
                style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: realtimeStatus === 'connected' ? '#00ff88' : realtimeStatus === 'disconnected' ? '#ff4444' : '#ffaa00',
                  boxShadow: realtimeStatus === 'connected' ? '0 0 6px rgba(0,255,136,0.6)' : 'none',
                  animation: realtimeStatus !== 'disconnected' ? 'sb-glow 2s ease-in-out infinite' : 'none',
                }}
              />
            </div>
            {isAdmin && !activeTpkId ? (
              <div className="flex items-center gap-1 mt-0.5">
                <ShieldCheck size={9} style={{ color: '#fbbf24' }} />
                <span className="text-[10px] font-mono" style={{ color: '#fbbf24' }}>superadmin</span>
              </div>
            ) : (
              <p className="text-[10px] font-mono mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.25)', maxWidth: 120 }}>
                {namaTpk}
              </p>
            )}
          </div>
        </div>

        {/* Admin context banner */}
        {isAdmin && activeTpkId && (
          <button
            data-sb-item
            onClick={() => { setActiveTpkId(null); navigate('/admin') }}
            className="mx-3 mt-3 flex items-center gap-2 px-3 py-2 font-mono text-xs transition-colors"
            style={{
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.2)',
              borderRadius: 3,
              color: 'rgba(251,191,36,0.8)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,191,36,0.13)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251,191,36,0.08)' }}
          >
            <ArrowLeft size={12} />
            <span className="truncate">← admin panel</span>
          </button>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5" style={{ scrollbarWidth: 'none' }}>
          {navItems.map((item, i) => (
            <div key={item.path || i} data-sb-item>
              <SidebarItem item={item} />
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-3 space-y-0.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {!isAdmin && (
            <div data-sb-item>
              <NavLink
                to="/settings"
                className={({ isActive }) => `sb-link ${isActive ? 'sb-link-active' : ''}`}
              >
                <SettingsIcon size={14} />
                <span className="font-mono">Settings</span>
              </NavLink>
            </div>
          )}
          <div data-sb-item>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 font-mono text-xs sb-btn sb-btn-danger"
              style={{
                borderRadius: 3, borderLeft: '2px solid transparent',
                color: 'rgba(255,255,255,0.28)',
              }}
            >
              <LogOut size={13} />
              keluar
            </button>
          </div>
        </div>

        {/* Footer */}
        <div data-sb-item className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <p className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.12)' }}>Perum Perhutani · KPH Banyuwangi Utara</p>
          <p className="text-[10px] font-mono mt-1" style={{ color: 'rgba(255,255,255,0.1)' }}>
            © 2026{' '}
             <a
               href="https://astrolabs.site"
               target="_blank"
               rel="noopener noreferrer"
               className="sb-footer-link"
               style={{ color: 'rgba(0,255,136,0.3)' }}
            >
              AstroLabs Studio
            </a>
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto" style={{ background: '#0a0a0a' }}>
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
    </div>
  )
}
