import { useMemo } from 'react'
import { useCompanyContext } from '@/context/CompanyContext'

/**
 * Permissão de Regulação (Internação).
 * Ação 'approve' no módulo `inpatient` permite aprovar, recusar/redirecionar
 * e confirmar a chegada do paciente. Perfis antigos (sem a chave configurada)
 * mantêm acesso total, garantindo compatibilidade retroativa.
 */
export function useInpatientPermissions() {
  const { activeProfile } = useCompanyContext()

  return useMemo(() => {
    const perms = activeProfile?.permissions?.inpatient
    if (!perms) {
      return { canRegulate: true, isConfigured: false }
    }
    return { canRegulate: perms.includes('approve'), isConfigured: true }
  }, [activeProfile])
}
