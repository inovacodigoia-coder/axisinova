import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

// Ponto único de escuta das mudanças de login (entrou, renovou o acesso, saiu).
// Uma só assinatura no cliente de autenticação para o app inteiro; as telas se inscrevem aqui.
// O aviso é sempre adiado (setTimeout 0): nenhuma consulta ao banco roda dentro do callback,
// para não segurar a entrada nem a renovação automática do acesso.

export type OuvinteAuth = (evento: AuthChangeEvent, sessao: Session | null) => void

const ouvintes = new Set<OuvinteAuth>()
let assinado = false

function garantirAssinatura() {
  if (assinado) return
  assinado = true
  supabase.auth.onAuthStateChange((evento, sessao) => {
    if (ouvintes.size === 0) return
    setTimeout(() => {
      ouvintes.forEach((o) => {
        try { o(evento, sessao) } catch (e) { console.error('[authEventos]', e) }
      })
    }, 0)
  })
}

/** Inscreve um ouvinte; devolve a função para cancelar a inscrição. */
export function aoMudarAutenticacao(ouvinte: OuvinteAuth): () => void {
  garantirAssinatura()
  ouvintes.add(ouvinte)
  return () => { ouvintes.delete(ouvinte) }
}

/** Atalho: chama `acao` quando o acesso é obtido ou renovado. */
export function aoEntrarOuRenovar(acao: () => void): () => void {
  return aoMudarAutenticacao((evento) => {
    if (evento === 'SIGNED_IN' || evento === 'TOKEN_REFRESHED') acao()
  })
}
