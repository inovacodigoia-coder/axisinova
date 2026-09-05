import { useSyncExternalStore } from 'react'
import type { PartnerOrder } from '@/types/api-partner-orders.types'
import { DEMO_PARTNER_ORDERS } from '@/mocks/api-partner-orders.mock'

/**
 * Store local (mock) dos Pedidos Recebidos via API dos Parceiros.
 * Etapa 2: sem persistência real — dados em memória durante a sessão.
 */
let orders: PartnerOrder[] = [...DEMO_PARTNER_ORDERS]
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

/** Mock: marca o pedido como "Recebido" novamente (reprocessamento não executa lógica real). */
export function markOrderForReprocess(id: string) {
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
      attendanceId: r.attendanceProtocol ? `att_${r.attendanceProtocol}` : o.attendanceId,
    }
  })
  emit()
}


