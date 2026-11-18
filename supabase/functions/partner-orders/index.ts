// API de Parceiros — Pedidos de Exames
// POST /functions/v1/partner-orders          -> registra pedido na fila (aguarda autorização)
// GET  /functions/v1/partner-orders/{protocolo_parceiro} -> consulta status do próprio pedido (ou ?protocolo=)
// Auth: Authorization: Bearer <access_token> (OAuth2 client credentials de /oauth-token)
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { authenticateIntegration } from '../_shared/integrationAuth.ts'
import { consultarPedidoParceiro } from '../_shared/parceiroAcesso.ts'
import {
  codigoDeErro, consumirLimites, emSegundoPlano, gravarLog, linhaDeLog, mensagemFilaCheia, mensagemLimite, novoContexto,
  regrasPartnerOrders, verificarPostParceiro, type CtxApi,
} from '../_shared/apiProtecao.ts'
import {
  FALHA_CORPO_GRANDE, FALHA_PROTOCOLO, codigoDoExame, lerCorpoLimitado, lerProtocolo, limparCorpo, numeroDecimal,
  validarCampos, type Falha,
} from '../_shared/pedidoParceiroValidacao.ts'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const err = (error: string, message: string, status: number, extra: Record<string, unknown> = {}) =>
  json({ success: false, error, message, ...extra }, status)

// ---------- helpers ----------
const onlyDigits = (v: unknown) => String(v ?? '').replace(/\D/g, '')

const norm = (v: unknown) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()

const isValidCpf = (value: unknown): boolean => {
  const d = onlyDigits(value)
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const dv = (base: string, factor: number) => {
    let sum = 0
    for (let i = 0; i < base.length; i++) sum += parseInt(base[i], 10) * (factor - i)
    const r = (sum * 10) % 11
    return r === 10 ? 0 : r
  }
  return dv(d.slice(0, 9), 10) === parseInt(d[9], 10) && dv(d.slice(0, 10), 11) === parseInt(d[10], 10)
}

const formatCpf = (d: string) =>
  d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : d

const toIsoDate = (value: unknown): string | null => {
  const v = String(value ?? '').trim()
  if (!v) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10)
  const br = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (br) return `${br[3]}-${br[2]}-${br[1]}`
  return null
}

/** string trimada ou null (campos opcionais do JSON: se não vier, vai null) */
const strOrNull = (v: unknown): string | null => {
  const s = String(v ?? '').trim()
  return s || null
}

/** booleano a partir de true/false ou "sim"/"nao"; ausente/irreconhecível = null */
const boolOrNull = (v: unknown): boolean | null => {
  if (typeof v === 'boolean') return v
  const s = String(v ?? '').trim().toLowerCase()
  if (['sim', 's', 'true', '1', 'yes'].includes(s)) return true
  if (['nao', 'não', 'n', 'false', '0', 'no'].includes(s)) return false
  return null
}

/** número a partir de "85,5" ou "85.5"; ausente = null (formato e faixa já conferidos em validarCampos) */
const numOrNull = (v: unknown): number | null => numeroDecimal(v)

/** lista de strings a partir de array ou texto separado por vírgula/ponto-e-vírgula; vazio = null */
const listOrNull = (v: unknown): string[] | null => {
  if (Array.isArray(v)) {
    const arr = v.map((x) => String(x ?? '').trim()).filter(Boolean)
    return arr.length ? arr : null
  }
  const s = String(v ?? '').trim()
  if (!s) return null
  const arr = s.split(/[;,]/).map((x) => x.trim()).filter(Boolean)
  return arr.length ? arr : null
}

const genderFromSex = (sex: unknown) => {
  const s = String(sex ?? '').toUpperCase()
  if (s.startsWith('M')) return 'male'
  if (s.startsWith('F')) return 'female'
  return 'not_informed'
}


