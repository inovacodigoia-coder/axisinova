// Receptor público de eventos da uazapi. Segredo na URL (?s=) + token do payload igual ao de uma instância cadastrada.
// Responde 200 na hora e processa em segundo plano. Nunca loga o payload.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { decifrar } from '../_shared/whatsappCripto.ts'
import { MAX_RECEBIDA, extDoMime } from '../_shared/inovachatMidia.ts'

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
    // InovaChat: status das mensagens enviadas pelo celular (as do sistema seguem pela fila)
    if (novo !== 'enviada') await db.rpc('inovachat_status', { p_instancia: instId, p_ids: cands, p_status: novo })
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

// ---------- Respostas do paciente às confirmações (Etapa 9B) ----------
const PALAVRAS: Record<string, 'confirmar' | 'remarcar' | 'cancelar'> = {
  '1': 'confirmar', '2': 'remarcar', '3': 'cancelar',
  confirmar: 'confirmar', confirmo: 'confirmar', sim: 'confirmar', remarcar: 'remarcar', cancelar: 'cancelar',
}
const normalizar = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[.!?,;:\s]+$/, '')
const digitos = (jid: unknown) => typeof jid === 'string' && !jid.endsWith('@lid') ? jid.split('@')[0].split(':')[0].replace(/\D/g, '') : ''

type Motivo = 'processada' | 'proprio_numero' | 'grupo' | 'sem_acao' | 'formato_desconhecido' | 'sem_telefone'

async function diagnosticar(instId: string, p: any, m: any, tipoResp: string, textoLen: number, motivo: Motivo, bid: string) {
  try {
    const chaves = Object.keys(m ?? {}).sort()
    const mt = String(m?.messageType ?? '').slice(0, 60)
    // formato inclui motivo e hora para que cada ocorrência relevante apareça (sem conteúdo nem telefone)
    const minuto = new Date().toISOString().slice(0, 16)
    const formato = `${motivo}|${tipoResp}|${mt}|${minuto}|${chaves.join(',')}`.slice(0, 1000)
    await db.from('whatsapp_webhook_diagnostico').delete().lt('criado_em', new Date(Date.now() - 7 * 864e5).toISOString())
    await db.from('whatsapp_webhook_diagnostico').upsert({
      instancia_id: instId, formato, chaves: [...Object.keys(p ?? {}).sort().map((k) => `raiz.${k}`), ...chaves],
      message_type: mt || null,
      // só o prefixo da ação (nunca o código completo)
      button_or_listid: bid ? bid.split(':')[0].slice(0, 30) : null,
      tamanho_texto: textoLen, motivo,
    }, { onConflict: 'formato', ignoreDuplicates: true })
  } catch { /* diagnóstico nunca bloqueia */ }
}

const str = (v: unknown) => (typeof v === 'string' ? v : '')

/** Lê o id do botão em todos os campos conhecidos da uazapi/WhatsApp. */
function idDoBotao(m: any): string {
  const c = m?.content ?? {}
  return (str(m?.buttonOrListid) || str(c?.selectedButtonId) || str(c?.buttonId) || str(c?.selectedId)
    || str(c?.singleSelectReply?.selectedRowId) || str(m?.vote)).trim()
}
function textoDe(m: any): string {
  const c = m?.content
  return str(m?.text) || (typeof c === 'string' ? c : str(c?.text) || str(c?.selectedDisplayText) || str(c?.Conversation))
}

// ---------- InovaChat (Etapa 10A): grava a conversa quando a empresa tem o módulo ligado ----------
function tipoMidia(m: any): string {
  const mt = String(m?.mediaType ?? m?.messageType ?? '').toLowerCase()
  if (/reaction|edited|protocol/.test(mt)) return 'ignorar'
  if (/location/.test(mt)) return 'localizacao'
  if (/contact/.test(mt)) return 'contato'
  if (/poll/.test(mt)) return 'enquete'
  if (/audio|ptt/.test(mt)) return 'audio'
  if (/sticker/.test(mt)) return 'figurinha'
  if (/image/.test(mt)) return 'imagem'
  if (/video/.test(mt)) return 'video'
  if (/document/.test(mt)) return 'documento'
  if (!mt || /conversation|text|button|list|template|interactive/.test(mt)) return 'texto'
  return 'outro'
}
const MARCADOR: Record<string, string> = { localizacao: 'Localização recebida', contato: 'Contato recebido', enquete: 'Enquete recebida' }
const MIDIAS = new Set(['audio', 'figurinha', 'imagem', 'video', 'documento', 'outro'])

