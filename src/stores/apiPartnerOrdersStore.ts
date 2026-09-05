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

function nextProtocolNumber(): number {
  const nums = orders
    .map(o => Number((o.attendanceProtocol ?? '').split('-')[0]))
    .filter(n => Number.isFinite(n) && n > 0)
  return (nums.length ? Math.max(...nums) : 100) + 1
}

/**
 * Mock: cria os Atendimentos para os pedidos selecionados.
 * Regra: todos os exames precisam ter código reconhecido no catálogo (tudo ou nada por pedido).
 */
export function processPartnerOrders(ids: string[]): BatchProcessResult[] {
  let seq = nextProtocolNumber()
  const results: BatchProcessResult[] = []

  orders = orders.map(o => {
    if (!ids.includes(o.id) || o.status !== 'received') return o

    const invalid = o.exams.filter(e => !e.recognized)
    const base = {
      orderId: o.id,
      patientName: o.patient.name,
      cpf: o.patient.cpf,
      partnerId: o.partnerId,
      partnerProtocol: o.partnerProtocol,
      examsCount: o.exams.length,
    }

    if (invalid.length) {
      const errorMessage = `${invalid.length} de ${o.exams.length} exames com código inválido (${invalid.map(e => e.code).join(', ')}) — nenhum atendimento foi criado.`
      results.push({ ...base, ok: false, errorMessage })
      return { ...o, status: 'error' as const, errorMessage }
    }

    const attendanceProtocol = `${seq++}-00`
    results.push({ ...base, ok: true, attendanceProtocol })
    return {
      ...o,
      status: 'processed' as const,
      errorMessage: undefined,
      attendanceProtocol,
      attendanceId: `att_${attendanceProtocol.split('-')[0]}`,
    }
  })

  emit()
  return results
}

