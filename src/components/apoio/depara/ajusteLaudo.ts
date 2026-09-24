import { norm } from './deparaUtils'
import type { ModeloItem } from './modelosXml'

export type Acao = 'reaproveitar' | 'ajustar' | 'criar' | 'excluir' | 'inativar'
export type Modo = 'usar' | 'novo' | 'copia'

export interface FormatoAjuste { codigo_formato: string; recente: boolean; itens: ModeloItem[] }

export interface Linha {
  key: string
  acao: Acao
  incluir: boolean
  nome: string
  nomeApoio: string
  unidade: string
  tipo: 'numerical' | 'text'
  casas: number | null
  tamanho: number | null
  obrigatorio: boolean
  param?: any
  mudancas: string[]
  /** codigo_formato -> chave do valor do Pardini */
  chaves: Record<string, string>
  sobra?: boolean
}

const semNome = (i: ModeloItem) => !i.nome || i.nome === i.chave
const tipoLis = (t: string): 'numerical' | 'text' => /decimal|inteir|numer|float/i.test(t || '') ? 'numerical' : 'text'
const longo = (n: number | null | undefined) => (n ?? 0) > 255
const eq = (a: any, b: any) => (a ?? null) === (b ?? null) || String(a ?? '') === String(b ?? '')

/** Monta a prévia do ajuste do laudo a partir dos formatos do Pardini (formato mais recente como base). */
export function montarAjuste(formatos: FormatoAjuste[], params: any[], comHistorico: Set<string>, modo: Modo): Linha[] {
  const comItens = formatos.filter(f => f.itens.length)
  const rec = comItens.filter(f => f.recente)
  const base = rec[0] ?? comItens[0]
  if (!base) return []

  // Nomes sugeridos para valores sem nome: 1º curto = Resultado, longo = Laudo descritivo, demais = Resultado 2, 3…
  let curtos = 0, longos = 0
  const sugerir = (i: ModeloItem) => {
    if (longo(i.tamanho)) { longos++; return longos === 1 ? 'Laudo descritivo' : `Laudo descritivo ${longos}` }
    curtos++; return curtos === 1 ? 'Resultado' : `Resultado ${curtos}`
  }
  const nova = (i: ModeloItem, fmt: string): Linha => ({
    key: `${fmt}:${i.chave}`, acao: 'criar', incluir: true, nome: semNome(i) ? sugerir(i) : i.nome, nomeApoio: semNome(i) ? '' : i.nome,
    unidade: i.unidade || '', tipo: tipoLis(i.tipo), casas: i.casas ?? null, tamanho: i.tamanho ?? null, obrigatorio: false, mudancas: [], chaves: { [fmt]: i.chave },
  })
  const linhas: Linha[] = base.itens.map(i => nova(i, base.codigo_formato))

  // Outros formatos: casa por nome + unidade; sem nome, pela chave ou pela posição
  for (const f of comItens) {
    if (f === base) continue
    f.itens.forEach((i, idx) => {
      let l = !semNome(i) ? linhas.find(x => !x.chaves[f.codigo_formato] && x.nomeApoio && norm(x.nomeApoio) === norm(i.nome) && norm(x.unidade) === norm(i.unidade || '')) : undefined
      if (!l && semNome(i)) {
        l = linhas.find(x => !x.chaves[f.codigo_formato] && !x.nomeApoio && x.chaves[base.codigo_formato] === i.chave)
        if (!l && f.itens.length === base.itens.length) { const c = linhas[idx]; if (c && !c.chaves[f.codigo_formato] && !c.nomeApoio) l = c }
      }
      if (l) l.chaves[f.codigo_formato] = i.chave
      else if (f.recente) linhas.push(nova(i, f.codigo_formato))
    })
  }

  // Obrigatório só se aparece em todos os formatos com uso recente
  for (const l of linhas) l.obrigatorio = rec.length ? rec.every(f => !!l.chaves[f.codigo_formato]) : true

  // Reaproveitar parâmetros existentes (mesmo nome e unidade)
  const usados = new Set<any>()
  const lista = modo === 'novo' ? [] : params
  for (const l of linhas) {
    const p = lista.find(p => !usados.has(p) && norm(p.name) === norm(l.nome) && norm(p.unit || '') === norm(l.unidade))
    if (!p) continue
    usados.add(p); l.param = p
    const m: string[] = []
    const tipoAntes = p.type || 'numerical'
    if (tipoAntes !== l.tipo) m.push(`Tipo: ${tipoAntes === 'text' ? 'Texto' : tipoAntes === 'selection' ? 'Seleção' : 'Numérico'} → ${l.tipo === 'text' ? 'Texto' : 'Numérico'}`)
    if (!eq(p.decimals, l.casas) && l.tipo === 'numerical') m.push(`Casas: ${p.decimals ?? '—'} → ${l.casas ?? '—'}`)
    if (!eq(p.maxLength, l.tamanho)) m.push(`Tamanho: ${p.maxLength ?? '—'} → ${l.tamanho ?? '—'}`)
    if (!!(p.isMandatory ?? true) !== l.obrigatorio) m.push(`Obrigatório: ${(p.isMandatory ?? true) ? 'sim' : 'não'} → ${l.obrigatorio ? 'sim' : 'não'}`)
    if (p.isHidden) m.push('Oculto: sim → não')
    l.mudancas = m
    l.acao = m.length ? 'ajustar' : 'reaproveitar'
  }

  // Parâmetros que sobram
  for (const p of lista) {
    if (usados.has(p)) continue
    const hist = comHistorico.has(String(p.id)) || (p.dbId && comHistorico.has(String(p.dbId)))
    if (modo === 'usar' && hist && p.isHidden && !p.isMandatory) continue // já inativado
    linhas.push({
      key: `sobra:${p.id}`, acao: modo === 'usar' && hist ? 'inativar' : 'excluir', incluir: true, nome: p.name, nomeApoio: '', unidade: p.unit || '',
      tipo: p.type === 'text' ? 'text' : 'numerical', casas: p.decimals ?? null, tamanho: p.maxLength ?? null, obrigatorio: false, param: p, mudancas: [], chaves: {}, sobra: true,
    })
  }
  return linhas
}

