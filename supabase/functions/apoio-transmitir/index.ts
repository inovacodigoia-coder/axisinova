// Transmissão da remessa ao Hermes Pardini (getPedido, Registro protocolo 2), com recuperação por ConsultaLote.
import { z } from 'npm:zod@3'
import { adminClient, autenticar, carregarCtx, corsHeaders, cursorGravar, idMsg, json } from '../_shared/pardini/contexto.ts'
import { chamar, hojeBR, PardiniErro, type Ctx } from '../_shared/pardini/soap.ts'
import { conteudoUtil, esc, texto } from '../_shared/pardini/xml.ts'
import { parseAdmitido } from '../_shared/pardini/parsers.ts'
import { montarRegistro } from '../_shared/pardini/registro.ts'

const Body = z.object({ remessa_id: z.string().uuid(), operacao: z.enum(['consultar']).optional() })
const cortar = (s: unknown, n: number) => String(s ?? '').slice(0, n)
const sexo = (g: string) => /^(m|male|masc)/i.test(g || '') ? 'Masculino' : /^(f|female|fem)/i.test(g || '') ? 'Feminino' : 'Indefinido'
const RECUPERAVEIS = ['10023', '10217']
const baseCodPed = (o: any, prefixo?: string | null) => {
  const pre = String(prefixo ?? '').replace(/\s/g, '').toUpperCase().slice(0, 8)
  const num = String(o?.order_number ?? o?.protocol ?? '').replace(/\s/g, '')
  return pre + num.slice(Math.max(0, num.length - (15 - pre.length)))
}
const novoCodPed = (base: string) => `${cortar(base, 8)}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
const codColisao = (pe: PardiniErro | null, neg: { codigo: string; msg: string } | null) => {
  const txt = `${pe?.codigo ?? ''} ${pe?.message ?? ''} ${neg?.codigo ?? ''} ${neg?.msg ?? ''}`
  return /10023/.test(txt) ? '10023' : /10217/.test(txt) ? '10217' : null
}

const consultaLote = (ctx: Ctx, remessa: any) =>
  `<Consulta><Protocolo>1</Protocolo><ID>${idMsg()}</ID><SolicitaLote><CodLab>${esc(ctx.lab.cod_lab)}</CodLab><CodLoteLab>${remessa.cod_lote_lab}</CodLoteLab></SolicitaLote></Consulta>`

function erroNegocio(util: string): { codigo: string; msg: string } | null {
  if (/RegistroAdmitido/i.test(util)) return null
  const cod = texto(util, 'CodErro') || texto(util, 'Codigo') || util.match(/\b(1\d{4})\b/)?.[1] || ''
  const msg = texto(util, 'DescErro') || texto(util, 'Mensagem') || texto(util, 'Descricao') || util.replace(/<[^>]+>/g, ' ').trim().slice(0, 300)
  return { codigo: cod, msg }
}

async function aplicarAdmitido(ctx: Ctx, remessa: any, exames: any[], util: string) {
  const { admin, lab } = ctx
  const adm = parseAdmitido(util)
  if (!adm) throw new Error('Resposta sem RegistroAdmitido')
  const codLoteApoio = adm.codLoteApoio
  let recipientes = 0
  const transmitidos = new Set<string>()
  for (const p of adm.pedidos) {
    const codPedLab = p.codPedLab, codPedApoio = p.codPedApoio
    const doPedido = exames.filter((e) => String(e.cod_ped_lab ?? '').toUpperCase() === String(codPedLab).toUpperCase())
    for (const r of p.recipientes) {
      const codBar = r.codBarApoio, epl = r.etiquetaEpl
      const codigos = r.exames.map((x) => x.codExmApoio.toUpperCase())
      const { data: existente } = await admin.from('apoio_recipiente').select('id').eq('remessa_id', remessa.id).eq('cod_bar_apoio', codBar).maybeSingle()
      let recId = existente?.id
      if (!recId) {
        const { data: novo, error } = await admin.from('apoio_recipiente').insert({ company_id: lab.company_id, remessa_id: remessa.id, cod_ped_apoio: codPedApoio, cod_bar_apoio: codBar, etiqueta_epl: epl }).select('id').single()
        if (error) throw new Error(error.message)
        recId = novo.id; recipientes++
        await admin.from('apoio_impressao_fila').insert({ empresa_id: lab.company_id, tipo: 'etiqueta_epl', conteudo: epl, referencia: `remessa:${remessa.cod_lote_lab}:${codBar}` }).then(() => {}, () => {})
      } else {
        await admin.from('apoio_recipiente').update({ etiqueta_epl: epl, cod_ped_apoio: codPedApoio }).eq('id', recId)
      }
      for (const e of doPedido) {
        const c = `${e.codigo_apoio}|${e.sequencial ?? 1}`.toUpperCase()
        if (codigos.length && !codigos.includes(c)) continue
        await admin.from('apoio_pedido_exame').update({ cod_ped_apoio: codPedApoio, recipiente_id: recId, erro: null }).eq('id', e.id)
        transmitidos.add(e.id)
      }
    }
    // Exames do pedido sem recipiente explícito também recebem o código do pedido
    for (const e of doPedido) if (!transmitidos.has(e.id)) {
      await admin.from('apoio_pedido_exame').update({ cod_ped_apoio: codPedApoio, erro: null }).eq('id', e.id); transmitidos.add(e.id)
    }
  }
  for (const id of transmitidos) {
    const e = exames.find((x) => x.id === id)
    if (e?.status === 'erro_transmissao') await admin.rpc('apoio_integ_status', { _pe: id, _novo: 'em_remessa', _motivo: 'Nova tentativa de transmissão' })
    await admin.rpc('apoio_integ_status', { _pe: id, _novo: 'transmitido', _motivo: 'Transmitido ao apoio', _dados: { cod_lote_apoio: codLoteApoio } })
    // Ponto da Soroteca: ainda não existe cadastro de amostras armazenadas; fica a marcação no exame.
    await admin.from('apoio_pedido_exame').update({ info_complementar: { ...(e?.info_complementar ?? {}), armazenada_no_apoio: lab.nome ?? 'apoio', armazenada_em: new Date().toISOString() } }).eq('id', id)
  }
  // Recipientes provisórios (gerados antes da transmissão) que o apoio não devolveu ficam cancelados
  await admin.from('apoio_recipiente').update({ cancelado: true }).eq('remessa_id', remessa.id).is('cod_ped_apoio', null)
  const todos = transmitidos.size === exames.length
  await admin.from('apoio_remessa').update({ status: todos ? 'transmitida' : 'parcial', cod_lote_apoio: codLoteApoio || null, transmitido_em: new Date().toISOString() }).eq('id', remessa.id)
  return { cod_lote_apoio: codLoteApoio, exames: transmitidos.size, recipientes }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const admin = adminClient()
  const quem = await autenticar(req, admin, 'apoio.remessa.operar')
  if (quem instanceof Response) return quem
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400)

  const { data: rem0 } = await admin.from('apoio_remessa').select('*').eq('id', parsed.data.remessa_id).maybeSingle()
  if (!rem0 || (quem.companyId && rem0.company_id !== quem.companyId)) return json({ ok: false, motivo: 'Remessa não encontrada' }, 404)
  // Só consulta o lote quando a tentativa anterior ficou sem resposta (timeout/queda)
  const jaEnviada = !!rem0.envio_sem_resposta
  const presa = rem0.status === 'transmitindo' && Date.now() - new Date(rem0.updated_at).getTime() > 5 * 60_000
  const permitidos = presa ? ['transmitindo'] : ['aberta', 'conferida', 'erro']
  const msgId = rem0.mensagem_id || idMsg()
  const { data: travada } = await admin.from('apoio_remessa').update({ status: 'transmitindo', mensagem_id: msgId }).eq('id', rem0.id).in('status', permitidos).select('*')
  if (!travada?.length) return json({ ok: false, motivo: rem0.status === 'transmitindo' ? 'Esta remessa já está sendo transmitida' : `Remessa com status "${rem0.status}" não pode ser transmitida` })
  const remessa = travada[0]

  let ctx: Ctx
  try { ctx = await carregarCtx(admin, remessa.apoio_id) } catch (e) {
    await admin.from('apoio_remessa').update({ status: rem0.status }).eq('id', remessa.id)
    return json({ ok: false, motivo: (e as Error).message })
  }
  if (ctx.lab.modo_contingencia) { await admin.from('apoio_remessa').update({ status: rem0.status }).eq('id', remessa.id); return json({ ok: false, motivo: 'Apoio em modo manual: use a aba Contingência' }) }

  // Exames da remessa + dados do pedido/paciente
  const { data: pes } = await admin.from('apoio_pedido_exame').select('id, pedido_id, exame_id, codigo_apoio, sequencial, status, info_complementar, cod_ped_lab').eq('remessa_id', remessa.id).neq('status', 'cancelado')
  const exames: any[] = []
  for (const e of pes ?? []) {
    const { data: o } = await admin.from('attendance_orders').select('id, order_number, protocol, created_at, patient_id, patient_name, lab_guides').eq('id', e.pedido_id).single()
    const { data: p } = o?.patient_id ? await admin.from('patients').select('name, gender, birth_date, cpf').eq('id', o.patient_id).maybeSingle() : { data: null }
    const { data: ex } = await admin.from('exams').select('internal_code').eq('id', e.exame_id).maybeSingle()
    const item = (o?.lab_guides ?? []).flatMap((g: any) => g.exams ?? []).find((x: any) => x.id === e.exame_id || x.examId === e.exame_id)
    exames.push({ ...e, ordem: o, paciente: p, cod_exm_lab: ex?.internal_code || e.exame_id.slice(0, 15), coletado_em: item?.collectedAt })
  }
  if (!exames.length) { await admin.from('apoio_remessa').update({ status: rem0.status }).eq('id', remessa.id); return json({ ok: false, motivo: 'Remessa sem exames' }) }

  // CodPedLab: uma vez gravado para o pedido, nunca muda (reenvio usa o mesmo)
  const codPorPedido = new Map<string, string>()
  for (const e of exames) if (e.cod_ped_lab) codPorPedido.set(e.pedido_id, e.cod_ped_lab)
  for (const e of exames) {
    if (!codPorPedido.has(e.pedido_id)) {
      const { data: outros } = await admin.from('apoio_pedido_exame').select('cod_ped_lab').eq('pedido_id', e.pedido_id).eq('apoio_id', remessa.apoio_id).not('cod_ped_lab', 'is', null).limit(1)
      codPorPedido.set(e.pedido_id, outros?.[0]?.cod_ped_lab || baseCodPed(e.ordem, (ctx.lab as any).opcoes?.prefixoPedido))
    }
    e.cod_ped_lab = codPorPedido.get(e.pedido_id)
    // CodPedLab é obrigatório no XSD do Pardini: sem número de pedido, bloqueia em vez de enviar sem a tag
    if (!e.cod_ped_lab) {
      await admin.from('apoio_remessa').update({ status: rem0.status }).eq('id', remessa.id)
      return json({ ok: false, motivo: `Pedido ${e.ordem?.order_number ?? e.pedido_id} sem número: não foi possível gerar o código do pedido (CodPedLab). Verifique o cadastro do pedido e tente de novo. Nada foi transmitido.` })
    }
    await admin.from('apoio_pedido_exame').update({ cod_ped_lab: e.cod_ped_lab }).eq('id', e.id)
  }

  // Colisão com número de outro integrador (1ª transmissão): nunca consultar, pedir número novo
  const colidiu = async (cod: string) => {
    const motivo = cod === '10023'
      ? `Remessa ${remessa.cod_lote_lab}: número de lote já usado no Pardini`
      : `Remessa ${remessa.cod_lote_lab}: código de pedido já usado no Pardini`
    if (cod === '10217') {
      for (const pid of new Set(exames.map((e) => e.pedido_id))) {
        const novo = novoCodPed(codPorPedido.get(pid) || '')
        await admin.from('apoio_pedido_exame').update({ cod_ped_lab: novo }).eq('pedido_id', pid).eq('apoio_id', remessa.apoio_id).is('cod_ped_apoio', null)
      }
    }
    for (const e of exames) await admin.from('apoio_pedido_exame').update({ erro: { codigo: cod, mensagem: motivo, categoria: 'numero_usado' } }).eq('id', e.id)
    await admin.from('apoio_remessa').update({ status: 'erro', colisao: motivo, envio_sem_resposta: false }).eq('id', remessa.id)
    await cursorGravar(admin, ctx.lab, 'transmissao', { erro: motivo })
    return json({ ok: false, colisao: true, motivo: `${motivo}. ${cod === '10023' ? 'Clique em "Gerar número novo" e transmita de novo.' : 'Um código novo de pedido já foi gerado; clique em "Gerar número novo" e transmita de novo.'}` })
  }

  const recuperar = async () => {
    const resp = await chamar(ctx, 'getPedido', [['XML', 'string', consultaLote(ctx, remessa)]], { tentativas: 3 })
    const util = conteudoUtil(resp)
    if (!/RegistroAdmitido/i.test(util)) throw new PardiniErro(erroNegocio(util)?.msg || 'ConsultaLote sem RegistroAdmitido', 'negocio')
    return aplicarAdmitido(ctx, remessa, exames, util)
  }

  try {
    let r
    if (jaEnviada) {
      // Tentativa anterior deste lote ficou sem resposta: recupera pelo lote antes de reenviar
      try {
        r = await recuperar()
        await admin.from('apoio_remessa').update({ envio_sem_resposta: false }).eq('id', remessa.id)
        await cursorGravar(admin, ctx.lab, 'transmissao', {}); return json({ ok: true, recuperado: true, ...r })
      } catch { /* segue para envio */ }
    }
    let util: string
    await admin.from('apoio_remessa').update({ envio_sem_resposta: true }).eq('id', remessa.id)
    try {
      const resp = await chamar(ctx, 'getPedido', [['XML', 'string', montarRegistro(ctx.lab.cod_lab ?? '', remessa, exames, msgId)]])
      util = conteudoUtil(resp)
    } catch (e) {
      const pe = e as PardiniErro
      if (pe.tipo === 'timeout' || pe.tipo === 'rede') { r = await recuperar(); await admin.from('apoio_remessa').update({ envio_sem_resposta: false }).eq('id', remessa.id); return json({ ok: true, recuperado: true, ...r }) }
      await admin.from('apoio_remessa').update({ envio_sem_resposta: false }).eq('id', remessa.id)
      const cod = codColisao(pe, null)
      if (cod) { if (jaEnviada) { r = await recuperar(); return json({ ok: true, recuperado: true, ...r }) } return await colidiu(cod) }
      throw e
    }
    await admin.from('apoio_remessa').update({ envio_sem_resposta: false }).eq('id', remessa.id)
    const neg = erroNegocio(util)
    const codN = neg ? codColisao(null, neg) : null
    if (codN) { if (jaEnviada) { r = await recuperar(); return json({ ok: true, recuperado: true, ...r }) } return await colidiu(codN) }
    if (neg) {
      const { data: ae } = neg.codigo ? await admin.from('apoio_erro').select('mensagem, categoria').eq('apoio_id', ctx.lab.id).eq('codigo', neg.codigo).maybeSingle() : { data: null }
      const motivo = `${neg.codigo ? neg.codigo + ' – ' : ''}${ae?.mensagem || neg.msg}${ae?.categoria ? ` (${ae.categoria})` : ''}`
      for (const e of exames) {
        await admin.from('apoio_pedido_exame').update({ erro: { codigo: neg.codigo, mensagem: ae?.mensagem || neg.msg, categoria: ae?.categoria ?? null } }).eq('id', e.id)
        await admin.rpc('apoio_integ_status', { _pe: e.id, _novo: 'erro_transmissao', _motivo: motivo })
      }
      await admin.from('apoio_remessa').update({ status: 'erro' }).eq('id', remessa.id)
      await cursorGravar(admin, ctx.lab, 'transmissao', { erro: motivo })
      return json({ ok: false, motivo })
    }
    r = await aplicarAdmitido(ctx, remessa, exames, util)
    await cursorGravar(admin, ctx.lab, 'transmissao', {})
    return json({ ok: true, ...r })
  } catch (e) {
    const msg = (e as Error).message
    await admin.from('apoio_remessa').update({ status: 'erro' }).eq('id', remessa.id)
    await cursorGravar(admin, ctx.lab, 'transmissao', { erro: msg })
    return json({ ok: false, motivo: `Falha na transmissão: ${msg}. Se o Pardini não respondeu, a próxima tentativa consulta o lote antes de reenviar, sem duplicar.` })
  }
})
