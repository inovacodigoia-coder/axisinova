import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export interface InovachatAcesso { ver: boolean; responder: boolean; gerenciar: boolean; usuario_id?: string }

/** Acesso ao InovaChat (empresa liberada + permissão), checado no banco. */
export function useInovachatAcesso() {
  const [acesso, setAcesso] = useState<InovachatAcesso | null>(null)
  useEffect(() => {
    let vivo = true
    void supabase.rpc('inovachat_meu_acesso').then(({ data }) => {
      if (vivo) setAcesso((data as unknown as InovachatAcesso) ?? { ver: false, responder: false, gerenciar: false })
    })
    return () => { vivo = false }
  }, [])
  return acesso
}

/** Assina só os avisos de mudança (sem texto nem telefone) e chama onSinal. */
export function useInovachatSinais(ativo: boolean, onSinal: (conversaId: string) => void) {
  useEffect(() => {
    if (!ativo) return
    const ch = supabase.channel(`inovachat-sinais-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inovachat_sinais' },
        (p: any) => onSinal(String(p.new?.conversa_id ?? p.old?.conversa_id ?? '')))
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  }, [ativo, onSinal])
}

/** Total de não lidas das conversas que o usuário pode ver (para o badge do menu). */
export function useInovachatNaoLidas(ativo: boolean) {
  const [total, setTotal] = useState(0)
  const carregar = useCallback(async () => {
    const { data } = await supabase.from('whatsapp_conversas').select('nao_lidas').neq('status', 'finalizada').gt('nao_lidas', 0)
    setTotal((data ?? []).reduce((s, r: any) => s + (r.nao_lidas ?? 0), 0))
  }, [])
  useEffect(() => { if (ativo) void carregar() }, [ativo, carregar])
  useInovachatSinais(ativo, carregar as any)
  return total
}