/** Converte a prévia no que o banco grava (ordem do Pardini; sobras no fim) */
export function montarPayload(linhas: Linha[], modo: Modo) {
  const params: any[] = [], mapas: any[] = []
  const ordem = [...linhas.filter(l => !l.sobra), ...linhas.filter(l => l.sobra)]
  for (const l of ordem) {
    const p = l.param
    if (l.sobra) {
      if (!l.incluir) { params.push({ acao: 'manter', id: p.id, dbId: p.dbId ?? null, antes: p, obj: p }); continue }
      if (l.acao === 'excluir') { if (modo === 'usar') params.push({ acao: 'excluir', id: p.id, dbId: p.dbId ?? null, antes: p }); continue }
      params.push({ acao: 'inativar', id: p.id, dbId: p.dbId ?? null, antes: p, obj: { ...p, isHidden: true, isMandatory: false } })
      continue
    }
    if (!l.incluir && !p) continue // "Criar" desmarcado: não grava
    const obj = !l.incluir ? p : {
      ...(p || { formula: '', options: [], section: '', equipCode: '', isCalculated: false, allowNegative: false, referenceValues: [] }),
      name: l.nome.trim(), unit: l.unidade, type: l.tipo, decimals: l.tipo === 'numerical' ? l.casas : null, maxLength: l.tamanho,
      longText: longo(l.tamanho), origin: 'apoio', isMandatory: l.obrigatorio, isHidden: false,
    }
    const idx = params.length
    params.push({ acao: !l.incluir ? 'manter' : l.acao, id: p?.id ?? null, dbId: p?.dbId ?? null, antes: p ?? null, obj })
    for (const [fmt, chave] of Object.entries(l.chaves)) mapas.push({ codigo_formato: fmt, chave, nome_apoio: l.nomeApoio || l.nome, idx, casas: l.casas })
  }
  return { params, mapas }
}
