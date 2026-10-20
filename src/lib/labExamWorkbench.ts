interface ExamWorkbench {
  examId?: string
  id?: string
  bancadaId?: string | null
  workbenchId?: string | null
  workbench?: string | null
}

interface CatalogWorkbench { id: string; workbenchId?: string | null }

/** Preserve the order's frozen destination; use the catalog only for older incomplete items. */
export function resolveExamWorkbench(exam: ExamWorkbench, catalog: readonly CatalogWorkbench[]): string {
  const saved = exam.bancadaId || exam.workbenchId || exam.workbench
  if (saved) return saved
  const catalogId = exam.examId || exam.id
  return catalog.find(item => item.id === catalogId)?.workbenchId || ''
}

export function matchesExamWorkbench(exam: ExamWorkbench, selected: readonly string[]): boolean {
  return selected.length === 0 || selected.includes(exam.bancadaId || exam.workbenchId || exam.workbench || '')
}