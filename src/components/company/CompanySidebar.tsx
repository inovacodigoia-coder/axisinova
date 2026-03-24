import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { BarChart3, Calendar, FileText, DollarSign, Users, Settings, LogOut, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Dashboard', icon: BarChart3, path: '/app/dashboard' },
  { label: 'Agendamento', icon: Calendar, path: '/app/agendamento' },
  { label: 'Prontuário', icon: FileText, path: '/app/prontuario' },
  { label: 'Faturamento TISS', icon: DollarSign, path: '/app/faturamento' },
  { label: 'Usuários', icon: Users, path: '/app/usuarios' },
  { label: 'Configurações', icon: Settings, path: '/app/configuracoes' },
]

interface CompanySidebarProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function CompanySidebar({ mobileOpen, onMobileClose }: CompanySidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuth()
  const location = useLocation()

  const sidebarContent = (
    <aside className={cn(
      'flex h-screen flex-col bg-[hsl(220,26%,14%)] text-white transition-all duration-300',
      collapsed ? 'w-[72px]' : 'w-[260px]'
    )}>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-5">
        {!collapsed ? (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">Axis<span className="text-white/70">Inova</span></span>
            </div>
            <p className="mt-1 truncate text-xs text-white/40">{user?.companyName || 'Portal da Empresa'}</p>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full gradient-bg text-xs font-bold">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user?.name}</p>
                <p className="truncate text-xs text-white/40">{user?.email}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full gradient-bg text-xs font-bold">
            {user?.name?.charAt(0) || 'U'}
          </div>
        )}
        {mobileOpen && (
          <button onClick={onMobileClose} className="ml-2 rounded-lg p-1 hover:bg-white/10 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = location.pathname.startsWith(item.path)
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onMobileClose}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                active
                  ? 'gradient-bg text-white shadow-lg border-l-[3px] border-white/50'
                  : 'text-white/60 hover:bg-white/[0.06] hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="flex-1">{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-white/10 px-3 py-3 space-y-2">
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-colors">
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
        <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:flex w-full items-center justify-center rounded-lg py-2 text-white/40 hover:bg-white/[0.06] hover:text-white transition-colors">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 z-40">
        {sidebarContent}
      </div>
      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onMobileClose} />
          <div className="fixed left-0 top-0 z-50 lg:hidden">
            {sidebarContent}
          </div>
        </>
      )}
    </>
  )
}
