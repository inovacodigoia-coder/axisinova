import { Outlet } from 'react-router-dom'
import { RegistersSidebar, RegistersMobileNav } from '@/components/registers/layout/RegistersSidebar'

export default function RegistersLayout() {
  return (
    <div className="flex gap-6">
      <RegistersSidebar />
      <div className="flex-1 min-w-0">
        <RegistersMobileNav />
        <Outlet />
      </div>
    </div>
  )
}
