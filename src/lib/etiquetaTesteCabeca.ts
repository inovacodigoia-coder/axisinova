/**
 * Página de teste da cabeça térmica: faixas pretas cheias de ponta a ponta (um ponto queimado
 * aparece como risco branco vertical), texto em todas as posições e um código de barras com
 * barra larga. Serve para o operador ver na hora se há uma coluna de pontos falhando.
 */

export const TESTE_CARACTERES = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
export const TESTE_CODIGO_BARRAS = 'TESTE1234'

export interface TesteCabecaMedidas {
  widthMm: number
  heightMm: number
  /** Pontos por mm da impressora (203 dpi = 8; 300 dpi = 12) */
  dpmm?: number
}

/** ZPL do teste, no tamanho exato da etiqueta, para o servidor de impressão local. */
export function zplTesteCabeca({ widthMm, heightMm, dpmm = 8 }: TesteCabecaMedidas): string {
  const W = Math.max(1, Math.round(widthMm * dpmm))
  const H = Math.max(1, Math.round(heightMm * dpmm))
  const faixa = Math.max(8, Math.round(H * 0.14))
  const letra = Math.max(16, Math.round(H * 0.12))
  const barras = Math.max(24, Math.round(H * 0.24))
  const linha = (y: number, deslocamento = 0) =>
    `^FO${deslocamento},${y}^A0N,${letra},${Math.round(letra * 0.8)}^FD${TESTE_CARACTERES}${TESTE_CARACTERES}^FS`

  let y = 0
  const partes: string[] = ['^XA', '^CI28', `^PW${W}`, `^LL${H}`, '^LH0,0']
  partes.push(`^FO0,${y}^GB${W},${faixa},${faixa}^FS`)
  y += faixa + 4
  partes.push(linha(y))
  y += letra + 2
  partes.push(linha(y, Math.round(letra * 0.4)))
  y += letra + 4
  // Barra larga (módulo de 3 pontos): um ponto falho atrapalha menos a leitura
  partes.push(`^FO${Math.round(W * 0.05)},${y}^BY3,2,${barras}^BCN,${barras},N,N,N^FD${TESTE_CODIGO_BARRAS}^FS`)
  y += barras + 4
  partes.push(`^FO0,${Math.max(y, H - faixa)}^GB${W},${faixa},${faixa}^FS`)
  partes.push('^PQ1', '^XZ')
  return partes.join('\n')
}
