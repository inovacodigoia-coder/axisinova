// InovaChat 10C: baixa mídias recebidas (POST /message/download) e guarda no bucket privado.
// Chamado pelo pg_cron (inovachat_midia_tick) só quando há pendências; autenticação por código de uso único com hash.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { decifrar } from '../_shared/whatsappCripto.ts'
import { BUCKET, MAX_RECEBIDA, extDoMime } from '../_shared/inovachatMidia.ts'

const BASE = (Deno.env.get('UAZAPI_BASE_URL') ?? '').replace(/\/+$/, '')
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

type Item = { id: string; company_id: string; conversa_id: string; instancia_id: string; message_id_uazapi: string; tipo: string; midia_mime: string | null; midia_nome: string | null; tentativas: number }

async function baixarLimitado(url: string): Promise<{ bytes: Uint8Array; mime: string } | 'grande' | null> {
  const r = await fetch(url, { signal: AbortSignal.timeout(60_000) })
  if (!r.ok || !r.body) return null
  const len = Number(r.headers.get('content-length') ?? 0)
  if (len > MAX_RECEBIDA) { await r.body.cancel(); return 'grande' }
  const partes: Uint8Array[] = []; let total = 0
  const reader = r.body.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > MAX_RECEBIDA) { await reader.cancel(); return 'grande' }
    partes.push(value)
  }
  const out = new Uint8Array(total); let o = 0
  for (const p of partes) { out.set(p, o); o += p.length }
  return { bytes: out, mime: r.headers.get('content-type') ?? '' }
}

Deno.serve(async (req) => {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const h = req.headers.get('x-worker-secret') ?? ''
  if (!/^[0-9a-f]{64}$/.test(h)) return json(401, { ok: false })
  const { data: ok } = await db.rpc('whatsapp_worker_consumir_token', { p_token: h })
  if (ok !== true) return json(401, { ok: false })
  if (!BASE) return json(500, { ok: false })

  const { data, error } = await db.rpc('inovachat_midia_reservar', { p_limite: 5 })
  if (error) return json(500, { ok: false })
  const itens = (data ?? []) as Item[]
  const tokens = new Map<string, string>()
  const c = { baixadas: 0, falhas: 0, grandes: 0 }

  for (const it of itens) {
    const upd = async (patch: Record<string, unknown>) => {
      await db.from('whatsapp_mensagens').update({ ...patch, midia_reservada_em: null }).eq('id', it.id)
      await db.rpc('inovachat_sinal', { _conv: it.conversa_id })
    }
    const falhar = async (motivo: string) => {
      c.falhas++
      await upd(it.tentativas >= 3 ? { midia_status: 'falha', midia_erro: motivo } : { midia_erro: motivo })
    }
    try {
      let token = tokens.get(it.instancia_id)
      if (!token) {
        const { data: seg } = await db.from('whatsapp_instancia_segredos').select('token_instancia_cifrado').eq('instancia_id', it.instancia_id).maybeSingle()
        if (!seg?.token_instancia_cifrado) { await falhar('Número sem credencial'); continue }
        token = await decifrar(seg.token_instancia_cifrado as string); tokens.set(it.instancia_id, token)
      }
      const r = await fetch(`${BASE}/message/download`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', token },
        body: JSON.stringify({ id: it.message_id_uazapi, return_link: true, return_base64: false, generate_mp3: true }),
        signal: AbortSignal.timeout(45_000),
      })
      let j: any = null
      try { j = await r.json() } catch { /* */ }
      const url = j?.fileURL ?? j?.fileUrl ?? j?.url
      if (!r.ok || typeof url !== 'string') { await falhar(`Download recusado (HTTP ${r.status})`); continue }
      const arq = await baixarLimitado(url)
      if (arq === 'grande') { c.grandes++; await upd({ midia_status: 'grande_demais' }); continue }
      if (!arq) { await falhar('Arquivo indisponível'); continue }
      const mime = String(j?.mimetype || arq.mime || it.midia_mime || '').split(';')[0].trim().toLowerCase()
      const ext = extDoMime(mime) ?? extDoMime(it.midia_mime ?? '')
      if (!ext) { await upd({ midia_status: 'nao_suportado', midia_mime: mime }); continue }
      const seguro = it.message_id_uazapi.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120)
      const path = `${it.company_id}/${it.conversa_id}/${seguro}.${ext}`
      const { error: ue } = await db.storage.from(BUCKET).upload(path, arq.bytes, { contentType: mime || 'application/octet-stream', upsert: true })
      if (ue) { await falhar('Falha ao guardar o arquivo'); continue }
      c.baixadas++
      await upd({ midia_status: 'baixada', midia_path: path, midia_mime: mime, midia_tamanho: arq.bytes.length, midia_erro: null })
    } catch (e) {
      await falhar(e instanceof DOMException && e.name === 'TimeoutError' ? 'Tempo esgotado' : 'Erro no download')
    }
  }
  return json(200, { ok: true, reservadas: itens.length, ...c })
})
