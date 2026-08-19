import { useMemo } from 'react'
import { useCompanyContext } from '@/context/CompanyContext'

/**
 * Permissões da tela de Digitação de Resultados.
 * Perfis antigos (sem a chave `result_entry` configurada) mantêm acesso total,
 * garantindo compatibilidade retroativa.
 */
export function useResultEntryPermissions() {
  const { activeProfile } = useCompanyContext()

  return useMemo(() => {
    const perms = activeProfile?.permissions?.result_entry
    if (!perms) {
      return { canType: true, canRelease: true, canCorrect: true, isConfigured: false }
    }
    return {
      canType: perms.includes('create'),
      canRelease: perms.includes('approve'),
      canCorrect: perms.includes('edit'),
      isConfigured: true,
    }
  }, [activeProfile])
}
