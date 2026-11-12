import { normalizeText } from '@/utils/examParameters'

/**
 * Parâmetro com "Obrig" desmarcado no cadastro do exame.
 * Sem a informação o parâmetro continua obrigatório (padrão do cadastro).
 */
export function isParametroOpcional(param: any): boolean {
  return param?.isMandatory === false || param?.isRequired === false || param?.is_required === false
}

export function resultadoVazio(value: unknown): boolean {
  return value == null || String(value).trim() === ''
}

/**
 * Marca as linhas do laudo cujo parâmetro não é obrigatório no cadastro.
 * Procura o parâmetro pelo código salvo no resultado e, se não achar, pelo nome.
 */
export function marcarOpcionais<T extends { parameterId?: any; parameterName?: any; parameterCode?: any; optional?: boolean }>(
  rows: T[],
  catalogExam: any,
): T[] {
  const params: any[] = Array.isArray(catalogExam?.parameters) ? catalogExam.parameters : []
  if (params.length === 0) return rows
  return rows.map((row) => {
    if (row.optional) return row
    const id = row.parameterId != null ? String(row.parameterId) : ''
    const nome = normalizeText(String(row.parameterName || row.parameterCode || ''))
    const param =
      (id && params.find((p) => (p?.id != null && String(p.id) === id) || (p?.dbId != null && String(p.dbId) === id))) ||
      (nome && params.find((p) => normalizeText(String(p?.name || '')) === nome)) ||
      null
    return param && isParametroOpcional(param) ? { ...row, optional: true } : row
  })
}

/** Linhas que saem no laudo: parâmetro não obrigatório sem resultado fica de fora. */
export function linhasDoLaudo<T extends { optional?: boolean; value?: any }>(rows: T[]): T[] {
  return (rows || []).filter((r) => !(r?.optional && resultadoVazio(r.value)))
}
