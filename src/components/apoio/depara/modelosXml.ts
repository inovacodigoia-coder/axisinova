export interface ModeloItem { chave: string; nome: string; unidade: string; tipo: string; casas: number | null }
export interface Modelo { codigoFormato: string; itens: ModeloItem[] }

/** Atributo (case-insensitive) ou texto de filho direto */
function val(el: Element | null, ...nomes: string[]): string {
  if (!el) return ''
  for (const n of nomes) {
    for (const a of Array.from(el.attributes)) if (a.name.toLowerCase() === n.toLowerCase()) return a.value.trim()
    for (const c of Array.from(el.children)) if (c.tagName.toLowerCase() === n.toLowerCase() && c.children.length === 0) return (c.textContent || '').trim()
  }
  return ''
}
const up = (el: Element, tag: string): Element | null => {
  let p = el.parentElement
  while (p) { if (p.tagName.toLowerCase() === tag.toLowerCase()) return p; p = p.parentElement }
  return null
}

export async function lerXml(file: File): Promise<Document> {
  const buf = new Uint8Array(await file.arrayBuffer())
  const head = new TextDecoder('latin1').decode(buf.slice(0, 200))
  const enc = /encoding=["']utf-8["']/i.test(head) ? 'utf-8' : 'iso-8859-1'
  const txt = new TextDecoder(enc).decode(buf)
  const doc = new DOMParser().parseFromString(txt, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) throw new Error('Arquivo XML inválido')
  return doc
}

/** Localiza o <SuperExame> cujo CodExmApoio começa com "MNMAT|MNEXA|" e lista os valores */
export function extrairModelo(doc: Document, codigoApoio: string): Modelo | null {
  const alvo = codigoApoio.toUpperCase()
  const supers = Array.from(doc.getElementsByTagName('*')).filter(e => e.tagName.toLowerCase() === 'superexame')
  const se = supers.find(s => {
    const c = val(s, 'CodExmApoio').toUpperCase()
    return c === alvo || c.startsWith(alvo + '|')
  })
  if (!se) return null
  return modeloDe(se)
}

function modeloDe(se: Element): Modelo {
  const codigoFormato = val(se, 'CodigoFormato') || Array.from(se.getElementsByTagName('*')).map(e => val(e, 'CodigoFormato')).find(Boolean) || ''
  const valores = Array.from(se.getElementsByTagName('*')).filter(e => e.tagName.toLowerCase() === 'valor')
  const itens: ModeloItem[] = []
  const vistos = new Set<string>()
  for (const v of valores) {
    const res = up(v, 'Resultado'), item = up(v, 'ItemDeExame'), ex = up(v, 'Exame')
    const id = (e: Element | null) => val(e, 'id', 'Id', 'ID', 'Codigo')
    const chave = [id(ex), id(item), id(res), id(v)].join('/')
    if (vistos.has(chave)) continue
    vistos.add(chave)
    const casas = val(v, 'CasasDecimais', 'Decimais')
    itens.push({
      chave,
      nome: val(res, 'Nome') || val(item, 'Nome') || val(v, 'Nome') || chave,
      unidade: val(v, 'Unidade') || val(res, 'Unidade'),
      tipo: (val(v, 'Tipo', 'TipoValor') || val(res, 'Tipo')).toLowerCase(),
      casas: casas && !isNaN(Number(casas)) ? Number(casas) : null,
    })
  }
  return { codigoFormato, itens }
}

export interface ModeloCompleto extends Modelo { codExmApoio: string; materialNome: string; exameNome: string; unidadeProdutiva: string; metodo: string; ultimaLiberacao: string | null }

function dataBR(v: string): string | null {
  const t = (v || '').trim(); if (!t) return null
  const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}T${m[4] || '00'}:${m[5] || '00'}:${m[6] || '00'}-03:00`
  const d = new Date(t); return isNaN(d.getTime()) ? null : d.toISOString()
}

/** Todos os <SuperExame> do arquivo (para gravar em apoio_modelo_resultado de uma vez) */
export function extrairTodos(doc: Document): ModeloCompleto[] {
  const supers = Array.from(doc.getElementsByTagName('*')).filter(e => e.tagName.toLowerCase() === 'superexame')
  const out: ModeloCompleto[] = []
  for (const s of supers) {
    const cod = val(s, 'CodExmApoio').toUpperCase()
    if (!cod) continue
    const m = modeloDe(s)
    const ex = Array.from(s.children).find(c => c.tagName.toLowerCase() === 'exame') || null
    out.push({ ...m, codExmApoio: cod, materialNome: val(s, 'Material', 'NomeMaterial', 'MaterialNome'), exameNome: val(ex, 'Nome', 'NomeExame'),
      unidadeProdutiva: val(s, 'UnidadeProdutiva'), metodo: val(s, 'Metodo'), ultimaLiberacao: dataBR(val(s, 'UltimaLiberacao')) })
  }
  return out
}
