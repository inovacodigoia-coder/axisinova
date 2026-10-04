import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { SchedulingPatient, SchedulingAppointment, ConfirmationDispatch } from '@/types/scheduling.types'
import { MOCK_PATIENTS, MOCK_APPOINTMENTS, MOCK_CONFIRMATIONS } from '@/mocks/scheduling.mock'
import { useAuth } from '@/context/AuthContext'
import { isDemoCompany } from '@/mocks/registers.mock'
import { supabase } from '@/integrations/supabase/client'
import { resolveCompanyId } from '@/utils/companyId'
import { toast } from 'sonner'

interface SchedulingContextValue {
  patients: SchedulingPatient[]
  appointments: SchedulingAppointment[]
  confirmations: ConfirmationDispatch[]
  isDemo: boolean
  addPatient: (p: SchedulingPatient) => void
  addAppointment: (a: SchedulingAppointment) => Promise<boolean>
  updateAppointment: (id: string, data: Partial<SchedulingAppointment>) => void
  updateConfirmation: (id: string, data: Partial<ConfirmationDispatch>) => void
  addConfirmation: (c: ConfirmationDispatch) => void
}

const SchedulingContext = createContext<SchedulingContextValue | null>(null)

const isUuid = (v?: string | null) => !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
const TYPE_LABEL: Record<string, string> = { consultation: 'Consulta', exam: 'Exame', procedure: 'Procedimento' }
const legacyStatus = (s: string) => (s === 'cancelled' ? 'cancelled' : s === 'waiting' ? 'waiting' : 'confirmed')

function dbToSchedulingPatient(row: any): SchedulingPatient {
  const convenios = Array.isArray(row.convenios) ? row.convenios : []
  const firstConv = convenios[0] || null
  return {
    id: row.id,
    fullName: row.name || '',
    birthDate: row.birth_date || '',
    cpf: row.cpf || undefined,
    motherName: row.mother_name || '',
    phone1: row.phone || '',
    phone2: row.phone2 || undefined,
    email: row.email || undefined,
    convenioId: firstConv?.convenioId || firstConv?.convenio_id || undefined,
    convenioCardNumber: firstConv?.cardNumber || firstConv?.card_number || undefined,
    gender: row.gender === 'M' || row.gender === 'F' ? row.gender : row.gender ? 'O' : undefined,
    companyId: row.company_id,
    createdAt: row.created_at || '',
  }
}

function dbToAppointment(r: any): SchedulingAppointment {
  return {
    id: r.id,
    companyId: r.company_id,
    patientId: r.patient_id || '',
    patientName: r.patient_name || '',
    patientPhone1: r.patient_phone1 || '',
    patientPhone2: r.patient_phone2 || undefined,
    doctorId: r.doctor_id || '',
    doctorName: r.doctor || '',
    convenioId: r.convenio_id || '',
    convenioName: r.convenio_name || '',
    type: r.appointment_type || 'consultation',
    examId: r.exam_id || undefined,
    examName: r.exam_name || undefined,
    date: r.date,
    time: String(r.time || '').slice(0, 5),
    duration: r.duration || 30,
    status: r.sched_status || 'scheduled',
    visitType: r.visit_type || 'first_visit',
    observations: r.notes || undefined,
    cancelledReason: r.cancelled_reason || undefined,
    createdBy: r.created_by || '',
    createdAt: r.created_at || '',
    updatedAt: r.updated_at || '',
  }
}

