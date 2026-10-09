// InovaChat 10B: envio de resposta do atendente. Validação de permissão/escopo/estado no banco
// (inovachat_preparar_envio, com o login do usuário); gravação só com service role. Sem retry automático.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { decifrar } from '../_shared/whatsappCripto.ts'
import { idMensagem } from '../_shared/whatsappMenu.ts'

const BASE = (Deno.env.get('UAZAPI_BASE_URL') ?? '').replace(/\/+$/, '')
const resp = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
const erro = (status: number, codigo: string, mensagem: string, extra: Record<string, unknown> = {}) =>
  resp(status, { ok: false, codigo, mensagem, ...extra })

async function uaz(method: string, path: string, token: string, body?: unknown) {
  try {
    const r = await fetch(`${BASE}${path}`, {
      method, headers: { 'Content-Type': 'application/json', Accept: 'application/json', token },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30_000),
    })
    let json: any = null
    try { json = await r.json() } catch { /* sem corpo */ }
    return { status: r.status, json }
  } catch (e) {
    return { status: e instanceof DOMException && e.name === 'TimeoutError' ? 504 : 0, json: null }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return erro(405, 'METODO', 'Use POST.')
  if (!BASE || !Deno.env.get('WHATSAPP_TOKEN_KEY')) return erro(500, 'NAO_CONFIGURADO', 'WhatsApp sem configuração no servidor.')
  const auth = req.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return erro(401, 'NAO_AUTENTICADO', 'Faça login novamente.')
  const url = Deno.env.get('SUPABASE_URL')!
  const userDb = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: cl, error: ce } = await userDb.auth.getClaims(auth.slice(7))
  if (ce || !cl?.claims?.sub) return erro(401, 'NAO_AUTENTICADO', 'Faça login novamente.')

  let body: any
  try { body = await req.json() } catch { return erro(400, 'DADOS_INVALIDOS', 'Corpo inválido.') }
  const conversa = String(body?.conversa_id ?? '')
  const substituir = body?.substituir_id ? String(body.substituir_id) : null
  const texto = typeof body?.texto === 'string' ? body.texto.replace(/\r\n/g, '\n').trim() : ''
  const uuid = /^[0-9a-f-]{36}$/i
  if (!uuid.test(conversa) || (substituir && !uuid.test(substituir))) return erro(400, 'DADOS_INVALIDOS', 'Conversa inválida.')
  if (texto.length < 1 || texto.length > 4000) return erro(400, 'DADOS_INVALIDOS', 'A mensagem deve ter de 1 a 4000 caracteres.')

  // permissão, empresa, escopo, estado, conexão local, limites e assumir atômico — tudo no banco
  const { data: prep, error: pe } = await userDb.rpc('inovachat_preparar_envio', { p_conversa: conversa })
  if (pe) return erro(400, 'ERRO', 'Não foi possível validar a conversa.')
  const p = prep as any
  if (!p?.ok) return erro(p?.codigo === 'LIMITE' ? 429 : p?.codigo === 'SEM_PERMISSAO' ? 403 : 409, p?.codigo ?? 'ERRO', p?.mensagem ?? 'Não foi possível enviar.')

  const gravar = async (status: string, msgId: string | null, motivo: string | null) => {
    const { data } = await db.rpc('inovachat_gravar_envio', {
      p_conversa: conversa, p_usuario: p.usuario_id, p_nome: p.nome, p_texto: texto,
      p_status: status, p_message_id: msgId, p_erro: motivo, p_substituir: substituir,
    })
    return data as string | null
  }

  const { data: seg } = await db.from('whatsapp_instancia_segredos').select('token_instancia_cifrado').eq('instancia_id', p.instancia_id).maybeSingle()
  if (!seg?.token_instancia_cifrado) return erro(409, 'DESCONECTADO', 'Número desconectado: reconecte em Configurações > WhatsApp.')
  const token = await decifrar(seg.token_instancia_cifrado as string)

  const { data: cab } = await db.rpc('whatsapp_cabecalho', { p_responsavel: p.nome || 'Atendente', p_corpo: texto })
  const final = String(cab ?? `*Atendente*:\n${texto}`)
  if (!final.startsWith('*')) return erro(400, 'SEM_CABECALHO', 'Não foi possível montar o nome do atendente.')

  const r = await uaz('POST', '/send/text', token, { number: String(p.telefone), text: final })
  if (r.status === 0 || r.status === 504) {
    const id = await gravar('falha', null, 'Resultado incerto: confira no celular antes de tentar de novo')
    return erro(200, 'RESULTADO_INCERTO', 'Resultado incerto: confira no celular antes de tentar de novo.', { mensagem_id: id })
  }
  if (r.status < 200 || r.status >= 300) {
    if (r.status === 401 || r.status === 404) {
      await db.from('whatsapp_instancias').update({ status: 'disconnected', status_atualizado_em: new Date().toISOString() }).eq('id', p.instancia_id)
    }
    const id = await gravar('falha', null, r.status === 401 ? 'Número desconectado' : `O WhatsApp recusou o envio (HTTP ${r.status})`)
    return erro(200, 'FALHA_ENVIO', r.status === 401 ? 'Número desconectado: reconecte em Configurações > WhatsApp.' : 'O WhatsApp não aceitou a mensagem.', { mensagem_id: id })
  }
  const id = await gravar('enviada', idMensagem(r.json), null)
  return resp(200, { ok: true, mensagem_id: id })
})
