// Receptor público de eventos da uazapi. Segredo na URL (?s=) + token do payload igual ao de uma instância cadastrada.
// Responde 200 na hora e processa em segundo plano. Nunca loga o payload.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { decifrar } from '../_shared/whatsappCripto.ts'

const SEGREDO = Deno.env.get('WHATSAPP_WEBHOOK_SECRET') ?? ''
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

function igual(a: string, b: string) {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b)
  let d = x.length ^ y.length
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] ?? 0) ^ (y[i] ?? 0)
  return d === 0
}

// Cache curto token → instância (evita decifrar tudo a cada evento)
let cache: { em: number; mapa: Map<string, string> } | null = null
async function instanciaDoToken(token: string): Promise<string | null> {
  if (!cache || Date.now() - cache.em > 60_000) {
    const { data } = await db.from('whatsapp_instancia_segredos').select('instancia_id, token_instancia_cifrado')
    const mapa = new Map<string, string>()
    for (const r of data ?? []) {
      try { mapa.set(await decifrar(r.token_instancia_cifrado as string), r.instancia_id as string) } catch { /* ignora */ }
    }
    cache = { em: Date.now(), mapa }
  }
  for (const [tk, id] of cache.mapa) if (igual(tk, token)) return id
  return null
}

const ORDEM: Record<string, number> = { agendada: 0, enviando: 1, enviada: 2, entregue: 3, lida: 4 }
const MAPA_MSG: Record<string, string> = {
  sent: 'enviada', serverack: 'enviada', delivered: 'entregue', deliveryack: 'entregue',
  read: 'lida', played: 'lida', failed: 'falha', expired: 'falha', canceled: 'falha', cancelled: 'falha',
}

async function processarConexao(instId: string, p: any) {
  const inst = p?.instance ?? {}
  const bruto = String(inst.status ?? p?.status ?? p?.event?.status ?? '').toLowerCase()
  const status = ['connected', 'connecting', 'disconnected', 'hibernated'].includes(bruto) ? bruto
    : (p?.event?.connected === true ? 'connected' : p?.event?.connected === false ? 'disconnected' : null)
  if (!status) return
  const { data: atual } = await db.from('whatsapp_instancias').select('status').eq('id', instId).maybeSingle()
  if (!atual) return
  const agora = new Date().toISOString()
  const upd: Record<string, unknown> = { status, status_atualizado_em: agora }
  if (inst.owner) upd.numero_conectado = String(inst.owner)
  if (inst.profileName !== undefined) upd.nome_perfil = inst.profileName || null
  if (inst.profilePicUrl !== undefined) upd.foto_perfil_url = inst.profilePicUrl || null
  if (inst.lastDisconnectReason !== undefined) upd.ultimo_motivo_desconexao = inst.lastDisconnectReason || null
  if (status === 'connected' && atual.status !== 'connected') upd.conectado_em = agora
  await db.from('whatsapp_instancias').update(upd).eq('id', instId)
}

async function processarMensagem(instId: string, p: any) {
  const ev = p?.event ?? p?.message ?? {}
  const tipo = String(ev.Type ?? ev.type ?? ev.status ?? p?.state ?? '').toLowerCase()
  const novo = MAPA_MSG[tipo]
  if (!novo) return
  const ids: string[] = [...(Array.isArray(ev.MessageIDs) ? ev.MessageIDs : []), ev.MessageID, ev.messageid, ev.id]
    .filter((x) => typeof x === 'string' && x.length > 0 && x.length < 200)
  for (const id of new Set(ids)) {
    // id pode vir com prefixo "numero:" — tenta exato e sufixo
    const cands = [id, id.includes(':') ? id.split(':').pop()! : null].filter(Boolean) as string[]
    const { data: linhas } = await db.from('whatsapp_fila_envios').select('id, status')
      .eq('instancia_id', instId).in('message_id_uazapi', cands)
    for (const l of linhas ?? []) {
      let permitidos: string[]
      if (novo === 'falha') permitidos = ['enviando', 'enviada']
      else permitidos = Object.keys(ORDEM).filter((s) => ORDEM[s] < ORDEM[novo])
      if (!permitidos.includes(l.status)) continue // nunca regride
      const upd: Record<string, unknown> = { status: novo }
      if (novo === 'falha') upd.erro = `uazapi: ${tipo}`
      await db.from('whatsapp_fila_envios').update(upd).eq('id', l.id).in('status', permitidos)
    }
  }
}

async function processar(p: any) {
  try {
    const token = String(p?.token ?? p?.instance?.token ?? '')
    if (!token) return
    const instId = await instanciaDoToken(token)
    if (!instId) { console.warn('webhook: token desconhecido'); return }
    const tipo = String(p?.EventType ?? p?.type ?? p?.event_type ?? '').toLowerCase()
    if (tipo === 'connection') await processarConexao(instId, p)
    else if (tipo === 'messages_update') await processarMensagem(instId, p)
  } catch (e) {
    console.error('webhook: erro ao processar', e instanceof Error ? e.message : 'desconhecido')
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('método', { status: 405 })
  const s = new URL(req.url).searchParams.get('s') ?? ''
  if (!SEGREDO || !s || !igual(s, SEGREDO)) return new Response('não autorizado', { status: 401 })
  let p: any
  try { p = await req.json() } catch { return new Response('ok', { status: 200 }) }
  const token = String(p?.token ?? p?.instance?.token ?? '')
  // token desconhecido é rejeitado (checagem rápida, com cache)
  if (!token || !(await instanciaDoToken(token))) return new Response('não autorizado', { status: 401 })
  // @ts-ignore EdgeRuntime existe no runtime do Supabase
  EdgeRuntime.waitUntil(processar(p))
  return new Response('ok', { status: 200 })
})
