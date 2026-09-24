// Confirma recebimento das amostras no apoio (verificarRecebimentoPedido) e reprocessa cancelamentos pendentes.
import { adminClient, apoiosAutomaticos, autenticar, corsHeaders, json, paraCada, uuidOk } from '../_shared/pardini/contexto.ts'
import { chamar, type Ctx } from '../_shared/pardini/soap.ts'
import { desescapar } from '../_shared/pardini/xml.ts'

async function rodar(ctx: Ctx) {
  const { admin, lab } = ctx
  const { data: pes } = await admin.from('apoio_pedido_exame').select('id, cod_ped_apoio').eq('apoio_id', lab.id).eq('status', 'transmitido').not('cod_ped_apoio', 'is', null).limit(2000)
  const ids = [...new Set((pes ?? []).map((p: any) => p.cod_ped_apoio))]
  let recebidos = 0
  for (let i = 0; i < ids.length; i += 100) {
    const lote = ids.slice(i, i + 100)
    const resp = desescapar(await chamar(ctx, 'verificarRecebimentoPedido', [['ids', 'string', lote.join(',')], ['unidade', 'long', lab.opcoes?.unidade ?? 0]], { tentativas: 3 }))
    const pedidos = new Set<string>()
    for (const m of resp.matchAll(/'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'/g)) pedidos.add(m[2].trim())
    for (const p of (pes ?? []).filter((x: any) => pedidos.has(x.cod_ped_apoio))) {
      const { data: ok } = await admin.rpc('apoio_integ_status', { _pe: p.id, _novo: 'recebido_apoio', _motivo: 'Amostra recebida pelo apoio' })
      if (ok) recebidos++
    }
  }
  // Cancelamentos que ficaram pendentes (ex.: falha de rede na hora)
  let cancelamentos = null
  try {
    const r = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/apoio-cancelar`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-apoio-cron': (await admin.from('apoio_cron_config').select('token').eq('id', 1).single()).data.token },
      body: JSON.stringify({ apoio_id: lab.id }),
    })
    cancelamentos = await r.json().catch(() => null)
  } catch { /* segue */ }
  return { consultados: ids.length, recebidos, cancelamentos }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const admin = adminClient()
  const quem = await autenticar(req, admin)
  if (quem instanceof Response) return quem
  const body = await req.json().catch(() => ({}))
  const labs = await apoiosAutomaticos(admin, uuidOk(body?.apoio_id) ? body.apoio_id : undefined, quem.companyId)
  const out = await paraCada(admin, labs, 'recebimento', rodar)
  return json({ ok: out.every((o) => o.ok), resultados: out })
})
