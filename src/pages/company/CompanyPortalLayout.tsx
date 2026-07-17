import { useState, Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueueProvider } from '@/context/QueueContext'
import { QueueSystemProvider } from '@/context/QueueSystemContext'
import { NotificationContextProvider, useNotificationContext } from '@/context/NotificationContext'
import { GlobalSearchProvider, useGlobalSearch } from '@/context/GlobalSearchContext'
import { SchedulingProvider } from '@/context/SchedulingContext'
import { RegistersProvider } from '@/context/RegistersContext'
import { MedicalProvider } from '@/context/MedicalContext'
import { BillingProvider } from '@/context/BillingContext'
import { CompanySidebar } from '@/components/company/CompanySidebar'
import { UserMenuDropdown } from '@/components/company/UserMenuDropdown'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { NotificationBadge } from '@/components/notifications/NotificationBadge'
import { CommandPalette } from '@/components/global/CommandPalette'
import { BreadcrumbNav } from '@/components/global/BreadcrumbNav'
import { PageTransition } from '@/components/global/PageTransition'
import { SystemStatusBar } from '@/components/global/SystemStatusBar'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useSessionTimeout } from '@/hooks/useSessionTimeout'
import { Menu, Bell, Search, Clock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useCompanyContext } from '@/context/CompanyContext'

// Pages
import CompanyDashboard from './CompanyDashboard'
import SchedulePage from './SchedulePage'
import MedicalRecordsPage from './MedicalRecordsPage'
import BillingTissPage from './BillingTissPage'
import UsersListPage from './users/UsersListPage'
import ProfilesManagerPage from './users/ProfilesManagerPage'
import SectorsPage from './sectors/SectorsPage'
import RegistersLayout from './registers/RegistersLayout'
import DoctorsPage from './registers/DoctorsPage'
import ConveniosPage from './registers/ConveniosPage'
import ExamsPage from './registers/ExamsPage'
import ProceduresPage from './registers/ProceduresPage'
import PatientsListPage from './registers/patients/PatientsListPage'
import PatientFormPage from './registers/patients/PatientFormPage'
import CompanySettingsPage from './settings/CompanySettingsPage'
import VisualSettingsPage from './settings/VisualSettingsPage'

import RoomsSettingsPage from './settings/RoomsSettingsPage'
import PrinterSettingsPage from './settings/PrinterSettingsPage'
import VoiceSettingsPage from './settings/VoiceSettingsPage'
import CompanyDataSettingsPage from './settings/CompanyDataSettingsPage'
import NotificationsSettingsPage from './settings/NotificationsSettingsPage'
import EstablishmentsSettingsPage from './settings/EstablishmentsSettingsPage'
import OriginsPage from './settings/OriginsPage'
import ReceptionLayout from './reception/ReceptionLayout'
import SchedulingPage from './scheduling/SchedulingPage'
import ConfirmationsPage from './scheduling/ConfirmationsPage'
import AbsenteesPage from './scheduling/AbsenteesPage'
import PatientHistoryPage from './scheduling/PatientHistoryPage'
import MedicalDashboardPage from './medical/MedicalDashboardPage'
import AttendancePage from './medical/AttendancePage'
import PatientRecordPage from './medical/PatientRecordPage'
import BillingDashboardPage from './billing/BillingDashboardPage'
import GuidesListPage from './billing/GuidesListPage'
import GuideDetailPage from './billing/GuideDetailPage'
import LotesPage from './billing/LotesPage'
import LoteDetailPage from './billing/LoteDetailPage'
import GlosasPage from './billing/GlosasPage'
import CorrectionQueuePage from './billing/CorrectionQueuePage'
import ResultsListPage from './results/ResultsListPage'
import BIDashboardPage from './bi/BIDashboardPage'
import ProductionReportPage from './bi/ProductionReportPage'
import FinancialReportPage from './bi/FinancialReportPage'
import SchedulingReportPage from './bi/SchedulingReportPage'
import AbsenteesReportPage from './bi/AbsenteesReportPage'
import ConvenioReportPage from './bi/ConvenioReportPage'
import DoctorPerformancePage from './bi/DoctorPerformancePage'
import QueueSelectorPage from './queue/QueueSelectorPage'
import TVSelectorPage from './queue/TVSelectorPage'
import TotemSelectorPage from './queue/TotemSelectorPage'
import AttendantSelectorPage from './queue/AttendantSelectorPage'
import AttendantPanelPage from './queue/AttendantPanelPage'
import QueueAdminPage from './queue/admin/QueueAdminPage'
import AdminHomePage from './queue/admin/AdminHomePage'
import UnitsListPage from './queue/admin/UnitsListPage'
import UnitConfigPage from './queue/admin/UnitConfigPage'
import TVConfigPage from './queue/admin/TVConfigPage'
import QueueBIPage from './queue/admin/QueueBIPage'
import LabColetaPage from './lab/LabColetaPage'

