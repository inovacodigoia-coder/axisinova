import type { Exam } from '@/types/registers.types'

export interface PartnerCatalogExam {
  code: string
  name: string
  workbench: string
}

interface WorkbenchLike { id: string; name: string }

/**
 * Catálogo de exames usado nos documentos voltados a parceiros (Guia PDF e /docs).
 * Usa SEMPRE o Código interno do Catálogo de Exames — nunca o código TUSS/ANS.
 */
export function buildPartnerExamCatalog(
  exams: Exam[] | undefined | null,
  workbenches: WorkbenchLike[] | undefined | null,
): PartnerCatalogExam[] {
  if (!exams?.length) return []
  return exams
    .filter(e => {
      if (!e || !e.isActive) return false
      const type = String((e as { type?: string }).type ?? '').toLowerCase()
      return type === 'lab' || type === 'laboratorio' || type === 'laboratório' || type === ''
    })
    .map(e => ({
      code: (e.internalCode || '').toUpperCase() || 'S/C',
      name: e.name || 'Sem nome',
      workbench:
        workbenches?.find(w => w.id === (e as { workbenchId?: string }).workbenchId)?.name || 'Sem Bancada',
    }))
    .filter(e => e.code !== 'S/C')
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

export const PARTNER_CODE_WARNING =
  'Este código é o identificador interno do laboratório, diferente do código TUSS/ANS usado para autorização de convênio. Use sempre o código desta tabela nas requisições à API.'

/** Dois exemplos reais de código para usar nos payloads de exemplo. */
export function exampleExamCodes(catalog: PartnerCatalogExam[]): PartnerCatalogExam[] {
  const fallback: PartnerCatalogExam[] = [
    { code: 'VDRL', name: 'Pesquisa de Sífilis (VDRL)', workbench: 'Imunologia' },
    { code: 'FR', name: 'Fator Reumatoide (FR)', workbench: 'Imunologia' },
  ]
  if (!catalog.length) return fallback
  return [catalog[0], catalog[1] ?? catalog[0]]
}
