// InovaChat 10C: URLs assinadas curtas. 'url' (ver mídia, 5 min) e 'upload' (subir anexo do atendente).
// Permissão e escopo da conversa checados no banco com o login do usuário; o bucket é privado e sem policies.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { BUCKET, MAX_DOCUMENTO, MAX_IMAGEM, validarEnvio } from '../_shared/inovachatMidia.ts'

const resp = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
const uuid = /^[0-9a-f-]{36}$/i

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return resp(405, { ok: false, mensagem: 'Use POST.' })
  const auth = req.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return resp(401, { ok: false, mensagem: 'Faça login novamente.' })
  const url = Deno.env.get('SUPABASE_URL')!
  const userDb = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: cl, error: ce } = await userDb.auth.getClaims(auth.slice(7))
  if (ce || !cl?.claims?.sub) return resp(401, { ok: false, mensagem: 'Faça login novamente.' })
  let b: any
  try { b = await req.json() } catch { return resp(400, { ok: false, mensagem: 'Corpo inválido.' }) }

  if (b?.acao === 'url') {
    const id = String(b?.mensagem_id ?? '')
    if (!uuid.test(id)) return resp(400, { ok: false, mensagem: 'Mensagem inválida.' })
    const { data } = await userDb.rpc('inovachat_midia_acesso', { p_mensagem: id })
    const m = data as any
    if (!m?.path) return resp(404, { ok: false, mensagem: 'Arquivo indisponível.' })
    const { data: s, error } = await db.storage.from(BUCKET).createSignedUrl(m.path, 300, b?.baixar ? { download: m.nome || true } : undefined)
    if (error || !s?.signedUrl) return resp(404, { ok: false, mensagem: 'Arquivo indisponível.' })
    return resp(200, { ok: true, url: s.signedUrl, mime: m.mime })
  }

  if (b?.acao === 'upload') {
    const conversa = String(b?.conversa_id ?? '')
    const nome = String(b?.nome ?? '').slice(0, 200)
    const mime = String(b?.mime ?? '')
    const tamanho = Number(b?.tamanho ?? 0)
    if (!uuid.test(conversa) || !nome) return resp(400, { ok: false, mensagem: 'Dados inválidos.' })
    const v = validarEnvio(nome, mime)
    if (!v.ok || v.cat === 'video') return resp(400, { ok: false, mensagem: 'Tipo de arquivo não permitido.' })
    const limite = v.cat === 'documento' ? MAX_DOCUMENTO : MAX_IMAGEM
    if (!(tamanho > 0) || tamanho > limite) return resp(400, { ok: false, mensagem: `Arquivo acima do limite (${limite / 1048576} MB).` })
    const { data: comp } = await userDb.rpc('inovachat_pode_enviar', { p_conversa: conversa })
    if (!comp) return resp(403, { ok: false, mensagem: 'Você não pode enviar arquivos nesta conversa.' })
    const path = `tmp/${comp}/${crypto.randomUUID()}.${v.ext}`
    const { data: s, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path)
    if (error || !s?.token) return resp(500, { ok: false, mensagem: 'Não foi possível preparar o envio.' })
    return resp(200, { ok: true, path, token: s.token })
  }
  return resp(400, { ok: false, mensagem: 'Ação inválida.' })
})
