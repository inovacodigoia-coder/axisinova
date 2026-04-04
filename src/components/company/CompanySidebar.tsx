import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useCompanyContext } from '@/context/CompanyContext'
import {
  Home, Calendar, UserCheck, FileText, DollarSign, FlaskConical, BarChart3,
  TrendingUp, Users, Settings, Database, Monitor, Building2, Lock,
  LogOut, ChevronLeft, ChevronRight, X, Stethoscope
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { SystemModule } from '@/types/permissions.types'

const ICON_MAP: Record<string, any> = {
  Calendar, UserCheck, FileText, DollarSign, FlaskConical, BarChart3,
  TrendingUp, Users, Settings, Database, Monitor, Building2, Stethoscope, Home
}

interface NavSection {
  title: string
  items: { label: string; icon: string; path: string; module: SystemModule | null }[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'PRINCIPAL',
    items: [
      { label: 'Dashboard', icon: 'Home', path: '/app/dashboard', module: null },
    ],
  },
  {
    title: 'ATENDIMENTO',
    items: [
      { label: 'Agenda', icon: 'Calendar', path: '/app/agendamento', module: 'scheduling' },
      { label: 'Confirmações', icon: 'UserCheck', path: '/app/confirmacoes', module: 'scheduling' },
      { label: 'Faltosos', icon: 'Monitor', path: '/app/faltosos', module: 'scheduling' },
      { label: 'Recepção', icon: 'UserCheck', path: '/app/recepcao', module: 'reception' },
      { label: 'Prontuário', icon: 'FileText', path: '/app/prontuario', module: 'medical_record' },
    ],
  },
  {
    title: 'OPERACIONAL',
    items: [
      { label: 'Faturamento', icon: 'DollarSign', path: '/app/faturamento', module: 'billing' },
      { label: 'Resultados', icon: 'FlaskConical', path: '/app/resultados', module: 'results' },
    ],
  },
  {
    title: 'GESTÃO',
    items: [
      { label: 'Usuários', icon: 'Users', path: '/app/usuarios', module: 'users' },
      { label: 'Cadastros', icon: 'Database', path: '/app/cadastros', module: 'registers' },
      { label: 'Setores', icon: 'Building2', path: '/app/setores', module: 'settings' },
      { label: 'Configurações', icon: 'Settings', path: '/app/configuracoes', module: 'settings' },
      { label: 'Relatórios', icon: 'BarChart3', path: '/app/relatorios', module: 'reports' },
      { label: 'BI', icon: 'TrendingUp', path: '/app/bi', module: 'bi' },
    ],
  },
]

interface CompanySidebarProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function CompanySidebar({ mobileOpen, onMobileClose, collapsed = false, onToggleCollapse }: CompanySidebarProps) {
  const { user, logout } = useAuth()
  const { canAccess, activeProfile } = useCompanyContext()
  const location = useLocation()

  const sidebarContent = (
    <aside className={cn(
      'flex h-screen flex-col bg-[hsl(220,26%,14%)] text-white transition-all duration-300',
      collapsed ? 'w-[72px]' : 'w-[260px]'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-5">
        {!collapsed ? (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">Axis<span className="text-white/70">Inova</span></span>
            </div>
            <p className="mt-1 truncate text-xs text-white/40">{user?.companyName || 'Portal da Empresa'}</p>
            {activeProfile && (
              <p className="mt-0.5 truncate text-[10px] text-white/30">{activeProfile.name}</p>
            )}
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

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-bold tracking-wider text-white/30 uppercase">{section.title}</p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const hasAccess = !item.module || canAccess(item.module, 'view')
                const active = location.pathname.startsWith(item.path)
                const Icon = ICON_MAP[item.icon] || Home

                const link = (
                  <NavLink
                    key={item.path}
                    to={hasAccess ? item.path : '#'}
                    onClick={(e) => {
                      if (!hasAccess) { e.preventDefault(); return }
                      onMobileClose?.()
                    }}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      !hasAccess && 'opacity-40 cursor-not-allowed',
                      active && hasAccess
                        ? 'gradient-bg text-white shadow-lg'
                        : hasAccess
                          ? 'text-white/60 hover:bg-white/[0.06] hover:text-white'
                          : 'text-white/40'
                    )}
                  >
                    {hasAccess ? (
                      <Icon className="h-5 w-5 shrink-0" />
                    ) : (
                      <Lock className="h-5 w-5 shrink-0" />
                    )}
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                  </NavLink>
                )

                if (!hasAccess && collapsed) {
                  return (
                    <Tooltip key={item.path}>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">Seu perfil não tem acesso a este módulo</TooltipContent>
                    </Tooltip>
                  )
                }

                if (collapsed) {
                  return (
                    <Tooltip key={item.path}>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  )
                }

                if (!hasAccess) {
                  return (
                    <Tooltip key={item.path}>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent>Seu perfil não tem acesso a este módulo</TooltipContent>
                    </Tooltip>
                  )
                }

                return link
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-3 py-3 space-y-2">
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-colors">
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
        <button onClick={onToggleCollapse} className="hidden lg:flex w-full items-center justify-center rounded-lg py-2 text-white/40 hover:bg-white/[0.06] hover:text-white transition-colors">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  )

  return (
    <>
      <div className="hidden lg:block fixed left-0 top-0 z-40">{sidebarContent}</div>
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onMobileClose} />
          <div className="fixed left-0 top-0 z-50 lg:hidden">{sidebarContent}</div>
        </>
      )}
    </>
  )
}
