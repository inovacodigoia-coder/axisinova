import { createContext, useCallback, useContext, useReducer, useEffect, useMemo, type ReactNode } from 'react'
import type { Unit, QueueLine, Guiche, Totem, TV, Ticket, TicketStatus, AttendantSession, MediaAttachment } from '@/types/queue-system.types'
import { MOCK_UNITS, MOCK_QUEUE_LINES, MOCK_GUICHES, MOCK_TOTEMS, MOCK_TVS, MOCK_TICKETS } from '@/mocks/queue-system.mock'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

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
  isLoading: boolean
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
  | { type: 'SET_LOADING'; payload: boolean }

function reducer(state: QueueSystemState, action: QueueSystemAction): QueueSystemState {
  switch (action.type) {
    case 'SET_LOADING': return { ...state, isLoading: action.payload }
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

// Helper to map DB rows to local types
function mapDbUnit(row: any): Unit {
  return { id: row.id, name: row.name, companyId: row.company_id, isActive: row.is_active, createdAt: row.created_at }
}
function mapDbTotem(row: any): Totem {
  // A senha é armazenada com hash no banco: nunca é devolvida em texto para a interface.
  return { id: row.id, unitId: row.unit_id, name: row.name, isActive: row.is_active, slug: row.slug || undefined, accessUsername: row.access_username || undefined, accessPassword: undefined }
}
function mapDbQueueLine(row: any): QueueLine {
  return {
    id: row.id, unitId: row.unit_id, name: row.name, prefix: row.prefix, type: row.type as any,
    category: row.category as any, isActive: row.is_active, order: row.sort_order,
    color: row.color, showOnTotem: row.show_on_totem, queueType: row.queue_type as any,
    linkedQueueIds: row.linked_queue_ids || [], prefixAlt: row.prefix_alt,
    totemId: row.totem_id, hasPreferential: row.has_preferential,
    hasPreferential80: row.has_preferential_80, allowTotemChoice: row.allow_totem_choice,
  }
}
function mapDbGuiche(row: any): Guiche {
  return { id: row.id, unitId: row.unit_id, name: row.name, type: row.type as any, isActive: row.is_active }
}
function mapDbTV(row: any): TV {
  return {
    id: row.id, unitId: row.unit_id, name: row.name, voiceType: row.voice_type as any,
    screenSize: row.screen_size as any, deviceCount: row.device_count,
    mediaMode: row.media_mode as any,
    mediaAttachments: Array.isArray(row.media_attachments) ? row.media_attachments : [],
    isActive: row.is_active,
    slug: row.slug || undefined,
    accessUsername: row.access_username || undefined,
    // A senha é armazenada com hash no banco: nunca é devolvida em texto para a interface.
    accessPassword: undefined,
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
  // Supabase CRUD helpers
  addUnitDB: (name: string, companyId: string) => Promise<Unit | null>
  updateUnitDB: (id: string, name: string) => Promise<boolean>
  removeUnitDB: (id: string) => Promise<boolean>
  addTotemDB: (unitId: string, name: string, companyId: string, extra?: { slug?: string; accessUsername?: string; accessPassword?: string }) => Promise<Totem | null>
  updateTotemDB: (id: string, name: string, extra?: { slug?: string; accessUsername?: string; accessPassword?: string }) => Promise<boolean>
  removeTotemDB: (id: string) => Promise<boolean>
  addQueueLineDB: (data: Omit<QueueLine, 'id' | 'isActive'> & { companyId: string }) => Promise<QueueLine | null>
  updateQueueLineDB: (data: QueueLine & { companyId?: string }) => Promise<boolean>
  removeQueueLineDB: (id: string) => Promise<boolean>
  addGuicheDB: (unitId: string, name: string, type: string, companyId: string) => Promise<Guiche | null>
  updateGuicheDB: (id: string, name: string, type: string) => Promise<boolean>
  removeGuicheDB: (id: string) => Promise<boolean>
  addTVDB: (data: Omit<TV, 'id' | 'isActive' | 'mediaAttachments'> & { companyId: string }) => Promise<TV | null>
  updateTVDB: (data: TV & { companyId?: string }) => Promise<boolean>
  removeTVDB: (id: string) => Promise<boolean>
  loadCompanyData: (companyId: string) => Promise<void>
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
    isLoading: false,
  })

  // Load data from Supabase for non-demo companies
  const loadCompanyData = useCallback(async (companyId: string) => {
    if (companyId === DEMO_COMPANY_ID) return
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const [unitsRes, totemsRes, queuesRes, guichesRes, tvsRes] = await Promise.all([
        supabase.from('queue_units').select('*').eq('company_id', companyId),
        supabase.from('queue_totems').select('*').eq('company_id', companyId),
        supabase.from('queue_lines').select('*').eq('company_id', companyId).order('sort_order'),
        supabase.from('queue_guiches').select('*').eq('company_id', companyId),
        supabase.from('queue_tvs').select('*').eq('company_id', companyId),
      ])
      if (unitsRes.data) dispatch({ type: 'SET_UNITS', payload: unitsRes.data.map(mapDbUnit) })
      if (totemsRes.data) dispatch({ type: 'SET_TOTEMS', payload: totemsRes.data.map(mapDbTotem) })
      if (queuesRes.data) dispatch({ type: 'SET_QUEUE_LINES', payload: queuesRes.data.map(mapDbQueueLine) })
      if (guichesRes.data) dispatch({ type: 'SET_GUICHES', payload: guichesRes.data.map(mapDbGuiche) })
      if (tvsRes.data) dispatch({ type: 'SET_TVS', payload: tvsRes.data.map(mapDbTV) })
    } catch (err) {
      console.error('Error loading queue data:', err)
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [])

  useEffect(() => {
    if (user?.companyId && user.companyId !== DEMO_COMPANY_ID) {
      loadCompanyData(user.companyId)
    }
  }, [user?.companyId, loadCompanyData])

  // Auto ticket generation for demo
  useEffect(() => {
    if (!isDemoCompany) return
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
  }, [isDemoCompany, state.attendantSession?.unitId, state.queueLines, state.tickets])

  // ====== Supabase CRUD helpers ======
  const addUnitDB = useCallback(async (name: string, companyId: string): Promise<Unit | null> => {
    if (!companyId) { toast.error('Empresa não identificada'); return null }
    const { data, error } = await supabase.from('queue_units').insert({ name, company_id: companyId }).select().single()
    if (error) { toast.error('Erro ao criar unidade: ' + error.message); console.error('addUnitDB error:', error); return null }
    const unit = mapDbUnit(data)
    dispatch({ type: 'ADD_UNIT', payload: unit })
    return unit
  }, [])

  const updateUnitDB = useCallback(async (id: string, name: string): Promise<boolean> => {
    const { error } = await supabase.from('queue_units').update({ name }).eq('id', id)
    if (error) { toast.error('Erro ao atualizar unidade'); return false }
    dispatch({ type: 'UPDATE_UNIT', payload: { ...state.units.find(u => u.id === id)!, name } })
    return true
  }, [state.units])

  const removeUnitDB = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('queue_units').delete().eq('id', id)
    if (error) { toast.error('Erro ao remover unidade'); return false }
    dispatch({ type: 'REMOVE_UNIT', payload: id })
    return true
  }, [])

  const addTotemDB = useCallback(async (unitId: string, name: string, companyId: string, extra?: { slug?: string; accessUsername?: string; accessPassword?: string }): Promise<Totem | null> => {
    const { data, error } = await supabase.from('queue_totems').insert({
      unit_id: unitId, name, company_id: companyId,
      slug: extra?.slug || null,
      access_username: extra?.accessUsername || null,
      access_password: extra?.accessPassword || null,
    }).select().single()
    if (error) { toast.error('Erro ao criar totem'); console.error(error); return null }
    const totem = mapDbTotem(data)
    dispatch({ type: 'ADD_TOTEM', payload: totem })
    return totem
  }, [])

  const updateTotemDB = useCallback(async (id: string, name: string, extra?: { slug?: string; accessUsername?: string; accessPassword?: string }): Promise<boolean> => {
    const payload: any = { name }
    if (extra) {
      payload.slug = extra.slug || null
      payload.access_username = extra.accessUsername || null
      // Só grava a senha quando uma nova for digitada (mantém a senha atual caso contrário).
      if (extra.accessPassword) payload.access_password = extra.accessPassword
    }
    const { error } = await supabase.from('queue_totems').update(payload).eq('id', id)
    if (error) { toast.error('Erro ao atualizar totem'); return false }
    const existing = state.totems.find(t => t.id === id)
    if (existing) dispatch({ type: 'UPDATE_TOTEM', payload: { ...existing, name, ...(extra ? { slug: extra.slug, accessUsername: extra.accessUsername, accessPassword: undefined } : {}) } })
    return true
  }, [state.totems])

  const removeTotemDB = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('queue_totems').delete().eq('id', id)
    if (error) { toast.error('Erro ao remover totem'); return false }
    dispatch({ type: 'REMOVE_TOTEM', payload: id })
    return true
  }, [])

  const addQueueLineDB = useCallback(async (data: Omit<QueueLine, 'id' | 'isActive'> & { companyId: string }): Promise<QueueLine | null> => {
    const { data: row, error } = await supabase.from('queue_lines').insert({
      company_id: data.companyId, unit_id: data.unitId, name: data.name, prefix: data.prefix,
      prefix_alt: data.prefixAlt || null, type: data.type, category: data.category,
      color: data.color, show_on_totem: data.showOnTotem, queue_type: data.queueType,
      linked_queue_ids: data.linkedQueueIds, totem_id: data.totemId || null,
      has_preferential: data.hasPreferential, has_preferential_80: data.hasPreferential80,
      allow_totem_choice: data.allowTotemChoice, sort_order: data.order,
    }).select().single()
    if (error) { toast.error('Erro ao criar fila'); console.error(error); return null }
    const ql = mapDbQueueLine(row)
    dispatch({ type: 'ADD_QUEUE_LINE', payload: ql })
    return ql
  }, [])

  const updateQueueLineDB = useCallback(async (data: QueueLine & { companyId?: string }): Promise<boolean> => {
    const { error } = await supabase.from('queue_lines').update({
      name: data.name, prefix: data.prefix, prefix_alt: data.prefixAlt || null,
      type: data.type, category: data.category, color: data.color,
      show_on_totem: data.showOnTotem, queue_type: data.queueType,
      linked_queue_ids: data.linkedQueueIds, totem_id: data.totemId || null,
      has_preferential: data.hasPreferential, has_preferential_80: data.hasPreferential80,
      allow_totem_choice: data.allowTotemChoice, sort_order: data.order,
    }).eq('id', data.id)
    if (error) { toast.error('Erro ao atualizar fila'); return false }
    dispatch({ type: 'UPDATE_QUEUE_LINE', payload: data })
    return true
  }, [])

  const removeQueueLineDB = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('queue_lines').delete().eq('id', id)
    if (error) { toast.error('Erro ao remover fila'); return false }
    dispatch({ type: 'REMOVE_QUEUE_LINE', payload: id })
    return true
  }, [])

  const addGuicheDB = useCallback(async (unitId: string, name: string, type: string, companyId: string): Promise<Guiche | null> => {
    const { data, error } = await supabase.from('queue_guiches').insert({ unit_id: unitId, name, type, company_id: companyId }).select().single()
    if (error) { toast.error('Erro ao criar guichê'); console.error(error); return null }
    const g = mapDbGuiche(data)
    dispatch({ type: 'ADD_GUICHE', payload: g })
    return g
  }, [])

  const updateGuicheDB = useCallback(async (id: string, name: string, type: string): Promise<boolean> => {
    const { error } = await supabase.from('queue_guiches').update({ name, type }).eq('id', id)
    if (error) { toast.error('Erro ao atualizar guichê'); return false }
    const existing = state.guiches.find(g => g.id === id)
    if (existing) dispatch({ type: 'UPDATE_GUICHE', payload: { ...existing, name, type: type as any } })
    return true
  }, [state.guiches])

  const removeGuicheDB = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('queue_guiches').delete().eq('id', id)
    if (error) { toast.error('Erro ao remover guichê'); return false }
    dispatch({ type: 'REMOVE_GUICHE', payload: id })
    return true
  }, [])

  const addTVDB = useCallback(async (data: Omit<TV, 'id' | 'isActive' | 'mediaAttachments'> & { companyId: string }): Promise<TV | null> => {
    const { data: row, error } = await supabase.from('queue_tvs').insert({
      company_id: data.companyId, unit_id: data.unitId, name: data.name,
      voice_type: data.voiceType, screen_size: data.screenSize,
      device_count: data.deviceCount, media_mode: data.mediaMode,
      slug: data.slug || null,
      access_username: data.accessUsername || null,
      access_password: data.accessPassword || null,
    } as any).select().single()
    if (error) { toast.error('Erro ao criar TV'); console.error(error); return null }
    const tv = mapDbTV(row)
    dispatch({ type: 'ADD_TV', payload: tv })
    return tv
  }, [])

  const updateTVDB = useCallback(async (data: TV & { companyId?: string }): Promise<boolean> => {
    const { error } = await supabase.from('queue_tvs').update({
      name: data.name, voice_type: data.voiceType, screen_size: data.screenSize,
      device_count: data.deviceCount, media_mode: data.mediaMode,
      media_attachments: data.mediaAttachments as any,
      slug: data.slug || null,
      access_username: data.accessUsername || null,
      access_password: data.accessPassword || null,
    } as any).eq('id', data.id)
    if (error) { toast.error('Erro ao atualizar TV'); return false }
    dispatch({ type: 'UPDATE_TV', payload: data })
    return true
  }, [])

  const removeTVDB = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('queue_tvs').delete().eq('id', id)
    if (error) { toast.error('Erro ao remover TV'); return false }
    dispatch({ type: 'REMOVE_TV', payload: id })
    return true
  }, [])

  const getUnitQueues = useCallback((unitId: string) => state.queueLines.filter(q => q.unitId === unitId), [state.queueLines])
  const getUnitGuiches = useCallback((unitId: string) => state.guiches.filter(g => g.unitId === unitId), [state.guiches])
  const getUnitTotems = useCallback((unitId: string) => state.totems.filter(t => t.unitId === unitId), [state.totems])
  const getUnitTVs = useCallback((unitId: string) => state.tvs.filter(t => t.unitId === unitId), [state.tvs])
  const getUnitTickets = useCallback((unitId: string, queueLineIds?: string[]) => {
    let filtered = state.tickets.filter(t => t.unitId === unitId)
    if (queueLineIds?.length) filtered = filtered.filter(t => queueLineIds.includes(t.queueLineId))
    return filtered
  }, [state.tickets])

  const value = useMemo(() => ({
    state, dispatch, getUnitQueues, getUnitGuiches, getUnitTotems, getUnitTVs, getUnitTickets,
    addUnitDB, updateUnitDB, removeUnitDB, addTotemDB, updateTotemDB, removeTotemDB,
    addQueueLineDB, updateQueueLineDB, removeQueueLineDB, addGuicheDB, updateGuicheDB, removeGuicheDB,
    addTVDB, updateTVDB, removeTVDB, loadCompanyData,
  }), [state, dispatch, getUnitQueues, getUnitGuiches, getUnitTotems, getUnitTVs, getUnitTickets,
    addUnitDB, updateUnitDB, removeUnitDB, addTotemDB, updateTotemDB, removeTotemDB,
    addQueueLineDB, updateQueueLineDB, removeQueueLineDB, addGuicheDB, updateGuicheDB, removeGuicheDB,
    addTVDB, updateTVDB, removeTVDB, loadCompanyData])

  return <QueueSystemContext.Provider value={value}>{children}</QueueSystemContext.Provider>
}

export function useQueueSystem() {
  const ctx = useContext(QueueSystemContext)
  if (!ctx) throw new Error('useQueueSystem must be used within QueueSystemProvider')
  return ctx
}
