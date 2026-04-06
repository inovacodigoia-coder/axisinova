import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import type { SchedulingPatient, SchedulingAppointment, ConfirmationDispatch } from '@/types/scheduling.types'
import { MOCK_PATIENTS, MOCK_APPOINTMENTS, MOCK_CONFIRMATIONS } from '@/mocks/scheduling.mock'
import { useAuth } from '@/context/AuthContext'
import { isDemoCompany } from '@/mocks/registers.mock'

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

export function SchedulingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const companyId = user?.companyId
  const isDemo = isDemoCompany(companyId)

  const [patients, setPatients] = useState<SchedulingPatient[]>(isDemo ? MOCK_PATIENTS : [])
  const [appointments, setAppointments] = useState<SchedulingAppointment[]>(isDemo ? MOCK_APPOINTMENTS : [])
  const [confirmations, setConfirmations] = useState<ConfirmationDispatch[]>(isDemo ? MOCK_CONFIRMATIONS : [])

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
