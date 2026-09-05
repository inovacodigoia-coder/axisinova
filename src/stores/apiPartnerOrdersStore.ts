import { useSyncExternalStore } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { PartnerOrder, PartnerOrderStatus } from '@/types/api-partner-orders.types'

/**
 * Pedidos Recebidos via API dos Parceiros (dados reais da tabela partner_orders).
 * O pedido chega pela API e fica AGUARDANDO autorização — o atendimento no sistema
 * só é criado quando a equipe seleciona o pedido e confirma a criação.
 */
let orders: PartnerOrder[] = []
const listeners = new Set<() => void>()

function emit() {
  orders = [...orders]
  listeners.forEach(l => l())
}

function getSnapshot() {
  return orders
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function usePartnerOrders(): PartnerOrder[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

interface Row {
  id: string
  company_id: string
  partner_id: string | null
  protocolo_parceiro: string | null
  attendance_order_id: string | null
  status: string
  error: string | null
  payload: Record<string, unknown> | null
  created_at: string
  attendance_orders?: { order_number: string | null; protocol: string | null } | null
}

function mapRow(row: Row): PartnerOrder {
  const payload = (row.payload ?? {}) as Record<string, any>
  const resolved = (payload._resolved ?? {}) as Record<string, any>
  const paciente = (payload.paciente ?? payload.patient ?? {}) as Record<string, any>
  const convenio = (payload.convenio ?? {}) as Record<string, any>
  const rawExams = Array.isArray(resolved.exams)
    ? resolved.exams
    : Array.isArray(payload.exames)
      ? payload.exames.map((e: any) => ({ code: e?.codigo ?? e?.code ?? '', name: e?.nome ?? e?.name ?? '' }))
      : []

  const status: PartnerOrderStatus =
    row.status === 'processed' ? 'processed' : row.status === 'error' ? 'error' : 'received'

  return {
    id: row.id,
    companyId: row.company_id,
    partnerId: row.partner_id ?? '',
    partnerProtocol: row.protocolo_parceiro ?? undefined,
    receivedAt: row.created_at,
    status,
    patient: {
      name: String(paciente.nome ?? paciente.name ?? '—'),
      cpf: String(paciente.cpf ?? ''),
      birthDate: String(paciente.data_nascimento ?? paciente.birthDate ?? ''),
      sex: String(paciente.sexo ?? paciente.sex ?? ''),
      phone: paciente.telefone ?? paciente.phone ?? undefined,
    },
    patientExisted: !!resolved.patientExisted,
    exams: rawExams.map((e: any) => ({
      code: String(e.code ?? '').toUpperCase(),
      name: String(e.name ?? ''),
      recognized: true,
    })),
    requestingDoctor: resolved.doctorName ?? undefined,
    insurance: resolved.convenioName ?? convenio.nome ?? undefined,
    insuranceGuide: convenio.numero_guia ?? resolved.cardNumber ?? undefined,
    attendanceProtocol:
      row.attendance_orders?.order_number ?? row.attendance_orders?.protocol ?? undefined,
    attendanceId: row.attendance_order_id ?? undefined,
    errorMessage: row.error ?? undefined,
    rawPayload: payload,
  }
}

/** Carrega os pedidos recebidos da empresa a partir do banco. */
export async function loadPartnerOrders(companyId: string) {
  const { data, error } = await supabase
    .from('partner_orders')
    .select('id, company_id, partner_id, protocolo_parceiro, attendance_order_id, status, error, payload, created_at, attendance_orders(order_number, protocol)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) return
  orders = ((data ?? []) as unknown as Row[]).map(mapRow)
  emit()
}

/** Marca o pedido como "Recebido" novamente para nova tentativa de criação. */
export async function markOrderForReprocess(id: string) {
  await supabase.from('partner_orders').update({ status: 'received', error: null }).eq('id', id)
  orders = orders.map(o => (o.id === id ? { ...o, status: 'received', errorMessage: undefined } : o))
  emit()
}

export interface BatchProcessResult {
  orderId: string
  patientName: string
  cpf: string
  partnerId: string
  partnerProtocol?: string
  examsCount: number
  ok: boolean
  attendanceProtocol?: string
  errorMessage?: string
  warningMessage?: string
}

/** Aplica no store o resultado da criação REAL dos atendimentos. */
export function applyImportResults(results: BatchProcessResult[]) {
  const byId = new Map(results.map(r => [r.orderId, r]))
  orders = orders.map(o => {
    const r = byId.get(o.id)
    if (!r) return o
    if (!r.ok) return { ...o, status: 'error' as const, errorMessage: r.errorMessage }
    return {
      ...o,
      status: 'processed' as const,
      errorMessage: undefined,
      attendanceProtocol: r.attendanceProtocol,
    }
  })
  emit()
}
