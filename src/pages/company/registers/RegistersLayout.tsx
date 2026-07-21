import { Outlet } from 'react-router-dom'
import { RegistersSidebar, RegistersMobileNav } from '@/components/registers/layout/RegistersSidebar'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'

export default function RegistersLayout() {
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <RegistersSidebar />
      <div className="flex-1 min-w-0">
        <RegistersMobileNav />
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </div>
    </div>
  )
}
