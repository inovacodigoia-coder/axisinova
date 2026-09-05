// API de Parceiros — Pedidos de Exames
// POST /functions/v1/partner-orders          -> cria pedido (paciente + exames)
// GET  /functions/v1/partner-orders/{proto}  -> consulta status (ou ?protocolo=)
// Auth: Authorization: Bearer <access_token> (OAuth2 client credentials de /oauth-token)
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { authenticateIntegration, verifyAccessToken } from '../_shared/integrationAuth.ts'

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

const genderFromSex = (sex: unknown) => {
  const s = String(sex ?? '').toUpperCase()
  if (s.startsWith('M')) return 'male'
  if (s.startsWith('F')) return 'female'
  return 'not_informed'
}

const STATUS_LABEL: Record<string, string> = {
  open: 'ABERTO',
  waiting: 'AGUARDANDO',
  waiting_collection: 'AGUARDANDO',
  collection_done: 'COLETA_REALIZADA',
  in_analysis: 'EM_ANALISE',
  validation: 'VALIDACAO',
  released: 'LIBERADO',
  completed: 'CONCLUIDO',
  cancelled: 'CANCELADO',
  deleted: 'CANCELADO',
}
const statusLabel = (s: unknown) => STATUS_LABEL[String(s ?? '')] ?? 'ABERTO'

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
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // ---- 1. Autenticação OAuth2 (parceiros não usam API Key legada) ----
  const auth = await authenticateIntegration(req, supabase)
  if (!auth.ok) return err('UNAUTHORIZED', auth.error, auth.status)
  if (auth.method !== 'oauth2') {
    return err('UNAUTHORIZED', 'Parceiros devem autenticar com OAuth2 (Bearer token de /oauth-token)', 401)
  }
  if (auth.scopes.length && !auth.scopes.some((s) => ['orders:write', 'orders:read'].includes(s))) {
    return err('FORBIDDEN', 'Token sem permissão para pedidos (escopo orders:write)', 403)
  }
  const companyId = auth.companyId

  // client_id do token -> parceiro dono da credencial
  const bearer = (req.headers.get('Authorization') || '').slice(7).trim()
  const payload = await verifyAccessToken(bearer)
  const clientId = String(payload?.sub ?? '')

  const { data: partners } = await supabase
    .from('api_partners')
    .select('id, name, api_authorized, status, credentials')
    .eq('company_id', companyId)

  const partner = (partners || []).find((p: any) =>
    Array.isArray(p.credentials) &&
    p.credentials.some((c: any) => c?.clientId === clientId && !c?.revokedAt),
  )
  if (!partner) {
    return err('PARTNER_NOT_FOUND', 'Nenhum parceiro cadastrado para estas credenciais', 403)
  }
  if (partner.status !== 'active' || partner.api_authorized !== true) {
    return err(
      'PARTNER_NOT_AUTHORIZED',
      'Parceiro sem autorização para criar pedidos via API. Ative "Autorizado a criar pedidos via API" no cadastro do parceiro.',
      403,
    )
  }

  // ---- 2. Roteamento ----
  if (req.method === 'POST') return await createOrder(req, supabase, companyId, partner)
  if (req.method === 'GET') return await getOrderStatus(req, supabase, companyId, partner)
  return err('METHOD_NOT_ALLOWED', 'Use POST (criar) ou GET (consultar status)', 405)
})

// ---------- POST: criar pedido ----------
async function createOrder(req: Request, supabase: any, companyId: string, partner: any) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return err('INVALID_JSON', 'Corpo da requisição não é um JSON válido', 400)
  }

  const protocoloParceiro = String(body?.protocolo_parceiro ?? body?.partnerProtocol ?? '').trim() || null
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
  const invalid: string[] = []
  for (const item of exames) {
    const code = typeof item === 'string' ? item : String(item?.codigo ?? item?.code ?? '')
    const exam = byCode.get(norm(code))
    if (!exam) invalid.push(code || '(vazio)')
    else matched.push(exam)
  }
  if (invalid.length) {
    return err(
      'EXAM_CODE_NOT_FOUND',
      `Código(s) de exame não reconhecido(s): ${invalid.join(', ')}. Use o Código interno do Catálogo de Exames (não o código TUSS/ANS). Nenhum pedido foi criado.`,
      422,
      { protocolo_parceiro: protocoloParceiro },
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
async function getOrderStatus(req: Request, supabase: any, companyId: string, _partner: any) {
  const url = new URL(req.url)
  const segments = url.pathname.split('/').filter(Boolean)
  const last = segments[segments.length - 1]
  const fromPath = last && last !== 'partner-orders' ? decodeURIComponent(last) : null
  const ref = String(url.searchParams.get('protocolo') ?? url.searchParams.get('protocolo_parceiro') ?? fromPath ?? '').trim()

  if (!ref) {
    return err('MISSING_FIELD', 'Informe o protocolo: /partner-orders/{protocolo} ou ?protocolo=', 400)
  }

  // aceita protocolo interno OU protocolo_parceiro
  let orderId: string | null = null
  const { data: byProtocol } = await supabase
    .from('attendance_orders')
    .select('id')
    .eq('company_id', companyId)
    .or(`order_number.eq.${ref},protocol.eq.${ref}`)
    .maybeSingle()
  orderId = byProtocol?.id ?? null

  let protocoloParceiro: string | null = null
  if (!orderId) {
    const { data: po } = await supabase
      .from('partner_orders')
      .select('attendance_order_id, protocolo_parceiro')
      .eq('company_id', companyId)
      .eq('protocolo_parceiro', ref)
      .maybeSingle()
    orderId = po?.attendance_order_id ?? null
    protocoloParceiro = po?.protocolo_parceiro ?? null
  } else {
    const { data: po } = await supabase
      .from('partner_orders')
      .select('protocolo_parceiro')
      .eq('attendance_order_id', orderId)
      .maybeSingle()
    protocoloParceiro = po?.protocolo_parceiro ?? null
  }

  if (!orderId) {
    return err('ORDER_NOT_FOUND', 'Nenhum pedido encontrado com o protocolo informado', 404)
  }

  const { data: order } = await supabase
    .from('attendance_orders')
    .select('id, order_number, protocol, status, patient_name, lab_guides')
    .eq('id', orderId)
    .maybeSingle()
  if (!order) return err('ORDER_NOT_FOUND', 'Nenhum pedido encontrado com o protocolo informado', 404)

  const { data: results } = await supabase
    .from('lab_exam_results')
    .select('exam_code, status')
    .eq('order_id', orderId)
  const resultStatus = new Map<string, string>(
    (results || []).map((r: any) => [norm(r.exam_code), statusLabel(r.status)]),
  )

  const exames: any[] = []
  for (const g of Array.isArray(order.lab_guides) ? order.lab_guides : []) {
    for (const e of Array.isArray((g as any)?.exams) ? (g as any).exams : []) {
      const code = String(e?.internalCode ?? '').toUpperCase()
      exames.push({
        codigo: code,
        nome: e?.name ?? null,
        status: resultStatus.get(norm(code)) ?? (e?.collected ? 'COLETA_REALIZADA' : 'AGUARDANDO'),
      })
    }
  }

  return json({
    success: true,
    protocolo: order.order_number ?? order.protocol,
    protocolo_parceiro: protocoloParceiro,
    status: statusLabel(order.status),
    paciente: { nome: order.patient_name },
    exames,
  })
}
