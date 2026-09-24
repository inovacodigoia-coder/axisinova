import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { useCompanyContext } from '@/context/CompanyContext'
import { resolveCompanyId } from '@/utils/companyId'

export const APOIO_BLOQUEADO_MSG =
  'O módulo de Apoio / Terceirização ainda não foi liberado pelo Super Admin para esta empresa. Entre em contato com o suporte Axis Inova.'

/** Liberação do módulo Apoio (companies.apoio_enabled) */
export function useApoioEntitlement() {
  const { user } = useAuth()
  const companyId = resolveCompanyId(user?.companyId) || ''
  const [enabled, setEnabled] = useState<boolean | null>(null)
  useEffect(() => {
    if (!companyId) return
    supabase.from('companies').select('apoio_enabled').eq('id', companyId).maybeSingle()
      .then(({ data }) => setEnabled(!!(data as any)?.apoio_enabled))
  }, [companyId])
  return { companyId, enabled: enabled === true, loading: enabled === null }
}

/** Checa permissões apoio.* do perfil ativo (gestor da empresa tem todas, como no banco) */
export function useApoioPermissions() {
  const { user } = useAuth()
  const { activeProfile } = useCompanyContext()
  const isManager = user?.role === 'company_admin' || user?.role === 'super_admin' || (user as any)?.isAdmin === true
  const list = (((activeProfile?.permissions as any)?.apoio) || []) as string[]
  const has = useCallback((code: string) => isManager || list.includes(code), [isManager, list])
  return { has }
}