export function SchedulingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const companyId = user?.companyId
  const isDemo = isDemoCompany(companyId)
  const dbCompanyId = resolveCompanyId(companyId)

  const [patients, setPatients] = useState<SchedulingPatient[]>(isDemo ? MOCK_PATIENTS : [])
  const [appointments, setAppointments] = useState<SchedulingAppointment[]>(isDemo ? MOCK_APPOINTMENTS : [])
  const [confirmations, setConfirmations] = useState<ConfirmationDispatch[]>(isDemo ? MOCK_CONFIRMATIONS : [])

  // Empresas reais: carrega pacientes e agendamentos do banco
  useEffect(() => {
    if (isDemo || !dbCompanyId) return
    let cancelled = false
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session || cancelled) return
      const [pRes, aRes] = await Promise.all([
        supabase
          .from('patients')
          .select('id, company_id, name, cpf, birth_date, phone, phone2, email, gender, mother_name, convenios, created_at')
          .eq('company_id', dbCompanyId)
          .order('name', { ascending: true }),
        supabase
          .from('appointments')
          .select('*')
          .eq('company_id', dbCompanyId)
          .order('date', { ascending: true })
          .order('time', { ascending: true }),
      ])
      if (cancelled) return
      if (pRes.error) console.error('[SchedulingContext] erro ao carregar pacientes:', pRes.error)
      else setPatients((pRes.data || []).map(dbToSchedulingPatient))
      if (aRes.error) console.error('[SchedulingContext] erro ao carregar agendamentos:', aRes.error)
      else setAppointments((aRes.data || []).map(dbToAppointment))
    }
    load()
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') load()
    })
    return () => { cancelled = true; sub.subscription.unsubscribe() }
  }, [isDemo, dbCompanyId])

  const addPatient = useCallback((p: SchedulingPatient) => setPatients(prev => [...prev, p]), [])

  const addAppointment = useCallback(async (a: SchedulingAppointment) => {
    if (isDemo || !dbCompanyId) {
      setAppointments(prev => [...prev, a])
      return true
    }
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        company_id: dbCompanyId,
        patient_id: isUuid(a.patientId) ? a.patientId : null,
        patient_name: a.patientName,
        patient_phone1: a.patientPhone1 || null,
        patient_phone2: a.patientPhone2 || null,
        doctor_id: isUuid(a.doctorId) ? a.doctorId : null,
        doctor: a.doctorName || '-',
        convenio_id: a.convenioId || null,
        convenio_name: a.convenioName || null,
        appointment_type: a.type,
        type: TYPE_LABEL[a.type] || 'Consulta',
        exam_id: a.examId || null,
        exam_name: a.examName || null,
        date: a.date,
        time: a.time,
        duration: a.duration || 30,
        sched_status: a.status,
        status: legacyStatus(a.status) as any,
        visit_type: a.visitType,
        notes: a.observations || null,
      } as any)
      .select('*')
      .single()
    if (error || !data) {
      console.error('[SchedulingContext] erro ao salvar agendamento:', error)
      toast.error('Não foi possível salvar o agendamento. Tente novamente.')
      return false
    }
    setAppointments(prev => [...prev, dbToAppointment(data)])
    return true
  }, [isDemo, dbCompanyId])

  const updateAppointment = useCallback((id: string, data: Partial<SchedulingAppointment>) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...data } : a))
    if (isDemo || !isUuid(id)) return
    const patch: Record<string, any> = { updated_at: new Date().toISOString() }
    if (data.status) { patch.sched_status = data.status; patch.status = legacyStatus(data.status) }
    if (data.cancelledReason !== undefined) patch.cancelled_reason = data.cancelledReason || null
    if (data.date) patch.date = data.date
    if (data.time) patch.time = data.time
    if (data.observations !== undefined) patch.notes = data.observations || null
    supabase.from('appointments').update(patch as any).eq('id', id).then(({ error }) => {
      if (error) {
        console.error('[SchedulingContext] erro ao atualizar agendamento:', error)
        toast.error('Não foi possível salvar a alteração do agendamento.')
      }
    })
  }, [isDemo])

  const updateConfirmation = useCallback((id: string, data: Partial<ConfirmationDispatch>) => {
    setConfirmations(prev => prev.map(c => c.id === id ? { ...c, ...data } : c))
  }, [])
  const addConfirmation = useCallback((c: ConfirmationDispatch) => setConfirmations(prev => [...prev, c]), [])

  return (
    <SchedulingContext.Provider value={{
      patients, appointments, confirmations, isDemo,
      addPatient, addAppointment, updateAppointment, updateConfirmation, addConfirmation,
    }}>
      {children}
    </SchedulingContext.Provider>
  )
}

export function useScheduling() {
  const ctx = useContext(SchedulingContext)
  if (!ctx) throw new Error('useScheduling must be used within SchedulingProvider')
  return ctx
}
