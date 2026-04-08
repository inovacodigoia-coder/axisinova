import { createContext, useCallback, useContext, useReducer, useEffect, useMemo, type ReactNode } from 'react'
import type { Unit, QueueLine, Guiche, Totem, TV, Ticket, TicketStatus, AttendantSession, MediaAttachment } from '@/types/queue-system.types'
import { MOCK_UNITS, MOCK_QUEUE_LINES, MOCK_GUICHES, MOCK_TOTEMS, MOCK_TVS, MOCK_TICKETS } from '@/mocks/queue-system.mock'
import { useAuth } from '@/context/AuthContext'

const DEMO_COMPANY_ID = 'comp_001'

interface QueueSystemState {
  units: Unit[]
  queueLines: QueueLine[]
  guiches: Guiche[]
  totems: Totem[]
  tvs: TV[]
  tickets: Ticket[]
  lastCalledTicket: Ticket | null
  attendantSession: AttendantSession | null
}

type QueueSystemAction =
  | { type: 'SET_UNITS'; payload: Unit[] }
  | { type: 'ADD_UNIT'; payload: Unit }
  | { type: 'UPDATE_UNIT'; payload: Unit }
  | { type: 'REMOVE_UNIT'; payload: string }
  | { type: 'SET_QUEUE_LINES'; payload: QueueLine[] }
  | { type: 'ADD_QUEUE_LINE'; payload: QueueLine }
  | { type: 'UPDATE_QUEUE_LINE'; payload: QueueLine }
  | { type: 'REMOVE_QUEUE_LINE'; payload: string }
  | { type: 'REORDER_QUEUE_LINES'; payload: QueueLine[] }
  | { type: 'SET_GUICHES'; payload: Guiche[] }
  | { type: 'ADD_GUICHE'; payload: Guiche }
  | { type: 'UPDATE_GUICHE'; payload: Guiche }
  | { type: 'REMOVE_GUICHE'; payload: string }
  | { type: 'SET_TOTEMS'; payload: Totem[] }
  | { type: 'ADD_TOTEM'; payload: Totem }
  | { type: 'UPDATE_TOTEM'; payload: Totem }
  | { type: 'REMOVE_TOTEM'; payload: string }
  | { type: 'SET_TVS'; payload: TV[] }
  | { type: 'ADD_TV'; payload: TV }
  | { type: 'UPDATE_TV'; payload: TV }
  | { type: 'REMOVE_TV'; payload: string }
  | { type: 'ADD_MEDIA'; payload: { tvId: string; attachment: MediaAttachment } }
  | { type: 'REMOVE_MEDIA'; payload: { tvId: string; attachmentId: string } }
  | { type: 'ADD_TICKET'; payload: Ticket }
  | { type: 'CALL_TICKET'; payload: { ticketId: string; guicheId: string; guicheName: string; tvId?: string; attendantName: string } }
  | { type: 'ATTEND_TICKET'; payload: { ticketId: string; attendantName: string; guicheName: string } }
  | { type: 'REALLOCATE_TICKET'; payload: { ticketId: string; queueId: string; queueName: string; patientName?: string; attendantName: string } }
  | { type: 'FINALIZE_TICKET'; payload: { ticketId: string; attendantName: string } }
  | { type: 'REACTIVATE_TICKET'; payload: { ticketId: string; attendantName: string } }
  | { type: 'SET_ATTENDANT_SESSION'; payload: AttendantSession | null }

