// Cancela no Pardini os exames marcados (info_complementar.cancelar_no_apoio): cancelaAmostra (tubo inteiro) e depois cancelaExame.
import { adminClient, apoiosAutomaticos, autenticar, corsHeaders, json, paraCada, uuidOk } from '../_shared/pardini/contexto.ts'
import { chamar, PardiniErro, type Ctx } from '../_shared/pardini/soap.ts'
import { texto } from '../_shared/pardini/xml.ts'

const retorno = (xml: string) => (texto(xml, 'return') || texto(xml, 'retorno') || xml.replace(/<[^>]+>/g, ' ')).trim()
const ok1 = (xml: string) => /^\s*1\s*$/.test(retorno(xml)) || />\s*1\s*</.test(xml.replace(/[\s\S]*<(?:\w+:)?Body[^>]*>/i, ''))

async function cancelaExame(ctx: Ctx, e: any) {
  const r = await chamar(ctx, 'cancelaExame', [['codPedApoio', 'string', e.cod_ped_apoio], ['codExmApoio', 'string', `${e.codigo_apoio}|${e.sequencial ?? 1}`]], { tentativas: 2 })
  return ok1(r)
}

async function finalizar(ctx: Ctx, e: any, como: string) {
  await ctx.admin.rpc('apoio_integ_status', { _pe: e.id, _novo: 'cancelado', _motivo: `Cancelado no apoio (${como})` })
  await ctx.admin.from('apoio_pedido_exame').update({ info_complementar: { ...(e.info_complementar ?? {}), cancelar_no_apoio: false, cancelado_no_apoio_em: new Date().toISOString() } }).eq('id', e.id)
}

export async function processar(ctx: Ctx, ids?: string[]) {
  const { admin, lab } = ctx
  let q = admin.from('apoio_pedido_exame').select('id, cod_ped_apoio, codigo_apoio, sequencial, recipiente_id, status, info_complementar')
    .eq('apoio_id', lab.id).neq('status', 'cancelado').not('cod_ped_apoio', 'is', null).filter('info_complementar->>cancelar_no_apoio', 'eq', 'true')
  if (ids?.length) q = q.in('id', ids)
  const { data: alvo } = await q
  const res = { cancelados: 0, falhas: [] as string[] }
  const porTubo = new Map<string, any[]>()
  for (const e of alvo ?? []) if (e.recipiente_id) porTubo.set(e.recipiente_id, [...(porTubo.get(e.recipiente_id) ?? []), e])
  const feitos = new Set<string>()

  for (const [rid, es] of porTubo) {
    const { data: noTubo } = await admin.from('apoio_pedido_exame').select('id').eq('recipiente_id', rid).neq('status', 'cancelado')
    if ((noTubo ?? []).length !== es.length) continue // o tubo continua com outros exames: cancela por exame
    const { data: rec } = await admin.from('apoio_recipiente').select('cod_bar_apoio').eq('id', rid).single()
    try {
      const r = await chamar(ctx, 'cancelaAmostra', [['idTuboLab', 'string', rec.cod_bar_apoio]], { tentativas: 2 })
      if (!ok1(r)) throw new PardiniErro(`cancelaAmostra retornou ${retorno(r).slice(0, 80)}`, 'negocio')
    } catch (err) {
      if ((err as PardiniErro).http !== 500) { res.falhas.push(`${rec.cod_bar_apoio}: ${(err as Error).message}`); continue }
      // Bug conhecido do Pardini: 500 no cancelaAmostra. Cancela exame a exame; se todos derem 1, trata como sucesso.
      let todos = true
      for (const e of es) { try { if (!(await cancelaExame(ctx, e))) todos = false } catch { todos = false } }
      if (!todos) { res.falhas.push(`${rec.cod_bar_apoio}: cancelaAmostra HTTP 500`); continue }
      await admin.from('apoio_chamada_log').insert({ company_id: lab.company_id, apoio_id: lab.id, operacao: 'cancelaAmostra', erro: null, resposta: 'HTTP 500 após todos os exames cancelados: tratado como sucesso (bug conhecido do Pardini)' })
    }
    await admin.from('apoio_recipiente').update({ cancelado: true }).eq('id', rid)
    for (const e of es) { await finalizar(ctx, e, 'amostra'); feitos.add(e.id); res.cancelados++ }
  }
  for (const e of alvo ?? []) {
    if (feitos.has(e.id)) continue
    try {
      if (await cancelaExame(ctx, e)) { await finalizar(ctx, e, 'exame'); res.cancelados++ }
      else res.falhas.push(`${e.codigo_apoio}: retorno diferente de 1`)
    } catch (err) { res.falhas.push(`${e.codigo_apoio}: ${(err as Error).message}`) }
  }
  if (res.falhas.length && !res.cancelados) throw new Error(res.falhas.join('; '))
  return res
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const admin = adminClient()
  const quem = await autenticar(req, admin)
  if (quem instanceof Response) return quem
  const body = await req.json().catch(() => ({}))
  const ids: string[] = Array.isArray(body?.pedido_exame_ids) ? body.pedido_exame_ids.filter(uuidOk).slice(0, 200) : []
  let apoioId: string | undefined = uuidOk(body?.apoio_id) ? body.apoio_id : undefined
  if (ids.length && !apoioId) {
    const { data } = await admin.from('apoio_pedido_exame').select('apoio_id').eq('id', ids[0]).maybeSingle()
    apoioId = data?.apoio_id
  }
  const labs = await apoiosAutomaticos(admin, apoioId, quem.companyId)
  const out = await paraCada(admin, labs, 'cancelamento', (ctx) => processar(ctx, ids))
  return json({ ok: out.every((o) => o.ok), resultados: out })
})