/** Hash interno do pedido (mesma regra do front: src/utils/orderHash.ts) */
const generateOrderHash = (orderId: string): string => {
  const digits = String(orderId || '').replace(/\D/g, '') || '0'
  const base = (Number(digits) + Date.now()).toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return (base + random).substring(0, 9)
}

const materialOf = (e: any): string | null => {
  if (e.default_material) return String(e.default_material)
  const sel = e.selected_materials
  if (Array.isArray(sel) && sel.length) {
    const first = sel[0]
    return typeof first === 'string' ? first : (first?.name ?? null)
  }
  return null
}

// ---------- handler ----------
// Toda chamada (sucesso ou falha) gera uma linha em api_request_logs, gravada depois da resposta.
// Consultas extras por chamada: 1 de limite (POST: api_partner_post_pre, que também confere o teto
// da fila; GET: api_limite_consumir) + 1 de log (api_log_registrar).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const ctx = novoContexto(req, 'partner-orders')
  let res: Response
  let errorCode: string | null = null
  try {
    res = await atender(req, supabase, ctx)
  } catch (e) {
    console.error('[partner-orders] erro interno:', e instanceof Error ? e.message : e)
    res = err('INTERNAL_ERROR', 'Erro interno ao processar a requisição', 500)
    errorCode = 'INTERNAL_ERROR'
  }
  errorCode = errorCode ?? (await codigoDeErro(res))
  emSegundoPlano(gravarLog(supabase, linhaDeLog(ctx, res.status, errorCode)))
  return res
})

async function atender(req: Request, supabase: any, ctx: CtxApi): Promise<Response> {

  // ---- 1. Autenticação OAuth2 (parceiros não usam API Key legada) ----
  // authenticateIntegration confere a cada chamada: credencial ativa/não revogada e
  // parceiro ativo + autorizado + módulo liberado na empresa.
  const auth = await authenticateIntegration(req, supabase)
  if (!auth.ok) {
    return err(auth.code === 'PARTNER_NOT_AUTHORIZED' ? 'PARTNER_NOT_AUTHORIZED' : 'UNAUTHORIZED', auth.error, auth.status)
  }
  if (auth.method !== 'oauth2') {
    return err('UNAUTHORIZED', 'Parceiros devem autenticar com OAuth2 (Bearer token de /oauth-token)', 401)
  }
  if (auth.scopes.length && !auth.scopes.some((s) => ['orders:write', 'orders:read'].includes(s))) {
    return err('FORBIDDEN', 'Token sem permissão para pedidos (escopo orders:write)', 403)
  }
  // company_id e partner_id vêm SEMPRE do token (credencial vinculada ao parceiro)
  const companyId = auth.companyId
  const clientId = String(auth.clientId ?? '')
  ctx.companyId = companyId
  ctx.clientId = auth.clientId
  ctx.partnerId = auth.partnerId
  if (!auth.partnerId) {
    return err('PARTNER_NOT_FOUND', 'Nenhum parceiro cadastrado para estas credenciais', 403)
  }

  const { data: partner } = await supabase
    .from('api_partners')
    .select('id, name, api_authorized, status')
    .eq('id', auth.partnerId)
    .eq('company_id', companyId)
    .maybeSingle()
  if (!partner) {
    return err('PARTNER_NOT_FOUND', 'Nenhum parceiro cadastrado para estas credenciais', 403)
  }

  // ---- 1b. Limite por minuto (por parceiro; no POST também por empresa e teto da fila) ----
  const limite = req.method === 'POST'
    ? await verificarPostParceiro(supabase, String(partner.id), companyId)
    : await consumirLimites(supabase, regrasPartnerOrders(req.method, String(partner.id), companyId))
  if (!limite.permitido && limite.errorCode === 'QUEUE_FULL') {
    const l = limite as Awaited<ReturnType<typeof verificarPostParceiro>>
    return err('QUEUE_FULL', mensagemFilaCheia(l.escopo, l.limite), 429)
  }
  if (!limite.permitido) {
    return new Response(JSON.stringify({
      success: false, error: 'RATE_LIMITED', message: mensagemLimite(limite.retryAfter), retry_after: limite.retryAfter,
    }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(limite.retryAfter) } })
  }

  // ---- 2. Roteamento ----
  if (req.method === 'POST') return await createOrder(req, supabase, companyId, partner, clientId)
  if (req.method === 'GET') return await getOrderStatus(req, supabase, companyId, String(partner.id))
  return err('METHOD_NOT_ALLOWED', 'Use POST (criar) ou GET (consultar status)', 405)
}

