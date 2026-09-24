// Utilitários de XML tolerantes (sem DOM): tags desconhecidas são ignoradas.

export const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

export const desescapar = (s: string) =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')

/** Corrige texto ISO-8859-1 lido como UTF-8 (ou vice-versa): "Ã©" -> "é" */
export function corrigirAcentos(s: string): string {
  if (!/Ã[\x80-\xBF¡-¿]|Â[\x80-\xBF ]/.test(s)) return s
  try {
    const bytes = Uint8Array.from([...s].map((c) => c.charCodeAt(0) & 0xff))
    const out = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return out
  } catch { return s }
}

/** Decodifica bytes de resposta respeitando o encoding declarado */
export function decodificar(buf: Uint8Array): string {
  const head = new TextDecoder('latin1').decode(buf.slice(0, 200))
  const enc = /encoding=["']iso-8859-1["']/i.test(head) ? 'iso-8859-1' : 'utf-8'
  return new TextDecoder(enc).decode(buf)
}

const reTag = (tag: string) => `(?:[\\w-]+:)?${tag}`

/** Blocos completos <TAG ...>...</TAG> ou <TAG/> (ignora prefixo de namespace) */
export function blocos(xml: string, tag: string): string[] {
  const t = reTag(tag)
  const re = new RegExp(`<${t}\\b[^>]*?(?:/>|>[\\s\\S]*?</${t}>)`, 'gi')
  return xml.match(re) ?? []
}

/** Blocos de nível superior (não confunde <Exame> dentro de <SuperExame>) */
export function filhos(xml: string, tag: string): string[] {
  const out: string[] = []
  const open = new RegExp(`<(${reTag(tag)})\\b[^>]*?(/?)>`, 'gi')
  let m: RegExpExecArray | null
  while ((m = open.exec(xml))) {
    if (m[2] === '/') { out.push(m[0]); continue }
    const nome = m[1]
    let depth = 1, i = open.lastIndex
    const re = new RegExp(`<(/?)${nome}\\b[^>]*?(/?)>`, 'gi')
    re.lastIndex = i
    let n: RegExpExecArray | null
    while (depth > 0 && (n = re.exec(xml))) {
      if (n[2] === '/') continue
      depth += n[1] === '/' ? -1 : 1
      i = re.lastIndex
    }
    out.push(xml.slice(m.index, i))
    open.lastIndex = i
  }
  return out
}

/** Conteúdo interno de um bloco */
export const interno = (bloco: string) => bloco.replace(/^<[^>]*>/, '').replace(/<\/[^>]*>$/, '')

/** Texto de um filho direto ou descendente <TAG> (CDATA/entidades resolvidos) */
export function texto(bloco: string, tag: string): string {
  const b = filhos(bloco, tag)[0] ?? blocos(bloco, tag)[0]
  if (!b || b.endsWith('/>') && !b.includes('</')) return ''
  let s = interno(b)
  const cd = s.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/)
  if (cd) return cd[1]
  s = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  return desescapar(s).trim()
}

export function attr(bloco: string, nome: string): string {
  const head = bloco.match(/^<[^>]*>/)?.[0] ?? ''
  const m = head.match(new RegExp(`\\s${nome}="([^"]*)"`, 'i'))
  return m ? desescapar(m[1]) : ''
}

/**
 * Extrai o XML útil que vem dentro do retorno SOAP: em CDATA (getResultado)
 * ou como texto escapado (&lt;RegistroAdmitido&gt;… no getPedido).
 */
export function conteudoUtil(envelope: string): string {
  const body = envelope.match(/<(?:\w+:)?Body[^>]*>([\s\S]*)<\/(?:\w+:)?Body>/i)?.[1] ?? envelope
  const cd = body.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)
  if (cd) return corrigirAcentos(cd[1].replace(/^\s*<\?xml[^>]*>/, ''))
  const esc = body.match(/&lt;\??[A-Za-z][\s\S]*&gt;/)
  if (esc) return corrigirAcentos(desescapar(esc[0]).replace(/^\s*<\?xml[^>]*>/, ''))
  return corrigirAcentos(body)
}

/** Resolve SOAP-encoding multi-ref (href="#idN") embutindo os <multiRef id="idN"> */
export function resolverHref(xml: string): string {
  const refs = new Map<string, string>()
  for (const b of blocos(xml, 'multiRef')) {
    const id = attr(b, 'id'); if (id) refs.set(id, interno(b))
  }
  let out = xml, guard = 0
  while (/href="#[^"]+"/.test(out) && guard++ < 10) {
    out = out.replace(/<([\w:-]+)([^>]*?)\shref="#([^"]+)"([^>]*?)\/>/g, (_, t, a, id, b) => `<${t}${a}${b}>${refs.get(id) ?? ''}</${t}>`)
  }
  return out
}

/** SOAP Fault -> mensagem ou null */
export function fault(xml: string): string | null {
  if (!/Fault>/i.test(xml)) return null
  const fs = texto(xml, 'faultstring'), det = texto(xml, 'detail')
  return [fs, det].filter(Boolean).join(' — ') || 'SOAP Fault'
}

/**
 * Números do Pardini: Tipo=decimal e CasasDecimais=0 -> "." é separador de milhar (2.500 = 2500).
 * Com casas > 0, o separador decimal é o último "." ou "," seguido de exatamente N dígitos.
 */
export function numeroPardini(valor: string, tipo: string, casas: string | number | null): string {
  const v = String(valor ?? '').trim()
  if (!/decimal|num|inteiro|int/i.test(tipo || '') || !/^[<>]?=?\s*-?[\d.,]+$/.test(v)) return v
  const pre = v.match(/^[<>]?=?\s*/)?.[0] ?? ''
  const n = v.slice(pre.length)
  const c = Number(casas ?? 0) || 0
  if (c === 0) return pre + n.replace(/[.,]/g, '')
  const m = n.match(new RegExp(`^(.*)[.,](\\d{${c}})$`))
  if (!m) return pre + n.replace(/[.,]/g, '')
  return pre + m[1].replace(/[.,]/g, '') + '.' + m[2]
}
