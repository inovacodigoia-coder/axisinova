// Ponte servidor ↔ uazapi. O navegador nunca fala com a uazapi nem vê tokens.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const BASE = (Deno.env.get('UAZAPI_BASE_URL') ?? '').replace(/\/+$/, '')
const ADMIN = Deno.env.get('UAZAPI_ADMIN_TOKEN') ?? ''
const LIMITE_SERVIDOR = 100
const ALERTA_ACIMA = 80

type R = { ok: boolean; codigo?: string; mensagem?: string; dados?: unknown }
const resp = (status: number, body: R) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
const erro = (status: number, codigo: string, mensagem: string) => resp(status, { ok: false, codigo, mensagem })

// ---------- cifra AES-GCM do token da instância ----------
import { cifrar, decifrar } from '../_shared/whatsappCripto.ts'

// ---------- chamada à uazapi (uma tentativa, sem repetição) ----------
async function uaz(method: string, path: string, headers: Record<string, string>, body?: unknown) {
  try {
    const r = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    })
    let json: any = null
    try { json = await r.json() } catch { /* sem corpo */ }
    return { status: r.status, json, retryAfter: r.headers.get('Retry-After') }
  } catch (e) {
    const timeout = e instanceof DOMException && e.name === 'TimeoutError'
    return { status: timeout ? 504 : 0, json: null, retryAfter: null }
  }
}
function erroUaz(status: number, retryAfter: string | null) {
  if (status === 429 || status === 503)
    return erro(503, 'SERVIDOR_OCUPADO', `Servidor do WhatsApp ocupado. Tente de novo${retryAfter ? ` em ${retryAfter} s` : ' em instantes'}.`)
  // 401 da uazapi é sobre a chave do número, não sobre o login: responde 200 com ok:false para a tela tratar.
  if (status === 401) return erro(200, 'TOKEN_INSTANCIA_INVALIDO', 'A chave deste número não vale mais. Remova e crie o número de novo.')
  if (status === 403) return erro(403, 'UAZAPI_RECUSOU', 'O servidor do WhatsApp recusou a operação.')
  if (status === 404) return erro(404, 'NAO_CONFIGURADA', 'Este número não existe mais no servidor do WhatsApp.')
  if (status === 409) return erro(409, 'EM_ANDAMENTO', 'Já existe uma conexão em andamento para este número.')
  if (status === 400) return erro(400, 'DADOS_INVALIDOS', 'O servidor do WhatsApp não aceitou os dados enviados.')
  if (status === 504) return erro(504, 'SEM_RESPOSTA', 'O servidor do WhatsApp não respondeu a tempo. Nada foi repetido.')
  if (status === 0) return erro(502, 'SEM_CONEXAO', 'Não foi possível falar com o servidor do WhatsApp (internet ou servidor fora do ar).')
  return erro(502, 'ERRO_SERVIDOR', 'O servidor do WhatsApp teve um erro. Tente de novo mais tarde.')
}

