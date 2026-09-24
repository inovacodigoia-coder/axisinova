// Rastreabilidade (status do apoio) e pendências técnicas. Janela máxima de 7 dias por chamada.
import { adminClient, apoiosAutomaticos, autenticar, corsHeaders, cursorGravar, cursorLer, json, paraCada, uuidOk } from '../_shared/pardini/contexto.ts'
import { brData, brHora, chamar, type Ctx } from '../_shared/pardini/soap.ts'
import { blocos, desescapar, resolverHref, texto } from '../_shared/pardini/xml.ts'

const SEMANA = 7 * 864e5
const cmp = (s: string) => String(s ?? '').trim().toUpperCase()

/** Divide um trecho pelas ocorrências de <tag> (cada item começa numa ocorrência) */
function fatiar(xml: string, tag: string): string[] {
  const idx: number[] = []; const re = new RegExp(`<(?:\\w+:)?${tag}\\b`, 'gi'); let m
  while ((m = re.exec(xml))) idx.push(m.index)
  return idx.map((i, k) => xml.slice(i, idx[k + 1] ?? xml.length))
}
const campo = (s: string, t: string) => texto(s, t) || desescapar(s.match(new RegExp(`<(?:\\w+:)?${t}[^>]*>([^<]*)<`, 'i'))?.[1] ?? '').trim()

function janelas(desde: Date, ate: Date) {
  const out: [Date, Date][] = []
  let a = desde
  while (a < ate && out.length < 4) { const b = new Date(Math.min(a.getTime() + SEMANA, ate.getTime())); out.push([a, b]); a = b }
  return out
}
const params = (a: Date, b: Date) => [['dataInicial', 'string', brData(a)], ['dataFinal', 'string', brData(b)], ['horaInicial', 'string', brHora(a)], ['horaFinal', 'string', brHora(b)]] as any

async function rastreabilidade(ctx: Ctx) {
  const { admin, lab } = ctx
  const cur = await cursorLer(admin, lab, 'rastreabilidade')
  const ate = new Date()
  const desde = new Date(Math.max(cur?.ate ? new Date(cur.ate).getTime() - 30 * 60_000 : ate.getTime() - SEMANA, ate.getTime() - 365 * 864e5))
  const { data: mapa } = await admin.from('apoio_status_map').select('cod_apoio, status_nosso').eq('apoio_id', lab.id)
  const m = new Map((mapa ?? []).map((x: any) => [String(x.cod_apoio), x.status_nosso]))
  let atualizados = 0, desconhecidos = 0, fimOk = desde
  for (const [a, b] of janelas(desde, ate)) {
    const xml = resolverHref(await chamar(ctx, 'getRastreabilidade', params(a, b), { tentativas: 3 }))
    for (const am of fatiar(xml, 'idtuboLab').length ? blocos(xml, 'RastreabilidadeAmostra').concat(blocos(xml, 'item')).filter((x) => /idtuboLab/i.test(x) && !/<(?:\w+:)?item\b[\s\S]*<(?:\w+:)?item\b/i.test(x.slice(5))) : []) {
      const cab = am.split(/<(?:\w+:)?mnMaterial\b/i)[0]
      const tubos = [campo(cab, 'etqCodBar'), campo(cab, 'idtuboLab')].filter(Boolean)
      if (!tubos.length) continue
      const { data: recs } = await admin.from('apoio_recipiente').select('id').eq('company_id', lab.company_id).in('cod_bar_apoio', tubos)
      if (!recs?.length) continue
      const { data: pes } = await admin.from('apoio_pedido_exame').select('id, codigo_apoio, sequencial, status, info_complementar').in('recipiente_id', recs.map((r: any) => r.id))
      for (const ex of fatiar(am, 'mnMaterial')) {
        const cod = cmp(`${campo(ex, 'mnMaterial')}|${campo(ex, 'mnExame')}|${campo(ex, 'sqeExa') || 1}`)
        const pe = (pes ?? []).find((p: any) => cmp(`${p.codigo_apoio}|${p.sequencial ?? 1}`) === cod)
        if (!pe) continue
        const codSt = campo(ex, 'codStatus'), desc = campo(ex, 'descricaoStatus'), quando = campo(ex, 'dataHoraStatusExame')
        const nosso = m.get(codSt)
        const info = { ...(pe.info_complementar ?? {}) }
        if (nosso) delete info.status_desconhecido; else { info.status_desconhecido = true; desconhecidos++ }
        await admin.from('apoio_pedido_exame').update({ status_apoio_cod: codSt, status_apoio_desc: desc, status_apoio_em: quando ? new Date(quando.replace(' ', 'T') + (quando.includes('-03') ? '' : '-03:00')).toISOString() : new Date().toISOString(), info_complementar: info }).eq('id', pe.id)
        if (nosso) { const { data: mudou } = await admin.rpc('apoio_integ_status', { _pe: pe.id, _novo: nosso, _motivo: `Status do apoio ${codSt} – ${desc}` }); if (mudou) atualizados++ }
      }
    }
    fimOk = b
  }
  await cursorGravar(admin, lab, 'rastreabilidade', { ate: fimOk.toISOString() })
  return { atualizados, desconhecidos }
}