function reducer(state: QueueSystemState, action: QueueSystemAction): QueueSystemState {
  switch (action.type) {
    case 'SET_UNITS': return { ...state, units: action.payload }
    case 'ADD_UNIT': return { ...state, units: [...state.units, action.payload] }
    case 'UPDATE_UNIT': return { ...state, units: state.units.map(u => u.id === action.payload.id ? action.payload : u) }
    case 'REMOVE_UNIT': return { ...state, units: state.units.filter(u => u.id !== action.payload) }
    case 'SET_QUEUE_LINES': return { ...state, queueLines: action.payload }
    case 'ADD_QUEUE_LINE': return { ...state, queueLines: [...state.queueLines, action.payload] }
    case 'UPDATE_QUEUE_LINE': return { ...state, queueLines: state.queueLines.map(q => q.id === action.payload.id ? action.payload : q) }
    case 'REMOVE_QUEUE_LINE': return { ...state, queueLines: state.queueLines.filter(q => q.id !== action.payload) }
    case 'REORDER_QUEUE_LINES': return { ...state, queueLines: action.payload }
    case 'SET_GUICHES': return { ...state, guiches: action.payload }
    case 'ADD_GUICHE': return { ...state, guiches: [...state.guiches, action.payload] }
    case 'UPDATE_GUICHE': return { ...state, guiches: state.guiches.map(g => g.id === action.payload.id ? action.payload : g) }
    case 'REMOVE_GUICHE': return { ...state, guiches: state.guiches.filter(g => g.id !== action.payload) }
    case 'SET_TOTEMS': return { ...state, totems: action.payload }
    case 'ADD_TOTEM': return { ...state, totems: [...state.totems, action.payload] }
    case 'UPDATE_TOTEM': return { ...state, totems: state.totems.map(t => t.id === action.payload.id ? action.payload : t) }
    case 'REMOVE_TOTEM': return { ...state, totems: state.totems.filter(t => t.id !== action.payload) }
    case 'SET_TVS': return { ...state, tvs: action.payload }
    case 'ADD_TV': return { ...state, tvs: [...state.tvs, action.payload] }
    case 'UPDATE_TV': return { ...state, tvs: state.tvs.map(t => t.id === action.payload.id ? action.payload : t) }
    case 'REMOVE_TV': return { ...state, tvs: state.tvs.filter(t => t.id !== action.payload) }
    case 'ADD_MEDIA': return { ...state, tvs: state.tvs.map(t => t.id === action.payload.tvId ? { ...t, mediaAttachments: [...t.mediaAttachments, action.payload.attachment] } : t) }
    case 'REMOVE_MEDIA': return { ...state, tvs: state.tvs.map(t => t.id === action.payload.tvId ? { ...t, mediaAttachments: t.mediaAttachments.filter(m => m.id !== action.payload.attachmentId) } : t) }

    case 'ADD_TICKET': return { ...state, tickets: [...state.tickets, action.payload] }

    case 'CALL_TICKET': {
      const now = new Date().toISOString()
      const tickets = state.tickets.map(t => {
        if (t.id !== action.payload.ticketId) return t
        return {
          ...t, status: 'called' as TicketStatus, callCount: t.callCount + 1, calledAt: now,
          guicheId: action.payload.guicheId, guicheName: action.payload.guicheName, tvId: action.payload.tvId,
          timeline: [...t.timeline, { id: `tl_${Date.now()}`, action: 'called' as const, description: `Chamado por ${action.payload.attendantName} (${action.payload.guicheName})`, performedBy: action.payload.attendantName, guicheName: action.payload.guicheName, timestamp: now }],
        }
      })
      return { ...state, tickets, lastCalledTicket: tickets.find(t => t.id === action.payload.ticketId) || null }
    }

    case 'ATTEND_TICKET': {
      const now = new Date().toISOString()
      return {
        ...state,
        tickets: state.tickets.map(t => t.id !== action.payload.ticketId ? t : {
          ...t, status: 'in_attendance' as TicketStatus, attendanceStartedAt: now,
          timeline: [...t.timeline, { id: `tl_${Date.now()}`, action: 'attended' as const, description: `Atendido por ${action.payload.attendantName} (${action.payload.guicheName})`, performedBy: action.payload.attendantName, guicheName: action.payload.guicheName, timestamp: now }],
        }),
      }
    }

    case 'REALLOCATE_TICKET': {
      const now = new Date().toISOString()
      return {
        ...state,
        tickets: state.tickets.map(t => t.id !== action.payload.ticketId ? t : {
          ...t, status: 'reallocated' as TicketStatus, reallocatedAt: now,
          reallocatedToQueueId: action.payload.queueId, reallocatedToQueueName: action.payload.queueName,
          patientName: action.payload.patientName || t.patientName,
          timeline: [...t.timeline, { id: `tl_${Date.now()}`, action: 'reallocated' as const, description: `Realocado para ${action.payload.queueName}${action.payload.patientName ? ` — ${action.payload.patientName}` : ''}`, performedBy: action.payload.attendantName, timestamp: now }],
        }),
      }
    }

    case 'FINALIZE_TICKET': {
      const now = new Date().toISOString()
      return {
        ...state,
        tickets: state.tickets.map(t => t.id !== action.payload.ticketId ? t : {
          ...t, status: 'finalized' as TicketStatus, finalizedAt: now,
          timeline: [...t.timeline, { id: `tl_${Date.now()}`, action: 'finalized' as const, description: `Finalizado por ${action.payload.attendantName}`, performedBy: action.payload.attendantName, timestamp: now }],
        }),
      }
    }

    case 'REACTIVATE_TICKET': {
      const now = new Date().toISOString()
      return {
        ...state,
        tickets: state.tickets.map(t => t.id !== action.payload.ticketId ? t : {
          ...t, status: 'waiting' as TicketStatus, finalizedAt: undefined,
          timeline: [...t.timeline, { id: `tl_${Date.now()}`, action: 'reactivated' as const, description: `Reativada por ${action.payload.attendantName}`, performedBy: action.payload.attendantName, timestamp: now }],
        }),
      }
    }

    case 'SET_ATTENDANT_SESSION': return { ...state, attendantSession: action.payload }

    default: return state
  }
}

