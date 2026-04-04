import { createContext, useCallback, useContext, useEffect, useReducer, type ReactNode } from 'react'
import type { QueueEntry, QueueStatus, TicketCategory } from '@/types/reception.types'
import { MOCK_QUEUE } from '@/mocks/reception.mock'

interface QueueState {
  entries: QueueEntry[]
  lastCalledTicket: QueueEntry | null
  callHistory: QueueEntry[]
  counters: Record<TicketCategory, number>
}

type QueueAction =
  | { type: 'ADD_TO_QUEUE'; payload: QueueEntry }
  | { type: 'CALL_TICKET'; payload: string }
  | { type: 'UPDATE_STATUS'; payload: { id: string; status: QueueStatus; room?: string } }
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
            ? { ...e, status: action.payload.status, room: action.payload.room || e.room }
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
        entries: state.entries.map(e =>
          ['waiting', 'called', 'in_reception', 'documents_ok'].includes(e.status)
            ? { ...e, waitingMinutes: e.waitingMinutes + 1 }
            : e
        ),
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

interface QueueContextValue {
  state: QueueState
  callTicket: (id: string) => void
  updateStatus: (id: string, status: QueueStatus, room?: string) => void
  completeEntry: (id: string) => void
  skipEntry: (id: string) => void
  recallEntry: (id: string) => void
  addToQueue: (entry: Omit<QueueEntry, 'id' | 'ticketNumber' | 'ticketCategory' | 'callCount' | 'waitingMinutes' | 'createdAt' | 'documentsValidated'>) => void
  stats: { waiting: number; inProgress: number; completed: number; avgWaitTime: number }
}

const QueueContext = createContext<QueueContextValue | null>(null)

export function QueueProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    entries: MOCK_QUEUE,
    lastCalledTicket: MOCK_QUEUE.find(e => e.status === 'called') || null,
    callHistory: [],
    counters: initCounters(MOCK_QUEUE),
  })

  // Increment wait time every 60 seconds
  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'INCREMENT_WAIT' }), 60000)
    return () => clearInterval(id)
  }, [])

  const callTicket = useCallback((id: string) => dispatch({ type: 'CALL_TICKET', payload: id }), [])
  const updateStatus = useCallback((id: string, status: QueueStatus, room?: string) =>
    dispatch({ type: 'UPDATE_STATUS', payload: { id, status, room } }), [])
  const completeEntry = useCallback((id: string) => dispatch({ type: 'COMPLETE', payload: id }), [])
  const skipEntry = useCallback((id: string) => dispatch({ type: 'SKIP', payload: id }), [])
  const recallEntry = useCallback((id: string) => dispatch({ type: 'RECALL', payload: id }), [])

  const addToQueue = useCallback((entry: Omit<QueueEntry, 'id' | 'ticketNumber' | 'ticketCategory' | 'callCount' | 'waitingMinutes' | 'createdAt' | 'documentsValidated'>) => {
    const cat: TicketCategory = entry.isPreferential ? 'SP'
      : entry.appointmentType === 'exam' ? 'EX'
      : entry.appointmentType === 'procedure' ? 'PR'
      : 'SN'
    const next = (state.counters[cat] || 0) + 1
    const ticketNumber = `${cat}${String(next).padStart(3, '0')}`
    state.counters[cat] = next
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
      },
    })
  }, [state.counters])

  const active = state.entries.filter(e => e.status !== 'completed' && e.status !== 'absent')
  const stats = {
    waiting: active.filter(e => ['waiting', 'called', 'in_reception', 'documents_ok', 'called_doctor'].includes(e.status)).length,
    inProgress: active.filter(e => e.status === 'in_progress').length,
    completed: state.entries.filter(e => e.status === 'completed').length,
    avgWaitTime: active.length ? Math.round(active.reduce((s, e) => s + e.waitingMinutes, 0) / active.length) : 0,
  }

  return (
    <QueueContext.Provider value={{ state, callTicket, updateStatus, completeEntry, skipEntry, recallEntry, addToQueue, stats }}>
      {children}
    </QueueContext.Provider>
  )
}

export function useQueue() {
  const ctx = useContext(QueueContext)
  if (!ctx) throw new Error('useQueue must be used within QueueProvider')
  return ctx
}
