import { useMemo } from 'react'
import { useCompanyContext } from '@/context/CompanyContext'
import { useAuth } from '@/context/AuthContext'

/**
 * Permissão de Regulação (Internação).
 * Ação 'approve' no módulo `inpatient` permite aprovar, recusar/redirecionar,
 * confirmar a chegada do paciente e dar alta. Fechado por padrão: perfil sem o
 * módulo configurado NÃO tem acesso. Administrador da empresa tem acesso total.
 * O banco confere a mesma regra em `internacao_tem_permissao`.
 */
export function useInpatientPermissions() {
  const { activeProfile } = useCompanyContext()
  const { user } = useAuth()

  return useMemo(() => {
    const admin = user?.role === 'company_admin' || user?.role === 'super_admin'
    const perms: string[] | undefined = (activeProfile?.permissions as any)?.inpatient
    return { canRegulate: admin || !!perms?.includes('approve'), isConfigured: !!perms }
  }, [activeProfile, user])
}
