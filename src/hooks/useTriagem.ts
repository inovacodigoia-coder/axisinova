import { useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useCompanyContext } from '@/context/CompanyContext'

/** Permissões do grupo Triagem Lab (a checagem de verdade é no banco: triagem_tem_permissao) */
export function useTriagemPermissions() {
  const { user } = useAuth()
  const { activeProfile } = useCompanyContext()
  const isManager = user?.role === 'company_admin' || user?.role === 'super_admin' || (user as any)?.isAdmin === true
  const list = (((activeProfile?.permissions as any)?.triagem) || []) as string[]
  const has = useCallback((code: string) => isManager || list.includes(code), [isManager, list])
  return { has, algum: isManager || list.length > 0 }
}
