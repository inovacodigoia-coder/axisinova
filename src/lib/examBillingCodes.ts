export function exportExamBillingCodes(exam: { tussCode?: string; sigtapCode?: string }) {
 return { 'Código TUSS': exam.tussCode?.trim() || '', 'Código SIGTAP': exam.sigtapCode?.trim() || '' }
}
/** Missing columns preserve existing codes; an explicitly blank cell clears them. */
export function importExamBillingCodes(row: Record<string, unknown>): { tussCode?: string; sigtapCode?: string } {
 const normalized = new Map(Object.entries(row).map(([key,value]) => [key.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(),value]))
 const result: { tussCode?: string; sigtapCode?: string } = {}
 for (const [field,aliases] of [['tussCode',['codigo tuss','tuss']],['sigtapCode',['codigo sigtap','codigo sus (sigtap)','sigtap','codigo sus']]] as const) {
  const alias=aliases.find(key=>normalized.has(key))
  if (alias) result[field]=String(normalized.get(alias) ?? '').trim()
 }
 return result
}