// =====================================================================
// Exame com coletas em tempos diferentes (ex.: Curva Glicêmica / TOTG).
// Configurado no Editar Exame (exams.coletas_etiqueta) e copiado para o
// exame do pedido no Cadastro de Atendimento (congela a configuração).
// 1ª coleta: vai no tubo comum, junto com as outras amostras.
// 2ª em diante: cada uma ganha uma etiqueta própria, numerada depois dos
// tubos comuns (assim os códigos dos tubos comuns não mudam).
// =====================================================================

export interface ColetaEtiqueta { nome: string }

export const MAX_COLETAS = 6
export const MAX_NOME_COLETA = 20

/** Sugestão ao ligar a opção (TOTG 2 dosagens). */
export const COLETAS_PADRAO: ColetaEtiqueta[] = [{ nome: 'JEJUM' }, { nome: '120 MIN' }]

/** Limpa a lista vinda do cadastro/pedido. Menos de 2 coletas = exame comum (lista vazia). */
export function normalizarColetas(lista: unknown): ColetaEtiqueta[] {
  if (!Array.isArray(lista)) return []
  const out = lista
    .slice(0, MAX_COLETAS)
    .map((c: any, i) => ({
      nome: String((typeof c === 'string' ? c : c?.nome) ?? '').trim().slice(0, MAX_NOME_COLETA) || `${i + 1}ª COLETA`,
    }))
  return out.length >= 2 ? out : []
}

/** Coletas do exame do pedido (ou do catálogo). */
export const coletasDoExame = (e: any): ColetaEtiqueta[] => normalizarColetas(e?.coletasEtiqueta)

/** Quantas etiquetas próprias o exame gera além do tubo comum. */
export const etiquetasExtrasDoExame = (e: any): number => Math.max(0, coletasDoExame(e).length - 1)

/** Identidade estável do exame dentro do pedido. */
export const chaveExame = (e: any): string =>
  `${e?.examId || e?.id || ''}|${e?.code || e?.internalCode || e?.name || ''}`

/** Texto do exame na etiqueta: "TOTG JEJUM" (tubo comum) ou "TOTG 120 MIN" (etiqueta própria). */
export function refExameEtiqueta(ref: string, e: any, coletaIdx = 0): string {
  const c = coletasDoExame(e)[coletaIdx]
  return c ? `${ref} ${c.nome}`.trim() : ref
}
