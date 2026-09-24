import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react'
import type { Doctor, Specialty, Convenio, Exam, Procedure, LabWorkbench } from '@/types/registers.types'
import { DEMO_DOCTORS, DEMO_SPECIALTIES, DEMO_CONVENIOS, DEMO_EXAMS, DEMO_PROCEDURES, isDemoCompany } from '@/mocks/registers.mock'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { resolveCompanyId } from '@/utils/companyId'
import { toast } from 'sonner'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ensureUUID = (id?: string | null): string =>
  (id && UUID_RE.test(id)) ? id : (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)

interface RegistersContextValue {
  doctors: Doctor[]
  specialties: Specialty[]
  convenios: Convenio[]
  exams: Exam[]
  procedures: Procedure[]
  workbenches: LabWorkbench[]
  isDemo: boolean
  isLoading: boolean
  addDoctor: (d: Doctor) => void
  updateDoctor: (d: Doctor) => void
  removeDoctor: (id: string) => void
  addSpecialty: (s: Specialty) => void
  updateSpecialty: (s: Specialty) => void
  removeSpecialty: (id: string) => void
  addConvenio: (c: Convenio) => void
  updateConvenio: (c: Convenio) => void
  removeConvenio: (id: string) => void
  addExam: (e: Exam) => Promise<Exam | undefined>
  updateExam: (e: Exam) => Promise<void>
  removeExam: (id: string) => void
  addProcedure: (p: Procedure) => void
  updateProcedure: (p: Procedure) => void
  removeProcedure: (id: string) => void
  addWorkbench: (w: LabWorkbench) => void
  updateWorkbench: (w: LabWorkbench) => void
  removeWorkbench: (id: string) => void
  getSpecialtyName: (id: string) => string
  getConvenioName: (id: string) => string
  getDoctorsForSpecialty: (specId: string) => Doctor[]
  getDoctorsForConvenio: (convId: string) => Doctor[]
}

const RegistersContext = createContext<RegistersContextValue | null>(null)

// DB row → App type mappers
function mapSpecialtyRow(row: any): Specialty {
  return { id: row.id, name: row.name, companyId: row.company_id, isActive: row.is_active, createdAt: row.created_at }
}
function mapDoctorRow(row: any): Doctor {
  return {
    id: row.id, companyId: row.company_id, fullName: row.full_name, crm: row.crm, crmState: row.crm_state || '',
    specialtyIds: row.specialty_ids || [], phone: row.phone, email: row.email, birthDate: row.birth_date,
    photo: row.photo, enabledConvenioIds: row.enabled_convenio_ids || [],
    scheduleConfig: row.schedule_config || undefined,
    isActive: row.is_active, isBlocked: row.is_blocked, blockedReason: row.blocked_reason,
    blockedAt: row.blocked_at, createdAt: row.created_at, updatedAt: row.updated_at,
  }
}
function mapConvenioRow(row: any): Convenio {
  return {
    id: row.id, companyId: row.company_id, name: row.name, ansCode: row.ans_code,
    type: row.type as Convenio['type'], cnpj: row.cnpj, authPhone: row.auth_phone,
    email: row.email, observations: row.observations,
    attachmentRules: row.attachment_rules || [], 
    examPrices: row.exam_prices || [],
    isActive: row.is_active, createdAt: row.created_at,
  }
}
function mapExamRow(row: any): Exam {
  return {
    id: row.id, companyId: row.company_id, name: row.name, tussCode: row.tuss_code, internalCode: row.internal_code,
    type: row.type || 'clinical',
    measurementUnit: row.measurement_unit,
    specialtyId: row.specialty_id,
    workbenchId: row.workbench_id,
    defaultOrigin: row.default_origin,
    defaultDestination: row.default_destination,
    reportObservations: row.report_observations,
    reportTemplateId: row.report_template_id || '',
    reportSinglePage: row.report_single_page ?? false,
    preparationInstructions: row.preparation_instructions,
    estimatedDurationMinutes: row.estimated_duration_minutes, resultDeadlineDays: row.result_deadline_days, prazoContagem: row.prazo_contagem === 'uteis' ? 'uteis' : 'corridos',
    requiresAuthorization: row.requires_authorization, authorizationInstructions: row.authorization_instructions,
    attachmentRules: row.attachment_rules || [], 
    parameters: row.parameters || [],
    referenceValues: row.reference_values || [],
    confirmationQuestions: row.confirmation_questions || [],
    isActive: row.is_active, createdAt: row.created_at,
    showDuration: row.show_duration, showDeadline: row.show_deadline,
    methodology: row.methodology,
    interfacingConfig: {
      equipmentId: row.interfacing_config?.equipmentId || '',
      equipmentCode: row.interfacing_config?.equipmentCode || '',
      autoReceiveResults: row.interfacing_config?.autoReceiveResults ?? true,
      autoSendOrders: row.interfacing_config?.autoSendOrders ?? true,
    },
    interfacingParameters: row.interfacing_parameters || [],
    selectedMaterials: row.selected_materials || [],
    defaultMaterial: row.default_material || '',
  }
}
function mapProcedureRow(row: any): Procedure {
  return {
    id: row.id, companyId: row.company_id, name: row.name, tussCode: row.tuss_code,
    type: row.type as Procedure['type'], specialtyId: row.specialty_id,
    estimatedDurationMinutes: row.estimated_duration_minutes,
    requiresAuthorization: row.requires_authorization, authorizationInstructions: row.authorization_instructions,
    requiresAnesthesia: row.requires_anesthesia, anesthesiaType: row.anesthesia_type,
    preOperativeInstructions: row.pre_operative_instructions, postOperativeInstructions: row.post_operative_instructions,
    attachmentRules: row.attachment_rules || [], isActive: row.is_active, createdAt: row.created_at,
  }
}
function mapWorkbenchRow(row: any): LabWorkbench {
  return {
    id: row.id, 
    companyId: row.company_id, 
    name: row.name, 
    description: row.description,
    reportBreakPolicy: row.report_break_policy || 'default',
    reportOrder: row.report_order || 0,
    isActive: row.is_active, 
    tipo: row.tipo === 'apoio' ? 'apoio' : 'interna',
    apoioId: row.apoio_id ?? null,
    createdAt: row.created_at
  }
}

