import { useState, Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueueProvider } from '@/context/QueueContext'
import { NotificationContextProvider, useNotificationContext } from '@/context/NotificationContext'
import { GlobalSearchProvider, useGlobalSearch } from '@/context/GlobalSearchContext'
import { SchedulingProvider } from '@/context/SchedulingContext'
import { CompanySidebar } from '@/components/company/CompanySidebar'
import { UserMenuDropdown } from '@/components/company/UserMenuDropdown'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { NotificationBadge } from '@/components/notifications/NotificationBadge'
import { CommandPalette } from '@/components/global/CommandPalette'
import { BreadcrumbNav } from '@/components/global/BreadcrumbNav'
import { PageTransition } from '@/components/global/PageTransition'
import { SystemStatusBar } from '@/components/global/SystemStatusBar'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { Menu, Bell, Search } from 'lucide-react'
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
import CompanySettingsPage from './settings/CompanySettingsPage'
import SchedulingPage from './scheduling/SchedulingPage'
import ConfirmationsPage from './scheduling/ConfirmationsPage'
import AbsenteesPage from './scheduling/AbsenteesPage'
import PatientHistoryPage from './scheduling/PatientHistoryPage'
import ReceptionPage from './reception/ReceptionPage'
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

function PortalContent() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const { user } = useAuth()
  const { unreadCount } = useNotificationContext()
  const { activeSector } = useCompanyContext()
  const { open: openSearch } = useGlobalSearch()
  const location = useLocation()

  useKeyboardShortcuts({
    'ctrl+k': openSearch,
    'ctrl+n': () => window.location.href = '/app/agendamento',
    'ctrl+d': () => window.location.href = '/app/dashboard',
    'escape': () => setNotifOpen(false),
  })

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
              <Route path="recepcao" element={<ReceptionPage />} />
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
              </Route>
              <Route path="configuracoes" element={<CompanySettingsPage />} />
              <Route path="bi" element={<BIDashboardPage />} />
              <Route path="bi/producao" element={<ProductionReportPage />} />
              <Route path="bi/financeiro" element={<FinancialReportPage />} />
              <Route path="bi/agendamentos" element={<SchedulingReportPage />} />
              <Route path="bi/faltosos" element={<AbsenteesReportPage />} />
              <Route path="bi/convenios" element={<ConvenioReportPage />} />
              <Route path="bi/medicos" element={<DoctorPerformancePage />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </PageTransition>
        </main>

        {/* Status bar */}
        <SystemStatusBar />
      </div>

      {/* Command Palette */}
      <CommandPalette />
    </div>
  )
}

export default function CompanyPortalLayout() {
  return (
    <QueueProvider>
      <NotificationContextProvider>
        <GlobalSearchProvider>
          <SchedulingProvider>
            <PortalContent />
          </SchedulingProvider>
        </GlobalSearchProvider>
      </NotificationContextProvider>
    </QueueProvider>
  )
}
