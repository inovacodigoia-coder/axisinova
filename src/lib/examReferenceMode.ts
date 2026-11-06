/**
 * Referência do parâmetro em dois modos:
 * - simples: texto da faixa escolhida (idade/sexo/jejum), como sempre foi.
 * - completa: bloco de texto livre (tabelas, notas, fonte) mostrado inteiro
 *   na digitação e no laudo. As faixas continuam sendo usadas para marcar
 *   Alto/Baixo, então o modo completo não muda a sinalização.
 */
export type ReferenceMode = 'simples' | 'completa'

export function referenceModeOf(p: any): ReferenceMode {
  return p?.referenceMode === 'completa' && String(p?.referenceFullText || '').trim() ? 'completa' : 'simples'
}

/** Texto exibido como referência (tela, laudo e envio). */
export function displayReference(p: any, simple: string): string {
  return referenceModeOf(p) === 'completa' ? String(p.referenceFullText).replace(/\s+$/, '') : simple
}

/** Colunas extras da planilha de parâmetros. */
export function exportReferenceModeColumns(p: any) {
  return {
    'Tipo de referência': referenceModeOf(p) === 'completa' ? 'Completa' : 'Simples',
    'Referência completa': String(p?.referenceFullText || ''),
  }
}

/** Lê as colunas da planilha. Planilha antiga (sem colunas) não altera nada. */
export function importReferenceModeColumns(row: any): { referenceMode?: ReferenceMode; referenceFullText?: string } {
  const hasMode = row && Object.prototype.hasOwnProperty.call(row, 'Tipo de referência')
  const hasText = row && Object.prototype.hasOwnProperty.call(row, 'Referência completa')
  const out: { referenceMode?: ReferenceMode; referenceFullText?: string } = {}
  if (hasText) out.referenceFullText = String(row['Referência completa'] ?? '').replace(/\r\n/g, '\n')
  if (hasMode) out.referenceMode = /complet/i.test(String(row['Tipo de referência'] ?? '')) ? 'completa' : 'simples'
  return out
}
