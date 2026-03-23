import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useLocation } from 'react-router-dom'
import { Menu, Bell, ChevronRight, LogOut, User } from 'lucide-react'
import { SearchInput } from '@/components/ui/SearchInput'

const breadcrumbMap: Record<string, string> = {
  '/superadmin/dashboard': 'Dashboard Geral',
  '/superadmin/empresas': 'Empresas',
  '/superadmin/usuarios': 'Usuários do Sistema',
  '/superadmin/planos': 'Planos e Preços',
  '/superadmin/configuracoes': 'Configurações Globais',
  '/superadmin/auditoria': 'Log de Auditoria',
  '/superadmin/alertas': 'Alertas e Suporte',
}

export function SuperAdminTopbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [search, setSearch] = useState('')
  const [showUserMenu, setShowUserMenu] = useState(false)

  const currentPage = Object.entries(breadcrumbMap).find(([path]) => location.pathname.startsWith(path))?.[1] || 'Super Admin'

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-6 shadow-[0_1px_0_hsl(var(--border))]">
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">Super Admin</span>
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">{currentPage}</span>
      </div>

      <div className="hidden md:block w-80">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar empresa, usuário, CNPJ..." />
      </div>

      <div className="flex items-center gap-3">
        <button className="relative rounded-lg p-2 hover:bg-muted transition-colors">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">3</span>
        </button>

        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-muted transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-bg text-xs font-bold text-white">
              {user?.name?.charAt(0) || 'S'}
            </div>
          </button>
          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-border bg-card p-1 shadow-xl">
                <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted">
                  <User className="h-4 w-4" /> Perfil
                </button>
                <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
                  <LogOut className="h-4 w-4" /> Sair
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