async function pendencias(ctx: Ctx) {
  const { admin, lab } = ctx
  const cur = await cursorLer(admin, lab, 'pendencia')
  const ate = new Date()
  const desde = new Date(cur?.ate ? new Date(cur.ate).getTime() - 30 * 60_000 : ate.getTime() - SEMANA)
  let novas = 0, fimOk = desde
  for (const [a, b] of janelas(desde, ate)) {
    const xml = resolverHref(await chamar(ctx, 'getPendenciaTecnica', params(a, b), { tentativas: 3 }))
    fimOk = b
    if (/N[ãa]o existe\(m\) pend[êe]ncia/i.test(xml) || !/codPedApoio/i.test(xml)) continue
    for (const p of fatiar(xml, 'codPedApoio')) {
      const codPed = campo(p, 'codPedApoio')
      const cabFim = p.split(/<(?:\w+:)?mnMaterial\b/i)
      const resto = cabFim[cabFim.length - 1]
      const pend = campo(p, 'pendencia') || campo(resto, 'pendencia'), det = campo(p, 'detalhamentoPendencia'), disp = campo(p, 'disposicao'), sit = campo(p, 'situacaoPendencia')
      const { data: pes } = await admin.from('apoio_pedido_exame').select('id, company_id, codigo_apoio, sequencial').eq('apoio_id', lab.id).eq('cod_ped_apoio', codPed)
      const exs = fatiar(p, 'mnMaterial').map((e) => cmp(`${campo(e, 'mnMaterial')}|${campo(e, 'mnExame')}|${campo(e, 'sqeExa') || 1}`))
      const alvo = (pes ?? []).filter((pe: any) => !exs.length || exs.includes(cmp(`${pe.codigo_apoio}|${pe.sequencial ?? 1}`)))
      const resolvida = /resolv|encerr|conclu/i.test(sit)
      for (const pe of alvo) {
        const { error } = await admin.from('apoio_pendencia_tecnica').insert({
          company_id: pe.company_id, pedido_exame_id: pe.id, cod_ped_apoio: codPed, codigo_apoio: pe.codigo_apoio, situacao: sit || null,
          pendencia: pend || null, detalhamento: det || null, disposicao: disp || null, recebida_em: new Date().toISOString(),
          resolvida_em: resolvida ? new Date().toISOString() : null,
        })
        if (error?.code === '23505') {
          if (resolvida) await admin.from('apoio_pendencia_tecnica').update({ situacao: sit, resolvida_em: new Date().toISOString() }).eq('pedido_exame_id', pe.id).is('resolvida_em', null)
          continue
        }
        if (!error) { novas++; if (!resolvida) await admin.rpc('apoio_integ_status', { _pe: pe.id, _novo: 'pendencia_tecnica', _motivo: pend || 'Pendência técnica do apoio' }) }
      }
    }
  }
  await cursorGravar(admin, lab, 'pendencia', { ate: fimOk.toISOString() })
  return { novas }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const admin = adminClient()
  const quem = await autenticar(req, admin)
  if (quem instanceof Response) return quem
  const body = await req.json().catch(() => ({}))
  const labs = await apoiosAutomaticos(admin, uuidOk(body?.apoio_id) ? body.apoio_id : undefined, quem.companyId)
  const a = await paraCada(admin, labs, 'rastreabilidade', async (ctx) => { const r = await rastreabilidade(ctx); return r })
  const b = await paraCada(admin, labs, 'pendencia', async (ctx) => { const r = await pendencias(ctx); return r })
  return json({ ok: [...a, ...b].every((o) => o.ok), rastreabilidade: a, pendencias: b })
})
