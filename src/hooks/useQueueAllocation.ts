import { useCallback, useMemo } from 'react'
import { useQueueSystem } from '@/context/QueueSystemContext'
import type { QueueLine, Ticket } from '@/types/queue-system.types'

export function useQueueAllocation(unitId: string) {
  const { state, dispatch, getUnitQueues, getUnitTickets } = useQueueSystem()

  const internalQueues: QueueLine[] = useMemo(
    () => getUnitQueues(unitId).filter(q => q.type === 'internal' && q.isActive),
    [unitId, getUnitQueues, state.queueLines],
  )

  const allocate = useCallback((queueLineId: string, patientName: string, attendanceOrderId?: string): Ticket | null => {
    const line = internalQueues.find(q => q.id === queueLineId)
    if (!line) return null
    const existingCount = state.tickets.filter(t => t.queueLineId === line.id).length
    const number = existingCount + 1
    const ticket: Ticket = {
      id: `tk_int_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      unitId,
      queueLineId: line.id,
      queueLineName: line.name,
      prefix: line.prefix,
      number,
      displayCode: `${line.prefix}${String(number).padStart(3, '0')}`,
      status: 'waiting',
      callCount: 0,
      patientName,
      generatedAt: new Date().toISOString(),
      timeline: [{
        id: `tl_${Date.now()}`,
        action: 'created',
        description: `Alocado na fila interna a partir do pedido ${attendanceOrderId || ''}`.trim(),
        timestamp: new Date().toISOString(),
      }],
    }
    dispatch({ type: 'ADD_TICKET', payload: ticket })
    return ticket
  }, [internalQueues, state.tickets, unitId, dispatch])

  const positionInLine = useCallback((queueLineId: string) => {
    return state.tickets.filter(t => t.queueLineId === queueLineId && t.status === 'waiting').length
  }, [state.tickets])

  return { internalQueues, allocate, positionInLine }
}
