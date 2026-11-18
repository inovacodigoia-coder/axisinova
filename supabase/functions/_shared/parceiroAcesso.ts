// API de Parceiros — regras de isolamento e revogação, sem dependências de runtime
// (usadas pelas Edge Functions e testadas com vitest).
//  - a cada chamada: credencial ativa (integration_oauth_clients) e, se for de parceiro,
//    parceiro ativo + autorizado + módulo liberado na empresa;
//  - consulta de pedido só em partner_orders do próprio parceiro, sem dados do paciente.

// deno-lint-ignore no-explicit-any
export type Db = { from: (table: string) => any }

export interface ClienteOAuth {
  id: string
  company_id: string
  client_id: string
  secret_hash: string
  scopes: string[] | null
  is_active: boolean
  revoked_at: string | null
  partner_id: string | null
  uso: string | null
}

export type AcessoCliente =
  | { ok: true; client: ClienteOAuth; partnerId: string | null }
  | { ok: false; status: 401 | 403; code: 'UNAUTHORIZED' | 'PARTNER_NOT_AUTHORIZED'; message: string }

/** Protocolo aceito na URL: letras, números, hífen, underline e ponto; até 64. */
export const REFERENCIA_REGEX = /^[A-Za-z0-9._-]{1,64}$/
export const referenciaValida = (ref: string) => REFERENCIA_REGEX.test(ref)

/** Comparação sem atalho: o tempo não revela quantos caracteres batem. */
export function iguaisTempoConstante(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length)
  let diff = a.length ^ b.length
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  return diff === 0
}

export async function carregarCliente(db: Db, clientId: string): Promise<ClienteOAuth | null> {
  if (!clientId) return null
  const { data } = await db
    .from('integration_oauth_clients')
    .select('id, company_id, client_id, secret_hash, scopes, is_active, revoked_at, partner_id, uso')
    .eq('client_id', clientId)
    .maybeSingle()
  return (data as ClienteOAuth) ?? null
}

const NEGADO_CREDENCIAL = {
  ok: false as const, status: 401 as const, code: 'UNAUTHORIZED' as const,
  message: 'Credenciais inválidas ou revogadas',
}
const NEGADO_PARCEIRO = {
  ok: false as const, status: 403 as const, code: 'PARTNER_NOT_AUTHORIZED' as const,
  message: 'Parceiro sem autorização para usar a API. Solicite a liberação à empresa responsável.',
}

/** Estado atual da credencial e do parceiro dono dela (consultado a cada requisição). */
export async function avaliarCliente(db: Db, client: ClienteOAuth | null): Promise<AcessoCliente> {
  if (!client || client.is_active !== true || client.revoked_at) return NEGADO_CREDENCIAL
  const deParceiro = client.uso === 'parceiro' || !!client.partner_id
  if (!deParceiro) return { ok: true, client, partnerId: null }
  if (!client.partner_id) return NEGADO_PARCEIRO

  const { data: partner } = await db
    .from('api_partners')
    .select('id, status, api_authorized')
    .eq('id', client.partner_id)
    .eq('company_id', client.company_id)
    .maybeSingle()
  if (!partner || partner.status !== 'active' || partner.api_authorized !== true) return NEGADO_PARCEIRO

  const { data: company } = await db
    .from('companies')
    .select('partner_api_enabled')
    .eq('id', client.company_id)
    .maybeSingle()
  if (company?.partner_api_enabled !== true) return NEGADO_PARCEIRO

  return { ok: true, client, partnerId: String(partner.id) }
}

// ---------- GET /partner-orders/{ref} ----------

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
export const statusLabel = (s: unknown) => STATUS_LABEL[String(s ?? '')] ?? 'ABERTO'

const norm = (v: unknown) =>
  String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()

export interface Resposta { status: number; body: Record<string, unknown> }

const NAO_ENCONTRADO: Resposta = {
  status: 404,
  body: { success: false, error: 'ORDER_NOT_FOUND', message: 'Nenhum pedido encontrado com o protocolo informado' },
}

