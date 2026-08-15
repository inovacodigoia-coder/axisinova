import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'

/**
 * ID sequencial da empresa (ordem de criação no sistema).
 * Usado como último bloco do código da amostra: 16-00-1-<idEmpresa>
 */
export function useCompanySequenceId() {
  const { user } = useAuth()
  const companyId = user?.companyId

  const { data } = useQuery({
    queryKey: ['company_sequence_id', companyId],
    queryFn: async () => {
      if (!companyId) return null
      const { data, error } = await supabase
        .from('companies')
        .select('sequence_id')
        .eq('id', companyId)
        .maybeSingle()
      if (error) throw error
      return ((data as any)?.sequence_id as number | null) ?? null
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 60,
  })

  return data ?? null
}
