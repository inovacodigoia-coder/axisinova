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
import { OriginSelector } from '@/components/company/OriginSelector'
import { getLandingRoute } from '@/utils/landingRoute'
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
import WhatsappSettingsPage from './settings/WhatsappSettingsPage'
import EstablishmentsSettingsPage from './settings/EstablishmentsSettingsPage'
import OriginsPage from './settings/OriginsPage'
import LabTriagemPage from './lab/LabTriagemPage'
import ReceptionLayout from './reception/ReceptionLayout'
import TriagePage from './triage/TriagePage'
import CollectionPostsPage from './beds/CollectionPostsPage'
import InpatientPage from './beds/InpatientPage'
import NutritionPage from './nutrition/NutritionPage'
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
import LabSettingsPage from './lab/settings/LabSettingsPage'
import LabCatalogPage from './lab/catalog/LabCatalogPage'
import LabCatalogFormPage from './lab/catalog/LabCatalogFormPage'
import LabEquipmentPage from './lab/equipment/LabEquipmentPage'
import InstrumentApiKeysPage from './lab/equipment/InstrumentApiKeysPage'
import LabAbbreviationsPage from './lab/abbreviations/LabAbbreviationsPage'
import LabTechnicalWorkPage from './lab/LabTechnicalWorkPage'
import LabHematologiaPage from './lab/LabHematologiaPage'
import LabAnalisePage from './lab/analise/LabAnalisePage'
import LabMapaPage from './lab/LabMapaPage'
import LabMapaViewPage from './lab/LabMapaViewPage'
import LabReportsPage from './lab/LabReportsPage'
import LabBudgetsPage from './lab/orcamentos/LabBudgetsPage'
import LabBudgetFormPage from './lab/orcamentos/LabBudgetFormPage'
import LabBudgetDetailPage from './lab/orcamentos/LabBudgetDetailPage'
import LabDashboard from './lab/LabDashboard'
import ConnectAgentsPage from './ConnectAgentsPage'

import DirectCadastroPage from './reception/DirectCadastroPage'

import LabFinanceDashboardPage from './financeiro/LabFinanceDashboardPage'
import LabAccountsReceivablePage from './financeiro/LabAccountsReceivablePage'
import LabAccountsPayablePage from './financeiro/LabAccountsPayablePage'
import LabPriceTablesPage from './financeiro/LabPriceTablesPage'
import LabBillingTissPage from './financeiro/LabBillingTissPage'
import LabCostCentersPage from './financeiro/LabCostCentersPage'
import LabFinancialIndicatorsPage from './financeiro/LabFinancialIndicatorsPage'
import LabStockDashboardPage from './estoque/LabStockDashboardPage'
import LabStockItemsPage from './estoque/LabStockItemsPage'
import LabStockLotsPage from './estoque/LabStockLotsPage'
import LabStockMovementsPage from './estoque/LabStockMovementsPage'
import LabStockSuppliersPage from './estoque/LabStockSuppliersPage'
import LabStockReportsPage from './estoque/LabStockReportsPage'
import LabPharmacyDashboardPage from './farmacia/LabPharmacyDashboardPage'
import LabPharmacyMedsPage from './farmacia/LabPharmacyMedsPage'
import LabPharmacyPrescriptionsPage from './farmacia/LabPharmacyPrescriptionsPage'
import LabPharmacyStockPage from './farmacia/LabPharmacyStockPage'
import LabPharmacyReportsPage from './farmacia/LabPharmacyReportsPage'
import LabSorotecaDashboardPage from './lab/soroteca/LabSorotecaDashboardPage'
import LabSorotecaStructurePage from './lab/soroteca/LabSorotecaStructurePage'
import ExternalPortalsPage from './lab/portals/ExternalPortalsPage'
import SupportOutsourcingPage from './support/SupportOutsourcingPage'
import ApoioKanbanPage from './support/ApoioKanbanPage'
import ApoioRelatoriosPage from './support/ApoioRelatoriosPage'


import PartnersHubPage from './lab/portals/PartnersHubPage'
import PartnerDetailPage from './lab/portals/PartnerDetailPage'
import PartnerPortalPage from './lab/portals/PartnerPortalPage'
import PatientPortalPage from './lab/portals/PatientPortalPage'
import DoctorPortalPage from './lab/portals/DoctorPortalPage'
import SessionSettingsPage from './settings/SessionSettingsPage'





