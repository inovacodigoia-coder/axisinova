// Regra: o resultado mais recente vence. Se o aparelho mandou um valor novo enquanto a
// tela de digitação estava aberta, salvar/liberar a tela não pode gravar por cima dele o
// valor antigo que estava na tela (nem liberar um valor que o técnico não viu).

export interface ValorGravado {
  /** mesma chave usada pela tela para o parâmetro */
  key: string
  nome: string
  source: string | null
  value: string | null
  instrument_value: string | null
}

const limpo = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim())

/**
 * Parâmetros cujo valor do aparelho no banco é diferente do que a tela carregou.
 * `carregados` = último valor do aparelho que a tela leu, por chave (ausente = a tela não tinha).
 */
export function mudadosPeloAparelho(carregados: Record<string, string | undefined>, gravados: ValorGravado[]): string[] {
  const nomes: string[] = []
  for (const g of gravados) {
    if (g.source !== 'instrument') continue
    const atual = limpo(g.instrument_value ?? g.value)
    if (!atual) continue
    const antes = carregados[g.key]
    if (antes === undefined || limpo(antes) !== atual) {
      if (!nomes.includes(g.nome)) nomes.push(g.nome)
    }
  }
  return nomes
}

export function mensagemAparelhoMudou(nomes: string[]): string {
  const lista = nomes.slice(0, 5).join(', ') + (nomes.length > 5 ? ` e mais ${nomes.length - 5}` : '')
  return `O aparelho enviou um resultado novo (${lista}) enquanto a tela estava aberta. Nada foi salvo. Feche e abra o exame de novo para conferir o valor novo.`
}

export class AparelhoMudouError extends Error {
  constructor(public nomes: string[]) {
    super(mensagemAparelhoMudou(nomes))
    this.name = 'AparelhoMudouError'
  }
}
