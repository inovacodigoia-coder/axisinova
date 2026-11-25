// Leva na planilha toda a configuração do exame/parâmetro, para a importação copiar tudo.
const FORA_DO_EXAME = ['id', 'companyId', 'company_id', 'workbenchId', 'parameters', 'referenceValues', 'createdAt', 'updatedAt', 'created_at', 'updated_at']
const FORA_DO_PARAMETRO = ['id', 'referenceValues']

const semCampos = (obj: any, fora: string[]) => {
  const out: Record<string, unknown> = {}
  Object.entries(obj || {}).forEach(([k, v]) => { if (!fora.includes(k) && v !== undefined) out[k] = v })
  return out
}

export const configuracaoExame = (e: any) => JSON.stringify(semCampos(e, FORA_DO_EXAME))
export const configuracaoParametro = (p: any) => JSON.stringify(semCampos(p, FORA_DO_PARAMETRO))

/** Lê a coluna "Configuração completa"; planilha antiga ou texto inválido devolve {}. */
export function lerConfiguracao(row: any, tipo: 'exame' | 'parametro'): Record<string, unknown> {
  const raw = row?.['Configuração completa']
  if (!raw || typeof raw !== 'string') return {}
  try {
    const obj = JSON.parse(raw)
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {}
    return semCampos(obj, tipo === 'exame' ? FORA_DO_EXAME : FORA_DO_PARAMETRO)
  } catch { return {} }
}

const sim = (v: any) => v === true || String(v ?? '').trim().toLowerCase() === 'sim'
const tem = (row: any, k: string) => row && Object.prototype.hasOwnProperty.call(row, k)

/** Colunas novas do parâmetro (Valor, Editar, Várias, casas). Só aplica as que existem na planilha. */
export function lerColunasExtrasParametro(row: any): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (tem(row, 'Casas decimais')) { const v = String(row['Casas decimais'] ?? '').trim(); out.decimals = v === '' ? null : Number(v) }
  if (tem(row, 'Valor padrão ativo')) out.defaultValueEnabled = sim(row['Valor padrão ativo'])
  if (tem(row, 'Valor padrão')) out.defaultValue = String(row['Valor padrão'] ?? '')
  if (tem(row, 'Permite editar seleção')) out.allowEditSelection = sim(row['Permite editar seleção'])
  if (tem(row, 'Várias opções')) out.multiSelect = sim(row['Várias opções'])
  return out
}
