import { useMemo } from 'react'
import { useCompanyContext } from '@/context/CompanyContext'
import { useAuth } from '@/context/AuthContext'
import type { AtendimentoDetalhesPermission } from '@/types/permissions.types'

/** Ações do menu do pedido em "Detalhes Atendimento". Admin tem todas; demais só o que o perfil marcar. */
export function atendimentoDetalhesPode(isAdmin: boolean, perms: unknown, code: AtendimentoDetalhesPermission): boolean {
  if (isAdmin) return true
  return Array.isArray(perms) && perms.includes(code)
}

export function useAtendimentoDetalhesPermissions() {
  const { activeProfile } = useCompanyContext()
  const { user } = useAuth()
  return useMemo(() => {
    const isAdmin = user?.role === 'company_admin' || user?.role === 'super_admin'
    const perms = (activeProfile?.permissions as any)?.atendimento_detalhes
    return (code: AtendimentoDetalhesPermission) => atendimentoDetalhesPode(isAdmin, perms, code)
  }, [activeProfile, user])
}
