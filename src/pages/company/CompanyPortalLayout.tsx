import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { QueueProvider } from '@/context/QueueContext'
import { CompanySidebar } from '@/components/company/CompanySidebar'
import { UserMenuDropdown } from '@/components/company/UserMenuDropdown'
import { Menu, Bell, Search } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useCompanyContext } from '@/context/CompanyContext'
import { NotificationProvider, NotificationPanel, useNotifications } from '@/components/company/NotificationPanel'
import CompanyDashboard from './CompanyDashboard'
import SchedulePage from './SchedulePage'
import MedicalRecordsPage from './MedicalRecordsPage'
import BillingTissPage from './BillingTissPage'
import UsersListPage from './users/UsersListPage'
import ProfilesManagerPage from './users/ProfilesManagerPage'
import SectorsPage from './sectors/SectorsPage'
import DoctorsPage from './registers/DoctorsPage'
import ConveniosPage from './registers/ConveniosPage'
import ExamsPage from './registers/ExamsPage'
import CompanySettingsPage from './settings/CompanySettingsPage'
import SchedulingPage from './scheduling/SchedulingPage'
import ConfirmationsPage from './scheduling/ConfirmationsPage'
import AbsenteesPage from './scheduling/AbsenteesPage'
import PatientHistoryPage from './scheduling/PatientHistoryPage'
import ReceptionPage from './reception/ReceptionPage'

function PortalContent() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const { user } = useAuth()
  const { unreadCount } = useNotifications()
  const { activeSector } = useCompanyContext()

  return (
    <div className="min-h-screen bg-muted">
      <CompanySidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />
      <div className={`${collapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'} flex flex-col min-h-screen transition-all duration-300`}>
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

          <div className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input placeholder="Buscar..." className="w-full rounded-lg border border-input bg-background pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setNotifOpen(!notifOpen)} className="relative rounded-lg p-2 hover:bg-muted transition-colors">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>
            <UserMenuDropdown />
          </div>
        </header>

        <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />

        <main className="flex-1 p-4 sm:p-6">
          <Routes>
            <Route path="dashboard" element={<CompanyDashboard />} />
            <Route path="agendamento" element={<SchedulingPage />} />
            <Route path="agendamento/legado" element={<SchedulePage />} />
            <Route path="confirmacoes" element={<ConfirmationsPage />} />
            <Route path="faltosos" element={<AbsenteesPage />} />
            <Route path="historico-paciente" element={<PatientHistoryPage />} />
            <Route path="recepcao" element={<ReceptionPage />} />
            <Route path="prontuario" element={<MedicalRecordsPage />} />
            <Route path="faturamento" element={<BillingTissPage />} />
            <Route path="usuarios" element={<UsersListPage />} />
            <Route path="configuracoes/perfis" element={<ProfilesManagerPage />} />
            <Route path="setores" element={<SectorsPage />} />
            <Route path="cadastros/medicos" element={<DoctorsPage />} />
            <Route path="cadastros/convenios" element={<ConveniosPage />} />
            <Route path="cadastros/exames" element={<ExamsPage />} />
            <Route path="cadastros" element={<Navigate to="medicos" replace />} />
            <Route path="configuracoes" element={<CompanySettingsPage />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function CompanyPortalLayout() {
  return (
    <NotificationProvider>
      <PortalContent />
    </NotificationProvider>
  )
}
