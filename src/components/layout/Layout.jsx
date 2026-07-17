import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import PageTransition from './PageTransition'
import {
  LayoutDashboard, Link2, Users, Users2, Layers, Package,
  ChevronDown, ChevronRight, ChevronLeft, ClipboardList, Wallet, ScrollText,
  Settings as SettingsIcon, Building2, ShieldCheck, LogOut,
  ArrowLeft, FileBarChart2, ScanLine, MapPin, History, Database, Menu,
  BarChart3, Table2, Receipt,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useIsMobile } from '../../lib/hooks/useIsMobile'
import AppResponsiveStyles from '../ui/responsive/AppResponsiveStyles'
import { useAccount } from '../../lib/hooks/useAccount'
import { useAuth } from '../../lib/AuthProvider'
import { canUseOperatorRoutes } from '../../lib/adminOperatorContext'
import { version as appVersion } from '../../../package.json'
import { gsap } from 'gsap'

const operatorNavItems = [
  { label: 'Dashboard',       path: '/dashboard',       icon: LayoutDashboard },
  {
    label: 'Register Kapling', icon: ClipboardList,
    children: [
      { label: 'Statistik',       path: '/register-kapling',        icon: BarChart3, end: true },
      { label: 'Tabel Register',  path: '/register-kapling/tabel',  icon: Table2 },
      { label: 'Register Invois', path: '/register-kapling/invois', icon: Receipt },
    ],
  },
  { label: 'DKHP SKSHHK',    path: '/dkhp-skshhk',     icon: ScrollText },
  { label: 'Kayu Bernomor',  path: '/kayu-bernomor',   icon: ScanLine },
  { label: 'Log Aktivitas',  path: '/activity-log',    icon: History },
  {
    label: 'DK310', icon: FileBarChart2,
    children: [
      { label: 'Penambahan',  path: '/dk310/penambahan',  icon: FileBarChart2, indicator: '+' },
      { label: 'Pengurangan', path: '/dk310/pengurangan', icon: FileBarChart2, indicator: '-' },
    ],
  },
  {
    label: 'Uang Kerja', icon: Wallet,
    children: [
      { label: 'Main Link',        path: '/main-link',        icon: Link2 },
      { label: 'Tumpuk Kapling',   path: '/tumpuk-kapling',   icon: Layers },
      { label: 'Detail Pekerjaan', path: '/detail-pekerjaan', icon: Package },
    ],
  },
  {
    label: 'Database', icon: Database,
    children: [
      { label: 'Pejabat',        path: '/database/pejabat',        icon: Users },
      { label: 'Tenaga Kerja',   path: '/database/tenaga',         icon: Users2 },
      { label: 'Alamat Bongkar', path: '/database/alamat-bongkar', icon: MapPin },
    ],
  },
]

const adminNavItems = [
  { label: 'Dashboard Admin', path: '/admin',     icon: LayoutDashboard },
  { label: 'Manajemen TPK',   path: '/admin/tpk', icon: Building2 },
]

function getPeriodeAktif() {
  const now   = new Date()
  const half  = now.getDate() <= 15 ? 'I' : 'II'
  const month = now.getMonth() + 1
  const year  = String(now.getFullYear()).slice(-2)
  return `${half}/${month} ${year}`
}

// ── SidebarItem ───────────────────────────────────────────────────────────────
function SidebarItem({ item, collapsed, onExpand }) {
  const location = useLocation()
  const [open, setOpen] = useState(
    item.children?.some(c => location.pathname.startsWith(c.path))
  )
  const bodyRef = useRef(null)

  useEffect(() => {
    if (!bodyRef.current || collapsed) return
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
  }, [open, collapsed])

  if (item.children) {
    if (collapsed) {
      const anyChildActive = item.children.some(c => location.pathname.startsWith(c.path))
      return (
        <button
          type="button"
          title={item.label}
          onClick={() => { onExpand?.(); setOpen(true) }}
          style={{
            width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '7px 0', border: 'none', borderRadius: 3, cursor: 'pointer',
            color: anyChildActive ? '#00ff88' : 'rgba(255,255,255,0.38)',
            background: anyChildActive ? 'rgba(0,255,136,0.07)' : 'transparent',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { if (!anyChildActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = anyChildActive ? '#00ff88' : '#f0f0f0' }}
          onMouseLeave={e => { e.currentTarget.style.background = anyChildActive ? 'rgba(0,255,136,0.07)' : 'transparent'; e.currentTarget.style.color = anyChildActive ? '#00ff88' : 'rgba(255,255,255,0.38)' }}
        >
          {item.icon && <item.icon size={14} />}
        </button>
      )
    }
    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono tracking-widest uppercase transition-colors sb-btn"
          style={{ color: 'rgba(255,255,255,0.38)' }}
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
              <SidebarItem key={child.path} item={child} collapsed={collapsed} onExpand={onExpand} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <NavLink
      to={item.path}
      end={item.path === '/admin' || item.end}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) => `sb-link ${isActive ? 'sb-link-active' : ''}`}
      style={collapsed ? { justifyContent: 'center', padding: '7px 0', gap: 0, borderLeftColor: 'transparent' } : {}}
    >
      {item.icon && <item.icon size={14} />}
      {!collapsed && (
        <span className="font-mono flex items-center gap-0.5">
          {item.label}
          {item.indicator && (
            <span style={{
              fontFamily: 'monospace', fontWeight: 700, fontSize: 13,
              color: item.indicator === '+' ? '#00ff88' : '#ff6b6b',
            }}>{item.indicator}</span>
          )}
        </span>
      )}
    </NavLink>
  )
}

