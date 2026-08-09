import { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useCompanyContext } from '@/context/CompanyContext'
import { useAttendanceCadastro } from '@/hooks/useAttendanceCadastro'
import { supabase } from '@/integrations/supabase/client'
import {
  Home, Calendar, UserCheck, FileText, DollarSign, FlaskConical, BarChart3,
  TrendingUp, Users, Settings, Database, Monitor, Building2, Lock,
  LogOut, ChevronLeft, ChevronRight, X, Stethoscope, TicketCheck, ShieldCheck, Ruler, Layout, Beaker as BeakerIcon,
  PieChart, Warehouse, Package as PackageIcon, UserPlus, FileSearch, Menu
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { SystemModule } from '@/types/permissions.types'

const ICON_MAP: Record<string, any> = {
  Calendar, UserCheck, FileText, DollarSign, FlaskConical, BarChart3,
  TrendingUp, Users, Settings, Database, Monitor, Building2, Stethoscope, Home, TicketCheck, Ruler, Layout, Beaker: BeakerIcon,
  PieChart, Warehouse, Package: PackageIcon, UserPlus, FileSearch
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
      { label: 'Iniciar Cadastro', icon: 'UserPlus', path: '/app/recepcao/cadastro-direto', module: 'reception' },
      { label: 'Buscar Cadastro', icon: 'FileSearch', path: '/app/recepcao?lookup=true', module: 'reception' },
      { label: 'Painel Médico', icon: 'Stethoscope', path: '/app/medico', module: 'medical_record' },
      { label: 'Prontuário', icon: 'FileText', path: '/app/prontuario', module: 'medical_record' },
    ],
  },
  {
    title: 'OPERACIONAL',
    items: [
      { label: 'Faturamento', icon: 'DollarSign', path: '/app/faturamento', module: 'billing' },
      { label: 'Guias', icon: 'FileText', path: '/app/faturamento/guias', module: 'billing' },
      { label: 'Lotes', icon: 'Database', path: '/app/faturamento/lotes', module: 'billing' },
      { label: 'Glosas', icon: 'DollarSign', path: '/app/faturamento/glosas', module: 'billing' },
      { label: 'Correções', icon: 'UserCheck', path: '/app/faturamento/correcoes', module: 'reception' },
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
      { label: 'BI Dashboard', icon: 'TrendingUp', path: '/app/bi', module: 'bi' },
      { label: 'Produção', icon: 'BarChart3', path: '/app/bi/producao', module: 'bi' },
      { label: 'Financeiro', icon: 'DollarSign', path: '/app/bi/financeiro', module: 'bi' },
      { label: 'Agendamentos', icon: 'Calendar', path: '/app/bi/agendamentos', module: 'bi' },
      { label: 'Faltosos (BI)', icon: 'Monitor', path: '/app/bi/faltosos', module: 'bi' },
      { label: 'Atendimento (BI)', icon: 'TicketCheck', path: '/app/bi/atendimento', module: 'bi' },
      { label: 'Convênios (BI)', icon: 'Database', path: '/app/bi/convenios', module: 'bi' },
      { label: 'Performance', icon: 'Stethoscope', path: '/app/bi/medicos', module: 'bi' },
    ],
  },
  {
    title: 'SETOR TÉCNICO',
    items: [
      { label: 'Coleta', icon: 'FlaskConical', path: '/app/lab/coleta', module: 'reception' },
      { label: 'Mapa de Trabalho', icon: 'FileText', path: '/app/lab/mapa', module: 'reception' },
      { label: 'Análise', icon: 'Database', path: '/app/lab/analise', module: 'reception' },
      { label: 'Validação', icon: 'ShieldCheck', path: '/app/lab/validacao', module: 'reception' },
      { label: 'Laudos', icon: 'FileText', path: '/app/lab/laudos', module: 'reception' },
    ],
  },
  {
    title: 'CADASTROS LABORATÓRIO',
    items: [
      { label: 'Catálogo de Exames', icon: 'FlaskConical', path: '/app/cadastros/catalogo', module: 'registers' },
      { label: 'Unidades de Medida', icon: 'Ruler', path: '/app/configuracoes/laboratorio?tab=units', module: 'settings' },
      { label: 'Metodologias', icon: 'Beaker', path: '/app/configuracoes/laboratorio?tab=methods', module: 'settings' },
      { label: 'Bancadas', icon: 'Layout', path: '/app/configuracoes/laboratorio?tab=workbenches', module: 'settings' },
      { label: 'Equipamentos', icon: 'Monitor', path: '/app/cadastros/equipamentos', module: 'registers' },
      { label: 'Abreviaturas', icon: 'FileText', path: '/app/configuracoes/abreviaturas', module: 'settings' },
    ],
  },
  {
    title: 'FINANCEIRO LABORATÓRIO',
    items: [
      { label: 'Dashboard Fin.', icon: 'Layout', path: '/app/financeiro', module: 'billing' },
      { label: 'Contas a Receber', icon: 'DollarSign', path: '/app/financeiro/receber', module: 'billing' },
      { label: 'Contas a Pagar', icon: 'DollarSign', path: '/app/financeiro/pagar', module: 'billing' },
      { label: 'Faturamento TISS', icon: 'FileText', path: '/app/financeiro/faturamento', module: 'billing' },
      { label: 'Tabelas de Preços', icon: 'Database', path: '/app/financeiro/tabelas', module: 'billing' },
      { label: 'Centros de Custo', icon: 'PieChart', path: '/app/financeiro/centros-custo', module: 'billing' },
      { label: 'Indicadores', icon: 'TrendingUp', path: '/app/financeiro/indicadores', module: 'billing' },
    ],
  },
  {
    title: 'ESTOQUE E ALMOXARIFADO',
    items: [
      { label: 'Dashboard Estoque', icon: 'Warehouse', path: '/app/estoque', module: 'settings' },
      { label: 'Itens de Estoque', icon: 'Package', path: '/app/estoque/itens', module: 'settings' },
      { label: 'Gestão de Lotes', icon: 'Database', path: '/app/estoque/lotes', module: 'settings' },
      { label: 'Movimentações', icon: 'RefreshCw', path: '/app/estoque/movimentacoes', module: 'settings' },
      { label: 'Fornecedores', icon: 'Building2', path: '/app/estoque/fornecedores', module: 'settings' },
      { label: 'Relatórios Estoque', icon: 'BarChart3', path: '/app/estoque/relatorios', module: 'settings' },
    ],
  },
  {
    title: 'FARMÁCIA HOSPITALAR',
    items: [
      { label: 'Dashboard Farmácia', icon: 'Layout', path: '/app/farmacia', module: 'settings' },
      { label: 'Dispensação', icon: 'Pill', path: '/app/farmacia/dispensacao', module: 'settings' },
      { label: 'Prescrições', icon: 'ClipboardList', path: '/app/farmacia/prescricoes', module: 'settings' },
      { label: 'Medicamentos', icon: 'Pill', path: '/app/farmacia/medicamentos', module: 'settings' },
      { label: 'Estoque Farmácia', icon: 'Warehouse', path: '/app/farmacia/estoque', module: 'settings' },
      { label: 'Relatórios Farmácia', icon: 'BarChart3', path: '/app/farmacia/relatorios', module: 'settings' },
    ],
  },
  {
    title: 'SOROTECA',
    items: [
      { label: 'Dashboard Soroteca', icon: 'Layout', path: '/app/soroteca', module: 'settings' },
      { label: 'Entrada / Armazenar', icon: 'ArrowRight', path: '/app/soroteca/entrada', module: 'settings' },
      { label: 'Consulta Amostras', icon: 'Search', path: '/app/soroteca/consulta', module: 'settings' },
      { label: 'Estrutura Física', icon: 'Database', path: '/app/soroteca/estrutura', module: 'settings' },
      { label: 'Descarte Amostras', icon: 'Package', path: '/app/soroteca/descarte', module: 'settings' },
      { label: 'Rastreabilidade', icon: 'FileText', path: '/app/soroteca/rastreabilidade', module: 'settings' },
      { label: 'Config. Soroteca', icon: 'Settings', path: '/app/soroteca/configuracoes', module: 'settings' },
    ],
  },
  {
    title: 'PORTAIS EXTERNOS',
    items: [
      { label: 'Gestão de Portais', icon: 'Users', path: '/app/portais', module: 'settings' },
      { label: 'Notificações', icon: 'Bell', path: '/app/configuracoes/notificacoes', module: 'settings' },
      { label: 'Relatórios Externos', icon: 'BarChart3', path: '/app/portais/relatorios', module: 'bi' },
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
  const { canAccess, activeProfile, activeSector } = useCompanyContext()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarBg, setSidebarBg] = useState<string | undefined>(undefined)

  // Load branding from DB
  useEffect(() => {
    const companyId = user?.companyId
    if (!companyId) return
    const load = async () => {
      const { data } = await supabase.from('company_branding').select('sidebar_bg, primary_color, secondary_color').eq('company_id', companyId).maybeSingle() as any
      if (data?.sidebar_bg) {
        setSidebarBg(data.sidebar_bg)
        document.documentElement.style.setProperty('--sidebar-bg', data.sidebar_bg)
      }
      if (data?.primary_color) {
        document.documentElement.style.setProperty('--color-primary-hex', data.primary_color)
        document.documentElement.style.setProperty('--company-accent-hex', data.primary_color)
        const secondary = data.secondary_color || '#7B2FF7'
        document.documentElement.style.setProperty('--color-secondary-hex', secondary)
        document.documentElement.style.setProperty('--gradient-main', `linear-gradient(135deg, ${data.primary_color} 0%, ${secondary} 100%)`)
      }
    }
    load()
  }, [user?.companyId])

  const sidebarContent = (
    <aside
      className={cn(
        'flex h-screen flex-col text-white transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
      style={{ background: sidebarBg || 'var(--sidebar-bg, hsl(220,26%,14%))' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-5">
        {!collapsed ? (
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">Axis<span className="text-white/70">Inova</span></span>
              </div>
              <button 
                onClick={() => navigate('/app/dashboard')} 
                className="rounded-lg p-1.5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                title="Menu do Sistema"
              >
                <Menu className="h-5 w-5" />
              </button>
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

                const { orders } = useAttendanceCadastro()
                const waitingCollectionCount = orders.filter(o => o.status === 'waiting_collection' || o.status === 'waiting').length
                const analiseCount = orders.filter(o => o.status === 'collection_done' || o.status === 'processing').length
                const badge = item.path === '/app/lab/coleta' ? waitingCollectionCount : item.path === '/app/lab/analise' ? analiseCount : null

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
                    {!collapsed && badge && (
                      <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[10px] font-bold">{badge}</span>
                    )}
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
