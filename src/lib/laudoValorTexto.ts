/**
 * Valor de parâmetro do tipo texto (OBS, observações, descrições) que não cabe
 * na coluna "Valor atual" do laudo. Esses valores quebram em várias linhas e
 * ocupam o espaço livre da linha, sem empurrar o laudo para fora da folha.
 */
export const LIMITE_VALOR_CURTO = 28

/** Caracteres que cabem em uma linha quando o texto ocupa a largura livre. */
export const CARACTERES_POR_LINHA = 60

export function valorTextoLongo(value: unknown): boolean {
  const texto = value == null ? '' : String(value).trim()
  if (!texto) return false
  return texto.includes('\n') || texto.length > LIMITE_VALOR_CURTO
}

/** Quantas linhas o valor ocupa no laudo (para a paginação por altura). */
export function linhasDoValor(value: unknown, porLinha = CARACTERES_POR_LINHA): number {
  if (!valorTextoLongo(value)) return 1
  return String(value)
    .trim()
    .split('\n')
    .reduce((total, linha) => total + Math.max(1, Math.ceil(linha.length / porLinha)), 0)
}

/** Sem referência real, o texto pode usar também a coluna de referência. */
export function semReferencia(reference: unknown): boolean {
  const r = reference == null ? '' : String(reference).trim()
  return r === '' || r === '—' || r === '-'
}
