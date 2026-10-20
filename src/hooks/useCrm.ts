import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
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
  useEffect(() => {
    if (!ativo) return
    const ch = supabase.channel(`crm-sinais-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_sinais' }, () => onSinal())
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  }, [ativo, onSinal])
}
