import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react'
import type { Doctor, Specialty, Convenio, Exam, Procedure } from '@/types/registers.types'
import { DEMO_DOCTORS, DEMO_SPECIALTIES, DEMO_CONVENIOS, DEMO_EXAMS, DEMO_PROCEDURES, isDemoCompany } from '@/mocks/registers.mock'
import { useAuth } from '@/context/AuthContext'

interface RegistersSnapshot {
  doctors: Doctor[]
  specialties: Specialty[]
  convenios: Convenio[]
  exams: Exam[]
  procedures: Procedure[]
}

const REGISTERS_STORAGE_PREFIX = 'axis-inova:registers'

const createEmptyRegisters = (): RegistersSnapshot => ({
  doctors: [],
  specialties: [],
  convenios: [],
  exams: [],
  procedures: [],
})

const createDemoRegisters = (): RegistersSnapshot => ({
  doctors: DEMO_DOCTORS,
  specialties: DEMO_SPECIALTIES,
  convenios: DEMO_CONVENIOS,
  exams: DEMO_EXAMS,
  procedures: DEMO_PROCEDURES,
})

const sanitizeRegisters = (value: Partial<RegistersSnapshot>): RegistersSnapshot => ({
  doctors: Array.isArray(value.doctors) ? value.doctors as Doctor[] : [],
  specialties: Array.isArray(value.specialties) ? value.specialties as Specialty[] : [],
  convenios: Array.isArray(value.convenios) ? value.convenios as Convenio[] : [],
  exams: Array.isArray(value.exams) ? value.exams as Exam[] : [],
  procedures: Array.isArray(value.procedures) ? value.procedures as Procedure[] : [],
})

const readStoredRegisters = (storageKey: string | null): RegistersSnapshot | null => {
  if (!storageKey || typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null

    return sanitizeRegisters(JSON.parse(raw) as Partial<RegistersSnapshot>)
  } catch {
    return null
  }
}

const createRegistersState = (isDemo: boolean, storageKey: string | null): RegistersSnapshot => {
  if (isDemo) return createDemoRegisters()
  return readStoredRegisters(storageKey) ?? createEmptyRegisters()
}

interface RegistersContextValue {
  // Data
  doctors: Doctor[]
  specialties: Specialty[]
  convenios: Convenio[]
  exams: Exam[]
  procedures: Procedure[]
  isDemo: boolean

  // Doctors
  addDoctor: (d: Doctor) => void
  updateDoctor: (d: Doctor) => void
  removeDoctor: (id: string) => void

  // Specialties
  addSpecialty: (s: Specialty) => void
  updateSpecialty: (s: Specialty) => void
  removeSpecialty: (id: string) => void

  // Convenios
  addConvenio: (c: Convenio) => void
  updateConvenio: (c: Convenio) => void
  removeConvenio: (id: string) => void

  // Exams
  addExam: (e: Exam) => void
  updateExam: (e: Exam) => void
  removeExam: (id: string) => void

  // Procedures
  addProcedure: (p: Procedure) => void
  updateProcedure: (p: Procedure) => void
  removeProcedure: (id: string) => void

  // Helpers
  getSpecialtyName: (id: string) => string
  getConvenioName: (id: string) => string
  getDoctorsForSpecialty: (specId: string) => Doctor[]
  getDoctorsForConvenio: (convId: string) => Doctor[]
}

const RegistersContext = createContext<RegistersContextValue | null>(null)

export function RegistersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const companyId = user?.companyId
  const isDemo = isDemoCompany(companyId)
  const storageKey = useMemo(
    () => (companyId ? `${REGISTERS_STORAGE_PREFIX}:${companyId}` : null),
    [companyId],
  )

  const [state, setState] = useState<RegistersSnapshot>(() => createRegistersState(isDemo, storageKey))
  const [hydratedKey, setHydratedKey] = useState<string | null>(() => (isDemo ? 'demo' : storageKey))

  useEffect(() => {
    setState(createRegistersState(isDemo, storageKey))
    setHydratedKey(isDemo ? 'demo' : storageKey)
  }, [isDemo, storageKey])

  useEffect(() => {
    if (isDemo || !storageKey || hydratedKey !== storageKey || typeof window === 'undefined') return
    window.localStorage.setItem(storageKey, JSON.stringify(state))
  }, [state, hydratedKey, isDemo, storageKey])

  const { doctors, specialties, convenios, exams, procedures } = state

  const addDoctor = useCallback((d: Doctor) => {
    setState(prev => ({ ...prev, doctors: [...prev.doctors, d] }))
  }, [])
  const updateDoctor = useCallback((d: Doctor) => {
    setState(prev => ({ ...prev, doctors: prev.doctors.map(x => x.id === d.id ? d : x) }))
  }, [])
  const removeDoctor = useCallback((id: string) => {
    setState(prev => ({ ...prev, doctors: prev.doctors.filter(x => x.id !== id) }))
  }, [])

  const addSpecialty = useCallback((s: Specialty) => {
    setState(prev => ({ ...prev, specialties: [...prev.specialties, s] }))
  }, [])
  const updateSpecialty = useCallback((s: Specialty) => {
    setState(prev => ({ ...prev, specialties: prev.specialties.map(x => x.id === s.id ? s : x) }))
  }, [])
  const removeSpecialty = useCallback((id: string) => {
    setState(prev => ({ ...prev, specialties: prev.specialties.filter(x => x.id !== id) }))
  }, [])

  const addConvenio = useCallback((c: Convenio) => {
    setState(prev => ({ ...prev, convenios: [...prev.convenios, c] }))
  }, [])
  const updateConvenio = useCallback((c: Convenio) => {
    setState(prev => ({ ...prev, convenios: prev.convenios.map(x => x.id === c.id ? c : x) }))
  }, [])
  const removeConvenio = useCallback((id: string) => {
    setState(prev => ({ ...prev, convenios: prev.convenios.filter(x => x.id !== id) }))
  }, [])

  const addExam = useCallback((e: Exam) => {
    setState(prev => ({ ...prev, exams: [...prev.exams, e] }))
  }, [])
  const updateExam = useCallback((e: Exam) => {
    setState(prev => ({ ...prev, exams: prev.exams.map(x => x.id === e.id ? e : x) }))
  }, [])
  const removeExam = useCallback((id: string) => {
    setState(prev => ({ ...prev, exams: prev.exams.filter(x => x.id !== id) }))
  }, [])

  const addProcedure = useCallback((p: Procedure) => {
    setState(prev => ({ ...prev, procedures: [...prev.procedures, p] }))
  }, [])
  const updateProcedure = useCallback((p: Procedure) => {
    setState(prev => ({ ...prev, procedures: prev.procedures.map(x => x.id === p.id ? p : x) }))
  }, [])
  const removeProcedure = useCallback((id: string) => {
    setState(prev => ({ ...prev, procedures: prev.procedures.filter(x => x.id !== id) }))
  }, [])

  const getSpecialtyName = useCallback((id: string) => specialties.find(s => s.id === id)?.name || '', [specialties])
  const getConvenioName = useCallback((id: string) => convenios.find(c => c.id === id)?.name || '', [convenios])
  const getDoctorsForSpecialty = useCallback((specId: string) => doctors.filter(d => d.specialtyIds.includes(specId)), [doctors])
  const getDoctorsForConvenio = useCallback((convId: string) => doctors.filter(d => d.enabledConvenioIds.includes(convId)), [doctors])

  return (
    <RegistersContext.Provider value={{
      doctors, specialties, convenios, exams, procedures, isDemo,
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