// ── Layout ────────────────────────────────────────────────────────────────────
export default function Layout() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const sidebarRef = useRef(null)
  const [realtimeStatus, setRealtimeStatus] = useState('connecting')
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sb_collapsed') === '1')
  const isMobile = useIsMobile()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { account } = useAccount()
  const { tpk, isAdmin, activeTpkId, setActiveTpkId, signOut } = useAuth()
  const namaTpk  = tpk?.namatpk || account.namaTpk || 'TPK Wongsorejo'
  const useOperatorContext = canUseOperatorRoutes({ isAdmin, activeTpkId })
  const navItems = useOperatorContext ? operatorNavItems : adminNavItems
  // on mobile drawer selalu expanded, tidak collapse
  const ec = isMobile ? false : collapsed

  const toggleCollapsed = () => {
    setCollapsed(c => {
      const next = !c
      localStorage.setItem('sb_collapsed', next ? '1' : '0')
      return next
    })
  }

  // Tutup drawer saat kembali ke desktop
  useEffect(() => {
    if (!isMobile) setMobileOpen(false)
  }, [isMobile])

  // Tutup drawer saat navigasi
  useEffect(() => {
    if (isMobile) setMobileOpen(false)
  }, [location.pathname, isMobile])

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
      <AppResponsiveStyles />
      <style>{`
        .sb-link { display:flex; align-items:center; gap:10px; padding:7px 12px; border-radius:3px; font-size:13px; text-decoration:none; transition:background 0.15s, color 0.15s, border-color 0.15s; border-left:2px solid transparent; color:rgba(255,255,255,0.38); }
        .sb-link:hover { color:#f0f0f0; background:rgba(255,255,255,0.04); }
        .sb-link-active { color:#00ff88 !important; background:rgba(0,255,136,0.07) !important; border-left-color:#00ff88 !important; padding-left:10px !important; }
        .sb-btn { transition:color 0.15s, background 0.15s; }
        .sb-btn:hover { color:rgba(255,255,255,0.5); }
        .sb-btn-danger:hover { color:#ff6b6b !important; background:rgba(255,107,107,0.07) !important; }
        .sb-collapsed .sb-link-active { padding-left:0 !important; border-left-color:transparent !important; }
        .sb-toggle { display:flex; align-items:center; justify-content:center; width:22px; height:22px; border-radius:3px; border:1px solid rgba(255,255,255,0.08); background:transparent; color:rgba(255,255,255,0.28); cursor:pointer; flex-shrink:0; transition:color 0.15s, background 0.15s; }
        .sb-toggle:hover { color:#f0f0f0; background:rgba(255,255,255,0.06); }
        @keyframes sb-cursor { 0%,49% { opacity:1 } 50%,100% { opacity:0 } }
        .sb-cursor { color:#00ff88; animation: sb-cursor 1.1s step-end infinite; }
      `}</style>

      {/* Mobile backdrop */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.6)' }}
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`flex flex-col shrink-0${ec ? ' sb-collapsed' : ''}`}
        style={isMobile ? {
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: 260, zIndex: 50,
          background: '#0d0d0d',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        } : {
          width: ec ? 56 : 220,
          background: '#0d0d0d',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          transition: 'width 0.25s ease',
          overflow: 'hidden',
        }}
      >
        {/* Brand */}
        <div
          data-sb-item
          className="flex items-center py-4 px-3"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            justifyContent: ec ? 'center' : 'space-between',
            minHeight: 64,
          }}
        >
          {ec ? (
            <button
              onClick={toggleCollapsed}
              title="Expand sidebar"
              className="sb-toggle font-mono"
              style={{ width: 32, height: 32, fontSize: 13, fontWeight: 700, color: '#f0f0f0' }}
            >
              d<span className="sb-cursor">_</span>
            </button>
          ) : (
            <>
              <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                <div className="flex items-center gap-2">
                  <p className="font-bold font-mono" style={{ color: '#f0f0f0', fontSize: 16, letterSpacing: '-0.02em' }}>
                    deskra<span className="sb-cursor">_</span>
                  </p>
                  <span
                    title={realtimeStatus === 'connected' ? 'Live' : realtimeStatus === 'disconnected' ? 'Offline' : 'Connecting'}
                    style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: realtimeStatus === 'connected' ? '#00ff88' : realtimeStatus === 'disconnected' ? '#ff4444' : '#ffaa00',
                      boxShadow: realtimeStatus === 'connected' ? '0 0 6px rgba(0,255,136,0.6)' : 'none',
                    }}
                  />
                </div>
                {isAdmin && !activeTpkId ? (
                  <div className="flex items-center gap-1 mt-1">
                    <ShieldCheck size={9} style={{ color: '#fbbf24' }} />
                    <span className="text-[10px] font-mono" style={{ color: '#fbbf24' }}>superadmin</span>
                  </div>
                ) : (
                  <>
                    <p className="text-[10px] font-mono mt-1 truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {namaTpk}
                    </p>
                    <span className="text-[10px] font-mono inline-flex items-center gap-1.5 mt-1 px-1.5 py-0.5" style={{
                      background: 'rgba(0,255,136,0.07)',
                      border: '1px solid rgba(0,255,136,0.18)',
                      borderRadius: 2,
                      color: 'rgba(255,255,255,0.4)',
                    }}>
                      periode <span style={{ color: '#00ff88', fontWeight: 700 }}>{getPeriodeAktif()}</span>
                    </span>
                  </>
                )}
              </div>
              <button
                onClick={isMobile ? () => setMobileOpen(false) : toggleCollapsed}
                title={isMobile ? 'Tutup menu' : 'Ciutkan sidebar'}
                className="sb-toggle"
                style={{ flexShrink: 0 }}
              >
                <ChevronLeft size={12} />
              </button>
            </>
          )}
        </div>

        {/* Admin context banner */}
        {!ec && isAdmin && activeTpkId && (
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
            <span className="truncate">admin panel</span>
          </button>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-0.5" style={{ scrollbarWidth: 'none', paddingLeft: ec ? 6 : 12, paddingRight: ec ? 6 : 12 }}>
          {navItems.map((item, i) => (
            <div key={item.path || i} data-sb-item>
              <SidebarItem item={item} collapsed={ec} onExpand={toggleCollapsed} />
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="py-3 space-y-0.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingLeft: ec ? 6 : 12, paddingRight: ec ? 6 : 12 }}>
          {!isAdmin && (
            <div data-sb-item>
              <NavLink
                to="/settings"
                title={ec ? 'Settings' : undefined}
                className={({ isActive }) => `sb-link ${isActive ? 'sb-link-active' : ''}`}
                style={ec ? { justifyContent: 'center', padding: '7px 0', gap: 0, borderLeftColor: 'transparent' } : {}}
              >
                <SettingsIcon size={14} />
                {!ec && <span className="font-mono">Settings</span>}
              </NavLink>
            </div>
          )}
          <div data-sb-item>
            <button
              onClick={handleSignOut}
              title={ec ? 'Keluar' : undefined}
              className="w-full flex items-center gap-2.5 px-3 py-2 font-mono text-xs sb-btn sb-btn-danger"
              style={{
                borderRadius: 3, borderLeft: '2px solid transparent',
                color: 'rgba(255,255,255,0.28)',
                justifyContent: ec ? 'center' : undefined,
                padding: ec ? '7px 0' : undefined,
                gap: ec ? 0 : undefined,
              }}
            >
              <LogOut size={13} />
              {!ec && 'keluar'}
            </button>
          </div>
        </div>

        {/* Footer */}
        {!ec && (
          <div data-sb-item className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <p className="text-[10px] font-mono flex items-center gap-2 mb-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
              <span style={{ width: 16, height: 1, background: 'rgba(0,255,136,0.4)', display: 'inline-block' }} />
              v{appVersion}
            </p>
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
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto flex flex-col" style={{ background: '#0a0a0a', minWidth: 0 }}>
        {/* Mobile top bar */}
        {isMobile && (
          <div style={{
            position: 'sticky', top: 0, zIndex: 40, flexShrink: 0,
            height: 48, background: '#0d0d0d',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center',
            paddingLeft: 14, paddingRight: 14, gap: 12,
          }}>
            <button
              onClick={() => setMobileOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: 3, flexShrink: 0,
                border: '1px solid rgba(255,255,255,0.08)', background: 'transparent',
                color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
              }}
            >
              <Menu size={14} />
            </button>
            <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#f0f0f0', letterSpacing: '-0.01em' }}>deskra</span>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: realtimeStatus === 'connected' ? '#00ff88' : realtimeStatus === 'disconnected' ? '#ff4444' : '#ffaa00',
            }} />
          </div>
        )}
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
    </div>
  )
}
