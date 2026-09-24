// Cliente do webservice HPWS do Hermes Pardini (SOAP 1.1 RPC/encoded, envelope montado como texto).
import { esc, decodificar, fault } from './xml.ts'

const NS = 'http://hermespardini.com.br/b2b/apoio/schemas'

export type Tipo = 'string' | 'long' | 'boolean' | 'date' | 'time'
export type Param = [nome: string, tipo: Tipo, valor: unknown]

export interface Lab {
  id: string; company_id: string; nome: string; cod_lab: string | null; endpoint_url: string | null
  opcoes: any; modo_contingencia: boolean; guardar_pdf_sempre: boolean; ativo: boolean
}

export interface Ctx { admin: any; lab: Lab; senha: string }

export class PardiniErro extends Error {
  constructor(msg: string, public tipo: 'rede' | 'timeout' | 'http' | 'fault' | 'negocio', public http?: number, public codigo?: string) { super(msg) }
}

export function envelope(op: string, login: string, senha: string, params: Param[]): string {
  const ps = params.map(([n, t, v]) => `<${n} xsi:type="xsd:${t}">${esc(v)}</${n}>`).join('')
  return `<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="${NS}"><soapenv:Header/><soapenv:Body><sch:${op} soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><login xsi:type="xsd:string">${esc(login)}</login><passwd xsi:type="xsd:string">${esc(senha)}</passwd>${ps}</sch:${op}></soapenv:Body></soapenv:Envelope>`
}

const mascarar = (s: string) => s.replace(/(<passwd[^>]*>)[\s\S]*?(<\/passwd>)/gi, '$1***$2')

async function log(ctx: Ctx, op: string, req: string, resp: string | null, http: number | null, ms: number, erro: string | null) {
  await ctx.admin.from('apoio_chamada_log').insert({
    company_id: ctx.lab.company_id, apoio_id: ctx.lab.id, operacao: op, requisicao: mascarar(req).slice(0, 200_000),
    resposta: resp?.slice(0, 500_000) ?? null, http_status: http, duracao_ms: ms, erro,
  }).then(() => {}, () => {})
}

/**
 * Chama uma operação. `tentativas` > 1 repete com espera crescente em erro de rede/5xx
 * (não use para getPedido de envio: lá a recuperação é pelo ConsultaLote).
 */
export async function chamar(ctx: Ctx, op: string, params: Param[], opts: { tentativas?: number; timeoutMs?: number; aceitar500?: boolean } = {}): Promise<string> {
  if (!ctx.lab.endpoint_url) throw new PardiniErro('Endereço (endpoint) do apoio não configurado', 'negocio')
  if (!ctx.lab.cod_lab) throw new PardiniErro('Código do laboratório (login) não configurado', 'negocio')
  const body = envelope(op, ctx.lab.cod_lab, ctx.senha, params)
  const max = opts.tentativas ?? 1
  let ultimo: PardiniErro | null = null
  for (let t = 1; t <= max; t++) {
    const ini = Date.now()
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), opts.timeoutMs ?? 60_000)
    try {
      const r = await fetch(ctx.lab.endpoint_url, {
        method: 'POST', signal: ac.signal,
        headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: `${NS}/HPWS.XMLServer.${op}` },
        body,
      })
      const txt = decodificar(new Uint8Array(await r.arrayBuffer()))
      clearTimeout(timer)
      const f = fault(txt)
      if (!r.ok || f) {
        const msg = f || `HTTP ${r.status}`
        await log(ctx, op, body, txt, r.status, Date.now() - ini, msg)
        const e = new PardiniErro(msg, f ? 'fault' : 'http', r.status, msg.match(/\b(1\d{4})\b/)?.[1])
        if (r.status >= 500 && !f && t < max) { ultimo = e; await esperar(t); continue }
        throw e
      }
      await log(ctx, op, body, txt, r.status, Date.now() - ini, null)
      return txt
    } catch (e) {
      clearTimeout(timer)
      if (e instanceof PardiniErro) throw e
      const timeout = (e as Error).name === 'AbortError'
      const msg = timeout ? 'Tempo esgotado (60 s)' : `Erro de rede: ${(e as Error).message}`
      await log(ctx, op, body, null, null, Date.now() - ini, msg)
      ultimo = new PardiniErro(msg, timeout ? 'timeout' : 'rede')
      if (t < max) { await esperar(t); continue }
      throw ultimo
    }
  }
  throw ultimo ?? new PardiniErro('Falha desconhecida', 'rede')
}

const esperar = (t: number) => new Promise((r) => setTimeout(r, Math.min(2 ** t * 1000, 15_000)))

export const hojeBR = () => {
  const d = new Date(Date.now() - 3 * 3600_000)
  return { data: d.toISOString().slice(0, 10), hora: d.toISOString().slice(11, 19) }
}
export const brData = (d: Date) => new Date(d.getTime() - 3 * 3600_000).toISOString().slice(0, 10)
export const brHora = (d: Date) => new Date(d.getTime() - 3 * 3600_000).toISOString().slice(11, 19)
