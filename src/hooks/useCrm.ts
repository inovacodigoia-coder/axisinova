import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useCanalRealtime } from '@/hooks/useCanalRealtime'
import { useAuth } from '@/context/AuthContext'
import { resolveCompanyId } from '@/utils/companyId'
import type { CrmAcesso } from '@/lib/crm'

/** Acesso ao CRM (empresa liberada + permissão), checado no banco. */
export function useCrmAcesso() {
  const [acesso, setAcesso] = useState<CrmAcesso | null>(null)
  useEffect(() => {
    let vivo = true
    void supabase.rpc('crm_meu_acesso' as any).then(({ data }) => {
      if (vivo) setAcesso((data as unknown as CrmAcesso) ?? { ver: false, operar: false, gerenciar: false, criar: false })
    })
    return () => { vivo = false }
  }, [])
  return acesso
}

/** Aviso de mudança do quadro (sem conteúdo nem telefone). */
export function useCrmSinais(ativo: boolean, onSinal: () => void) {
  const { user } = useAuth()
  const companyId = resolveCompanyId(user?.companyId)
  // Só os sinais da empresa (antes ouvia a tabela inteira)
  useCanalRealtime(ativo && companyId ? 'crm-sinais' : null, (ch) => ch
    .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_sinais', filter: `company_id=eq.${companyId}` }, () => onSinal()),
  [companyId, onSinal], { aoRetomar: () => onSinal() })
}
