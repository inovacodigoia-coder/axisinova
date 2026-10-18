// O rodapé no snapshot SQL preserva a opção da regra no momento do enfileiramento.
export const AVISO_SAIR = '\n\nPara não receber mais mensagens automáticas, responda SAIR.'
export const BOTAO_SAIR = 'PARAR MENSAGENS'
export const ID_BOTAO_SAIR = 'automacao:sair'

export function separarAvisoSaida(texto: string) {
  const incluirBotao = texto.endsWith(AVISO_SAIR)
  return { texto: incluirBotao ? texto.slice(0, -AVISO_SAIR.length) : texto, incluirBotao }
}

export function montarMenuSaida(numero: string, texto: string, trackId: string) {
  return { number: numero, type: 'button', text: texto,
    choices: [`${BOTAO_SAIR}|${ID_BOTAO_SAIR}`], track_source: 'axis_ciclo', track_id: trackId }
}

export function acaoOptout(bid: string, textoNormalizado: string): 'sair' | 'voltar' | null {
  if (bid.toLowerCase() === ID_BOTAO_SAIR) return 'sair'
  if (bid) return null
  if (['sair', 'parar', 'parar mensagens'].includes(textoNormalizado)) return 'sair'
  return textoNormalizado === 'voltar' ? 'voltar' : null
}