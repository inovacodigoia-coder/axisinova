import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
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
  addAppointment: (a: SchedulingAppointment, opts?: { confirmHoras?: 24 | 48 | null }) => Promise<boolean>
  updateAppointment: (id: string, data: Partial<SchedulingAppointment>) => void
  updateConfirmation: (id: string, data: Partial<ConfirmationDispatch>) => void
  addConfirmation: (c: ConfirmationDispatch) => void
}

const SchedulingContext = createContext<SchedulingContextValue | null>(null)

const isUuid = (v?: string | null) => !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
const TYPE_LABEL: Record<string, string> = { consultation: 'Consulta', exam: 'Exame', procedure: 'Procedimento' }
const legacyStatus = (s: string) => (s === 'cancelled' ? 'cancelled' : s === 'waiting' ? 'waiting' : 'confirmed')
const ENCERRA_FILA = ['cancelled', 'absent', 'in_progress', 'completed', 'rescheduled']

const AVISOS: Record<string, string> = {
  NENHUM_NUMERO_CONECTADO: 'Agendamento salvo. A confirmação foi programada, mas não há número de WhatsApp conectado. Ela será enviada quando um número estiver conectado.',
  PACIENTE_SEM_TELEFONE_VALIDO: 'Agendamento salvo. Não foi possível programar a confirmação: o paciente não tem um celular válido cadastrado.',
  WHATSAPP_NAO_LIBERADO: 'Agendamento salvo. Confirmação não programada: WhatsApp não liberado para a empresa.',
  SEM_NUMERO_CADASTRADO: 'Agendamento salvo. Confirmação não programada: nenhum número de WhatsApp cadastrado.',
  SEM_MODELO_ATIVO: 'Agendamento salvo. Confirmação não programada: nenhum modelo de mensagem ativo.',
  AGENDAMENTO_NO_PASSADO: 'Agendamento salvo. Confirmação não programada: o horário já passou.',
}

/** Data de envio = dia do agendamento menos 1 ou 2 dias (igual à tela). */
function dataEnvio(date: string, horas: 24 | 48) {
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() - horas / 24)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function enfileirarConfirmacao(id: string, date: string, horas: 24 | 48) {
  try {
    const { data, error } = await supabase.rpc('whatsapp_enfileirar_confirmacao' as any, {
      p_agendamento_id: id, p_horas_antes: horas, p_data_envio: dataEnvio(date, horas),
    } as any)
    if (error) { console.error('[WhatsApp] enfileirar:', error); toast.warning('Agendamento salvo. Não foi possível programar a confirmação por WhatsApp.'); return }
    const r = data as any
    if (r?.codigo === 'ENFILEIRADA' || r?.codigo === 'JA_ENFILEIRADA') toast.success('Confirmação por WhatsApp programada.')
    else toast.warning(AVISOS[r?.codigo] || `Agendamento salvo. ${r?.mensagem || 'Confirmação não programada.'}`)
  } catch (e) {
    console.error('[WhatsApp] enfileirar:', e)
  }
}

/** Etapa 11A: mensagens de ciclo. Falha nunca desfaz o agendamento. */
async function enfileirarCiclo(id: string, evento: 'criado' | 'remarcado' | 'finalizado') {
  try {
    const { data, error } = await supabase.rpc('whatsapp_enfileirar_ciclo' as any, { p_agendamento_id: id, p_evento: evento } as any)
    if (error) { console.error('[WhatsApp] ciclo:', error); return }
    if ((data as any)?.ok === false) console.warn('[WhatsApp] ciclo:', (data as any)?.codigo)
  } catch (e) {
    console.error('[WhatsApp] ciclo:', e)
  }
}

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
    confirmedAt: r.paciente_confirmou_em || undefined,
    confirmedBy: r.paciente_confirmou_em ? 'WhatsApp' : undefined,
    pedidoPaciente: r.pedido_paciente || undefined,
    pedidoPacienteEm: r.pedido_paciente_em || undefined,
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
  const appointmentsRef = useRef(appointments)
  appointmentsRef.current = appointments

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
    const t = setInterval(load, 60000)
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') load()
    })
    return () => { cancelled = true; clearInterval(t); sub.subscription.unsubscribe() }
  }, [isDemo, dbCompanyId])

  const addPatient = useCallback((p: SchedulingPatient) => setPatients(prev => [...prev, p]), [])

  const addAppointment = useCallback(async (a: SchedulingAppointment, opts?: { confirmHoras?: 24 | 48 | null }) => {
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
    if (opts?.confirmHoras) {
      await enfileirarConfirmacao((data as any).id, a.date, opts.confirmHoras)
    }
    await enfileirarCiclo((data as any).id, 'criado')
    return true
  }, [isDemo, dbCompanyId])

  const updateAppointment = useCallback((id: string, data: Partial<SchedulingAppointment>) => {
    const before = appointmentsRef.current.find(a => a.id === id)
    const limpaPedido = (data.status && ['cancelled', 'absent', 'completed', 'rescheduled', 'in_progress'].includes(data.status))
      || (data.date && data.date !== before?.date) || (data.time && data.time !== before?.time) || (data.doctorId && data.doctorId !== before?.doctorId)
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...data, ...(limpaPedido ? { pedidoPaciente: undefined, pedidoPacienteEm: undefined } : {}) } : a))
    if (isDemo || !isUuid(id)) return
    const patch: Record<string, any> = { updated_at: new Date().toISOString() }
    if (data.status) { patch.sched_status = data.status; patch.status = legacyStatus(data.status) }
    if (data.cancelledReason !== undefined) patch.cancelled_reason = data.cancelledReason || null
    if (data.date) patch.date = data.date
    if (data.time) patch.time = data.time
    if (data.doctorId) { patch.doctor_id = isUuid(data.doctorId) ? data.doctorId : null }
    if (data.doctorName) patch.doctor = data.doctorName
    if (data.observations !== undefined) patch.notes = data.observations || null
    supabase.from('appointments').update(patch as any).eq('id', id).then(async ({ error }) => {
      if (error) {
        console.error('[SchedulingContext] erro ao atualizar agendamento:', error)
        toast.error('Não foi possível salvar a alteração do agendamento.')
        return
      }
      const encerrou = data.status && ENCERRA_FILA.includes(data.status)
      const remarcou = !encerrou && before && (
        (data.date && data.date !== before.date) ||
        (data.time && data.time !== before.time) ||
        (data.doctorId && data.doctorId !== before.doctorId))
      if (encerrou) {
        await supabase.rpc('whatsapp_cancelar_envios_agendamento' as any, { p_agendamento_id: id } as any)
        if (data.status === 'completed') await enfileirarCiclo(id, 'finalizado')
      } else if (remarcou) {
        const { data: r } = await supabase.rpc('whatsapp_reenfileirar_confirmacao' as any, { p_agendamento_id: id } as any)
        const cod = (r as any)?.codigo
        if (cod === 'ENFILEIRADA') toast.success('Confirmação por WhatsApp reprogramada.')
        else if (cod && AVISOS[cod]) toast.warning(AVISOS[cod].replace('Agendamento salvo.', 'Agendamento alterado.'))
        await enfileirarCiclo(id, 'remarcado')
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