// ---------- POST: criar pedido ----------
async function createOrder(req: Request, supabase: any, companyId: string, partner: any, clientId: string) {
  const falha = (f: Falha, extra: Record<string, unknown> = {}) =>
    err(f.error, f.message, f.status, { ...(f.campo ? { campo: f.campo } : {}), ...extra })

  // ---- Etapa 2B: tamanho do corpo (bytes lidos), JSON, limpeza do texto livre e protocolo ----
  const lido = await lerCorpoLimitado(req)
  if (!lido.ok) return falha(FALHA_CORPO_GRANDE)
  let bruto: any
  try {
    bruto = JSON.parse(lido.texto)
  } catch {
    return err('INVALID_JSON', 'Corpo da requisição não é um JSON válido', 400)
  }
  const limpo = limparCorpo(bruto)
  if (!limpo.ok) return falha({ status: 422, error: 'VALIDATION_ERROR', campo: 'corpo', message: 'Campo inválido: corpo (estrutura do JSON profunda demais)' })
  const body: any = limpo.valor

  const protocolo = lerProtocolo(body)
  if (!protocolo.ok) return falha(FALHA_PROTOCOLO)
  // já validado pela regra do GET: pode voltar nas respostas como identificador do pedido
  const protocoloParceiro = protocolo.valor
  const paciente = body?.paciente ?? body?.patient ?? {}
  const exames = Array.isArray(body?.exames) ? body.exames : (Array.isArray(body?.exams) ? body.exams : [])
  const medico = body?.medico_solicitante ?? body?.requesting_doctor ?? null
  const convenio = body?.convenio ?? body?.insurance ?? null

  // ---- validações básicas ----
  const nome = String(paciente?.nome ?? paciente?.name ?? '').trim()
  if (!nome) return err('MISSING_FIELD', 'Campo obrigatório ausente: paciente.nome', 400, { protocolo_parceiro: protocoloParceiro })

  const cpfDigits = onlyDigits(paciente?.cpf)
  if (!cpfDigits) {
    return err('MISSING_FIELD', 'Campo obrigatório ausente: paciente.cpf', 400, { protocolo_parceiro: protocoloParceiro })
  }
  if (!isValidCpf(cpfDigits)) {
    return err('INVALID_CPF', 'CPF inválido', 422, { protocolo_parceiro: protocoloParceiro })
  }

  if (!exames.length) {
    return err('MISSING_FIELD', 'Informe ao menos um exame em "exames" (array de { codigo })', 400, { protocolo_parceiro: protocoloParceiro })
  }

  // ---- Etapa 2B: quantidade de exames, tamanho e formato dos campos (erro só com o nome do campo) ----
  const invalido = validarCampos(body)
  if (invalido) return falha(invalido, { protocolo_parceiro: protocoloParceiro })

  // ---- idempotência: protocolo_parceiro único por parceiro ----
  if (protocoloParceiro) {
    const { data: dup } = await supabase
      .from('partner_orders')
      .select('id, attendance_order_id, status')
      .eq('company_id', companyId)
      .eq('partner_id', partner.id)
      .eq('protocolo_parceiro', protocoloParceiro)
      .maybeSingle()
    if (dup) {
      let protocolo: string | null = null
      if (dup.attendance_order_id) {
        const { data: o } = await supabase
          .from('attendance_orders')
          .select('order_number, protocol')
          .eq('id', dup.attendance_order_id)
          .maybeSingle()
        protocolo = o?.order_number ?? o?.protocol ?? null
      }
      return err('DUPLICATE_ORDER', 'Já existe um pedido com este protocolo_parceiro', 409, {
        protocolo_parceiro: protocoloParceiro,
        protocolo,
      })
    }
  }

  // ---- exames: tudo ou nada ----
  const { data: catalog } = await supabase
    .from('exams')
    .select('id, name, internal_code, tuss_code, is_active, type, default_material, selected_materials')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .neq('type', 'clinical')

  const byCode = new Map<string, any>()
  for (const e of catalog || []) {
    const c = norm(e.internal_code)
    if (c && !byCode.has(c)) byCode.set(c, e)
  }

  const matched: any[] = []
  const invalid: number[] = []
  exames.forEach((item: unknown, i: number) => {
    const exam = byCode.get(norm(codigoDoExame(item)))
    if (!exam) invalid.push(i + 1)
    else matched.push(exam)
  })
  if (invalid.length) {
    // nunca repete o código enviado: informa a posição na lista "exames" (a partir de 1)
    return err(
      'EXAM_CODE_NOT_FOUND',
      `Código(s) de exame não reconhecido(s) na(s) posição(ões) ${invalid.join(', ')} da lista "exames". Use o Código interno do Catálogo de Exames (não o código TUSS/ANS). Nenhum pedido foi criado.`,
      422,
      { protocolo_parceiro: protocoloParceiro, posicoes: invalid },
    )
  }

  try {
    // ---- paciente: apenas verificamos se já existe (NÃO cadastramos aqui) ----
    let patientExisted = false
    if (cpfDigits) {
      const { data: found } = await supabase
        .from('patients')
        .select('id')
        .eq('company_id', companyId)
        .in('cpf', [cpfDigits, formatCpf(cpfDigits)])
        .limit(1)
        .maybeSingle()
      patientExisted = !!found?.id
    }

    const convenioNome = String(convenio?.nome ?? (typeof convenio === 'string' ? convenio : '') ?? '').trim()
    const doctorName = typeof medico === 'string' ? medico : String(medico?.nome ?? '').trim()
    const cardNumber = String(convenio?.numero_carteira ?? convenio?.numero_guia ?? '').trim() || null

    // ---- campos opcionais do paciente / convênio / médico (ausentes = null) ----
    const endereco = paciente?.endereco ?? {}
    const resolvedConvenio = convenioNome
      ? {
          nome: convenioNome,
          numero_carteira: cardNumber,
          validade: toIsoDate(convenio?.validade),
        }
      : null
    const resolvedMedico = doctorName
      ? {
          nome: doctorName,
          conselho: strOrNull(medico?.conselho),
          uf: strOrNull(medico?.uf),
          numero_inscricao: strOrNull(medico?.numero_inscricao ?? medico?.numero),
          especialidade: strOrNull(medico?.especialidade),
          telefone: strOrNull(medico?.telefone),
          email: strOrNull(medico?.email),
        }
      : null
    const resolvedPacienteExtras = {
      nome_social: strOrNull(paciente?.nome_social),
      rg: strOrNull(paciente?.rg),
      etnia: strOrNull(paciente?.etnia),
      estado_civil: strOrNull(paciente?.estado_civil),
      email: strOrNull(paciente?.email),
      gestante: boolOrNull(paciente?.gestante),
      peso_kg: numOrNull(paciente?.peso_kg ?? paciente?.peso),
      altura_m: numOrNull(paciente?.altura_m ?? paciente?.altura),
      endereco: {
        cep: strOrNull(paciente?.cep ?? endereco?.cep),
        logradouro: strOrNull(paciente?.logradouro ?? endereco?.logradouro),
        numero: strOrNull(paciente?.numero ?? endereco?.numero),
      },
      tipo_sanguineo: strOrNull(paciente?.tipo_sanguineo ?? paciente?.dados_clinicos?.tipo_sanguineo),
      alergias: listOrNull(paciente?.alergias ?? paciente?.dados_clinicos?.alergias),
      condicoes_cronicas: listOrNull(paciente?.condicoes_cronicas ?? paciente?.dados_clinicos?.condicoes_cronicas),
      medicacoes_continuas: listOrNull(paciente?.medicacoes_continuas ?? paciente?.dados_clinicos?.medicacoes_continuas),
      observacoes_gerais: strOrNull(paciente?.observacoes_gerais),
    }
    const at = body?.atendimento ?? {}
    const resolvedAtendimento = {
      peso_kg: numOrNull(at?.peso_kg ?? paciente?.peso_kg ?? paciente?.peso),
      altura_m: numOrNull(at?.altura_m ?? paciente?.altura_m ?? paciente?.altura),
      urgencia: boolOrNull(at?.urgencia),
      febre: boolOrNull(at?.febre),
      jejum: boolOrNull(at?.jejum),
      hospital: strOrNull(at?.hospital),
      setor: strOrNull(at?.setor),
      leito: strOrNull(at?.leito),
      numero_prontuario: strOrNull(at?.numero_prontuario),
      observacao_atendimento: strOrNull(at?.observacao_atendimento),
    }

    // ---- fila de Pedidos Recebidos: nada é criado no sistema ainda ----
    const { data: queued, error: qErr } = await supabase
      .from('partner_orders')
      .insert({
        company_id: companyId,
        partner_id: partner.id,
        client_id: clientId || String(partner.id),
        protocolo_parceiro: protocoloParceiro,
        attendance_order_id: null,
        status: 'received',
        payload: {
          ...body,
          _resolved: {
            patientExisted,
            doctorName: doctorName || null,
            convenioName: convenioNome || null,
            cardNumber,
            convenio: resolvedConvenio,
            medico: resolvedMedico,
            pacienteExtras: resolvedPacienteExtras,
            atendimento: resolvedAtendimento,
            exams: matched.map((e) => ({
              code: String(e.internal_code ?? '').toUpperCase(),
              name: e.name,
            })),
          },
        },
      })
      .select('id')
      .single()
    if (qErr) throw qErr

    await supabase
      .from('api_partners')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', partner.id)

    return json({
      success: true,
      pedido_id: queued.id,
      protocolo_parceiro: protocoloParceiro,
      status: 'RECEBIDO',
      message: 'Pedido recebido e aguardando autorização. O atendimento só é criado após liberação pela equipe do laboratório.',
      paciente: { nome, cpf: formatCpf(cpfDigits), cadastrado: patientExisted },
      exames: matched.map((e) => ({
        codigo: String(e.internal_code ?? '').toUpperCase(),
        nome: e.name,
        status: 'RECEBIDO',
      })),
    }, 202)
  } catch (e) {
    console.error('[partner-orders] erro ao registrar pedido:', (e as Error).message)
    return err('INTERNAL_ERROR', 'Não foi possível registrar o pedido', 500, { protocolo_parceiro: protocoloParceiro })
  }
}

// ---------- GET: status do pedido ----------
// Só pedidos do próprio parceiro, pelo protocolo_parceiro; regras em _shared/parceiroAcesso.ts
async function getOrderStatus(req: Request, supabase: any, companyId: string, partnerId: string) {
  const url = new URL(req.url)
  const segments = url.pathname.split('/').filter(Boolean)
  const last = segments[segments.length - 1]
  let fromPath: string | null = null
  if (last && last !== 'partner-orders') {
    try { fromPath = decodeURIComponent(last) } catch { fromPath = '\u0000' }
  }
  const ref = String(url.searchParams.get('protocolo') ?? url.searchParams.get('protocolo_parceiro') ?? fromPath ?? '').trim()
  const r = await consultarPedidoParceiro(supabase, { companyId, partnerId, ref })
  return json(r.body, r.status)
}
