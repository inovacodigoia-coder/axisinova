import { createContext, useCallback, useContext, useEffect, useReducer, useMemo, type ReactNode } from 'react'
import type { QueueEntry, QueueStatus, TicketCategory, DocumentValidationStatus } from '@/types/reception.types'
import { MOCK_QUEUE } from '@/mocks/reception.mock'
import { useAuth } from '@/context/AuthContext'
import { isDemoCompany } from '@/mocks/registers.mock'

interface QueueState {
  entries: QueueEntry[]
  lastCalledTicket: QueueEntry | null
  callHistory: QueueEntry[]
  counters: Record<TicketCategory, number>
}

type QueueAction =
  | { type: 'ADD_TO_QUEUE'; payload: QueueEntry }
  | { type: 'CALL_TICKET'; payload: string }
  | { type: 'UPDATE_STATUS'; payload: { id: string; status: QueueStatus; room?: string; documentsValidated?: boolean; documentsStatus?: DocumentValidationStatus; checkedInAt?: string } }
  | { type: 'COMPLETE'; payload: string }
  | { type: 'SKIP'; payload: string }
  | { type: 'RECALL'; payload: string }
  | { type: 'INCREMENT_WAIT' }

function reducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case 'ADD_TO_QUEUE':
      return { ...state, entries: [...state.entries, action.payload] }

    case 'CALL_TICKET': {
      const entries = state.entries.map(e =>
        e.id === action.payload
          ? { ...e, status: 'called' as QueueStatus, calledAt: new Date().toISOString(), callCount: e.callCount + 1 }
          : e
      )
      const called = entries.find(e => e.id === action.payload) || null
      return {
        ...state,
        entries,
        lastCalledTicket: called,
        callHistory: called ? [called, ...state.callHistory.slice(0, 9)] : state.callHistory,
      }
    }

    case 'UPDATE_STATUS':
      return {
        ...state,
        entries: state.entries.map(e =>
          e.id === action.payload.id
            ? {
                ...e,
                status: action.payload.status,
                room: action.payload.room || e.room,
                documentsValidated: action.payload.documentsValidated ?? e.documentsValidated,
                documentsStatus: action.payload.documentsStatus ?? e.documentsStatus,
                checkedInAt: action.payload.checkedInAt ?? e.checkedInAt,
              }
            : e
        ),
      }

    case 'COMPLETE':
      return {
        ...state,
        entries: state.entries.map(e =>
          e.id === action.payload ? { ...e, status: 'completed' as QueueStatus } : e
        ),
      }

    case 'SKIP': {
      const entry = state.entries.find(e => e.id === action.payload)
      if (!entry) return state
      const others = state.entries.filter(e => e.id !== action.payload)
      return { ...state, entries: [...others, { ...entry, status: 'waiting' as QueueStatus }] }
    }

    case 'RECALL': {
      const entries = state.entries.map(e =>
        e.id === action.payload
          ? { ...e, calledAt: new Date().toISOString(), callCount: e.callCount + 1, status: 'called' as QueueStatus }
          : e
      )
      const recalled = entries.find(e => e.id === action.payload) || null
      return {
        ...state,
        entries,
        lastCalledTicket: recalled,
        callHistory: recalled ? [recalled, ...state.callHistory.slice(0, 9)] : state.callHistory,
      }
    }

    case 'INCREMENT_WAIT':
      return {
        ...state,
        entries: state.entries.map(e => {
          if (!['waiting', 'called', 'in_reception', 'documents_ok'].includes(e.status)) return e
          const ref = e.checkedInAt || e.createdAt
          const mins = Math.floor((Date.now() - new Date(ref).getTime()) / 60000)
          return { ...e, waitingMinutes: mins }
        }),
      }

    default:
      return state
  }
}

function initCounters(entries: QueueEntry[]): Record<TicketCategory, number> {
  const counts: Record<TicketCategory, number> = { SP: 0, SN: 0, EX: 0, PR: 0, RE: 0 }
  entries.forEach(e => {
    const num = parseInt(e.ticketNumber.slice(2))
    if (num >= counts[e.ticketCategory]) counts[e.ticketCategory] = num
  })
  return counts
}

const emptyDocStatus: DocumentValidationStatus = {
  total: 0, required: 0, validated: 0, missingRequired: [], isComplete: false,
}

