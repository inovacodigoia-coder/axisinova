import { createContext, useCallback, useContext, useReducer, type ReactNode } from 'react'
import type { Guide, Glosa, Lote, GuideStatus, GuideAuditEntry } from '@/types/billing.types'
import type { ExamResult } from '@/types/results.types'
import { useAuth } from '@/context/AuthContext'
import { MOCK_GUIDES, MOCK_GLOSAS, MOCK_LOTES } from '@/mocks/billing.mock'
import { MOCK_RESULTS } from '@/mocks/results.mock'

const DEMO_COMPANY = 'comp_001'
const STORAGE_KEY = 'axis-inova:billing'

function generateId(): string {
  return crypto.randomUUID?.() || `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function generateTISSNumber(year: number, seq: number): string {
  return `TISS-${year}-${seq.toString().padStart(5, '0')}`
}

function generateLoteNumber(year: number, seq: number): string {
  return `LOTE-${year}-${seq.toString().padStart(3, '0')}`
}

function generateProtocolNumber(year: number, seq: number): string {
  return `PROT-${year}-${seq.toString().padStart(4, '0')}`
}

// ── State ──────────────────────────────────────────────────────

interface BillingState {
  guides: Guide[]
  lotes: Lote[]
  glosas: Glosa[]
  results: ExamResult[]
  nextGuideSeq: number
  nextLoteSeq: number
  nextProtocolSeq: number
}

type BillingAction =
  | { type: 'SET_GUIDES'; payload: Guide[] }
  | { type: 'ADD_GUIDE'; payload: Guide }
  | { type: 'UPDATE_GUIDE'; payload: Partial<Guide> & { id: string } }
  | { type: 'SET_LOTES'; payload: Lote[] }
  | { type: 'ADD_LOTE'; payload: Lote }
  | { type: 'UPDATE_LOTE'; payload: Partial<Lote> & { id: string } }
  | { type: 'SET_GLOSAS'; payload: Glosa[] }
  | { type: 'ADD_GLOSA'; payload: Glosa }
  | { type: 'UPDATE_GLOSA'; payload: Partial<Glosa> & { id: string } }
  | { type: 'SET_RESULTS'; payload: ExamResult[] }
  | { type: 'ADD_RESULT'; payload: ExamResult }
  | { type: 'UPDATE_RESULT'; payload: Partial<ExamResult> & { id: string } }

function reducer(state: BillingState, action: BillingAction): BillingState {
  switch (action.type) {
    case 'SET_GUIDES': return { ...state, guides: action.payload }
    case 'ADD_GUIDE': return { ...state, guides: [...state.guides, action.payload], nextGuideSeq: state.nextGuideSeq + 1 }
    case 'UPDATE_GUIDE': return { ...state, guides: state.guides.map(g => g.id === action.payload.id ? { ...g, ...action.payload } : g) }
    case 'SET_LOTES': return { ...state, lotes: action.payload }
    case 'ADD_LOTE': return { ...state, lotes: [...state.lotes, action.payload], nextLoteSeq: state.nextLoteSeq + 1 }
    case 'UPDATE_LOTE': return { ...state, lotes: state.lotes.map(l => l.id === action.payload.id ? { ...l, ...action.payload } : l) }
    case 'SET_GLOSAS': return { ...state, glosas: action.payload }
    case 'ADD_GLOSA': return { ...state, glosas: [...state.glosas, action.payload] }
    case 'UPDATE_GLOSA': return { ...state, glosas: state.glosas.map(g => g.id === action.payload.id ? { ...g, ...action.payload } : g) }
    case 'SET_RESULTS': return { ...state, results: action.payload }
    case 'ADD_RESULT': return { ...state, results: [...state.results, action.payload], nextProtocolSeq: state.nextProtocolSeq + 1 }
    case 'UPDATE_RESULT': return { ...state, results: state.results.map(r => r.id === action.payload.id ? { ...r, ...action.payload } : r) }
    default: return state
  }
}

function getInitialState(companyId: string | null): BillingState {
  if (companyId === DEMO_COMPANY) {
    return {
      guides: MOCK_GUIDES,
      lotes: MOCK_LOTES,
      glosas: MOCK_GLOSAS,
      results: MOCK_RESULTS,
      nextGuideSeq: MOCK_GUIDES.length + 1,
      nextLoteSeq: MOCK_LOTES.length + 1,
      nextProtocolSeq: 1,
    }
  }
  // Try restore from localStorage
  const key = `${STORAGE_KEY}:${companyId}`
  try {
    const saved = localStorage.getItem(key)
    if (saved) {
      const parsed = JSON.parse(saved) as BillingState
      return parsed
    }
  } catch { /* ignore */ }

  return {
    guides: [],
    lotes: [],
    glosas: [],
    results: [],
    nextGuideSeq: 1,
    nextLoteSeq: 1,
    nextProtocolSeq: 1,
  }
}

// ── Context ────────────────────────────────────────────────────

interface BillingContextValue {
  // Data filtered by company
  guides: Guide[]
  lotes: Lote[]
  glosas: Glosa[]
  results: ExamResult[]
  // Sequentials
  nextGuideSeq: number
  nextLoteSeq: number
  nextProtocolSeq: number
  // Guide actions
  addGuide: (guide: Guide) => void
  updateGuide: (data: Partial<Guide> & { id: string }) => void
  returnGuideToReception: (guideId: string, reason: string, notes: string, userId: string, userName: string) => void
  correctGuide: (guideId: string, correctionNotes: string, userId: string, userName: string) => void
  // Lote actions
  addLote: (lote: Lote) => void
  updateLote: (data: Partial<Lote> & { id: string }) => void
  // Glosa actions
  addGlosa: (glosa: Glosa) => void
  updateGlosa: (data: Partial<Glosa> & { id: string }) => void
  // Result actions
  addResult: (result: ExamResult) => void
  updateResult: (data: Partial<ExamResult> & { id: string }) => void
  deliverResult: (resultId: string, deliveredTo: 'patient' | 'responsible', toName: string, toDoc: string, userId: string) => void
  // Generators
  generateTISSNumber: () => string
  generateLoteNumber: () => string
  generateProtocolNumber: () => string
}

const BillingContext = createContext<BillingContextValue | null>(null)

export function BillingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const companyId = user?.companyId || null
  const [state, dispatch] = useReducer(reducer, companyId, getInitialState)

  // Persist state changes for non-demo companies
  const persist = useCallback((newState: BillingState) => {
    if (companyId && companyId !== DEMO_COMPANY) {
      try {
        localStorage.setItem(`${STORAGE_KEY}:${companyId}`, JSON.stringify(newState))
      } catch { /* ignore */ }
    }
  }, [companyId])

  // Filter by company
  const guides = state.guides.filter(g => g.companyId === companyId || g.companyId === DEMO_COMPANY && companyId === DEMO_COMPANY)
  const lotes = state.lotes.filter(l => l.companyId === companyId || l.companyId === DEMO_COMPANY && companyId === DEMO_COMPANY)
  const glosas = state.glosas.filter(g => g.companyId === companyId || g.companyId === DEMO_COMPANY && companyId === DEMO_COMPANY)
  const results = state.results.filter(r => r.companyId === companyId || r.companyId === DEMO_COMPANY && companyId === DEMO_COMPANY)

  const addGuide = useCallback((guide: Guide) => {
    dispatch({ type: 'ADD_GUIDE', payload: guide })
  }, [])

  const updateGuide = useCallback((data: Partial<Guide> & { id: string }) => {
    dispatch({ type: 'UPDATE_GUIDE', payload: { ...data, updatedAt: new Date().toISOString() } })
  }, [])

  const returnGuideToReception = useCallback((guideId: string, reason: string, notes: string, userId: string, userName: string) => {
    const guide = state.guides.find(g => g.id === guideId)
    if (!guide) return
    const entry: GuideAuditEntry = {
      id: generateId(),
      action: `Guia devolvida para recepção: ${reason}`,
      performedBy: userId,
      performedByName: userName,
      previousStatus: guide.status,
      newStatus: 'returned_reception',
      notes,
      timestamp: new Date().toISOString(),
    }
    dispatch({
      type: 'UPDATE_GUIDE',
      payload: {
        id: guideId,
        status: 'returned_reception',
        returnedReason: reason,
        returnedAt: new Date().toISOString(),
        returnedBy: userName,
        billerNotes: notes,
        auditLog: [...guide.auditLog, entry],
        updatedAt: new Date().toISOString(),
      },
    })
  }, [state.guides])

  const correctGuide = useCallback((guideId: string, correctionNotes: string, userId: string, userName: string) => {
    const guide = state.guides.find(g => g.id === guideId)
    if (!guide) return
    const entry: GuideAuditEntry = {
      id: generateId(),
      action: `Correção realizada pela recepção: ${correctionNotes}`,
      performedBy: userId,
      performedByName: userName,
      previousStatus: 'returned_reception',
      newStatus: 'authorized',
      notes: correctionNotes,
      timestamp: new Date().toISOString(),
    }
    dispatch({
      type: 'UPDATE_GUIDE',
      payload: {
        id: guideId,
        status: 'authorized',
        correctedAt: new Date().toISOString(),
        auditLog: [...guide.auditLog, entry],
        updatedAt: new Date().toISOString(),
      },
    })
  }, [state.guides])

  const addLote = useCallback((lote: Lote) => dispatch({ type: 'ADD_LOTE', payload: lote }), [])
  const updateLote = useCallback((data: Partial<Lote> & { id: string }) => dispatch({ type: 'UPDATE_LOTE', payload: data }), [])
  const addGlosa = useCallback((glosa: Glosa) => dispatch({ type: 'ADD_GLOSA', payload: glosa }), [])
  const updateGlosa = useCallback((data: Partial<Glosa> & { id: string }) => dispatch({ type: 'UPDATE_GLOSA', payload: data }), [])
  const addResult = useCallback((result: ExamResult) => dispatch({ type: 'ADD_RESULT', payload: result }), [])
  const updateResult = useCallback((data: Partial<ExamResult> & { id: string }) => dispatch({ type: 'UPDATE_RESULT', payload: data }), [])

  const deliverResult = useCallback((resultId: string, deliveredTo: 'patient' | 'responsible', toName: string, toDoc: string, userId: string) => {
    const year = new Date().getFullYear()
    const protocolNumber = generateProtocolNumber(year, state.nextProtocolSeq)
    dispatch({
      type: 'UPDATE_RESULT',
      payload: {
        id: resultId,
        status: 'delivered',
        deliveredAt: new Date().toISOString(),
        deliveredTo,
        deliveredToName: toName,
        deliveredToDocument: toDoc,
        deliveredBy: userId,
        deliveryProtocolNumber: protocolNumber,
        updatedAt: new Date().toISOString(),
      },
    })
  }, [state.nextProtocolSeq])

  const genTISS = useCallback(() => generateTISSNumber(new Date().getFullYear(), state.nextGuideSeq), [state.nextGuideSeq])
  const genLote = useCallback(() => generateLoteNumber(new Date().getFullYear(), state.nextLoteSeq), [state.nextLoteSeq])
  const genProtocol = useCallback(() => generateProtocolNumber(new Date().getFullYear(), state.nextProtocolSeq), [state.nextProtocolSeq])

  return (
    <BillingContext.Provider value={{
      guides, lotes, glosas, results,
      nextGuideSeq: state.nextGuideSeq,
      nextLoteSeq: state.nextLoteSeq,
      nextProtocolSeq: state.nextProtocolSeq,
      addGuide, updateGuide, returnGuideToReception, correctGuide,
      addLote, updateLote,
      addGlosa, updateGlosa,
      addResult, updateResult, deliverResult,
      generateTISSNumber: genTISS,
      generateLoteNumber: genLote,
      generateProtocolNumber: genProtocol,
    }}>
      {children}
    </BillingContext.Provider>
  )
}

export function useBillingContext() {
  const ctx = useContext(BillingContext)
  if (!ctx) throw new Error('useBillingContext must be used within BillingProvider')
  return ctx
}
