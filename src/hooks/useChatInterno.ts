import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useCanalRealtime } from '@/hooks/useCanalRealtime'
import { useAuth } from '@/context/AuthContext'
import { resolveCompanyId } from '@/utils/companyId'

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
/** Evento disparado pela tela do chat ao marcar uma conversa como lida (atualiza o badge na hora). */
export const CHAT_INTERNO_LIDO_EVENTO = 'chat-interno-lido'

export function avisarChatInternoLido() {
  window.dispatchEvent(new Event(CHAT_INTERNO_LIDO_EVENTO))
}

export function useChatInternoNaoLidas(ativo: boolean) {
  const [total, setTotal] = useState(0)
  const recarregar = useCallback(async () => {
    const { data } = await supabase.rpc('chat_interno_nao_lidas')
    setTotal(typeof data === 'number' ? data : 0)
  }, [])
  const { user } = useAuth()
  const companyId = resolveCompanyId(user?.companyId)
  useEffect(() => {
    if (!ativo) return
    void recarregar()
    const aoLer = () => { void recarregar() }
    window.addEventListener(CHAT_INTERNO_LIDO_EVENTO, aoLer)
    return () => { window.removeEventListener(CHAT_INTERNO_LIDO_EVENTO, aoLer) }
  }, [ativo, recarregar])
  // Só mensagens da empresa (antes ouvia a tabela inteira)
  useCanalRealtime(ativo && companyId ? 'chat-interno-badge' : null, (ch) => ch
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_interno_mensagem', filter: `company_id=eq.${companyId}` }, () => {
      void recarregar()
    }), [companyId, recarregar], { aoRetomar: () => { void recarregar() } })
  return total
}