const mapStatus = (j: any) => {
  const inst = j?.instance ?? {}
  const s = String(inst.status ?? j?.status?.state ?? (j?.status?.connected ? 'connected' : 'disconnected'))
  return {
    status: ['connected', 'connecting', 'disconnected'].includes(s) ? s : 'disconnected',
    numero_conectado: inst.owner ?? (j?.status?.jid ? String(j.status.jid).split(/[:@]/)[0] : null),
    nome_perfil: inst.profileName ?? null,
    foto_perfil_url: inst.profilePicUrl ?? null,
    ultimo_motivo_desconexao: inst.lastDisconnectReason ?? null,
    qrcode: inst.qrcode ?? null,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return erro(405, 'METODO', 'Use POST.')
  if (!BASE || !ADMIN || !Deno.env.get('WHATSAPP_TOKEN_KEY')) return erro(500, 'NAO_CONFIGURADO', 'Integração do WhatsApp sem configuração no servidor.')

  const auth = req.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return erro(401, 'NAO_AUTENTICADO', 'Faça login novamente.')
  const url = Deno.env.get('SUPABASE_URL')!
  const userDb = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: cl, error: ce } = await userDb.auth.getClaims(auth.slice(7))
  if (ce || !cl?.claims?.sub) return erro(401, 'NAO_AUTENTICADO', 'Faça login novamente.')
  const userId = cl.claims.sub as string

  let body: any
  try { body = await req.json() } catch { return erro(400, 'DADOS_INVALIDOS', 'Corpo da requisição inválido.') }
  const acao = String(body?.acao ?? '')

  const { data: perfil } = await db.from('profiles').select('company_id, role').eq('id', userId).maybeSingle()
  const superAdmin = perfil?.role === 'super_admin'
  const audit = (company_id: string, a: string, antes: unknown, depois: unknown) =>
    db.from('whatsapp_auditoria').insert({ company_id, acao: a, antes, depois, usuario_id: userId })

  const tokenDe = async (id: string) => {
    const { data } = await db.from('whatsapp_instancia_segredos').select('token_instancia_cifrado').eq('instancia_id', id).maybeSingle()
    return data?.token_instancia_cifrado ? await decifrar(data.token_instancia_cifrado as string) : null
  }
  const desconectarUma = async (inst: any) => {
    const tk = await tokenDe(inst.id)
    const r = tk ? await uaz('POST', '/instance/disconnect', { token: tk }, {}) : { status: 404, json: null, retryAfter: null }
    if (r.status >= 200 && r.status < 300 || r.status === 404 || r.status === 401) {
      await db.from('whatsapp_instancias').update({ status: 'disconnected', status_atualizado_em: new Date().toISOString() }).eq('id', inst.id)
      return true
    }
    return false
  }

  // ---------- ações do Super Admin (não dependem da empresa do perfil) ----------
  if (acao === 'desconectar_empresa' || acao === 'remover_numero') {
    if (!superAdmin) return erro(403, 'SEM_PERMISSAO', 'Apenas o Super Admin.')
    if (acao === 'desconectar_empresa') {
      const company = String(body?.company_id ?? '')
      if (!/^[0-9a-f-]{36}$/i.test(company)) return erro(400, 'DADOS_INVALIDOS', 'Empresa inválida.')
      const { data: insts } = await db.from('whatsapp_instancias').select('id').eq('company_id', company)
      let falhas = 0
      for (const i of insts ?? []) if (!(await desconectarUma(i))) falhas++
      await audit(company, 'desconectar_empresa', null, { total: insts?.length ?? 0, falhas })
      return resp(200, { ok: falhas === 0, codigo: falhas ? 'DESCONEXAO_PARCIAL' : undefined,
        mensagem: falhas ? `${falhas} número(s) não puderam ser desconectados.` : undefined, dados: { total: insts?.length ?? 0, falhas } })
    }
    const id = String(body?.instancia_id ?? '')
    const { data: inst } = await db.from('whatsapp_instancias').select('*').eq('id', id).maybeSingle()
    if (!inst) return erro(404, 'NAO_ENCONTRADA', 'Número não encontrado.')
    const tk = await tokenDe(id)
    if (tk) {
      const r = await uaz('DELETE', '/instance', { token: tk })
      if (!(r.status >= 200 && r.status < 300) && r.status !== 404 && r.status !== 401) return erroUaz(r.status, r.retryAfter)
    }
    await db.from('whatsapp_instancia_segredos').delete().eq('instancia_id', id)
    await db.from('whatsapp_instancias').delete().eq('id', id)
    await audit(inst.company_id, 'remover_numero', { apelido: inst.apelido, nome_instancia: inst.nome_instancia }, null)
    return resp(200, { ok: true })
  }

  // ---------- ações da empresa ----------
  const companyId = perfil?.company_id as string | null
  if (!companyId) return erro(403, 'SEM_EMPRESA', 'Usuário sem empresa.')
  const { data: perm } = await userDb.rpc('whatsapp_tem_permissao', { _perm: 'configuracoes.whatsapp' })
  if (!perm) return erro(403, 'SEM_PERMISSAO', 'Seu perfil não pode configurar o WhatsApp.')
  const { data: emp } = await db.from('companies').select('whatsapp_habilitado, whatsapp_numeros_autorizados').eq('id', companyId).maybeSingle()
  if (!emp?.whatsapp_habilitado) return erro(403, 'WHATSAPP_NAO_LIBERADO', 'O WhatsApp não está liberado para esta empresa.')

  const instDaEmpresa = async () => {
    const id = String(body?.instancia_id ?? '')
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null
    const { data } = await db.from('whatsapp_instancias').select('*').eq('id', id).eq('company_id', companyId).maybeSingle()
    return data
  }

  const atualizarStatus = async (inst: any) => {
    const tk = await tokenDe(inst.id)
    if (!tk) {
      await db.from('whatsapp_instancias').update({ status: 'nao_configurada', status_atualizado_em: new Date().toISOString() }).eq('id', inst.id)
      return { id: inst.id, ok: false, codigo: 'NAO_CONFIGURADA' }
    }
    const r = await uaz('GET', '/instance/status', { token: tk })
    if (r.status === 404) {
      await db.from('whatsapp_instancias').update({ status: 'nao_configurada', status_atualizado_em: new Date().toISOString() }).eq('id', inst.id)
      return { id: inst.id, ok: false, codigo: 'NAO_CONFIGURADA' }
    }
    if (r.status === 401) return { id: inst.id, ok: false, codigo: 'TOKEN_INSTANCIA_INVALIDO' }
    if (r.status < 200 || r.status >= 300) return { id: inst.id, ok: false, codigo: 'ERRO_SERVIDOR', http: r.status }
    const m = mapStatus(r.json)
    const agora = new Date().toISOString()
    const upd: Record<string, unknown> = {
      status: m.status, numero_conectado: m.numero_conectado, nome_perfil: m.nome_perfil,
      foto_perfil_url: m.foto_perfil_url, ultimo_motivo_desconexao: m.ultimo_motivo_desconexao, status_atualizado_em: agora,
    }
    if (m.status === 'connected' && inst.status !== 'connected') upd.conectado_em = agora
    await db.from('whatsapp_instancias').update(upd).eq('id', inst.id)
    return { id: inst.id, ok: true, status: m.status, qrcode: m.status === 'connecting' ? m.qrcode : null }
  }

  switch (acao) {
    case 'criar_numero': {
      const apelido = String(body?.apelido ?? '').trim()
      if (!apelido || apelido.length > 60) return erro(400, 'DADOS_INVALIDOS', 'Informe um apelido de até 60 caracteres.')
      const { count } = await db.from('whatsapp_instancias').select('id', { count: 'exact', head: true }).eq('company_id', companyId)
      if ((count ?? 0) >= (emp.whatsapp_numeros_autorizados ?? 0))
        return erro(403, 'COTA_NUMEROS_ESGOTADA', 'A empresa já usa todos os números autorizados.')
      const nome = `axis-${companyId.slice(0, 8)}-${crypto.randomUUID().slice(0, 8)}`
      const r2 = await uaz('POST', '/instance/create', { admintoken: ADMIN }, { name: nome })
      if (r2.status < 200 || r2.status >= 300) return erroUaz(r2.status, r2.retryAfter)
      const token = r2.json?.token ?? r2.json?.instance?.token
      if (!token) return erro(502, 'ERRO_SERVIDOR', 'O servidor do WhatsApp não devolveu a chave do número.')
      const { data: nova, error } = await db.from('whatsapp_instancias')
        .insert({ company_id: companyId, apelido, nome_instancia: nome, status: 'disconnected', status_atualizado_em: new Date().toISOString() })
        .select('id, apelido, nome_instancia, status').single()
      if (error || !nova) return erro(500, 'ERRO_INTERNO', 'Não foi possível gravar o número.')
      await db.from('whatsapp_instancia_segredos').insert({ instancia_id: nova.id, token_instancia_cifrado: await cifrar(token) })
      await audit(companyId, 'criar_numero', null, { apelido, nome_instancia: nome })
      // Alerta ao Super Admin quando o servidor passar de 80 instâncias
      try {
        const all = await uaz('GET', '/instance/all', { admintoken: ADMIN })
        const total = Array.isArray(all.json) ? all.json.length : Array.isArray(all.json?.instances) ? all.json.instances.length : null
        if (total !== null && total > ALERTA_ACIMA) {
          const { data: sas } = await db.from('profiles').select('id, company_id').eq('role', 'super_admin').not('company_id', 'is', null)
          if (sas?.length) await db.from('user_notifications').insert(sas.map((s) => ({
            user_id: s.id, company_id: s.company_id, category: 'system', priority: 'high',
            title: 'Servidor do WhatsApp quase cheio',
            message: `${total} de ${LIMITE_SERVIDOR} números criados no servidor uazapi.`, action_route: '/superadmin/whatsapp',
          })))
        }
      } catch { /* alerta é opcional */ }
      return resp(200, { ok: true, dados: nova })
    }
    case 'conectar': {
      const inst = await instDaEmpresa()
      if (!inst) return erro(404, 'NAO_ENCONTRADA', 'Número não encontrado.')
      const tk = await tokenDe(inst.id)
      if (!tk) return erro(404, 'NAO_CONFIGURADA', 'Este número não está configurado no servidor.')
      // Se já está em andamento, devolve o QR vigente sem disparar novo fluxo
      const pre = await uaz('GET', '/instance/status', { token: tk })
      if (pre.status >= 200 && pre.status < 300) {
        const m = mapStatus(pre.json)
        if (m.status === 'connecting' && m.qrcode) return resp(200, { ok: true, dados: { status: 'connecting', qrcode: m.qrcode } })
        if (m.status === 'connected') { await atualizarStatus(inst); return resp(200, { ok: true, dados: { status: 'connected', qrcode: null } }) }
      }
      const r = await uaz('POST', '/instance/connect', { token: tk }, {})
      if (r.status === 409) {
        const s = await atualizarStatus(inst)
        return resp(200, { ok: true, codigo: 'EM_ANDAMENTO', dados: { status: s.status ?? 'connecting', qrcode: s.qrcode ?? null } })
      }
      if (r.status < 200 || r.status >= 300) return erroUaz(r.status, r.retryAfter)
      const m = mapStatus(r.json)
      await db.from('whatsapp_instancias').update({ status: 'connecting', status_atualizado_em: new Date().toISOString() }).eq('id', inst.id)
      await audit(companyId, 'conectar', null, { instancia_id: inst.id })
      return resp(200, { ok: true, dados: { status: m.status === 'connected' ? 'connected' : 'connecting', qrcode: m.qrcode } })
    }
    case 'status': {
      if (body?.instancia_id) {
        const inst = await instDaEmpresa()
        if (!inst) return erro(404, 'NAO_ENCONTRADA', 'Número não encontrado.')
        const s = await atualizarStatus(inst)
        if (!s.ok && s.codigo === 'TOKEN_INSTANCIA_INVALIDO') return erroUaz(401, null)
        return resp(200, { ok: s.ok, codigo: s.codigo, dados: s })
      }
      const { data: insts } = await db.from('whatsapp_instancias').select('*').eq('company_id', companyId)
      const out = []
      for (const i of insts ?? []) out.push(await atualizarStatus(i))
      return resp(200, { ok: true, dados: out })
    }
    case 'desconectar': {
      const inst = await instDaEmpresa()
      if (!inst) return erro(404, 'NAO_ENCONTRADA', 'Número não encontrado.')
      if (!(await desconectarUma(inst))) return erro(502, 'ERRO_SERVIDOR', 'Não foi possível desconectar. Tente de novo.')
      await audit(companyId, 'desconectar', { status: inst.status }, { status: 'disconnected', instancia_id: inst.id })
      return resp(200, { ok: true })
    }
    case 'atualizar_numero': {
      const inst = await instDaEmpresa()
      if (!inst) return erro(404, 'NAO_ENCONTRADA', 'Número não encontrado.')
      const upd: Record<string, unknown> = {}
      if (body.apelido !== undefined) {
        const a = String(body.apelido).trim()
        if (!a || a.length > 60) return erro(400, 'DADOS_INVALIDOS', 'Apelido de 1 a 60 caracteres.')
        upd.apelido = a
      }
      if (body.ativo_no_rodizio !== undefined) {
        if (typeof body.ativo_no_rodizio !== 'boolean') return erro(400, 'DADOS_INVALIDOS', 'ativo_no_rodizio deve ser verdadeiro ou falso.')
        upd.ativo_no_rodizio = body.ativo_no_rodizio
      }
      if (body.limite_diario !== undefined) {
        const l = body.limite_diario
        if (l !== null && !(Number.isInteger(l) && l >= 1)) return erro(400, 'DADOS_INVALIDOS', 'Limite diário deve ser 1 ou mais, ou vazio.')
        upd.limite_diario = l
      }
      if (!Object.keys(upd).length) return erro(400, 'DADOS_INVALIDOS', 'Nada para atualizar.')
      upd.atualizado_em = new Date().toISOString()
      await db.from('whatsapp_instancias').update(upd).eq('id', inst.id)
      const antes = Object.fromEntries(Object.keys(upd).filter((k) => k !== 'atualizado_em').map((k) => [k, inst[k]]))
      await audit(companyId, 'atualizar_numero', antes, { ...upd, instancia_id: inst.id })
      return resp(200, { ok: true })
    }
    case 'excluir_numero': {
      const inst = await instDaEmpresa()
      if (!inst) return erro(404, 'NAO_ENCONTRADA', 'Número não encontrado.')
      const tk = await tokenDe(inst.id)
      if (tk) {
        const r = await uaz('DELETE', '/instance', { token: tk })
        if (!(r.status >= 200 && r.status < 300) && r.status !== 404 && r.status !== 401) return erroUaz(r.status, r.retryAfter)
      }
      await db.from('whatsapp_instancia_segredos').delete().eq('instancia_id', inst.id)
      await db.from('whatsapp_instancias').delete().eq('id', inst.id)
      await audit(companyId, 'excluir_numero', { apelido: inst.apelido, nome_instancia: inst.nome_instancia }, null)
      return resp(200, { ok: true })
    }
    case 'enviar_teste': {
      const texto = String(body?.texto ?? '')
      if (texto.trim().length < 1 || texto.length > 500) return erro(400, 'DADOS_INVALIDOS', 'A mensagem deve ter de 1 a 500 caracteres.')
      let num = String(body?.numero_destino ?? '').replace(/\D/g, '')
      if (!num.startsWith('55') || num.length <= 11) num = '55' + num
      if (!/^55[1-9]{2}\d{8,9}$/.test(num)) return erro(400, 'NUMERO_INVALIDO', 'Número de destino inválido. Use DDD + número.')

      // limite: 5 testes por minuto por empresa
      const desde = new Date(Date.now() - 60_000).toISOString()
      const { count: recentes } = await db.from('whatsapp_fila_envios').select('id', { count: 'exact', head: true })
        .eq('company_id', companyId).eq('tipo', 'teste').gte('criado_em', desde)
      if ((recentes ?? 0) >= 5) return erro(429, 'LIMITE_DE_TESTES', 'Limite de 5 testes por minuto atingido. Aguarde um pouco e tente de novo.')

      let inst: any
      if (body?.instancia_id) {
        inst = await instDaEmpresa()
        if (!inst) return erro(404, 'NAO_ENCONTRADA', 'Número não encontrado.')
      } else {
        const { data } = await db.from('whatsapp_instancias').select('*').eq('company_id', companyId)
          .eq('status', 'connected').eq('ativo_no_rodizio', true)
          .order('ultimo_envio_em', { ascending: true, nullsFirst: true }).limit(1)
        inst = data?.[0]
        if (!inst) return erro(409, 'INSTANCIA_DESCONECTADA', 'Nenhum número conectado no rodízio.')
      }
      const tk = await tokenDe(inst.id)
      if (!tk) return erro(404, 'NAO_CONFIGURADA', 'Este número não está configurado no servidor.')
      const st = await uaz('GET', '/instance/status', { token: tk })
      if (st.status === 401) return erroUaz(401, null)
      if (st.status < 200 || st.status >= 300) return erroUaz(st.status, st.retryAfter)
      const m = mapStatus(st.json)
      if (m.status !== 'connected') {
        await db.from('whatsapp_instancias').update({ status: m.status, status_atualizado_em: new Date().toISOString() }).eq('id', inst.id)
        return erro(409, 'INSTANCIA_DESCONECTADA', `O número "${inst.apelido}" não está conectado.`)
      }

      const r = await uaz('POST', '/send/text', { token: tk }, { number: num, text: texto })
      const agora = new Date().toISOString()
      const registrar = (status: string, msgId: string | null, err: string | null) =>
        db.from('whatsapp_fila_envios').insert({
          company_id: companyId, tipo: 'teste', telefone_destino: num, texto_final: texto, instancia_id: inst.id,
          status, agendada_para: agora, enviada_em: status === 'enviada' ? agora : null,
          message_id_uazapi: msgId, erro: err, criado_por: userId,
        })
      if (r.status === 0 || r.status === 504) {
        await registrar('falha', null, 'resultado incerto (sem resposta)')
        return resp(200, { ok: false, codigo: 'RESULTADO_INCERTO', mensagem: 'Não sabemos se a mensagem saiu. Confira o celular de destino antes de tentar de novo.', dados: { instancia_apelido: inst.apelido } })
      }
      if (r.status < 200 || r.status >= 300) {
        await registrar('falha', null, `HTTP ${r.status}`)
        return erroUaz(r.status, r.retryAfter)
      }
      const id = r.json?.messageid ?? r.json?.id ?? r.json?.key?.id ?? null
      const msgId = id == null ? null : String(id)
      await registrar('enviada', msgId, null)
      await db.from('whatsapp_instancias').update({ ultimo_envio_em: agora }).eq('id', inst.id)
      return resp(200, { ok: true, dados: { status: 'enviada', message_id: msgId, instancia_apelido: inst.apelido, numero: num } })
    }
    default:
      return erro(400, 'ACAO_INVALIDA', 'Ação desconhecida.')
  }
})
