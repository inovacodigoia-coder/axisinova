// Regras de exame repetido na guia do atendimento.
const chave = (e: any) => String(e?.id ?? e?.examId ?? e?.code ?? '')

/** Índice do exame já incluído na guia (ignora o item em edição), ou -1. */
export function indiceExameNaGuia(exams: any[] = [], exame: any, ignorarIndice: number | null = null): number {
  const k = chave(exame)
  if (!k) return -1
  return exams.findIndex((e, i) => i !== ignorarIndice && chave(e) === k)
}

/** Lista "Guia: Exame" para cada exame que aparece mais de uma vez na mesma guia. */
export function examesRepetidosNasGuias(guides: any[] = []): string[] {
  const out: string[] = []
  guides.forEach((g, gi) => {
    const vistos = new Set<string>()
    for (const e of g?.exams || []) {
      const k = chave(e)
      if (!k) continue
      if (vistos.has(k)) out.push(`${g?.convenioName || g?.name || `Guia ${gi + 1}`}: ${e?.name || e?.code || k}`)
      vistos.add(k)
    }
  })
  return out
}
