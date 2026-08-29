import { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useCompanyContext } from '@/context/CompanyContext'
import { useAttendanceCadastro } from '@/hooks/useAttendanceCadastro'
import { supabase } from '@/integrations/supabase/client'
import {
  Home, Calendar, UserCheck, FileText, DollarSign, FlaskConical, BarChart3,
  TrendingUp, Users, Settings, Database, Monitor, Building2,
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


export interface NavSection {
  title: string
  items: { label: string; icon: string; path: string; module: SystemModule | null }[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'PRINCIPAL',
    items: [
      { label: 'Dashboard', icon: 'Home', path: '/app/dashboard', module: 'dashboard' },
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
      { label: 'Dashboard', icon: 'Home', path: '/app/lab/dashboard', module: 'lab_technical' },
      { label: 'Coleta', icon: 'FlaskConical', path: '/app/lab/coleta', module: 'lab_technical' },
      { label: 'Mapa de Trabalho', icon: 'FileText', path: '/app/lab/mapa', module: 'lab_technical' },
      { label: 'Análise', icon: 'Database', path: '/app/lab/analise', module: 'lab_technical' },
      { label: 'Validação', icon: 'ShieldCheck', path: '/app/lab/validacao', module: 'lab_technical' },
      { label: 'Laudos', icon: 'FileText', path: '/app/lab/laudos', module: 'lab_technical' },
    ],
  },
  {
    title: 'CADASTROS LABORATÓRIO',
    items: [
      { label: 'Catálogo de Exames', icon: 'FlaskConical', path: '/app/cadastros/catalogo', module: 'lab_registers' },
      { label: 'Unidades de Medida', icon: 'Ruler', path: '/app/configuracoes/laboratorio?tab=units', module: 'lab_registers' },
      { label: 'Metodologias', icon: 'Beaker', path: '/app/configuracoes/laboratorio?tab=methods', module: 'lab_registers' },
      { label: 'Bancadas', icon: 'Layout', path: '/app/configuracoes/laboratorio?tab=workbenches', module: 'lab_registers' },
      { label: 'Equipamentos', icon: 'Monitor', path: '/app/cadastros/equipamentos', module: 'lab_registers' },
      { label: 'Abreviaturas', icon: 'FileText', path: '/app/configuracoes/abreviaturas', module: 'lab_registers' },
    ],
  },
  {
    title: 'FINANCEIRO LABORATÓRIO',
    items: [
      { label: 'Dashboard Fin.', icon: 'Layout', path: '/app/financeiro', module: 'finance' },
      { label: 'Contas a Receber', icon: 'DollarSign', path: '/app/financeiro/receber', module: 'finance' },
      { label: 'Contas a Pagar', icon: 'DollarSign', path: '/app/financeiro/pagar', module: 'finance' },
      { label: 'Faturamento TISS', icon: 'FileText', path: '/app/financeiro/faturamento', module: 'finance' },
      { label: 'Tabelas de Preços', icon: 'Database', path: '/app/financeiro/tabelas', module: 'finance' },
      { label: 'Centros de Custo', icon: 'PieChart', path: '/app/financeiro/centros-custo', module: 'finance' },
      { label: 'Indicadores', icon: 'TrendingUp', path: '/app/financeiro/indicadores', module: 'finance' },
    ],
  },
  {
    title: 'ESTOQUE E ALMOXARIFADO',
    items: [
      { label: 'Dashboard Estoque', icon: 'Warehouse', path: '/app/estoque', module: 'inventory' },
      { label: 'Itens de Estoque', icon: 'Package', path: '/app/estoque/itens', module: 'inventory' },
      { label: 'Gestão de Lotes', icon: 'Database', path: '/app/estoque/lotes', module: 'inventory' },
      { label: 'Movimentações', icon: 'RefreshCw', path: '/app/estoque/movimentacoes', module: 'inventory' },
      { label: 'Fornecedores', icon: 'Building2', path: '/app/estoque/fornecedores', module: 'inventory' },
      { label: 'Relatórios Estoque', icon: 'BarChart3', path: '/app/estoque/relatorios', module: 'inventory' },
    ],
  },
  {
    title: 'FARMÁCIA HOSPITALAR',
    items: [
      { label: 'Dashboard Farmácia', icon: 'Layout', path: '/app/farmacia', module: 'pharmacy' },
      { label: 'Dispensação', icon: 'Pill', path: '/app/farmacia/dispensacao', module: 'pharmacy' },
      { label: 'Prescrições', icon: 'ClipboardList', path: '/app/farmacia/prescricoes', module: 'pharmacy' },
      { label: 'Medicamentos', icon: 'Pill', path: '/app/farmacia/medicamentos', module: 'pharmacy' },
      { label: 'Estoque Farmácia', icon: 'Warehouse', path: '/app/farmacia/estoque', module: 'pharmacy' },
      { label: 'Relatórios Farmácia', icon: 'BarChart3', path: '/app/farmacia/relatorios', module: 'pharmacy' },
    ],
  },
  {
    title: 'SOROTECA',
    items: [
      { label: 'Dashboard Soroteca', icon: 'Layout', path: '/app/soroteca', module: 'serotheque' },
      { label: 'Entrada / Armazenar', icon: 'ArrowRight', path: '/app/soroteca/entrada', module: 'serotheque' },
      { label: 'Consulta Amostras', icon: 'Search', path: '/app/soroteca/consulta', module: 'serotheque' },
      { label: 'Estrutura Física', icon: 'Database', path: '/app/soroteca/estrutura', module: 'serotheque' },
      { label: 'Descarte Amostras', icon: 'Package', path: '/app/soroteca/descarte', module: 'serotheque' },
      { label: 'Rastreabilidade', icon: 'FileText', path: '/app/soroteca/rastreabilidade', module: 'serotheque' },
      { label: 'Config. Soroteca', icon: 'Settings', path: '/app/soroteca/configuracoes', module: 'serotheque' },
    ],
  },
  {
    title: 'PORTAIS EXTERNOS',
    items: [
      { label: 'Gestão de Portais', icon: 'Users', path: '/app/portais', module: 'portals' },
      { label: 'Notificações', icon: 'Bell', path: '/app/configuracoes/notificacoes', module: 'portals' },
      { label: 'Relatórios Externos', icon: 'BarChart3', path: '/app/portais/relatorios', module: 'portals' },
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
  const [brandName, setBrandName] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  const { orders } = useAttendanceCadastro()

  const visibleSections = NAV_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item => {
      const profileAllows = !item.module || canAccess(item.module, 'view')
      const sectorOverride = activeSector?.moduleOverrides?.[item.path]
      return sectorOverride !== undefined ? sectorOverride : profileAllows
    }),
  })).filter(section => section.items.length > 0)

  const waitingCollectionCount = orders.filter(o => o.status === 'waiting_collection' || o.status === 'waiting').length
  const analiseCount = orders.filter(o => o.status === 'collection_done' || (o.status as string) === 'in_analysis').length

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
        {visibleSections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-bold tracking-wider text-white/30 uppercase">{section.title}</p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = location.pathname.startsWith(item.path)
                const Icon = ICON_MAP[item.icon] || Home

                const badge = item.path === '/app/lab/coleta' ? waitingCollectionCount : item.path === '/app/lab/analise' ? analiseCount : null

                const link = (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => onMobileClose?.()}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      active
                        ? 'gradient-bg text-white shadow-lg'
                        : 'text-white/60 hover:bg-white/[0.06] hover:text-white'
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {!collapsed && badge && (
                      <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[10px] font-bold">{badge}</span>
                    )}
                  </NavLink>
                )

                if (collapsed) {
                  return (
                    <Tooltip key={item.path}>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
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
