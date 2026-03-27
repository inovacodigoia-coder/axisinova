import { useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { CompanySidebar } from '@/components/company/CompanySidebar'
import { Menu, Bell } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { UserSessionProvider, useUserSession } from '@/context/UserSessionContext'
import { NotificationProvider, NotificationPanel, useNotifications } from '@/components/company/NotificationPanel'
import { UserContextBadge } from '@/components/auth/UserContextBadge'
import { FunctionsMenu } from '@/components/portal/FunctionsMenu'
import CompanyDashboard from './CompanyDashboard'
import SchedulePage from './SchedulePage'
import MedicalRecordsPage from './MedicalRecordsPage'
import BillingTissPage from './BillingTissPage'
import ProfilesManagerPage from './ProfilesManagerPage'

function PortalContent() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const { user } = useAuth()
  const { unreadCount } = useNotifications()
  const { session } = useUserSession()
  const location = useLocation()

  const isDashboard = location.pathname === '/app/dashboard' || location.pathname === '/app'

  return (
    <div className="min-h-screen bg-muted">
      <CompanySidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="lg:ml-[260px] flex flex-col min-h-screen transition-all duration-300">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 sm:px-6 shadow-[0_1px_0_hsl(var(--border))]">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 hover:bg-muted transition-colors lg:hidden">
              <Menu className="h-5 w-5 text-muted-foreground" />
            </button>
            <div className="hidden sm:block">
              <span className="text-sm font-medium text-foreground">{user?.companyName || 'Portal'}</span>
              {session.selectedSector && (
                <span className="ml-2 text-xs text-muted-foreground">• {session.selectedSector.name}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setNotifOpen(!notifOpen)} className="relative rounded-lg p-2 hover:bg-muted transition-colors">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>
            <UserContextBadge />
          </div>
        </header>

        <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />

        <main className="flex-1 p-4 sm:p-6">
          <Routes>
            <Route path="dashboard" element={<FunctionsMenu />} />
            <Route path="agendamento" element={<SchedulePage />} />
            <Route path="prontuario" element={<MedicalRecordsPage />} />
            <Route path="faturamento" element={<BillingTissPage />} />
            <Route path="configuracoes/perfis" element={<ProfilesManagerPage />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function CompanyPortalLayout() {
  return (
    <UserSessionProvider>
      <NotificationProvider>
        <PortalContent />
      </NotificationProvider>
    </UserSessionProvider>
  )
}
