export const FINANCEIRO_PERMISSIONS = [
  { code: 'financeiro.ver', label: 'Ver' },
  { code: 'financeiro.lancar', label: 'Lançar' },
  { code: 'financeiro.baixar', label: 'Baixar' },
  { code: 'financeiro.cancelar', label: 'Cancelar / estornar' },
  { code: 'financeiro.configurar', label: 'Configurar' },
]
export const FORMAS = ['dinheiro', 'pix', 'debito', 'credito', 'boleto', 'transferencia', 'convenio', 'outro']
export const dinheiro = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const hojeFinanceiro = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
export function csvFinanceiro(rows: Record<string, unknown>[]) {
  if (!rows.length) return ''
  const keys = Object.keys(rows[0])
  const cell = (v: unknown) => `"${String(v ?? '').replace(/^[=+@\-]/, "'$&").replace(/"/g, '""')}"`
  return '\uFEFF' + [keys.map(cell).join(';'), ...rows.map(r => keys.map(k => cell(r[k])).join(';'))].join('\r\n')
}