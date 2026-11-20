import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

/** Opção por empresa (padrão desligada): fluxo com Enter na etapa Guias e Procedimentos. */
export function useCadastroRapidoExames(companyId?: string | null) {
  const [ativo, setAtivo] = useState(false)
  const [carregado, setCarregado] = useState(false)
  useEffect(() => {
    let vivo = true
    supabase.rpc('cadastro_rapido_situacao', { p_company: companyId ?? null } as any).then(({ data }) => {
      if (vivo) { setAtivo(data === true); setCarregado(true) }
    })
    return () => { vivo = false }
  }, [companyId])
  return { ativo, setAtivo, carregado }
}
