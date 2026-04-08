import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Home, BarChart3, Building2, Users, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { label: 'Home', icon: Home, path: '/app/filas/admin' },
  { label: 'Dashboard', icon: BarChart3, path: '/app/filas/admin/bi' },
  { label: 'Unidades', icon: Building2, path: '/app/filas/admin/unidades' },
  { label: 'Usuários', icon: Users, path: '/app/filas/admin/usuarios' },
]

export default function QueueAdminPage() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className={cn('flex flex-col bg-[hsl(220,26%,14%)] text-white transition-all duration-300', collapsed ? 'w-16' : 'w-60')}>
        <div className="flex items-center justify-between p-4">
          {!collapsed && <span className="text-sm font-bold">Admin Filas</span>}
          <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded hover:bg-white/10">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-2">
          {NAV.map(item => {
            const active = location.pathname === item.path || (item.path !== '/app/filas/admin' && location.pathname.startsWith(item.path))
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  active ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            )
          })}
        </nav>
        <div className="p-2">
          <button onClick={() => navigate('/app/filas')} className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/60 hover:bg-white/10 hover:text-white">
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
