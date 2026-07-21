import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react'
import type { Doctor, Specialty, Convenio, Exam, Procedure } from '@/types/registers.types'
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
  addExam: (e: Exam) => void
  updateExam: (e: Exam) => void
  removeExam: (id: string) => void
  addProcedure: (p: Procedure) => void
  updateProcedure: (p: Procedure) => void
  removeProcedure: (id: string) => void
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
    attachmentRules: row.attachment_rules || [], isActive: row.is_active, createdAt: row.created_at,
  }
}
function mapExamRow(row: any): Exam {
  return {
    id: row.id, companyId: row.company_id, name: row.name, tussCode: row.tuss_code,
    type: row.type || 'clinical',
    specialtyId: row.specialty_id, preparationInstructions: row.preparation_instructions,
    estimatedDurationMinutes: row.estimated_duration_minutes, resultDeadlineDays: row.result_deadline_days,
    requiresAuthorization: row.requires_authorization, authorizationInstructions: row.authorization_instructions,
    attachmentRules: row.attachment_rules || [], isActive: row.is_active, createdAt: row.created_at,
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

export function RegistersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const companyId = resolveCompanyId(user?.companyId)
  const isDemo = isDemoCompany(user?.companyId)

  const [doctors, setDoctors] = useState<Doctor[]>(isDemo ? DEMO_DOCTORS : [])
  const [specialties, setSpecialties] = useState<Specialty[]>(isDemo ? DEMO_SPECIALTIES : [])
  const [convenios, setConvenios] = useState<Convenio[]>(isDemo ? DEMO_CONVENIOS : [])
  const [exams, setExams] = useState<Exam[]>(isDemo ? DEMO_EXAMS : [])
  const [procedures, setProcedures] = useState<Procedure[]>(isDemo ? DEMO_PROCEDURES : [])
  const [isLoading, setIsLoading] = useState(!isDemo)

  // Load from Supabase
  useEffect(() => {
    if (isDemo || !companyId) return
    setIsLoading(true)

    const load = async () => {
      try {
        const [specRes, docRes, convRes, examRes, procRes] = await Promise.all([
          supabase.from('specialties').select('*').eq('company_id', companyId),
          supabase.from('doctors').select('*').eq('company_id', companyId),
          supabase.from('convenios').select('*').eq('company_id', companyId),
          supabase.from('exams').select('*').eq('company_id', companyId),
          supabase.from('procedures').select('*').eq('company_id', companyId),
        ])
        if (specRes.data) setSpecialties(specRes.data.map(mapSpecialtyRow))
        if (docRes.data) setDoctors(docRes.data.map(mapDoctorRow))
        if (convRes.data) setConvenios(convRes.data.map(mapConvenioRow))
        if (examRes.data) setExams(examRes.data.map(mapExamRow))
        if (procRes.data) setProcedures(procRes.data.map(mapProcedureRow))
      } catch (err) {
        console.error('Failed to load registers:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
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
      attachment_rules: c.attachmentRules, is_active: c.isActive,
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
      observations: c.observations || null, attachment_rules: c.attachmentRules, is_active: c.isActive,
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
  const addExam = useCallback(async (e: Exam) => {
    const id = ensureUUID(e.id)
    const entity = { ...e, id, companyId: companyId || e.companyId }
    setExams(prev => [...prev, entity])
    if (isDemo || !companyId) return
    const { error } = await supabase.from('exams').insert({
      id, company_id: companyId, name: e.name, tuss_code: e.tussCode || null,
      type: e.type,
      specialty_id: e.specialtyId || null, preparation_instructions: e.preparationInstructions || null,
      estimated_duration_minutes: e.estimatedDurationMinutes || null,
      result_deadline_days: e.resultDeadlineDays || null,
      requires_authorization: e.requiresAuthorization,
      authorization_instructions: e.authorizationInstructions || null,
      attachment_rules: e.attachmentRules, is_active: e.isActive,
    } as any)
    if (error) {
      console.error('[exams.insert]', error)
      toast.error(`Erro ao salvar exame: ${error.message}`)
      setExams(prev => prev.filter(x => x.id !== id))
    }
  }, [isDemo, companyId])

  const updateExam = useCallback(async (e: Exam) => {
    setExams(prev => prev.map(x => x.id === e.id ? e : x))
    if (isDemo) return
    const { error } = await supabase.from('exams').update({
      name: e.name, tuss_code: e.tussCode || null, specialty_id: e.specialtyId || null,
      type: e.type,
      preparation_instructions: e.preparationInstructions || null,
      estimated_duration_minutes: e.estimatedDurationMinutes || null,
      result_deadline_days: e.resultDeadlineDays || null,
      requires_authorization: e.requiresAuthorization,
      authorization_instructions: e.authorizationInstructions || null,
      attachment_rules: e.attachmentRules, is_active: e.isActive,
    } as any).eq('id', e.id)
    if (error) { console.error(error); toast.error('Erro ao atualizar exame') }
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
      doctors, specialties, convenios, exams, procedures, isDemo, isLoading,
      addDoctor, updateDoctor, removeDoctor,
      addSpecialty, updateSpecialty, removeSpecialty,
      addConvenio, updateConvenio, removeConvenio,
      addExam, updateExam, removeExam,
      addProcedure, updateProcedure, removeProcedure,
      getSpecialtyName, getConvenioName, getDoctorsForSpecialty, getDoctorsForConvenio,
    }}>
      {children}
    </RegistersContext.Provider>
  )
}

export function useRegisters() {
  const ctx = useContext(RegistersContext)
  if (!ctx) throw new Error('useRegisters must be used within RegistersProvider')
  return ctx
}