/**
 * Consulta de status. company_id e partner_id vêm SEMPRE do token.
 * Só o protocolo_parceiro do próprio parceiro é aceito; inexistente e de outro
 * parceiro respondem igual. Nunca devolve paciente, payload ou erro bruto.
 */
export async function consultarPedidoParceiro(
  db: Db,
  args: { companyId: string; partnerId: string; ref: string },
): Promise<Resposta> {
  const ref = String(args.ref ?? '').trim()
  if (!ref) {
    return { status: 400, body: { success: false, error: 'MISSING_FIELD', message: 'Informe o protocolo: /partner-orders/{protocolo_parceiro} ou ?protocolo=' } }
  }
  if (!referenciaValida(ref)) {
    return { status: 400, body: { success: false, error: 'INVALID_REFERENCE', message: 'Protocolo inválido: use apenas letras, números, hífen, underline ou ponto (até 64 caracteres)' } }
  }
  if (!args.companyId || !args.partnerId) return NAO_ENCONTRADO

  const { data: rows } = await db
    .from('partner_orders')
    .select('id, attendance_order_id, protocolo_parceiro, status, payload, created_at')
    .eq('company_id', args.companyId)
    .eq('partner_id', args.partnerId)
    .eq('protocolo_parceiro', ref)
    .order('created_at', { ascending: false })
    .limit(1)
  const po = Array.isArray(rows) ? rows[0] : null
  if (!po) return NAO_ENCONTRADO

  const base = {
    success: true,
    protocolo_parceiro: po.protocolo_parceiro ?? ref,
    recebido_em: po.created_at ?? null,
  }

  let order: any = null
  if (po.attendance_order_id) {
    const { data } = await db
      .from('attendance_orders')
      .select('id, order_number, protocol, status, lab_guides, updated_at')
      .eq('id', po.attendance_order_id)
      .eq('company_id', args.companyId)
      .maybeSingle()
    order = data ?? null
  }

  if (!order) {
    const resolved = (po.payload as any)?._resolved ?? {}
    const erro = po.status === 'error'
    return {
      status: 200,
      body: {
        ...base,
        protocolo: null,
        status: erro ? 'ERRO' : 'AGUARDANDO_AUTORIZACAO',
        atualizado_em: po.created_at ?? null,
        ...(erro ? { erro: { codigo: 'ORDER_NOT_PROCESSED', mensagem: 'O pedido não pôde ser processado. Entre em contato com o laboratório.' } } : {}),
        exames: (Array.isArray(resolved.exams) ? resolved.exams : []).map((e: any) => ({
          codigo: String(e?.code ?? ''),
          nome: e?.name ?? null,
          status: 'RECEBIDO',
        })),
      },
    }
  }

  const { data: results } = await db
    .from('lab_exam_results')
    .select('exam_code, status')
    .eq('company_id', args.companyId)
    .eq('order_id', order.id)
  const resultStatus = new Map<string, string>(
    ((results as any[]) || []).map((r: any) => [norm(r.exam_code), statusLabel(r.status)]),
  )
  const exames: { codigo: string; nome: string | null; status: string }[] = []
  for (const g of Array.isArray(order.lab_guides) ? order.lab_guides : []) {
    for (const e of Array.isArray(g?.exams) ? g.exams : []) {
      const codigo = String(e?.internalCode ?? '').toUpperCase()
      exames.push({
        codigo,
        nome: e?.name ?? null,
        status: resultStatus.get(norm(codigo)) ?? (e?.collected ? 'COLETA_REALIZADA' : 'AGUARDANDO'),
      })
    }
  }

  return {
    status: 200,
    body: {
      ...base,
      protocolo: order.order_number ?? order.protocol ?? null,
      status: statusLabel(order.status),
      atualizado_em: order.updated_at ?? po.created_at ?? null,
      exames,
    },
  }
}
