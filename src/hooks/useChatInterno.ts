import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export interface ChatInternoAcesso {
  ver: boolean
  admin: boolean
  usuario_id: string | null
}

/** Acesso ao módulo Chat Interno (ligado por padrão; Super Admin desliga por empresa). */
export function useChatInternoAcesso() {
  const [acesso, setAcesso] = useState<ChatInternoAcesso | null>(null)
  useEffect(() => {
    let vivo = true
    void supabase.rpc('chat_interno_meu_acesso').then(({ data }) => {
      if (vivo) setAcesso((data as unknown as ChatInternoAcesso) ?? { ver: false, admin: false, usuario_id: null })
    })
    return () => { vivo = false }
  }, [])
  return acesso
}

/** Total de mensagens não lidas (badge do menu), atualizado em tempo real. */
export function useChatInternoNaoLidas(ativo: boolean) {
  const [total, setTotal] = useState(0)
  const recarregar = useCallback(async () => {
    const { data } = await supabase.rpc('chat_interno_nao_lidas')
    setTotal(typeof data === 'number' ? data : 0)
  }, [])
  useEffect(() => {
    if (!ativo) return
    void recarregar()
    const canal = supabase
      .channel(`chat-interno-badge-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_interno_mensagem' }, () => {
        void recarregar()
      })
      .subscribe()
    return () => { void supabase.removeChannel(canal) }
  }, [ativo, recarregar])
  return total
}