function PortalContent() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const { user, logout } = useAuth()
  const { unreadCount } = useNotificationContext()
  const { activeSector, activeProfile, isSessionReady, isSessionHydrated } = useCompanyContext()
  const { open: openSearch } = useGlobalSearch()
  const location = useLocation()
  const { showWarning, countdown, extendSession } = useSessionTimeout()

  useKeyboardShortcuts({
    'ctrl+k': openSearch,
    'ctrl+n': () => window.location.href = '/app/agendamento',
    'ctrl+d': () => window.location.href = '/app/dashboard',
    'escape': () => setNotifOpen(false),
  })

  if (!isSessionHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Preparando acesso...</span>
        </div>
      </div>
    )
  }

  // Guard: usuário precisa ter perfil + setor selecionados antes de acessar módulos.
  // super_admin / company_admin têm bypass automático no CompanyContext.
  const needsSessionSelection = user && !isSessionReady && (!activeProfile || !activeSector)
  if (needsSessionSelection) {
    return <Navigate to="/selecionar-perfil" replace state={{ from: location }} />
  }


  return (
    <div className="min-h-screen flex flex-col bg-muted">
      <CompanySidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />
      <div className={`${collapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'} flex flex-col flex-1 transition-all duration-300`}>
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 sm:px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 hover:bg-muted transition-colors lg:hidden">
              <Menu className="h-5 w-5 text-muted-foreground" />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{user?.companyName || 'Portal'}</span>
              {activeSector && <span className="text-xs text-muted-foreground">• {activeSector.name}</span>}
            </div>
          </div>

          {/* Global Search */}
          <div className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-4">
            <button
              onClick={openSearch}
              className="relative w-full flex items-center gap-2 rounded-lg border border-input bg-background pl-9 pr-4 py-2 text-sm text-muted-foreground hover:border-ring transition-colors"
            >
              <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
              <span>Buscar pacientes, guias, médicos...</span>
              <kbd className="ml-auto text-[10px] bg-muted border border-border rounded px-1.5 py-0.5">⌘K</kbd>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative rounded-lg p-2 hover:bg-muted transition-colors"
            >
              <Bell className="h-5 w-5 text-muted-foreground" />
              <NotificationBadge count={unreadCount} animate={unreadCount > 0} />
            </button>
            <UserMenuDropdown />
          </div>
        </header>

        <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} />

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6">
          <BreadcrumbNav />
          <PageTransition key={location.pathname}>
            <Routes>
              <Route path="dashboard" element={<CompanyDashboard />} />
              <Route path="agendamento" element={<SchedulingPage />} />
              <Route path="agendamento/legado" element={<SchedulePage />} />
              <Route path="confirmacoes" element={<ConfirmationsPage />} />
              <Route path="faltosos" element={<AbsenteesPage />} />
              <Route path="historico-paciente" element={<PatientHistoryPage />} />
              <Route path="recepcao" element={<ReceptionLayout />} />
              <Route path="medico" element={<MedicalDashboardPage />} />
              <Route path="atendimento/:appointmentId" element={<AttendancePage />} />
              <Route path="prontuario/:patientId" element={<PatientRecordPage />} />
              <Route path="prontuario" element={<MedicalRecordsPage />} />
              <Route path="faturamento" element={<BillingDashboardPage />} />
              <Route path="faturamento/guias" element={<GuidesListPage />} />
              <Route path="faturamento/guias/:guideId" element={<GuideDetailPage />} />
              <Route path="faturamento/lotes" element={<LotesPage />} />
              <Route path="faturamento/lotes/:loteId" element={<LoteDetailPage />} />
              <Route path="faturamento/glosas" element={<GlosasPage />} />
              <Route path="faturamento/correcoes" element={<CorrectionQueuePage />} />
              <Route path="faturamento/legado" element={<BillingTissPage />} />
              <Route path="resultados" element={<ResultsListPage />} />
              <Route path="usuarios" element={<UsersListPage />} />
              <Route path="configuracoes/perfis" element={<ProfilesManagerPage />} />
              <Route path="setores" element={<SectorsPage />} />
              <Route path="cadastros" element={<RegistersLayout />}>
                <Route index element={<Navigate to="medicos" replace />} />
                <Route path="medicos" element={<DoctorsPage />} />
                <Route path="especialidades" element={<Navigate to="/app/cadastros/medicos" replace />} />
                <Route path="convenios" element={<ConveniosPage />} />
                <Route path="convenios/anexos" element={<Navigate to="/app/cadastros/convenios" replace />} />
                <Route path="exames" element={<ExamsPage />} />
                <Route path="procedimentos" element={<ProceduresPage />} />
                <Route path="pacientes" element={<PatientsListPage />} />
                <Route path="pacientes/novo" element={<PatientFormPage />} />
                <Route path="pacientes/:patientId/editar" element={<PatientFormPage />} />
              </Route>
              <Route path="configuracoes" element={<CompanySettingsPage />} />
              <Route path="configuracoes/dados" element={<CompanyDataSettingsPage />} />
              <Route path="configuracoes/visual" element={<VisualSettingsPage />} />
              
              <Route path="configuracoes/salas" element={<RoomsSettingsPage />} />
              <Route path="configuracoes/impressora" element={<PrinterSettingsPage />} />
              <Route path="configuracoes/voz" element={<VoiceSettingsPage />} />
              <Route path="configuracoes/notificacoes" element={<NotificationsSettingsPage />} />
              <Route path="configuracoes/estabelecimentos" element={<EstablishmentsSettingsPage />} />
              <Route path="configuracoes/origens" element={<OriginsPage />} />
              <Route path="bi" element={<BIDashboardPage />} />
              <Route path="bi/producao" element={<ProductionReportPage />} />
              <Route path="bi/financeiro" element={<FinancialReportPage />} />
              <Route path="bi/agendamentos" element={<SchedulingReportPage />} />
              <Route path="bi/faltosos" element={<AbsenteesReportPage />} />
              <Route path="bi/convenios" element={<ConvenioReportPage />} />
              <Route path="bi/medicos" element={<DoctorPerformancePage />} />
              <Route path="bi/atendimento" element={<QueueBIPage />} />
              {/* Queue System */}
              <Route path="filas" element={<Navigate to="/app/filas/admin/unidades" replace />} />
              <Route path="filas/tv" element={<TVSelectorPage />} />
              <Route path="filas/totem" element={<TotemSelectorPage />} />
              <Route path="filas/atendente" element={<AttendantSelectorPage />} />
              <Route path="filas/atendente/painel" element={<AttendantPanelPage />} />
              <Route path="filas/admin" element={<QueueAdminPage />}>
                <Route index element={<Navigate to="/app/filas/admin/unidades" replace />} />
                <Route path="unidades" element={<UnitsListPage />} />
                <Route path="unidades/:unitId" element={<UnitConfigPage />} />
                <Route path="unidades/:unitId/tvs" element={<TVConfigPage />} />
                <Route path="bi" element={<QueueBIPage />} />
              </Route>
              
              {/* Lab Technical Sector */}
              <Route path="lab/coleta" element={<LabColetaPage />} />
              <Route path="lab/mapa" element={<div className="p-8">Mapa de Trabalho (Em breve)</div>} />
              <Route path="lab/caixa-entrada" element={<div className="p-8">Caixa de Entrada (Em breve)</div>} />
              <Route path="lab/validacao" element={<div className="p-8">Validação Técnica (Em breve)</div>} />

              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </PageTransition>
        </main>

        {/* Status bar */}
        <SystemStatusBar />
      </div>

      {/* Command Palette */}
      <CommandPalette />

      {/* Session Timeout Warning */}
      {showWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Sua sessão está expirando</h3>
              <p className="text-sm text-muted-foreground">
                Você ficará desconectado em{' '}
                <strong className="text-foreground">
                  {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                </strong>
                {' '}por inatividade.
              </p>
              <div className="flex w-full gap-3 mt-2">
                <button
                  onClick={logout}
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  Sair agora
                </button>
                <button
                  onClick={extendSession}
                  className="flex-1 rounded-lg gradient-bg px-4 py-2 text-sm font-medium text-primary-foreground transition-colors"
                >
                  Continuar conectado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CompanyPortalLayout() {
  return (
    <QueueProvider>
      <QueueSystemProvider>
        <NotificationContextProvider>
          <GlobalSearchProvider>
            <SchedulingProvider>
              <RegistersProvider>
                <MedicalProvider>
                  <BillingProvider>
                    <PortalContent />
                  </BillingProvider>
                </MedicalProvider>
              </RegistersProvider>
            </SchedulingProvider>
          </GlobalSearchProvider>
        </NotificationContextProvider>
      </QueueSystemProvider>
    </QueueProvider>
  )
}
