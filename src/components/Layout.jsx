import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Link2, Users, Users2, Layers, Package,
  ChevronDown, ChevronRight, TreePine, ClipboardList, Wallet, ScrollText,
  Settings as SettingsIcon, Sun, Moon, Building2, ShieldCheck, LogOut,
  ArrowLeft,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useTheme } from '../lib/useTheme'
import { useAccount } from '../lib/useAccount'
import { useAuth } from '../lib/AuthProvider'
import { version as appVersion } from '../../package.json'

const operatorNavItems = [
  { label: 'Dashboard',       path: '/dashboard',       icon: LayoutDashboard },
  { label: 'Register Kapling',path: '/register-kapling',icon: ClipboardList },
  { label: 'DKHP SKSHHK',    path: '/dkhp-skshhk',     icon: ScrollText },
  {
    label: 'Uang Kerja', icon: Wallet,
    children: [
      { label: 'Main Link',       path: '/main-link',        icon: Link2 },
      { label: 'Tumpuk Kapling',  path: '/tumpuk-kapling',   icon: Layers },
      { label: 'Detail Pekerjaan',path: '/detail-pekerjaan', icon: Package },
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

function SidebarItem({ item }) {
  const location = useLocation()
  const [open, setOpen] = useState(
    item.children?.some(c => location.pathname.startsWith(c.path))
  )

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-primary-100 hover:bg-primary-700 rounded-lg transition-colors"
        >
          <span className="flex items-center gap-3 font-medium">
            {item.icon && <item.icon size={16} />}
            {item.label}
          </span>
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
        {open && (
          <div className="ml-3 mt-1 space-y-1 border-l border-primary-600 pl-3">
            {item.children.map(child => (
              <SidebarItem key={child.path} item={child} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <NavLink
      to={item.path}
      end={item.path === '/admin'}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg transition-colors ${
          isActive
            ? 'bg-white text-primary-700 font-semibold shadow-sm'
            : 'text-primary-100 hover:bg-primary-700'
        }`
      }
    >
      {item.icon && <item.icon size={16} />}
      {item.label}
    </NavLink>
  )
}

export default function Layout() {
  const navigate = useNavigate()
  const [realtimeStatus, setRealtimeStatus] = useState('connecting')
  const { theme, toggle } = useTheme()
  const { account } = useAccount()
  const { tpk, isAdmin, activeTpkId, setActiveTpkId, signOut } = useAuth()
  const namaTpk = tpk?.namatpk || account.namaTpk || 'TPK Wongsorejo'
  const isDark = theme === 'dark'
  const navItems = isAdmin ? adminNavItems : operatorNavItems

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
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-primary-800 dark:bg-gray-900 flex flex-col shrink-0 border-r border-transparent dark:border-gray-800">

        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-primary-700 dark:border-gray-800">
          <div className="bg-white/10 p-2 rounded-lg">
            <TreePine size={20} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-white font-bold text-base leading-tight">Deskra</p>
              <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-primary-100 text-[9px] font-mono leading-none">
                v{appVersion}
              </span>
              <span
                title={
                  realtimeStatus === 'connected' ? 'Live' :
                  realtimeStatus === 'disconnected' ? 'Offline' : 'Connecting'
                }
                className={`w-1.5 h-1.5 rounded-full ${
                  realtimeStatus === 'connected'    ? 'bg-green-400 animate-pulse' :
                  realtimeStatus === 'disconnected' ? 'bg-red-400' :
                                                      'bg-yellow-400 animate-pulse'
                }`}
              />
            </div>
            {isAdmin ? (
              <div className="flex items-center gap-1 mt-0.5">
                <ShieldCheck size={10} className="text-amber-300" />
                <p className="text-amber-300 text-xs font-medium">Superadmin</p>
              </div>
            ) : (
              <p className="text-primary-300 dark:text-gray-400 text-xs">{namaTpk}</p>
            )}
          </div>
        </div>

        {/* Banner konteks TPK aktif (admin sedang browse data TPK tertentu) */}
        {isAdmin && activeTpkId && (
          <button
            onClick={() => { setActiveTpkId(null); navigate('/admin') }}
            className="mx-3 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs hover:bg-amber-500/30 transition-colors"
          >
            <ArrowLeft size={13} />
            <span className="truncate">Kembali ke Admin Panel</span>
          </button>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-hide px-3 py-4 space-y-1">
          {navItems.map((item, i) => (
            <SidebarItem key={item.path || i} item={item} />
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-3 border-t border-primary-700 dark:border-gray-800 space-y-1">
          {!isAdmin && (
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg transition-colors ${
                  isActive
                    ? 'bg-white text-primary-700 font-semibold shadow-sm'
                    : 'text-primary-100 hover:bg-primary-700 dark:hover:bg-gray-800'
                }`
              }
            >
              <SettingsIcon size={16} />
              Settings
            </NavLink>
          )}
          <button
            onClick={toggle}
            title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-primary-100 hover:bg-primary-700 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <span className="flex items-center gap-3 font-medium">
              <span className="relative inline-flex w-4 h-4 items-center justify-center">
                <Sun size={16} className={`absolute transition-all duration-300 ${isDark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}`} />
                <Moon size={16} className={`absolute transition-all duration-300 ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`} />
              </span>
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </span>
            <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-300 ${isDark ? 'bg-primary-500' : 'bg-primary-900'}`}>
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ease-out ${isDark ? 'translate-x-5' : 'translate-x-1'}`} />
            </span>
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-primary-100 hover:bg-red-600/20 hover:text-red-300 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Keluar
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-primary-700 dark:border-gray-800">
          <p className="text-primary-400 dark:text-gray-500 text-xs">Perum Perhutani</p>
          <p className="text-primary-400 dark:text-gray-500 text-xs">KPH Banyuwangi Utara</p>
          <p className="text-primary-500 dark:text-gray-600 text-[10px] mt-2">
            © 2026{' '}
            <a
              href="https://astrolabs.my.id"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary-300 dark:hover:text-gray-400 transition-colors"
            >
              AstroLabs
            </a>
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <Outlet />
      </main>
    </div>
  )
}
