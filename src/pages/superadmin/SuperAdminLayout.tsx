import { Outlet } from 'react-router-dom'
import { SuperAdminSidebar } from '@/components/superadmin/SuperAdminSidebar'
import { SuperAdminTopbar } from '@/components/superadmin/SuperAdminTopbar'
import { useAuth } from '@/context/AuthContext'

export default function SuperAdminLayout() {
  const { impersonation, setImpersonation } = useAuth()

  return (
    <div className="min-h-screen bg-muted">
      <SuperAdminSidebar />
      <div className="ml-[260px] flex flex-col min-h-screen transition-all duration-300">
        {impersonation && (
          <div className="flex items-center justify-center gap-3 bg-[hsl(33,100%,50%)] px-4 py-2 text-sm font-medium text-white">
            <span>Você está visualizando como <strong>{impersonation.companyName}</strong></span>
            <button onClick={() => setImpersonation(null)} className="rounded bg-white/20 px-2 py-0.5 text-xs font-bold hover:bg-white/30 transition-colors">
              Sair da impersonação
            </button>
          </div>
        )}
        <SuperAdminTopbar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
