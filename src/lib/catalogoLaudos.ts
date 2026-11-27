/** Planilha "Laudos do Exame": cada linha leva um laudo inteiro (e seu modelo) em JSON fatiado. */
export const ABA_LAUDOS = 'Laudos do Exame'
const LIMITE_CELULA = 30000
const PREFIXO = 'Configuração do laudo'

export interface LaudoExportado {
  code: string; name: string; sort_order: number; is_active: boolean
  methodology: string | null; parameters: any[]; reference_values: any[]
  result_deadline_days: number | null; workbench: string | null
  selected_materials: string[]; default_material: string | null; material_tubos: any
  report_single_page: boolean | null; report_observations: string | null
  template: null | { name: string; description: string | null; header_html: string | null; body_html: string | null; footer_html: string | null; single_page: boolean | null; is_active: boolean | null }
}

export function linhaLaudo(codigoExame: string, laudo: LaudoExportado): Record<string, any> {
  const json = JSON.stringify(laudo)
  const row: Record<string, any> = {
    'Código': codigoExame, 'Código do laudo': laudo.code, 'Nome do laudo': laudo.name,
    'Ordem': laudo.sort_order, 'Ativo': laudo.is_active ? 'Sim' : 'Não', 'Modelo': laudo.template?.name || '',
  }
  for (let i = 0, n = 1; i < json.length; i += LIMITE_CELULA, n++) row[`${PREFIXO} ${n}`] = json.slice(i, i + LIMITE_CELULA)
  return row
}

export function lerLinhaLaudo(row: Record<string, any>): { codigoExame: string; laudo: LaudoExportado } | null {
  const partes = Object.keys(row).filter(k => k.startsWith(PREFIXO))
    .sort((a, b) => Number(a.slice(PREFIXO.length)) - Number(b.slice(PREFIXO.length)))
  const codigoExame = String(row['Código'] ?? '').trim()
  if (!codigoExame || partes.length === 0) return null
  try {
    const laudo = JSON.parse(partes.map(k => String(row[k] ?? '')).join(''))
    return laudo?.code ? { codigoExame, laudo } : null
  } catch { return null }
}
