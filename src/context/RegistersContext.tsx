import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Doctor, Specialty, Convenio, Exam, Procedure } from '@/types/registers.types'
import { DEMO_DOCTORS, DEMO_SPECIALTIES, DEMO_CONVENIOS, DEMO_EXAMS, DEMO_PROCEDURES, isDemoCompany } from '@/mocks/registers.mock'
import { useAuth } from '@/context/AuthContext'

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

  const [doctors, setDoctors] = useState<Doctor[]>(isDemo ? DEMO_DOCTORS : [])
  const [specialties, setSpecialties] = useState<Specialty[]>(isDemo ? DEMO_SPECIALTIES : [])
  const [convenios, setConvenios] = useState<Convenio[]>(isDemo ? DEMO_CONVENIOS : [])
  const [exams, setExams] = useState<Exam[]>(isDemo ? DEMO_EXAMS : [])
  const [procedures, setProcedures] = useState<Procedure[]>(isDemo ? DEMO_PROCEDURES : [])

  const addDoctor = useCallback((d: Doctor) => setDoctors(prev => [...prev, d]), [])
  const updateDoctor = useCallback((d: Doctor) => setDoctors(prev => prev.map(x => x.id === d.id ? d : x)), [])
  const removeDoctor = useCallback((id: string) => setDoctors(prev => prev.filter(x => x.id !== id)), [])

  const addSpecialty = useCallback((s: Specialty) => setSpecialties(prev => [...prev, s]), [])
  const updateSpecialty = useCallback((s: Specialty) => setSpecialties(prev => prev.map(x => x.id === s.id ? s : x)), [])
  const removeSpecialty = useCallback((id: string) => setSpecialties(prev => prev.filter(x => x.id !== id)), [])

  const addConvenio = useCallback((c: Convenio) => setConvenios(prev => [...prev, c]), [])
  const updateConvenio = useCallback((c: Convenio) => setConvenios(prev => prev.map(x => x.id === c.id ? c : x)), [])
  const removeConvenio = useCallback((id: string) => setConvenios(prev => prev.filter(x => x.id !== id)), [])

  const addExam = useCallback((e: Exam) => setExams(prev => [...prev, e]), [])
  const updateExam = useCallback((e: Exam) => setExams(prev => prev.map(x => x.id === e.id ? e : x)), [])
  const removeExam = useCallback((id: string) => setExams(prev => prev.filter(x => x.id !== id)), [])

  const addProcedure = useCallback((p: Procedure) => setProcedures(prev => [...prev, p]), [])
  const updateProcedure = useCallback((p: Procedure) => setProcedures(prev => prev.map(x => x.id === p.id ? p : x)), [])
  const removeProcedure = useCallback((id: string) => setProcedures(prev => prev.filter(x => x.id !== id)), [])

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
