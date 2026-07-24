import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { addMockOrder, getMockOrders, nextOrderNumber, updateMockOrder } from '@/mocks/attendance-cadastro.mock'
import type { AttendanceOrder } from '@/types/attendance-cadastro.types'

export function useAttendanceCadastro() {
  const { user } = useAuth()
  const companyId = user?.companyId || 'comp_001'
  const [orders, setOrders] = useState<AttendanceOrder[]>(() => getMockOrders(companyId))

  const refresh = useCallback(() => setOrders(getMockOrders(companyId)), [companyId])

  const createOrder = useCallback((data: any): AttendanceOrder => {
    const now = new Date().toISOString()
    
    // Protocol formula: [idPaciente] - [nSequencial] - [idOrigem]
    const patientNum = data.patientId.split('-')[0] || data.patientId.substring(0, 4);
    const sequence = orders.filter(o => o.patientId === data.patientId).length + 1;
    const origin = String(data.originCode || '00').padStart(2, '0');
    const protocol = `${patientNum}-${sequence}-${origin}`;

    const order: AttendanceOrder = {
      ...data,
      id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      orderNumber: protocol, // Protocol is the primary reference
      companyId,
      registeredBy: user?.id || 'user_unknown',
      registeredByName: user?.name,
      registeredAt: now,
      updatedAt: now,
    }
    addMockOrder(order)
    refresh()
    return order
  }, [companyId, user, refresh, orders])

  const updateOrder = useCallback((orderId: string, patch: Partial<AttendanceOrder>) => {
    updateMockOrder(orderId, patch)
    refresh()
  }, [refresh])

  return { orders, createOrder, updateOrder, refresh }
}

const DRAFT_PREFIX = 'attendance_draft_'

export function loadDraft(ticketId: string): any | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_PREFIX + ticketId)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function saveDraft(ticketId: string, data: any) {
  try { sessionStorage.setItem(DRAFT_PREFIX + ticketId, JSON.stringify({ ...data, savedAt: new Date().toISOString() })) } catch {}
}

export function clearDraft(ticketId: string) {
  try { sessionStorage.removeItem(DRAFT_PREFIX + ticketId) } catch {}
}

export function useDraftAutosave(ticketId: string | undefined, data: any, enabled: boolean) {
  useEffect(() => {
    if (!ticketId || !enabled) return
    const id = setTimeout(() => saveDraft(ticketId, data), 800)
    return () => clearTimeout(id)
  }, [ticketId, data, enabled])
}
