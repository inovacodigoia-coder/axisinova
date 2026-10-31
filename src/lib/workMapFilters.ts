/**
 * Filtros do Mapa de Trabalho.
 *
 * O período é sempre comparado pelo dia local de America/Sao_Paulo, igual ao
 * resto do sistema (ver hojeFinanceiro em src/lib/financeiro.ts), para que um
 * exame coletado às 21h30 de ontem não entre no filtro de hoje.
 */

const FUSO = 'America/Sao_Paulo'

/** Devolve 'YYYY-MM-DD' do fuso de São Paulo, ou '' quando não há data válida. */
export function dataLocalSaoPaulo(iso?: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/**
 * Diz se a data do item está dentro do período pedido.
 *
 * - Sem filtro (de e ate vazios) tudo passa.
 * - Item sem data recuperável fica de fora quando há filtro ativo.
 * - 'de' e 'ate' são inclusivos e aceitam 'YYYY-MM-DD'.
 */
export function dentroDoPeriodo(iso: string | undefined | null, de: string, ate: string): boolean {
  if (!de && !ate) return true
  const dia = dataLocalSaoPaulo(iso)
  if (!dia) return false
  if (de && dia < de) return false
  if (ate && dia > ate) return false
  return true
}