async function inovachatGravar(instId: string, p: any, m: any, texto: string, msgId: string) {
  try {
    const chat = String(m.chatid ?? '')
    const deMim = m.fromMe === true
    const tel = deMim
      ? (digitos(chat) || digitos(p?.chat?.wa_chatid) || digitos(p?.chat?.phone))
      : (digitos(m.sender_pn) || digitos(chat) || digitos(m.sender) || digitos(p?.chat?.wa_chatid))
    if (!tel) { await db.rpc('inovachat_ignorar', { p_instancia: instId, p_motivo: 'sem_telefone' }); return }
    let tipo = tipoMidia(m)
    if (tipo === 'ignorar') return // reações e edições
    let txt: string | null
    if (MARCADOR[tipo]) { txt = MARCADOR[tipo]; tipo = 'texto' }
    else txt = tipo === 'texto' ? (texto || null) : (str(m?.content?.caption) || str(m?.caption) || null)
    const ts = Number(m.messageTimestamp ?? 0)
    const quando = ts > 0 ? new Date(ts < 1e12 ? ts * 1000 : ts).toISOString() : new Date().toISOString()
    const { data, error } = await db.rpc('inovachat_registrar', {
      p_instancia: instId, p_message_id: msgId, p_telefone: tel,
      p_nome: deMim ? null : (str(m.senderName) || str(p?.chat?.wa_name) || null),
      p_direcao: deMim ? 'saida' : 'entrada', p_origem: deMim ? 'usuario' : 'paciente', p_tipo: tipo,
      p_texto: txt,
      p_citada: typeof m.quoted === 'string' ? m.quoted : null,
      p_enviada_por_nome: deMim ? 'Enviado pelo celular' : null, p_status: deMim ? 'enviada' : null, p_criado_em: quando,
    })
    if (error) { console.error('inovachat: falha ao gravar', error.message); return }
    if (data === 'gravada' && MIDIAS.has(tipo)) {
      const c = typeof m?.content === 'object' && m.content ? m.content : {}
      const mime = String(c.mimetype ?? c.mimeType ?? m.mimetype ?? '').split(';')[0].trim().toLowerCase()
      const tam = Number(c.fileLength ?? c.fileSize ?? m.fileLength ?? 0) || null
      const seg = Number(c.seconds ?? c.duration ?? 0) || null
      const nome = str(c.fileName) || str(c.title) || str(m.fileName) || null
      const suportado = tipo !== 'outro' && (!mime || !!extDoMime(mime))
      const status = !suportado ? 'nao_suportado' : (tam && tam > MAX_RECEBIDA ? 'grande_demais' : 'pendente')
      await db.rpc('inovachat_midia_marcar', { p_instancia: instId, p_message_id: msgId, p_mime: mime || null, p_tamanho: tam, p_nome: nome, p_duracao: seg, p_status: status })
      // acorda o baixador na hora (sem polling); o agendador de hora em hora só repete as que falharam
      if (status === 'pendente') await db.rpc('inovachat_midia_tick', {
        p_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/inovachat-midia-worker`, p_apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '' })
    }
    if (data !== 'gravada' && data !== 'duplicada' && data !== 'desligado') await db.rpc('inovachat_ignorar', { p_instancia: instId, p_motivo: String(data) })
    return data === 'gravada' ? tel : undefined
  } catch { /* nunca bloqueia a resposta da confirmação */ }
}

// ---------- Fora do horário (Etapa 10C): no máximo 1 por contato a cada 12h, decidido no banco ----------
async function foraDoHorario(instId: string, tel: string, ehConfirmacao: boolean) {
  try {
    const { data } = await db.rpc('inovachat_fora_horario_avaliar', { p_instancia: instId, p_telefone: tel, p_eh_confirmacao: ehConfirmacao })
    const r = data as any
    if (!r?.enviar) return
    const { data: seg } = await db.from('whatsapp_instancia_segredos').select('token_instancia_cifrado').eq('instancia_id', instId).maybeSingle()
    const base = (Deno.env.get('UAZAPI_BASE_URL') ?? '').replace(/\/+$/, '')
    if (!seg?.token_instancia_cifrado || !base) return
    const token = await decifrar(seg.token_instancia_cifrado as string)
    const delay = 3000 + Math.floor(Math.random() * 5001)
    const resp = await fetch(`${base}/send/text`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', token },
      body: JSON.stringify({ number: r.telefone, text: r.texto, delay, track_source: 'axis_fora_horario' }),
      signal: AbortSignal.timeout(30_000),
    })
    let b: any = null
    try { b = await resp.json() } catch { /* */ }
    const id = b?.messageid ?? b?.id ?? b?.key?.id
    await db.rpc('inovachat_registrar', {
      p_instancia: instId, p_message_id: id ? String(id) : `local-${crypto.randomUUID()}`, p_telefone: r.telefone, p_nome: null,
      p_direcao: 'saida', p_origem: 'sistema', p_tipo: 'texto', p_texto: r.texto, p_citada: null,
      p_enviada_por_nome: 'Fora do horário', p_status: resp.ok ? 'enviada' : 'falha', p_criado_em: new Date().toISOString(),
    })
  } catch { /* sem nova tentativa automática */ }
}

async function processarRecebida(instId: string, p: any) {
  const m = p?.message ?? {}
  const chat = String(m.chatid ?? '')
  const bid = idDoBotao(m)
  const texto = textoDe(m)
  // só diagnostica o que parece resposta de confirmação (botão ou texto curto), nunca conversas comuns
  const pareceResposta = !!bid || (texto.length > 0 && texto.length <= 30)
  const descartar = async (motivo: Motivo) => { if (pareceResposta) await diagnosticar(instId, p, m, '-', texto.length, motivo, bid) }

  const grupo = m.isGroup === true || p?.chat?.wa_isGroup === true || chat.endsWith('@g.us') || chat.endsWith('@newsletter') || chat.endsWith('@broadcast')
  const msgIdIC = String(m.messageid ?? m.id ?? '')
  if (grupo) { await db.rpc('inovachat_ignorar', { p_instancia: instId, p_motivo: 'grupo' }); }
  // mensagens enviadas pelo próprio sistema (API) já são gravadas pela fila
  else if (m.wasSentByApi !== true && msgIdIC && msgIdIC.length <= 200) {
    const telIC = await inovachatGravar(instId, p, m, texto, msgIdIC)
    if (telIC && m.fromMe !== true) {
      const ehConf = /^(confirmar|remarcar|cancelar):/i.test(bid) || (texto.length > 0 && texto.length <= 30 && !!PALAVRAS[normalizar(texto)])
      await foraDoHorario(instId, telIC, ehConf)
    }
  }

  if (m.fromMe === true || m.wasSentByApi === true) return descartar('proprio_numero')
  if (grupo) return descartar('grupo')
  const msgId = String(m.messageid ?? m.id ?? '')
  if (!msgId || msgId.length > 200) return descartar('formato_desconhecido')

  let acao: 'confirmar' | 'remarcar' | 'cancelar' | null = null
  let tipoResp: 'botao' | 'numero' | 'palavra' | null = null
  let codigo: string | null = null
  const b = /^(confirmar|remarcar|cancelar):([A-Za-z0-9]{6,12})$/i.exec(bid)
  if (b) { acao = b[1].toLowerCase() as any; codigo = b[2].toUpperCase(); tipoResp = 'botao' }
  else if (texto && texto.length <= 30) {
    const n = normalizar(texto)
    if (PALAVRAS[n]) { acao = PALAVRAS[n]; tipoResp = bid ? 'botao' : /^[123]$/.test(n) ? 'numero' : 'palavra' }
  }
  if (!acao || !tipoResp) return descartar(bid ? 'formato_desconhecido' : 'sem_acao')

  const tel = digitos(m.sender_pn) || digitos(chat) || digitos(m.sender)
  if (!tel) { await diagnosticar(instId, p, m, tipoResp, texto.length, 'sem_telefone', bid); return }
  await diagnosticar(instId, p, m, tipoResp, texto.length, 'processada', bid)
  const quoted = typeof m.quoted === 'string' ? m.quoted : ''
  const { data: r, error } = await db.rpc('whatsapp_resposta_processar', {
    p_instancia: instId, p_message_id: msgId, p_telefone: tel, p_tipo_resposta: tipoResp, p_acao: acao, p_codigo: codigo, p_quoted: quoted || null,
  })
  if (error) { console.error('webhook: falha ao registrar resposta', error.message); return }
  if (!(r as any)?.enviar) return
  const { fila_id, telefone, texto: resposta } = r as any
  const agora = () => new Date().toISOString()
  try {
    const { data: seg } = await db.from('whatsapp_instancia_segredos').select('token_instancia_cifrado').eq('instancia_id', instId).maybeSingle()
    const token = seg ? await decifrar(seg.token_instancia_cifrado as string) : ''
    const base = (Deno.env.get('UAZAPI_BASE_URL') ?? '').replace(/\/+$/, '')
    if (!token || !base) throw new Error('SEM_CREDENCIAL')
    const delay = 3000 + Math.floor(Math.random() * 5001)
    const resp = await fetch(`${base}/send/text`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', token },
      body: JSON.stringify({ number: telefone, text: resposta, delay, track_source: 'axis_resposta', track_id: fila_id }),
      signal: AbortSignal.timeout(30_000),
    })
    let body: any = null
    try { body = await resp.json() } catch { /* sem corpo */ }
    if (resp.ok) {
      const id = body?.messageid ?? body?.id ?? body?.key?.id ?? null
      await db.from('whatsapp_fila_envios').update({ status: 'enviada', enviada_em: agora(), message_id_uazapi: id == null ? null : String(id), atualizado_em: agora() }).eq('id', fila_id)
      await db.from('whatsapp_instancias').update({ ultimo_envio_em: agora() }).eq('id', instId)
    } else {
      await db.from('whatsapp_fila_envios').update({ status: 'falha', erro: `HTTP ${resp.status}: ${String(body?.error ?? body?.message ?? '').slice(0, 200)}`, atualizado_em: agora() }).eq('id', fila_id)
    }
  } catch (e) {
    // sem nova tentativa automática
    await db.from('whatsapp_fila_envios').update({ status: 'falha', erro: e instanceof Error && e.message === 'SEM_CREDENCIAL' ? 'SEM_CREDENCIAL' : 'RESULTADO_INCERTO', atualizado_em: agora() }).eq('id', fila_id)
  }
}

async function processar(p: any) {
  try {
    const token = String(p?.token ?? p?.instance?.token ?? '')
    if (!token) return
    const instId = await instanciaDoToken(token)
    if (!instId) { console.warn('webhook: token desconhecido'); return }
    const tipo = String(p?.EventType ?? p?.type ?? p?.event_type ?? p?.event ?? '').toLowerCase()
    // só o tipo do evento (sem conteúdo nem telefone), para diagnóstico
    console.log('webhook: evento', tipo || '(vazio)', p?.message ? 'com_message' : 'sem_message')
    if (tipo === 'connection') await processarConexao(instId, p)
    else if (tipo === 'messages_update' || tipo === 'message_update') await processarMensagem(instId, p)
    else if (tipo === 'messages' || tipo === 'message' || tipo === 'messages_upsert') await processarRecebida(instId, p)
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
