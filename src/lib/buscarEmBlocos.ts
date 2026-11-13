import { useSyncExternalStore } from 'react'

/**
 * O servidor devolve no máximo 1.000 linhas por pedido. Para listas que precisam de
 * todos os registros, buscamos em blocos de 1.000 (range) até acabar, sem omitir nada.
 * Só para por um teto de segurança muito acima do uso real; ao atingir o teto,
 * avisa na tela ("Resultados limitados, refine o período") em vez de cortar em silêncio.
 */
export const TAMANHO_BLOCO = 1000
export const TETO_PADRAO = 50_000

type Resposta<T> = PromiseLike<{ data: T[] | null; error: any }>

export interface ResultadoBlocos<T> {
  linhas: T[]
  /** true quando o teto foi atingido e ainda havia registros no servidor. */
  limitado: boolean
}

export interface OpcoesBlocos<T> {
  tamanho?: number
  /** Teto de segurança (total de linhas). */
  teto?: number
  /** Remove repetidos entre blocos (ex.: pedido novo inserido no topo durante a busca). */
  chave?: (linha: T) => string
  /** Nome da tela para o aviso global quando o teto é atingido. */
  tela?: string
}

/**
 * `bloco(de, ate)` deve montar a consulta com ordem estável e terminar em `.range(de, ate)`.
 */
export async function buscarEmBlocos<T>(
  bloco: (de: number, ate: number) => Resposta<T>,
  opcoes: OpcoesBlocos<T> = {},
): Promise<ResultadoBlocos<T>> {
  const tamanho = Math.max(1, Math.min(opcoes.tamanho ?? TAMANHO_BLOCO, TAMANHO_BLOCO))
  const teto = Math.max(tamanho, opcoes.teto ?? TETO_PADRAO)
  const linhas: T[] = []
  const vistos = new Set<string>()
  const juntar = (lote: T[]) => {
    for (const linha of lote) {
      if (opcoes.chave) {
        const k = opcoes.chave(linha)
        if (vistos.has(k)) continue
        vistos.add(k)
      }
      linhas.push(linha)
    }
  }

  for (let de = 0; de < teto; de += tamanho) {
    const pedido = Math.min(tamanho, teto - de)
    const { data, error } = await bloco(de, de + pedido - 1)
    if (error) throw error
    const lote = data || []
    juntar(lote)
    if (lote.length < pedido) return { linhas, limitado: false }
  }

  // Chegou ao teto: confere se ainda existe registro além dele.
  const { data: alem, error } = await bloco(teto, teto)
  if (error) throw error
  const limitado = (alem || []).length > 0
  if (limitado && opcoes.tela) avisarResultadosLimitados(opcoes.tela)
  return { linhas, limitado }
}

/** Divide uma lista de ids em pedaços (filtros `.in()` grandes estouram o tamanho da URL). */
export function emPedacos<T>(itens: T[], tamanho = 200): T[][] {
  const out: T[][] = []
  for (let i = 0; i < itens.length; i += tamanho) out.push(itens.slice(i, i + tamanho))
  return out
}

/* ---------------- aviso global de resultados limitados ---------------- */

let telasLimitadas: string[] = []
const ouvintes = new Set<() => void>()
const emitir = () => ouvintes.forEach((o) => o())

export function avisarResultadosLimitados(tela: string) {
  if (telasLimitadas.includes(tela)) return
  telasLimitadas = [...telasLimitadas, tela]
  emitir()
}

export function limparAvisosLimite() {
  if (telasLimitadas.length === 0) return
  telasLimitadas = []
  emitir()
}

export function useAvisosLimite(): string[] {
  return useSyncExternalStore(
    (ouvir) => { ouvintes.add(ouvir); return () => { ouvintes.delete(ouvir) } },
    () => telasLimitadas,
    () => telasLimitadas,
  )
}