function PortalContent() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const { user, logout } = useAuth()
  const { unreadCount } = useNotificationContext()
  const { activeSector, activeProfile, isSessionReady, isSessionHydrated, canAccess } = useCompanyContext()
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
      <div className="min-h-screen flex items-center justify-center bg-background">
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

  // Guard: se o perfil/setor não tem acesso ao Dashboard, redireciona para a
  // primeira rota liberada no menu (ex.: Iniciar Cadastro).
  const landing = getLandingRoute(canAccess, activeSector)
  if (location.pathname === '/app/dashboard' && landing !== '/app/dashboard') {
    return <Navigate to={landing} replace />
  }


  return (
    <div className="min-h-screen flex flex-col bg-background">
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
            <OriginSelector />
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
              <Route path="triagem" element={<TriagePage />} />
              <Route path="postos-coleta" element={<CollectionPostsPage />} />
              <Route path="internacao" element={<InpatientPage />} />
              <Route path="nutricao" element={<NutritionPage />} />
              <Route path="recepcao/cadastro-direto" element={<DirectCadastroPage />} />
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
              <Route path="configuracoes/whatsapp" element={<WhatsappSettingsPage />} />
              <Route path="configuracoes/estabelecimentos" element={<EstablishmentsSettingsPage />} />
              <Route path="configuracoes/origens" element={<OriginsPage />} />
              <Route path="configuracoes/laboratorio" element={<LabSettingsPage />} />
              <Route path="configuracoes/sessao" element={<SessionSettingsPage />} />
              <Route path="configuracoes/abreviaturas" element={<LabAbbreviationsPage />} />
              <Route path="cadastros/catalogo" element={<LabCatalogPage />} />
              <Route path="cadastros/catalogo/novo" element={<LabCatalogFormPage />} />
              <Route path="cadastros/catalogo/:id/editar" element={<LabCatalogFormPage />} />
              <Route path="cadastros/equipamentos" element={<LabEquipmentPage />} />
              <Route path="cadastros/equipamentos/integracao" element={<InstrumentApiKeysPage />} />
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
              <Route path="lab/dashboard" element={<LabDashboard />} />
              <Route path="lab/coleta" element={<LabColetaPage />} />
              <Route path="lab/triagem" element={<LabTriagemPage />} />
              <Route path="lab/mapa" element={<LabMapaPage />} />
              <Route path="lab/mapa/:codigo" element={<LabMapaViewPage />} />
              <Route path="lab/analise" element={<LabAnalisePage />} />
              <Route path="lab/validacao" element={<LabHematologiaPage />} />
              <Route path="lab/laudos" element={<LabReportsPage />} />
              <Route path="orcamentos" element={<LabBudgetsPage />} />
              <Route path="orcamentos/novo" element={<LabBudgetFormPage />} />
              <Route path="orcamentos/:id" element={<LabBudgetDetailPage />} />
              <Route path="orcamentos/:id/editar" element={<LabBudgetFormPage />} />

              {/* Lab Financial Module */}
              <Route path="financeiro" element={<LabFinanceDashboardPage />} />
              <Route path="financeiro/receber" element={<LabAccountsReceivablePage />} />
              <Route path="financeiro/pagar" element={<LabAccountsPayablePage />} />
              <Route path="financeiro/tabelas" element={<LabPriceTablesPage />} />
              <Route path="financeiro/faturamento" element={<LabBillingTissPage />} />
              <Route path="financeiro/centros-custo" element={<LabCostCentersPage />} />
              <Route path="financeiro/indicadores" element={<LabFinancialIndicatorsPage />} />

              {/* Stock Module */}
              <Route path="estoque" element={<LabStockDashboardPage />} />
              <Route path="estoque/itens" element={<LabStockItemsPage />} />
              <Route path="estoque/lotes" element={<LabStockLotsPage />} />
              <Route path="estoque/movimentacoes" element={<LabStockMovementsPage />} />
              <Route path="portais" element={<ExternalPortalsPage />} />
              <Route path="portais/parceiros" element={<PartnersHubPage />} />
              <Route path="portais/parceiros/pedidos" element={<PartnersHubPage />} />
              <Route path="portais/parceiros/:id" element={<PartnerDetailPage />} />
              <Route path="portal/parceiro" element={<PartnerPortalPage />} />
              <Route path="portal/paciente" element={<PatientPortalPage />} />
              <Route path="portal/medico" element={<DoctorPortalPage />} />

              {/* Apoio */}
              <Route path="apoio/terceirizacao" element={<SupportOutsourcingPage />} />
              <Route path="apoio/kanban" element={<ApoioKanbanPage />} />
              <Route path="apoio/relatorios" element={<ApoioRelatoriosPage />} />
              <Route path="apoio/kanban/:boardId" element={<Navigate to="/app/apoio/kanban" replace />} />
              <Route path="conectar-agentes" element={<ConnectAgentsPage />} />


              <Route path="estoque/fornecedores" element={<LabStockSuppliersPage />} />
              <Route path="estoque/relatorios" element={<LabStockReportsPage />} />

              {/* Pharmacy Module */}
              <Route path="farmacia" element={<LabPharmacyDashboardPage />} />
              <Route path="farmacia/medicamentos" element={<LabPharmacyMedsPage />} />
              <Route path="farmacia/prescricoes" element={<LabPharmacyPrescriptionsPage />} />
              <Route path="farmacia/dispensacao" element={<LabPharmacyPrescriptionsPage />} /> {/* Link to queue */}
              <Route path="farmacia/estoque" element={<LabPharmacyStockPage />} />
              <Route path="farmacia/relatorios" element={<LabPharmacyReportsPage />} />

              {/* Soroteca Module */}
              <Route path="soroteca" element={<LabSorotecaDashboardPage />} />
              <Route path="soroteca/estrutura" element={<LabSorotecaStructurePage />} />
              <Route path="soroteca/entrada" element={<LabSorotecaDashboardPage />} /> {/* Placeholder */}
              <Route path="soroteca/consulta" element={<LabSorotecaDashboardPage />} /> {/* Placeholder */}
              <Route path="soroteca/descarte" element={<LabSorotecaDashboardPage />} /> {/* Placeholder */}
              <Route path="soroteca/rastreabilidade" element={<LabSorotecaDashboardPage />} /> {/* Placeholder */}
              <Route path="soroteca/configuracoes" element={<LabSorotecaDashboardPage />} /> {/* Placeholder */}





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