export function RegistersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const isDemo = isDemoCompany(user?.companyId)
  const companyId = resolveCompanyId(user?.companyId) || (isDemo ? '00000000-0000-0000-0000-000000000001' : null)

  const [doctors, setDoctors] = useState<Doctor[]>(isDemo ? DEMO_DOCTORS : [])
  const [specialties, setSpecialties] = useState<Specialty[]>(isDemo ? DEMO_SPECIALTIES : [])
  const [convenios, setConvenios] = useState<Convenio[]>(isDemo ? DEMO_CONVENIOS : [])
  const [exams, setExams] = useState<Exam[]>(isDemo ? DEMO_EXAMS : [])
  const [procedures, setProcedures] = useState<Procedure[]>(isDemo ? DEMO_PROCEDURES : [])
  const [workbenches, setWorkbenches] = useState<LabWorkbench[]>(isDemo ? [] : [])
  const [isLoading, setIsLoading] = useState(!isDemo)

  // Load from Supabase
  useEffect(() => {
    if (isDemo || !companyId) return
    setIsLoading(true)

    const load = async () => {
      try {
        // Ensure Supabase auth session is hydrated before RLS-protected queries
        const { data: sessionData } = await supabase.auth.getSession()
        if (!sessionData?.session) {
          console.warn('[RegistersContext] No active Supabase session — RLS will block queries. Skipping load.')
          setIsLoading(false)
          return
        }

        const queries = [
          supabase.from('specialties').select('*').eq('company_id', companyId),
          supabase.from('doctors').select('*').eq('company_id', companyId),
          supabase.from('convenios').select('*').eq('company_id', companyId),
          supabase.from('exams').select('*').eq('company_id', companyId),
          supabase.from('procedures').select('*').eq('company_id', companyId),
          supabase.from('lab_workbenches').select('*').eq('company_id', companyId),
        ]

        const results = await Promise.allSettled(queries)
        
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`Query ${index} failed:`, result.reason)
            return
          }
          
          const { data, error } = result.value
          if (error) {
            console.error(`Error in query ${index}:`, error)
            return
          }

          if (data) {
            switch(index) {
              case 0: setSpecialties(data.map(mapSpecialtyRow)); break
              case 1: setDoctors(data.map(mapDoctorRow)); break
              case 2: setConvenios(data.map(mapConvenioRow)); break
              case 3: setExams(data.map(mapExamRow)); break
              case 4: setProcedures(data.map(mapProcedureRow)); break
              case 5: setWorkbenches(data.map(mapWorkbenchRow)); break
            }
          }
        })
      } catch (err) {
        console.error('Unexpected error loading registers:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()

    // Re-run when auth state changes (e.g. session hydrated after mount)
    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        load()
      }
    })
    return () => { authSub.subscription.unsubscribe() }
  }, [isDemo, companyId])

  // --- Specialties ---
  const addSpecialty = useCallback(async (s: Specialty) => {
    const id = ensureUUID(s.id)
    const entity = { ...s, id, companyId: companyId || s.companyId }
    setSpecialties(prev => [...prev, entity])
    if (isDemo || !companyId) return
    const { error } = await supabase.from('specialties').insert({
      id, company_id: companyId, name: s.name, is_active: s.isActive,
    } as any)
    if (error) {
      console.error('[specialties.insert]', error)
      toast.error(`Erro ao salvar especialidade: ${error.message}`)
      setSpecialties(prev => prev.filter(x => x.id !== id))
    }
  }, [isDemo, companyId])

  const updateSpecialty = useCallback(async (s: Specialty) => {
    setSpecialties(prev => prev.map(x => x.id === s.id ? s : x))
    if (isDemo) return
    const { error } = await supabase.from('specialties').update({ name: s.name, is_active: s.isActive } as any).eq('id', s.id)
    if (error) { console.error(error); toast.error('Erro ao atualizar especialidade') }
  }, [isDemo])

  const removeSpecialty = useCallback(async (id: string) => {
    setSpecialties(prev => prev.filter(x => x.id !== id))
    if (isDemo) return
    const { error } = await supabase.from('specialties').delete().eq('id', id)
    if (error) { console.error(error); toast.error('Erro ao remover especialidade') }
  }, [isDemo])

  // --- Doctors ---
  const addDoctor = useCallback(async (d: Doctor) => {
    const id = ensureUUID(d.id)
    const entity = { ...d, id, companyId: companyId || d.companyId }
    setDoctors(prev => [...prev, entity])
    if (isDemo || !companyId) return
    const { error } = await supabase.from('doctors').insert({
      id, company_id: companyId, full_name: d.fullName, crm: d.crm, crm_state: d.crmState,
      specialty_ids: d.specialtyIds, phone: d.phone || null, email: d.email || null,
      birth_date: d.birthDate || null, photo: d.photo || null,
      enabled_convenio_ids: d.enabledConvenioIds, schedule_config: d.scheduleConfig || null,
      is_active: d.isActive, is_blocked: d.isBlocked,
      blocked_reason: d.blockedReason || null, blocked_at: d.blockedAt || null,
    } as any)
    if (error) {
      console.error('[doctors.insert]', error)
      toast.error(`Erro ao salvar médico: ${error.message}`)
      setDoctors(prev => prev.filter(x => x.id !== id))
    }
  }, [isDemo, companyId])

  const updateDoctor = useCallback(async (d: Doctor) => {
    setDoctors(prev => prev.map(x => x.id === d.id ? d : x))
    if (isDemo) return
    const { error } = await supabase.from('doctors').update({
      full_name: d.fullName, crm: d.crm, crm_state: d.crmState,
      specialty_ids: d.specialtyIds, phone: d.phone || null, email: d.email || null,
      birth_date: d.birthDate || null, photo: d.photo || null,
      enabled_convenio_ids: d.enabledConvenioIds, schedule_config: d.scheduleConfig || null,
      is_active: d.isActive, is_blocked: d.isBlocked,
      blocked_reason: d.blockedReason || null, blocked_at: d.blockedAt || null,
    } as any).eq('id', d.id)
    if (error) { console.error(error); toast.error('Erro ao atualizar médico') }
  }, [isDemo])

  const removeDoctor = useCallback(async (id: string) => {
    setDoctors(prev => prev.filter(x => x.id !== id))
    if (isDemo) return
    const { error } = await supabase.from('doctors').delete().eq('id', id)
    if (error) { console.error(error); toast.error('Erro ao remover médico') }
  }, [isDemo])

  // --- Convenios ---
  const addConvenio = useCallback(async (c: Convenio) => {
    const id = ensureUUID(c.id)
    const entity = { ...c, id, companyId: companyId || c.companyId }
    setConvenios(prev => [...prev, entity])
    if (isDemo || !companyId) return
    const { error } = await supabase.from('convenios').insert({
      id, company_id: companyId, name: c.name, ans_code: c.ansCode || null,
      type: c.type, cnpj: c.cnpj || null, auth_phone: c.authPhone || null,
      email: c.email || null, observations: c.observations || null,
      attachment_rules: c.attachmentRules, 
      exam_prices: c.examPrices || [],
      is_active: c.isActive,
    } as any)
    if (error) {
      console.error('[convenios.insert]', error)
      toast.error(`Erro ao salvar convênio: ${error.message}`)
      setConvenios(prev => prev.filter(x => x.id !== id))
    }
  }, [isDemo, companyId])

  const updateConvenio = useCallback(async (c: Convenio) => {
    setConvenios(prev => prev.map(x => x.id === c.id ? c : x))
    if (isDemo) return
    const { error } = await supabase.from('convenios').update({
      name: c.name, ans_code: c.ansCode || null, type: c.type, cnpj: c.cnpj || null,
      auth_phone: c.authPhone || null, email: c.email || null,
      observations: c.observations || null, 
      attachment_rules: c.attachmentRules, 
      exam_prices: c.examPrices || [],
      is_active: c.isActive,
    } as any).eq('id', c.id)
    if (error) { console.error(error); toast.error('Erro ao atualizar convênio') }
  }, [isDemo])

  const removeConvenio = useCallback(async (id: string) => {
    setConvenios(prev => prev.filter(x => x.id !== id))
    if (isDemo) return
    const { error } = await supabase.from('convenios').delete().eq('id', id)
    if (error) { console.error(error); toast.error('Erro ao remover convênio') }
  }, [isDemo])

  // --- Exams ---
  // Reenvia automaticamente quando a rede falha (TypeError: Failed to fetch)
  const runWithRetry = async <T,>(fn: () => Promise<T>, attempts = 3): Promise<T> => {
    let lastErr: any
    for (let i = 0; i < attempts; i++) {
      try {
        const res: any = await fn()
        const msg = res?.error?.message || ''
        if (res?.error && /failed to fetch|network|load failed/i.test(msg) && i < attempts - 1) {
          lastErr = res.error
          await new Promise(r => setTimeout(r, 600 * (i + 1)))
          continue
        }
        return res
      } catch (err: any) {
        lastErr = err
        if (!/failed to fetch|network|load failed/i.test(err?.message || '') || i === attempts - 1) throw err
        await new Promise(r => setTimeout(r, 600 * (i + 1)))
      }
    }
    throw lastErr
  }

  const addExam = useCallback(async (e: Exam) => {
    const id = ensureUUID(e.id)
    const entity = { ...e, id, companyId: companyId || e.companyId }
    
    if (isDemo || !companyId) {
      setExams(prev => [...prev, entity])
      return entity
    }

    const { data, error } = await runWithRetry(async () => await supabase.from('exams').insert({
      id, 
      company_id: companyId, 
      name: e.name, 
      tuss_code: e.tussCode || null,
      internal_code: e.internalCode || null,
      type: e.type,
      specialty_id: e.specialtyId || null, 
      measurement_unit: e.measurementUnit || null,
      default_origin: e.defaultOrigin || null,
      default_destination: e.defaultDestination || null,
      report_observations: e.reportObservations || null,
      report_template_id: e.reportTemplateId || null,
      report_single_page: e.reportSinglePage ?? false,
      preparation_instructions: e.preparationInstructions || null,
      estimated_duration_minutes: e.estimatedDurationMinutes || null,
      result_deadline_days: e.resultDeadlineDays || null,
      ...(e.prazoContagem ? { prazo_contagem: e.prazoContagem } : {}),
      requires_authorization: e.requiresAuthorization,
      authorization_instructions: e.authorizationInstructions || null,
      attachment_rules: e.attachmentRules || [], 
      parameters: e.parameters || [],
      reference_values: e.referenceValues || [],
      confirmation_questions: e.confirmationQuestions || [],
      is_active: e.isActive ?? true,
      show_duration: e.showDuration ?? true,
      show_deadline: e.showDeadline ?? true,
      methodology: e.methodology || null,
      interfacing_config: e.interfacingConfig || {},
      interfacing_parameters: e.interfacingParameters || [],
      selected_materials: e.selectedMaterials || [],
      default_material: e.defaultMaterial || null,
      workbench_id: e.workbenchId || null,
    } as any).select().single())

    if (error) {
      console.error('[exams.insert]', error)
      toast.error(
        /failed to fetch|network|load failed/i.test(error.message || '')
          ? 'Sem conexão no momento. Verifique sua internet e salve novamente.'
          : `Erro ao salvar exame: ${error.message}`
      )
      throw error
    } else if (data) {
      const mapped = mapExamRow(data)
      setExams(prev => [...prev, mapped])
      return mapped
    }
  }, [isDemo, companyId])

  const updateExam = useCallback(async (e: Exam) => {
    // Optimistic update
    setExams(prev => prev.map(x => x.id === e.id ? e : x))
    
    if (isDemo) return
    
    try {
      const { error } = await runWithRetry(async () => await supabase.from('exams').update({
        name: e.name, 
        tuss_code: e.tussCode || null, 
        internal_code: e.internalCode || null, 
        specialty_id: e.specialtyId || null,
        type: e.type,
        measurement_unit: e.measurementUnit || null,
        default_origin: e.defaultOrigin || null,
        default_destination: e.defaultDestination || null,
        report_observations: e.reportObservations || null,
        report_template_id: e.reportTemplateId || null,
        report_single_page: e.reportSinglePage ?? false,
        preparation_instructions: e.preparationInstructions || null,
        estimated_duration_minutes: e.estimatedDurationMinutes || null,
        result_deadline_days: e.resultDeadlineDays || null,
        ...(e.prazoContagem ? { prazo_contagem: e.prazoContagem } : {}),
        requires_authorization: e.requiresAuthorization,
        authorization_instructions: e.authorizationInstructions || null,
        attachment_rules: e.attachmentRules || [], 
        parameters: e.parameters || [],
        reference_values: e.referenceValues || [],
        confirmation_questions: e.confirmationQuestions || [],
        is_active: e.isActive,
        show_duration: e.showDuration,
        show_deadline: e.showDeadline,
        methodology: e.methodology || null,
        interfacing_config: e.interfacingConfig || {},
        interfacing_parameters: e.interfacingParameters || [],
        selected_materials: e.selectedMaterials || [],
        default_material: e.defaultMaterial || null,
        workbench_id: e.workbenchId || null
      } as any).eq('id', e.id))

      if (error) { 
        console.error('[updateExam] Error:', error); 
        toast.error(
          /failed to fetch|network|load failed/i.test(error.message || '')
            ? 'Sem conexão no momento. Verifique sua internet e salve novamente.'
            : `Erro ao atualizar exame: ${error.message}`
        );
        
        // Rollback state by re-fetching
        const { data: refreshed } = await supabase.from('exams').select('*').eq('id', e.id).single()
        if (refreshed) {
          setExams(prev => prev.map(x => x.id === e.id ? mapExamRow(refreshed) : x))
        }
        throw error;
      }
    } catch (err) {
      console.error('[updateExam] Caught error:', err);
      throw err;
    }
  }, [isDemo])

  const removeExam = useCallback(async (id: string) => {
    setExams(prev => prev.filter(x => x.id !== id))
    if (isDemo) return
    const { error } = await supabase.from('exams').delete().eq('id', id)
    if (error) { console.error(error); toast.error('Erro ao remover exame') }
  }, [isDemo])

  // --- Procedures ---
  const addProcedure = useCallback(async (p: Procedure) => {
    const id = ensureUUID(p.id)
    const entity = { ...p, id, companyId: companyId || p.companyId }
    setProcedures(prev => [...prev, entity])
    if (isDemo || !companyId) return
    const { error } = await supabase.from('procedures').insert({
      id, company_id: companyId, name: p.name, tuss_code: p.tussCode || null,
      type: p.type, specialty_id: p.specialtyId || null,
      estimated_duration_minutes: p.estimatedDurationMinutes || null,
      requires_authorization: p.requiresAuthorization,
      authorization_instructions: p.authorizationInstructions || null,
      requires_anesthesia: p.requiresAnesthesia, anesthesia_type: p.anesthesiaType || null,
      pre_operative_instructions: p.preOperativeInstructions || null,
      post_operative_instructions: p.postOperativeInstructions || null,
      attachment_rules: p.attachmentRules, is_active: p.isActive,
    } as any)
    if (error) {
      console.error('[procedures.insert]', error)
      toast.error(`Erro ao salvar procedimento: ${error.message}`)
      setProcedures(prev => prev.filter(x => x.id !== id))
    }
  }, [isDemo, companyId])

  const updateProcedure = useCallback(async (p: Procedure) => {
    setProcedures(prev => prev.map(x => x.id === p.id ? p : x))
    if (isDemo) return
    const { error } = await supabase.from('procedures').update({
      name: p.name, tuss_code: p.tussCode || null, type: p.type,
      specialty_id: p.specialtyId || null, estimated_duration_minutes: p.estimatedDurationMinutes || null,
      requires_authorization: p.requiresAuthorization,
      authorization_instructions: p.authorizationInstructions || null,
      requires_anesthesia: p.requiresAnesthesia, anesthesia_type: p.anesthesiaType || null,
      pre_operative_instructions: p.preOperativeInstructions || null,
      post_operative_instructions: p.postOperativeInstructions || null,
      attachment_rules: p.attachmentRules, is_active: p.isActive,
    } as any).eq('id', p.id)
    if (error) { console.error(error); toast.error('Erro ao atualizar procedimento') }
  }, [isDemo])

  // --- Workbenches ---
  const addWorkbench = useCallback(async (w: LabWorkbench) => {
    const id = ensureUUID(w.id)
    const entity = { ...w, id, companyId: companyId || w.companyId }
    
    if (isDemo || !companyId) {
      setWorkbenches(prev => [...prev, entity])
      return
    }

    const { data, error } = await supabase.from('lab_workbenches').insert({
      id,
      company_id: companyId,
      name: w.name,
      description: w.description || null,
      report_break_policy: w.reportBreakPolicy || 'default',
      report_order: w.reportOrder || 0,
      is_active: w.isActive ?? true,
      tipo: w.tipo || 'interna',
      apoio_id: w.tipo === 'apoio' ? (w.apoioId || null) : null,
    } as any).select().single()

    if (error) {
      console.error('[workbenches.insert]', error)
      toast.error(`Erro ao salvar bancada: ${error.message}`)
      throw error
    } else if (data) {
      setWorkbenches(prev => [...prev, mapWorkbenchRow(data)])
    }
  }, [isDemo, companyId])

  const updateWorkbench = useCallback(async (w: LabWorkbench) => {
    if (isDemo) { setWorkbenches(prev => prev.map(x => x.id === w.id ? w : x)); return }

    const { error } = await supabase.from('lab_workbenches').update({
      name: w.name,
      description: w.description || null,
      report_break_policy: w.reportBreakPolicy || 'default',
      report_order: w.reportOrder || 0,
      is_active: w.isActive,
      tipo: w.tipo || 'interna',
      apoio_id: w.tipo === 'apoio' ? (w.apoioId || null) : null,
    } as any).eq('id', w.id)

    if (error) {
      console.error('[workbenches.update]', error)
      toast.error(error.message || 'Erro ao atualizar bancada')
      throw error
    }
    setWorkbenches(prev => prev.map(x => x.id === w.id ? w : x))
  }, [isDemo])

  const removeWorkbench = useCallback(async (id: string) => {
    if (isDemo) { setWorkbenches(prev => prev.filter(x => x.id !== id)); return }
    const { error } = await supabase.from('lab_workbenches').delete().eq('id', id)
    if (error) {
      console.error('[workbenches.delete]', error)
      toast.error(error.message || 'Erro ao remover bancada')
      return
    }
    setWorkbenches(prev => prev.filter(x => x.id !== id))
  }, [isDemo])

  const removeProcedure = useCallback(async (id: string) => {
    setProcedures(prev => prev.filter(x => x.id !== id))
    if (isDemo) return
    const { error } = await supabase.from('procedures').delete().eq('id', id)
    if (error) { console.error(error); toast.error('Erro ao remover procedimento') }
  }, [isDemo])

  // --- Helpers ---
  const getSpecialtyName = useCallback((id: string) => specialties.find(s => s.id === id)?.name || '', [specialties])
  const getConvenioName = useCallback((id: string) => convenios.find(c => c.id === id)?.name || '', [convenios])
  const getDoctorsForSpecialty = useCallback((specId: string) => doctors.filter(d => d.specialtyIds.includes(specId)), [doctors])
  const getDoctorsForConvenio = useCallback((convId: string) => doctors.filter(d => d.enabledConvenioIds.includes(convId)), [doctors])

  return (
    <RegistersContext.Provider value={{
      doctors, specialties, convenios, exams, procedures, workbenches, isDemo, isLoading,
      addDoctor, updateDoctor, removeDoctor,
      addSpecialty, updateSpecialty, removeSpecialty,
      addConvenio, updateConvenio, removeConvenio,
      addExam, updateExam, removeExam,
      addProcedure, updateProcedure, removeProcedure,
      addWorkbench, updateWorkbench, removeWorkbench,
      getSpecialtyName, getConvenioName, getDoctorsForSpecialty, getDoctorsForConvenio
    }}>
      {children}
    </RegistersContext.Provider>
  )
}

export function useRegisters() {
  const context = useContext(RegistersContext)
  if (!context) throw new Error('useRegisters must be used within a RegistersProvider')
  return context
}