interface QueueContextValue {
  state: QueueState
  callTicket: (id: string) => void
  updateStatus: (id: string, status: QueueStatus, room?: string, extra?: { documentsValidated?: boolean; documentsStatus?: DocumentValidationStatus; checkedInAt?: string }) => void
  completeEntry: (id: string) => void
  skipEntry: (id: string) => void
  recallEntry: (id: string) => void
  addToQueue: (entry: Omit<QueueEntry, 'id' | 'ticketNumber' | 'ticketCategory' | 'callCount' | 'waitingMinutes' | 'createdAt' | 'documentsValidated' | 'documentsStatus'> & { ticketCategory?: TicketCategory }) => void
  stats: { waiting: number; inProgress: number; completed: number; avgWaitTime: number }
  isDemo: boolean
}

const QueueContext = createContext<QueueContextValue | null>(null)

export function QueueProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const companyId = user?.companyId
  const isDemo = isDemoCompany(companyId)

  const initialEntries = isDemo ? MOCK_QUEUE : []

  const [state, dispatch] = useReducer(reducer, {
    entries: initialEntries,
    lastCalledTicket: initialEntries.find(e => e.status === 'called') || null,
    callHistory: [],
    counters: initCounters(initialEntries),
  })

  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'INCREMENT_WAIT' }), 60000)
    return () => clearInterval(id)
  }, [])

  const callTicket = useCallback((id: string) => dispatch({ type: 'CALL_TICKET', payload: id }), [])
  const updateStatus = useCallback((id: string, status: QueueStatus, room?: string, extra?: { documentsValidated?: boolean; documentsStatus?: DocumentValidationStatus; checkedInAt?: string }) =>
    dispatch({ type: 'UPDATE_STATUS', payload: { id, status, room, ...extra } }), [])
  const completeEntry = useCallback((id: string) => dispatch({ type: 'COMPLETE', payload: id }), [])
  const skipEntry = useCallback((id: string) => dispatch({ type: 'SKIP', payload: id }), [])
  const recallEntry = useCallback((id: string) => dispatch({ type: 'RECALL', payload: id }), [])

  const addToQueue = useCallback((entry: Omit<QueueEntry, 'id' | 'ticketNumber' | 'ticketCategory' | 'callCount' | 'waitingMinutes' | 'createdAt' | 'documentsValidated' | 'documentsStatus'> & { ticketCategory?: TicketCategory }) => {
    const cat: TicketCategory = entry.ticketCategory
      || (entry.isPreferential ? 'SP'
      : entry.appointmentType === 'exam' ? 'EX'
      : entry.appointmentType === 'procedure' ? 'PR'
      : 'SN')
    const today = new Date().toISOString().slice(0, 10)
    const todayCount = state.entries.filter(e =>
      e.ticketCategory === cat && e.createdAt.startsWith(today)
    ).length
    const next = todayCount + 1
    const ticketNumber = `${cat}${String(next).padStart(3, '0')}`
    dispatch({
      type: 'ADD_TO_QUEUE',
      payload: {
        ...entry,
        id: `q_${Date.now()}`,
        ticketNumber,
        ticketCategory: cat,
        callCount: 0,
        waitingMinutes: 0,
        createdAt: new Date().toISOString(),
        documentsValidated: false,
        documentsStatus: emptyDocStatus,
      } as QueueEntry,
    })
  }, [state.entries])

  const active = state.entries.filter(e => e.status !== 'completed' && e.status !== 'absent')
  const stats = useMemo(() => ({
    waiting: active.filter(e => ['waiting', 'called', 'in_reception', 'documents_ok', 'called_doctor'].includes(e.status)).length,
    inProgress: active.filter(e => e.status === 'in_progress').length,
    completed: state.entries.filter(e => e.status === 'completed').length,
    avgWaitTime: active.length ? Math.round(active.reduce((s, e) => s + e.waitingMinutes, 0) / active.length) : 0,
  }), [state.entries])

  return (
    <QueueContext.Provider value={{ state, callTicket, updateStatus, completeEntry, skipEntry, recallEntry, addToQueue, stats, isDemo }}>
      {children}
    </QueueContext.Provider>
  )
}

export function useQueue() {
  const ctx = useContext(QueueContext)
  if (!ctx) throw new Error('useQueue must be used within QueueProvider')
  return ctx
}
