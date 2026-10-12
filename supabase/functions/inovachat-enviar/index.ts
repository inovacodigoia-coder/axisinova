// InovaChat 10B/10C: envio de resposta do atendente (texto, imagem, documento ou áudio gravado).
// Validação de permissão/escopo/estado no banco (inovachat_preparar_envio, com o login do usuário); gravação só com service role.
// Sem retry automático. Toda mensagem leva o nome do atendente; no áudio, o nome vai antes numa mensagem de texto.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { decifrar } from '../_shared/whatsappCripto.ts'
import { idMensagem } from '../_shared/whatsappMenu.ts'
import { BUCKET, MAX_AUDIO_SEG, MAX_DOCUMENTO, MAX_IMAGEM, validarEnvio } from '../_shared/inovachatMidia.ts'

const BASE = (Deno.env.get('UAZAPI_BASE_URL') ?? '').replace(/\/+$/, '')
const resp = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
const erro = (status: number, codigo: string, mensagem: string, extra: Record<string, unknown> = {}) =>
  resp(status, { ok: false, codigo, mensagem, ...extra })

async function uaz(method: string, path: string, token: string, body?: unknown) {
  try {
    const r = await fetch(`${BASE}${path}`, {
      method, headers: { 'Content-Type': 'application/json', Accept: 'application/json', token },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(60_000),
    })
    let json: any = null
    try { json = await r.json() } catch { /* sem corpo */ }
    return { status: r.status, json }
  } catch (e) {
    return { status: e instanceof DOMException && e.name === 'TimeoutError' ? 504 : 0, json: null }
  }
}
const motivoFalha = (s: number) => s === 0 || s === 504 ? 'Resultado incerto: confira no celular antes de tentar de novo'
  : s === 401 ? 'Número desconectado' : `O WhatsApp recusou o envio (HTTP ${s})`

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
  const midiaReq = body?.midia && typeof body.midia === 'object' ? body.midia : null
  const uuid = /^[0-9a-f-]{36}$/i
  if (!uuid.test(conversa) || (substituir && !uuid.test(substituir))) return erro(400, 'DADOS_INVALIDOS', 'Conversa inválida.')

  // reenvio de mídia que falhou: dados vêm do banco, não do navegador
  let reenvioMidia: any = null
  if (substituir && body?.midia_retry === true) {
    const { data: m } = await db.from('whatsapp_mensagens').select('id, conversa_id, tipo, texto, midia_path, midia_mime, midia_tamanho, midia_nome, duracao_seg, status, enviada_por_usuario_id')
      .eq('id', substituir).maybeSingle()
    if (!m || m.conversa_id !== conversa || m.status !== 'falha' || !m.midia_path || m.enviada_por_usuario_id !== cl.claims.sub) return erro(400, 'DADOS_INVALIDOS', 'Mensagem inválida.')
    reenvioMidia = m
  }
  const ehMidia = !!midiaReq || !!reenvioMidia
  if (!ehMidia && (texto.length < 1 || texto.length > 4000)) return erro(400, 'DADOS_INVALIDOS', 'A mensagem deve ter de 1 a 4000 caracteres.')
  if (ehMidia && texto.length > 1000) return erro(400, 'DADOS_INVALIDOS', 'A legenda deve ter até 1000 caracteres.')

  // permissão, empresa, escopo, estado, conexão local, limites e assumir atômico — tudo no banco
  const { data: prep, error: pe } = await userDb.rpc('inovachat_preparar_envio', { p_conversa: conversa })
  if (pe) return erro(400, 'ERRO', 'Não foi possível validar a conversa.')
  const p = prep as any
  if (!p?.ok) return erro(p?.codigo === 'LIMITE' ? 429 : p?.codigo === 'SEM_PERMISSAO' ? 403 : 409, p?.codigo ?? 'ERRO', p?.mensagem ?? 'Não foi possível enviar.')

  const { data: seg } = await db.from('whatsapp_instancia_segredos').select('token_instancia_cifrado').eq('instancia_id', p.instancia_id).maybeSingle()
  if (!seg?.token_instancia_cifrado) return erro(409, 'DESCONECTADO', 'Número desconectado: reconecte em Configurações > WhatsApp.')
  const token = await decifrar(seg.token_instancia_cifrado as string)
  const cabecalho = async (corpo: string) => String((await db.rpc('whatsapp_cabecalho', { p_responsavel: p.nome || 'Atendente', p_corpo: corpo })).data ?? '')
  const marcarDesconectado = async (s: number) => {
    if (s === 401 || s === 404) await db.from('whatsapp_instancias').update({ status: 'disconnected', status_atualizado_em: new Date().toISOString() }).eq('id', p.instancia_id)
  }
  const gravarTexto = async (t: string, status: string, msgId: string | null, motivo: string | null, subst: string | null) => {
    const { data } = await db.rpc('inovachat_gravar_envio', {
      p_conversa: conversa, p_usuario: p.usuario_id, p_nome: p.nome, p_texto: t,
      p_status: status, p_message_id: msgId, p_erro: motivo, p_substituir: subst,
    })
    return data as string | null
  }

  // ---------- texto ----------
  if (!ehMidia) {
    const final = await cabecalho(texto)
    if (!final.startsWith('*')) return erro(400, 'SEM_CABECALHO', 'Não foi possível montar o nome do atendente.')
    const r = await uaz('POST', '/send/text', token, { number: String(p.telefone), text: final })
    if (r.status < 200 || r.status >= 300) {
      await marcarDesconectado(r.status)
      const id = await gravarTexto(texto, 'falha', null, motivoFalha(r.status), substituir)
      return erro(200, r.status === 0 || r.status === 504 ? 'RESULTADO_INCERTO' : 'FALHA_ENVIO', motivoFalha(r.status) + '.', { mensagem_id: id })
    }
    const id = await gravarTexto(texto, 'enviada', idMensagem(r.json), null, substituir)
    return resp(200, { ok: true, mensagem_id: id })
  }

  // ---------- mídia ----------
  let path: string, mime: string, tamanho: number, arquivo: string, cat: string, duracao: number | null, legenda: string
  if (reenvioMidia) {
    path = reenvioMidia.midia_path; mime = reenvioMidia.midia_mime; tamanho = Number(reenvioMidia.midia_tamanho ?? 0)
    arquivo = reenvioMidia.midia_nome ?? 'arquivo'; cat = reenvioMidia.tipo; duracao = reenvioMidia.duracao_seg; legenda = reenvioMidia.texto ?? ''
  } else {
    const tmp = String(midiaReq.path ?? '')
    const m = new RegExp(`^tmp/${p.company_id}/[0-9a-f-]{36}\\.([a-z0-9]{2,5})$`).exec(tmp)
    if (!m) return erro(400, 'DADOS_INVALIDOS', 'Arquivo inválido.')
    arquivo = String(midiaReq.nome ?? `arquivo.${m[1]}`).slice(0, 200)
    const pasta = tmp.slice(0, tmp.lastIndexOf('/')), nomeObj = tmp.slice(tmp.lastIndexOf('/') + 1)
    const { data: lst } = await db.storage.from(BUCKET).list(pasta, { search: nomeObj, limit: 1 })
    const obj = (lst ?? []).find((o: any) => o.name === nomeObj) as any
    if (!obj) return erro(400, 'DADOS_INVALIDOS', 'Arquivo não encontrado. Envie de novo.')
    mime = String(obj.metadata?.mimetype ?? '').toLowerCase(); tamanho = Number(obj.metadata?.size ?? 0)
    const v = validarEnvio(`x.${m[1]}`, mime)
    const remover = () => db.storage.from(BUCKET).remove([tmp])
    if (!v.ok || v.cat === 'video') { await remover(); return erro(400, 'TIPO_NAO_PERMITIDO', 'Tipo de arquivo não permitido.') }
    cat = v.cat
    duracao = cat === 'audio' ? Math.round(Number(midiaReq.duracao ?? 0)) : null
    const limite = cat === 'documento' ? MAX_DOCUMENTO : MAX_IMAGEM
    if (!(tamanho > 0) || tamanho > limite) { await remover(); return erro(400, 'GRANDE_DEMAIS', `Arquivo acima do limite (${limite / 1048576} MB).`) }
    if (cat === 'audio' && (!(duracao! > 0) || duracao! > MAX_AUDIO_SEG)) { await remover(); return erro(400, 'AUDIO_LONGO', 'O áudio deve ter até 5 minutos.') }
    legenda = cat === 'audio' ? '' : texto
    path = `${p.company_id}/${conversa}/${crypto.randomUUID()}.${m[1]}`
    const { error: me } = await db.storage.from(BUCKET).move(tmp, path)
    if (me) return erro(500, 'ERRO', 'Não foi possível preparar o arquivo.')
  }
  const gravarMidia = (status: string, msgId: string | null, motivo: string | null) => db.rpc('inovachat_gravar_envio_midia', {
    p_conversa: conversa, p_usuario: p.usuario_id, p_nome: p.nome, p_tipo: cat, p_texto: legenda, p_status: status,
    p_message_id: msgId, p_erro: motivo, p_substituir: reenvioMidia ? substituir : null, p_path: path, p_mime: mime,
    p_tamanho: tamanho, p_arquivo: arquivo, p_duracao: duracao,
  }).then(({ data }) => data as string | null)

  const { data: s } = await db.storage.from(BUCKET).createSignedUrl(path, 600)
  if (!s?.signedUrl) { const id = await gravarMidia('falha', null, 'Arquivo indisponível'); return erro(200, 'FALHA_ENVIO', 'Arquivo indisponível.', { mensagem_id: id }) }

  let caption: string | undefined
  if (cat === 'audio') {
    // áudio não aceita legenda: nome do atendente antes, em texto
    const nomeTxt = await cabecalho('')
    const cab = nomeTxt.trim()
    if (!cab.startsWith('*')) return erro(400, 'SEM_CABECALHO', 'Não foi possível montar o nome do atendente.')
    const r1 = await uaz('POST', '/send/text', token, { number: String(p.telefone), text: cab })
    if (r1.status < 200 || r1.status >= 300) {
      await marcarDesconectado(r1.status)
      const id = await gravarMidia('falha', null, motivoFalha(r1.status))
      return erro(200, 'FALHA_ENVIO', motivoFalha(r1.status) + '.', { mensagem_id: id })
    }
    await gravarTexto(cab, 'enviada', idMensagem(r1.json), null, null)
  } else {
    caption = (await cabecalho(legenda)).replace(/\n$/, '')
    if (!caption.startsWith('*')) return erro(400, 'SEM_CABECALHO', 'Não foi possível montar o nome do atendente.')
  }
  const payload: Record<string, unknown> = {
    number: String(p.telefone), type: cat === 'audio' ? 'ptt' : cat === 'imagem' ? 'image' : 'document', file: s.signedUrl,
  }
  if (caption) payload.text = caption
  if (cat === 'documento') payload.docName = arquivo
  const r = await uaz('POST', '/send/media', token, payload)
  if (r.status < 200 || r.status >= 300) {
    await marcarDesconectado(r.status)
    const id = await gravarMidia('falha', null, motivoFalha(r.status))
    return erro(200, r.status === 0 || r.status === 504 ? 'RESULTADO_INCERTO' : 'FALHA_ENVIO', motivoFalha(r.status) + '.', { mensagem_id: id })
  }
  const id = await gravarMidia('enviada', idMensagem(r.json), null)
  return resp(200, { ok: true, mensagem_id: id })
})
