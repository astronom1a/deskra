import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Link2, Users, Users2, Layers, Package,
  ChevronDown, ChevronRight, TreePine, ClipboardList, Wallet
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Register Kapling',
    path: '/register-kapling',
    icon: ClipboardList,
  },
  {
    label: 'Uang Kerja',
    icon: Wallet,
    children: [
      { label: 'Main Link', path: '/main-link', icon: Link2 },
      { label: 'Tumpuk Kapling', path: '/tumpuk-kapling', icon: Layers },
      { label: 'Detail Pekerjaan', path: '/detail-pekerjaan', icon: Package },
    ],
  },
  {
    label: 'Database',
    icon: null,
    children: [
      { label: 'Pejabat', path: '/database/pejabat', icon: Users },
      { label: 'Tenaga Kerja', path: '/database/tenaga', icon: Users2 },
    ],
  },
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
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-primary-800 flex flex-col shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-primary-700">
          <div className="bg-white/10 p-2 rounded-lg">
            <TreePine size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">Deskra</p>
            <p className="text-primary-300 text-xs">TPK Wongsorejo</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-hide px-3 py-4 space-y-1">
          {navItems.map((item, i) => (
            <SidebarItem key={item.path || i} item={item} />
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-primary-700">
          <p className="text-primary-400 text-xs">Perum Perhutani</p>
          <p className="text-primary-400 text-xs">KPH Banyuwangi Utara</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  )
}