interface QueueSystemContextValue {
  state: QueueSystemState
  dispatch: React.Dispatch<QueueSystemAction>
  getUnitQueues: (unitId: string) => QueueLine[]
  getUnitGuiches: (unitId: string) => Guiche[]
  getUnitTotems: (unitId: string) => Totem[]
  getUnitTVs: (unitId: string) => TV[]
  getUnitTickets: (unitId: string, queueLineIds?: string[]) => Ticket[]
}

const QueueSystemContext = createContext<QueueSystemContextValue | null>(null)

export function QueueSystemProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const isDemoCompany = user?.companyId === DEMO_COMPANY_ID

  const [state, dispatch] = useReducer(reducer, {
    units: isDemoCompany ? MOCK_UNITS : [],
    queueLines: isDemoCompany ? MOCK_QUEUE_LINES : [],
    guiches: isDemoCompany ? MOCK_GUICHES : [],
    totems: isDemoCompany ? MOCK_TOTEMS : [],
    tvs: isDemoCompany ? MOCK_TVS : [],
    tickets: isDemoCompany ? MOCK_TICKETS : [],
    lastCalledTicket: null,
    attendantSession: null,
  })
  useEffect(() => {
    const interval = setInterval(() => {
      if (!state.attendantSession?.unitId) return
      const unitQueues = state.queueLines.filter(q => q.unitId === state.attendantSession!.unitId && q.type === 'external')
      if (!unitQueues.length) return
      const randomQueue = unitQueues[Math.floor(Math.random() * unitQueues.length)]
      const existingCount = state.tickets.filter(t => t.queueLineId === randomQueue.id).length
      const newNumber = existingCount + 1
      const ticket: Ticket = {
        id: `tk_auto_${Date.now()}`,
        unitId: state.attendantSession!.unitId,
        queueLineId: randomQueue.id,
        queueLineName: randomQueue.name,
        prefix: randomQueue.prefix,
        number: newNumber,
        displayCode: `${randomQueue.prefix}${newNumber}`,
        status: 'waiting',
        callCount: 0,
        generatedAt: new Date().toISOString(),
        timeline: [{ id: `tl_auto_${Date.now()}`, action: 'created', description: 'Ficha gerada no totem', timestamp: new Date().toISOString() }],
      }
      dispatch({ type: 'ADD_TICKET', payload: ticket })
    }, 60000)
    return () => clearInterval(interval)
  }, [state.attendantSession?.unitId, state.queueLines, state.tickets])

  const getUnitQueues = useCallback((unitId: string) => state.queueLines.filter(q => q.unitId === unitId), [state.queueLines])
  const getUnitGuiches = useCallback((unitId: string) => state.guiches.filter(g => g.unitId === unitId), [state.guiches])
  const getUnitTotems = useCallback((unitId: string) => state.totems.filter(t => t.unitId === unitId), [state.totems])
  const getUnitTVs = useCallback((unitId: string) => state.tvs.filter(t => t.unitId === unitId), [state.tvs])
  const getUnitTickets = useCallback((unitId: string, queueLineIds?: string[]) => {
    let filtered = state.tickets.filter(t => t.unitId === unitId)
    if (queueLineIds?.length) filtered = filtered.filter(t => queueLineIds.includes(t.queueLineId))
    return filtered
  }, [state.tickets])

  const value = useMemo(() => ({ state, dispatch, getUnitQueues, getUnitGuiches, getUnitTotems, getUnitTVs, getUnitTickets }), [state, dispatch, getUnitQueues, getUnitGuiches, getUnitTotems, getUnitTVs, getUnitTickets])

  return <QueueSystemContext.Provider value={value}>{children}</QueueSystemContext.Provider>
}

export function useQueueSystem() {
  const ctx = useContext(QueueSystemContext)
  if (!ctx) throw new Error('useQueueSystem must be used within QueueSystemProvider')
  return ctx
}
