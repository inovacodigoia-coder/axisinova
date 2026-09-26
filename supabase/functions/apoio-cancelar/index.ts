// Cancelamento no Pardini: só cancelaExame(codPedApoio, codExmApoio), um exame por vez. Retorno "1" = cancelado.
// cancelaAmostra está DESLIGADO: no teste real (23/09/2026) deu HTTP 500 do Pardini e não se sabe se
// idTuboLab é o código de barras deles (CodBarApoio) ou o tubo do laboratório (modo Direct). Aguardando resposta do Pardini.
import { z } from 'npm:zod@3'
import { adminClient, apoiosAutomaticos, autenticar, carregarCtx, corsHeaders, json, paraCada, uuidOk } from '../_shared/pardini/contexto.ts'
import { chamar, PardiniErro, type Ctx } from '../_shared/pardini/soap.ts'
import { texto } from '../_shared/pardini/xml.ts'

const CANCELA_AMOSTRA_LIGADO = false // não ligar sem confirmação do Pardini sobre idTuboLab

const corpo = (xml: string) => xml.replace(/[\s\S]*<(?:\w+:)?Body[^>]*>/i, '').replace(/<\/(?:\w+:)?Body>[\s\S]*/i, '')
const retorno = (xml: string) => (texto(xml, 'return') || texto(xml, 'retorno') || corpo(xml).replace(/<[^>]+>/g, ' ')).trim()
const ok1 = (xml: string) => /^\s*1\s*$/.test(retorno(xml))
const codExm = (e: any) => `${e.codigo_apoio}|${e.sequencial ?? 1}`

async function cancelaExame(ctx: Ctx, e: any) {
  const r = await chamar(ctx, 'cancelaExame', [['codPedApoio', 'string', e.cod_ped_apoio], ['codExmApoio', 'string', codExm(e)]], { tentativas: 1 })
  return { ok: ok1(r), resposta: retorno(r).slice(0, 500) }
}

// Rotina antiga (exames marcados com cancelar_no_apoio): agora também só cancelaExame
export async function processar(ctx: Ctx, ids?: string[]) {
  const { admin, lab } = ctx
  let q = admin.from('apoio_pedido_exame').select('id, cod_ped_apoio, codigo_apoio, sequencial, recipiente_id, status, info_complementar')
    .eq('apoio_id', lab.id).neq('status', 'cancelado').not('cod_ped_apoio', 'is', null).filter('info_complementar->>cancelar_no_apoio', 'eq', 'true')
  if (ids?.length) q = q.in('id', ids)
  const { data: alvo } = await q
  const res = { cancelados: 0, falhas: [] as string[] }
  if (CANCELA_AMOSTRA_LIGADO) { /* chamada cancelaAmostra(idTuboLab) desligada — ver comentário no topo */ }
  for (const e of alvo ?? []) {
    try {
      const r = await cancelaExame(ctx, e)
      if (r.ok) {
        await admin.rpc('apoio_cancelamento_registrar', { _pe: e.id, _usuario: null, _resultado: 'cancelado', _motivo: e.info_complementar?.motivo_cancelamento || 'Exame cancelado no pedido', _destino: 'atendimento', _resposta: r.resposta })
        res.cancelados++
      } else res.falhas.push(`${codExm(e)}: o Pardini recusou (${r.resposta || 'sem texto'})`)
    } catch (err) { res.falhas.push(`${codExm(e)}: ${(err as Error).message}`) }
  }
  if (res.falhas.length && !res.cancelados) throw new Error(res.falhas.join('; '))
  return res
}

const Remessa = z.object({
  modo: z.literal('remessa'),
  pedido_exame_id: z.string().uuid(),
  motivo: z.string().trim().min(3).max(300),
  destino: z.enum(['fila', 'atendimento']),
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const admin = adminClient()
  const body = await req.json().catch(() => ({}))

  if (body?.modo === 'remessa') {
    const p = Remessa.safeParse(body)
    if (!p.success) return json({ error: 'Dados inválidos: informe o exame, o motivo e o que fazer com o exame no LIS' }, 400)
    const quem = await autenticar(req, admin, 'apoio.remessa.cancelar')
    if (quem instanceof Response) return quem
    const { data: e } = await admin.from('apoio_pedido_exame').select('id, company_id, apoio_id, remessa_id, cod_ped_apoio, codigo_apoio, sequencial, status, info_complementar').eq('id', p.data.pedido_exame_id).maybeSingle()
    if (!e || e.company_id !== quem.companyId) return json({ error: 'Exame não encontrado' }, 404)
    if (e.status === 'cancelado') return json({ resultado: 'recusado', mensagem: 'Este exame já está cancelado.' })
    if (!e.cod_ped_apoio) return json({ resultado: 'recusado', mensagem: 'Este exame não tem o número do pedido no Pardini (não foi aceito na transmissão).' })
    const { data: rem } = await admin.from('apoio_remessa').select('status, entregue_em').eq('id', e.remessa_id).maybeSingle()
    if (!rem || !['transmitida', 'parcial', 'cancelada_parcial'].includes(rem.status)) return json({ resultado: 'recusado', mensagem: 'Só é possível cancelar exames de remessa transmitida.' })
    if (rem.entregue_em) return json({ resultado: 'recusado', mensagem: 'A amostra já foi entregue ao Pardini. O cancelamento é feito direto com o apoio.' })
    let ctx: Ctx
    try { ctx = await carregarCtx(admin, e.apoio_id) } catch (err) { return json({ resultado: 'recusado', mensagem: (err as Error).message }) }
    let resultado: 'cancelado' | 'recusado' | 'sem_confirmacao'; let resposta = ''; let mensagem = ''
    try {
      const r = await cancelaExame(ctx, e)
      resposta = r.resposta
      resultado = r.ok ? 'cancelado' : 'recusado'
      mensagem = r.ok ? 'Cancelado no Pardini' : `O Pardini recusou o cancelamento${resposta ? `: ${resposta}` : ''}. Nada foi alterado no sistema.`
    } catch (err) {
      const pe = err as PardiniErro
      resposta = pe.message
      if (pe.tipo === 'timeout' || pe.tipo === 'rede') { resultado = 'sem_confirmacao'; mensagem = 'O Pardini não respondeu. O cancelamento ficou sem confirmação: use "Tentar de novo".' }
      else { resultado = 'recusado'; mensagem = `O Pardini recusou o cancelamento (${pe.message}). Nada foi alterado no sistema.` }
    }
    const { error } = await admin.rpc('apoio_cancelamento_registrar', { _pe: e.id, _usuario: quem.userId, _resultado: resultado, _motivo: p.data.motivo, _destino: p.data.destino, _resposta: resposta })
    if (error) return json({ resultado, mensagem: `${mensagem} Atenção: não foi possível gravar no sistema (${error.message}).`, resposta })
    return json({ resultado, mensagem, resposta })
  }

  const quem = await autenticar(req, admin)
  if (quem instanceof Response) return quem
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
