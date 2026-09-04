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
