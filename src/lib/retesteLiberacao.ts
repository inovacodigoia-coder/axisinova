// Regras únicas de Liberar / Desliberar / Reteste do exame (telas Análise e Hematologia).
// Nunca existe "Liberado" + "Reteste" juntos: reteste só em exame não liberado.

export const AVISO_RETESTE_LIBERADO = 'Para solicitar reteste, deslibere o exame antes: clique em Desliberar.'
export const AVISO_LIBERAR_COM_RETESTE =
  'Este exame aguarda o resultado do reteste. Aguarde o resultado novo do aparelho ou cancele/remova o reteste antes de liberar.'

export const MOTIVOS_DESLIBERAR = ['Reteste', 'Correção de resultado', 'Outro'] as const
export const MOTIVO_DESLIBERAR_RETESTE = 'Reteste'

export interface EstadoExame {
  liberado: boolean
  /** Reteste pedido ao aparelho (gravado no banco) */
  retesteAparelho: boolean
  /** Reteste marcado na tela (motivo do reteste) */
  retesteLocal?: boolean
}

/** Item do menu que ocupa o lugar de "Liberar exame". */
export function acaoLiberacao(e: Pick<EstadoExame, 'liberado'>): 'liberar' | 'desliberar' {
  return e.liberado ? 'desliberar' : 'liberar'
}

/** O que acontece ao clicar em "Solicitar reteste (aparelho)". */
export function acaoRetesteAparelho(e: EstadoExame): 'aviso_desliberar' | 'solicitar' | 'cancelar' {
  if (e.retesteAparelho) return 'cancelar'
  if (e.liberado) return 'aviso_desliberar'
  return 'solicitar'
}

/** O que acontece ao clicar em "Solicitar reteste" (motivo na tela). Remover continua livre. */
export function acaoRetesteLocal(e: EstadoExame): 'aviso_desliberar' | 'marcar' | 'remover' {
  if (e.retesteLocal) return 'remover'
  if (e.liberado) return 'aviso_desliberar'
  return 'marcar'
}

/** Motivo que impede liberar o exame agora (null = pode liberar). */
export function bloqueioLiberar(e: EstadoExame): string | null {
  if (e.retesteAparelho || e.retesteLocal) return AVISO_LIBERAR_COM_RETESTE
  return null
}

/** Texto final do motivo da desliberação (Outro exige descrever). */
export function motivoDesliberar(motivo: string, detalhe: string): string | null {
  const d = detalhe.trim()
  if (!motivo) return null
  if (motivo === 'Outro') return d.length > 0 ? d : null
  return d ? `${motivo} — ${d}` : motivo
}
