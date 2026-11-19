import { etiquetasDosExames } from '@/lib/tubos'
import { buildSampleCode, generateSampleHash } from '@/utils/orderHash'

/** Pedido mínimo para montar os códigos das etiquetas (mesma regra da impressão). */
export interface PedidoEtiqueta {
  id: string
  orderNumber?: string | null
  empresaSeq?: number | null
  labGuides?: any[] | null
}

/** Normaliza o que foi colado/bipado: maiúsculas, sem espaços nem quebras de linha. */
export function normalizarCodigoEtiqueta(valor: string): string {
  return String(valor || '').toUpperCase().replace(/\s+/g, '')
}

/**
 * Códigos das etiquetas de um pedido: código da amostra (ex.: 16-00-1-1) e o
 * código alfanumérico do tubo (ex.: N2RQ87134). Inclui o formato antigo sem a
 * empresa e os números anteriores de pedidos renumerados.
 */
export function codigosDasEtiquetas(
  pedido: PedidoEtiqueta,
  companySequenceId: number | null,
  numerosAnteriores: string[] = [],
): string[] {
  const exams = (pedido.labGuides || []).flatMap((g: any) => g?.exams || [])
  const tubos = etiquetasDosExames(exams)
  const numeros = [pedido.orderNumber, ...numerosAnteriores].filter(Boolean) as string[]
  const out = new Set<string>()
  for (const numero of numeros) {
    tubos.forEach((_, idx) => {
      const seq = pedido.empresaSeq ?? companySequenceId
      for (const code of [buildSampleCode(numero, idx + 1, seq), buildSampleCode(numero, idx + 1, null)]) {
        if (!code) continue
        out.add(normalizarCodigoEtiqueta(code))
        const hash = generateSampleHash(code)
        if (hash) out.add(hash)
      }
    })
  }
  return [...out]
}

/** Índice código da etiqueta → pedidos, montado uma vez por lista de pedidos. */
export function indiceDeEtiquetas(
  pedidos: PedidoEtiqueta[],
  companySequenceId: number | null,
  anterioresPorPedido?: Map<string, string[]>,
): Map<string, Set<string>> {
  const indice = new Map<string, Set<string>>()
  for (const p of pedidos) {
    for (const c of codigosDasEtiquetas(p, companySequenceId, anterioresPorPedido?.get(p.id) || [])) {
      const s = indice.get(c) || new Set<string>()
      s.add(p.id)
      indice.set(c, s)
    }
  }
  return indice
}

/**
 * Pedidos cuja etiqueta tem exatamente o código buscado. `null` quando o texto
 * não é o código de nenhuma etiqueta (a tela segue com a busca normal).
 */
export function pedidosDaEtiqueta(indice: Map<string, Set<string>>, busca: string): Set<string> | null {
  const termo = normalizarCodigoEtiqueta(busca)
  if (termo.length < 3) return null
  return indice.get(termo) || null
}

/** Busca só por números (pedido, CPF) — texto com letras, como o código do tubo, nunca cai nela. */
export function buscaSoNumeros(busca: string): boolean {
  return !/[a-z]/i.test(busca)
}
