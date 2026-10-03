import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { SchedulingPatient, SchedulingAppointment, ConfirmationDispatch } from '@/types/scheduling.types'
import { MOCK_PATIENTS, MOCK_APPOINTMENTS, MOCK_CONFIRMATIONS } from '@/mocks/scheduling.mock'
import { useAuth } from '@/context/AuthContext'
import { isDemoCompany } from '@/mocks/registers.mock'
import { supabase } from '@/integrations/supabase/client'
import { resolveCompanyId } from '@/utils/companyId'

interface SchedulingContextValue {
  patients: SchedulingPatient[]
  appointments: SchedulingAppointment[]
  confirmations: ConfirmationDispatch[]
  isDemo: boolean
  addPatient: (p: SchedulingPatient) => void
  addAppointment: (a: SchedulingAppointment) => void
  updateAppointment: (id: string, data: Partial<SchedulingAppointment>) => void
  updateConfirmation: (id: string, data: Partial<ConfirmationDispatch>) => void
  addConfirmation: (c: ConfirmationDispatch) => void
}

const SchedulingContext = createContext<SchedulingContextValue | null>(null)

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

export function SchedulingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const companyId = user?.companyId
  const isDemo = isDemoCompany(companyId)
  const dbCompanyId = resolveCompanyId(companyId)

  const [patients, setPatients] = useState<SchedulingPatient[]>(isDemo ? MOCK_PATIENTS : [])
  const [appointments, setAppointments] = useState<SchedulingAppointment[]>(isDemo ? MOCK_APPOINTMENTS : [])
  const [confirmations, setConfirmations] = useState<ConfirmationDispatch[]>(isDemo ? MOCK_CONFIRMATIONS : [])

  // Empresas reais: carrega os pacientes cadastrados no banco
  useEffect(() => {
    if (isDemo || !dbCompanyId) return
    let cancelled = false
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session || cancelled) return
      const { data, error } = await supabase
        .from('patients')
        .select('id, company_id, name, cpf, birth_date, phone, phone2, email, gender, mother_name, convenios, created_at')
        .eq('company_id', dbCompanyId)
        .order('name', { ascending: true })
      if (cancelled) return
      if (error) {
        console.error('[SchedulingContext] erro ao carregar pacientes:', error)
        return
      }
      setPatients((data || []).map(dbToSchedulingPatient))
    }
    load()
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') load()
    })
    return () => { cancelled = true; sub.subscription.unsubscribe() }
  }, [isDemo, dbCompanyId])

  const addPatient = useCallback((p: SchedulingPatient) => setPatients(prev => [...prev, p]), [])
  const addAppointment = useCallback((a: SchedulingAppointment) => setAppointments(prev => [...prev, a]), [])
  const updateAppointment = useCallback((id: string, data: Partial<SchedulingAppointment>) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...data } : a))
  }, [])
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
