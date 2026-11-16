// Escolha do laudo do exame para um resultado do aparelho (Etapa 1 do servidor do laboratório).
// - Com laudo_code: precisa ser um laudo ATIVO deste exame; senão o resultado é recusado (409).
// - Sem laudo_code (servidores antigos): nunca recusa. Ordem: laudo já usado no resultado do exame
//   > laudo congelado no item do pedido > laudo da bancada do item > laudo ativo de menor Ordem.

export interface LaudoRow {
  id: string
  code: string
  sort_order?: number | null
  is_active?: boolean | null
  parameters?: unknown
}

export type EscolhaLaudo =
  | { ok: true; laudoId: string | null; origem: 'codigo' | 'resultado' | 'item' | 'bancada' | 'ordem1' | 'nenhum' }
  | { ok: false; erro: string }

const up = (v: unknown) => String(v ?? '').trim().toUpperCase()
const ativo = (l: LaudoRow) => l.is_active !== false

export function laudosEmOrdem(laudos: LaudoRow[]): LaudoRow[] {
  return [...laudos].sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999))
}

export function escolherLaudo(input: {
  laudoCode?: string | null
  examName: string
  laudos: LaudoRow[]
  resultadoLaudoId?: string | null
  itemLaudoId?: string | null
  bancadaLaudoId?: string | null
}): EscolhaLaudo {
  const laudos = laudosEmOrdem(input.laudos || [])
  const code = up(input.laudoCode)

  if (code) {
    const mesmo = laudos.find((l) => up(l.code) === code)
    if (!mesmo) {
      return {
        ok: false,
        erro:
          `laudo_code "${String(input.laudoCode).trim()}" não pertence ao exame "${input.examName}". ` +
          `Laudos deste exame: ${laudos.filter(ativo).map((l) => l.code).join(', ') || 'nenhum'}.`,
      }
    }
    if (!ativo(mesmo)) {
      return { ok: false, erro: `laudo_code "${mesmo.code}" está inativo no exame "${input.examName}".` }
    }
    return { ok: true, laudoId: mesmo.id, origem: 'codigo' }
  }

  const ativos = laudos.filter(ativo)
  const achar = (id?: string | null) => (id ? ativos.find((l) => String(l.id) === String(id)) : undefined)

  const doResultado = achar(input.resultadoLaudoId)
  if (doResultado) return { ok: true, laudoId: doResultado.id, origem: 'resultado' }
  const doItem = achar(input.itemLaudoId)
  if (doItem) return { ok: true, laudoId: doItem.id, origem: 'item' }
  const daBancada = achar(input.bancadaLaudoId)
  if (daBancada) return { ok: true, laudoId: daBancada.id, origem: 'bancada' }
  if (ativos[0]) return { ok: true, laudoId: ativos[0].id, origem: 'ordem1' }
  return { ok: true, laudoId: null, origem: 'nenhum' }
}

const chaveParametro = (p: any) => `${up(p?.name)}|${up(p?.equipCode ?? p?.equipment_code)}`

/**
 * Parâmetros onde procurar o test_code. `principal` é a configuração que vale (laudo indicado,
 * senão a do exame, senão a do laudo de menor Ordem); `todos` junta também os parâmetros dos
 * outros laudos ativos, sem repetir — assim um parâmetro que só existe num laudo (ex.: oculto
 * cadastrado no laudo) também é encontrado.
 */
export function parametrosParaCasar(
  examParams: unknown,
  laudos: LaudoRow[],
  laudoCode?: string | null,
): { principal: any[]; todos: any[] } {
  const lista = (v: unknown) => (Array.isArray(v) ? v.filter(Boolean) : [])
  const ativos = laudosEmOrdem(laudos || []).filter(ativo)
  const code = up(laudoCode)
  const indicado = code ? ativos.find((l) => up(l.code) === code) : undefined
  const exame = lista(examParams)

  const principal = lista(indicado?.parameters).length
    ? lista(indicado?.parameters)
    : exame.length
      ? exame
      : lista(ativos[0]?.parameters)

  const vistos = new Set<string>()
  const todos: any[] = []
  for (const p of [...principal, ...exame, ...ativos.flatMap((l) => lista(l.parameters))]) {
    const k = chaveParametro(p)
    if (vistos.has(k)) continue
    vistos.add(k)
    todos.push(p)
  }
  return { principal, todos }
}
