/**
 * Opções extras dos parâmetros do tipo Seleção (Editar Exame):
 * - "Editar": depois de escolher a opção, o texto pode ser alterado na digitação.
 * - "Várias": permite marcar mais de uma opção; o resultado fica com as
 *   opções separadas por vírgula, na ordem do cadastro.
 * Ficam no JSON dos parâmetros (exams/exam_laudos): allowEditSelection + multiSelect.
 */
export const MULTI_SEPARATOR = ', '

export function selectionModes(param: any): { editable: boolean; multiple: boolean } {
  if (!param || (param.type || 'numerical') !== 'selection') return { editable: false, multiple: false }
  return {
    editable: !!(param.allowEditSelection ?? param.allow_edit_selection),
    multiple: !!(param.multiSelect ?? param.multi_select),
  }
}

function partes(value: string): string[] {
  return String(value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

const igual = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/** Opções do cadastro que estão marcadas no resultado. */
export function selectedOptions(value: string, options: string[]): string[] {
  const ps = partes(value)
  return (options || []).filter((o) => ps.some((p) => igual(p, o)))
}

/**
 * Marca/desmarca uma opção. As opções marcadas seguem a ordem do cadastro;
 * texto digitado à mão que não é opção (modo Editar) fica no final, sem se perder.
 */
export function toggleOption(value: string, option: string, options: string[]): string {
  const ps = partes(value)
  const marcadas = selectedOptions(value, options)
  const jaMarcada = marcadas.some((o) => igual(o, option))
  const novas = (options || []).filter((o) =>
    igual(o, option) ? !jaMarcada : marcadas.some((m) => igual(m, o)),
  )
  const livres = ps.filter((p) => !(options || []).some((o) => igual(o, p)))
  return [...novas, ...livres].join(MULTI_SEPARATOR)
}
