import { Outlet } from 'react-router-dom'
import { RegistersSidebar, RegistersMobileNav } from '@/components/registers/layout/RegistersSidebar'
import { RegistersProvider } from '@/context/RegistersContext'

export default function RegistersLayout() {
  return (
    <RegistersProvider>
      <div className="flex gap-6">
        <RegistersSidebar />
        <div className="flex-1 min-w-0">
          <RegistersMobileNav />
          <Outlet />
        </div>
      </div>
    </RegistersProvider>
  )
}
