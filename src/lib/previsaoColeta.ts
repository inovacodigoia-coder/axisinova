/** Regras do modal "Alterar Previsão de Entrega" no Cadastro de Atendimento. */

/** dd/mm/aaaa HH:mm (aceita ISO ou já formatado). */
export function formatarPrevisao(valor?: string | null): string {
  if (!valor) return '—'
  if (/^\d{2}\/\d{2}\/\d{4}/.test(valor)) return valor
  const d = new Date(valor)
  if (isNaN(d.getTime())) return valor
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** Valor para input datetime-local no horário local. */
export function paraInputLocal(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function desloca(iso: string | null | undefined, ms: number): string | null | undefined {
  if (!iso || !ms) return iso
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : new Date(d.getTime() + ms).toISOString()
}

/**
 * Aplica a coleta/previsão. O exame escolhido recebe a previsão digitada; com "todos",
 * os demais exames recebem a mesma data de coleta e têm a previsão deslocada pelo mesmo intervalo.
 */
export function aplicarColetaPrevisao(
  exams: any[], alvo: number, opts: { coletaAntes: string; coleta: string; previsao: string; todos: boolean; agora?: number },
): any[] {
  const delta = new Date(opts.coleta).getTime() - new Date(opts.coletaAntes).getTime()
  const mudouColeta = !!delta
  const futura = new Date(opts.coleta).getTime() > (opts.agora ?? Date.now())
  const marcarColeta = (ex: any) => mudouColeta
    ? { ...ex, collectedAt: opts.coleta, coletaProgramada: futura || undefined }
    : ex
  return exams.map((ex, i) => {
    if (i === alvo) return { ...marcarColeta(ex), expectedDeliveryDate: opts.previsao }
    if (!opts.todos) return ex
    return { ...marcarColeta(ex), expectedDeliveryDate: desloca(ex.expectedDeliveryDate, delta) }
  })
}

/** Maior coleta futura entre os exames (vai para coleta_programada_para), ou null. */
export function coletaProgramadaDasGuias(guides: any[], agora = Date.now()): string | null {
  let max: number | null = null
  for (const g of guides || []) for (const e of g.exams || []) {
    if (!e.coletaProgramada || !e.collectedAt) continue
    const t = new Date(e.collectedAt).getTime()
    if (t > agora && (max === null || t > max)) max = t
  }
  return max === null ? null : new Date(max).toISOString()
}
