/**
 * Proteção única contra injeção de fórmula em exportações CSV (Excel/LibreOffice).
 * Só textos que comecem com = + - @ tabulação ou retorno de carro recebem uma aspa simples
 * inicial; números, datas e valores numéricos já formatados (-5,3 · 12% · -R$ 10,00) saem intactos.
 * Atua apenas no arquivo exportado: nada salvo no banco é alterado.
 */
const INICIO_PERIGOSO = /^[=+\-@\t\r]/
const NUMERO_FORMATADO = /^[+-]?\s*(R\$\s*)?[+-]?\d[\d.,\s]*%?$/

export function protegerTextoCsv(valor: unknown): string {
  if (valor == null) return ''
  if (typeof valor === 'number' || typeof valor === 'bigint' || typeof valor === 'boolean') return String(valor)
  if (valor instanceof Date) return isNaN(valor.getTime()) ? '' : valor.toISOString()
  const s = String(valor)
  if (!INICIO_PERIGOSO.test(s) || NUMERO_FORMATADO.test(s)) return s
  return `'${s}`
}

/** Célula CSV protegida e escapada; sempreAspas mantém o formato que cada tela já usava. */
export function celulaCsv(valor: unknown, separador = ';', sempreAspas = false): string {
  const s = protegerTextoCsv(valor)
  const precisa = sempreAspas || s.includes(separador) || /["\r\n\t]/.test(s)
  return precisa ? `"${s.replace(/"/g, '""')}"` : s
}

/** Monta o CSV inteiro (linhas já em ordem de colunas), com BOM UTF-8 para o Excel. */
export function montarCsv(linhas: unknown[][], opcoes: { separador?: string; sempreAspas?: boolean; quebra?: string } = {}): string {
  const { separador = ';', sempreAspas = false, quebra = '\r\n' } = opcoes
  return '\uFEFF' + linhas.map(l => l.map(v => celulaCsv(v, separador, sempreAspas)).join(separador)).join(quebra)
}

export function baixarCsv(conteudo: string, nomeArquivo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  a.click()
  URL.revokeObjectURL(url)
}
