import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { CompanySidebar } from '@/components/company/CompanySidebar'
import { Menu, Bell } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import CompanyDashboard from './CompanyDashboard'
import SchedulePage from './SchedulePage'
import MedicalRecordsPage from './MedicalRecordsPage'
import BillingTissPage from './BillingTissPage'

export default function CompanyPortalLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-muted">
      <CompanySidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="lg:ml-[260px] flex flex-col min-h-screen transition-all duration-300">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 sm:px-6 shadow-[0_1px_0_hsl(var(--border))]">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 hover:bg-muted transition-colors lg:hidden">
              <Menu className="h-5 w-5 text-muted-foreground" />
            </button>
            <span className="text-sm font-medium text-foreground">{user?.companyName || 'Portal'}</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative rounded-lg p-2 hover:bg-muted transition-colors">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">2</span>
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-bg text-xs font-bold text-white">
              {user?.name?.charAt(0) || 'U'}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Routes>
            <Route path="dashboard" element={<CompanyDashboard />} />
            <Route path="agendamento" element={<SchedulePage />} />
            <Route path="prontuario" element={<MedicalRecordsPage />} />
            <Route path="faturamento" element={<BillingTissPage />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
