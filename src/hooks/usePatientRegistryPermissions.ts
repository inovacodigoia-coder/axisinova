import { useMemo } from 'react'
import { useCompanyContext } from '@/context/CompanyContext'
import { useAuth } from '@/context/AuthContext'

/**
 * Permissões do cadastro do cliente (paciente) usado no modal
 * "Mais Informações do Cliente".
 * Perfis antigos (sem a chave `patient_registry`) mantêm acesso total.
 */
export function usePatientRegistryPermissions() {
  const { activeProfile } = useCompanyContext()
  const { user } = useAuth()

  return useMemo(() => {
    const isAdmin = user?.role === 'company_admin' || user?.role === 'super_admin'
    const perms = activeProfile?.permissions?.patient_registry
    if (isAdmin || !perms) {
      return { canView: true, canCreate: true, canEdit: true, isConfigured: false }
    }
    return {
      canView: perms.includes('view'),
      canCreate: perms.includes('create'),
      canEdit: perms.includes('edit'),
      isConfigured: true,
    }
  }, [activeProfile, user])
}
