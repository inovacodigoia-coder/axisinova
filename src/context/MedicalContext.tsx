import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react'
import type { AttendanceRecord, PatientAlert, PatientMedication, ExamResult } from '@/types/medical.types'
import { MOCK_ATTENDANCE_RECORDS, MOCK_PATIENT_ALERTS, MOCK_PATIENT_MEDICATIONS, MOCK_EXAM_RESULTS } from '@/mocks/medical.mock'
import { useAuth } from '@/context/AuthContext'
import { isDemoCompany } from '@/mocks/registers.mock'

interface MedicalSnapshot {
  attendanceRecords: AttendanceRecord[]
  patientAlerts: PatientAlert[]
  patientMedications: PatientMedication[]
  examResults: ExamResult[]
}

const STORAGE_PREFIX = 'axis-inova:medical'

const createEmpty = (): MedicalSnapshot => ({
  attendanceRecords: [],
  patientAlerts: [],
  patientMedications: [],
  examResults: [],
})

const createDemo = (): MedicalSnapshot => ({
  attendanceRecords: MOCK_ATTENDANCE_RECORDS,
  patientAlerts: MOCK_PATIENT_ALERTS,
  patientMedications: MOCK_PATIENT_MEDICATIONS,
  examResults: MOCK_EXAM_RESULTS,
})

const sanitize = (v: Partial<MedicalSnapshot>): MedicalSnapshot => ({
  attendanceRecords: Array.isArray(v.attendanceRecords) ? v.attendanceRecords : [],
  patientAlerts: Array.isArray(v.patientAlerts) ? v.patientAlerts : [],
  patientMedications: Array.isArray(v.patientMedications) ? v.patientMedications : [],
  examResults: Array.isArray(v.examResults) ? v.examResults : [],
})

const readStored = (key: string | null): MedicalSnapshot | null => {
  if (!key || typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    return sanitize(JSON.parse(raw))
  } catch {
    return null
  }
}

interface MedicalContextValue {
  attendanceRecords: AttendanceRecord[]
  patientAlerts: PatientAlert[]
  patientMedications: PatientMedication[]
  examResults: ExamResult[]
  isDemo: boolean

  addAttendanceRecord: (r: AttendanceRecord) => void
  updateAttendanceRecord: (r: AttendanceRecord) => void

  addPatientAlert: (a: PatientAlert) => void
  updatePatientAlert: (a: PatientAlert) => void

  addPatientMedication: (m: PatientMedication) => void

  getPatientAttendances: (patientId: string, companyId: string) => AttendanceRecord[]
  getPatientAlerts: (patientId: string, companyId?: string) => PatientAlert[]
  getPatientMedications: (patientId: string) => PatientMedication[]
  getPatientExamResults: (patientId: string) => ExamResult[]
}

const MedicalContext = createContext<MedicalContextValue | null>(null)

export function MedicalProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const companyId = user?.companyId
  const isDemo = isDemoCompany(companyId)
  const storageKey = useMemo(
    () => (companyId ? `${STORAGE_PREFIX}:${companyId}` : null),
    [companyId],
  )

  const [state, setState] = useState<MedicalSnapshot>(() => {
    if (isDemo) return createDemo()
    return readStored(storageKey) ?? createEmpty()
  })
  const [hydratedKey, setHydratedKey] = useState<string | null>(() => isDemo ? 'demo' : storageKey)

  useEffect(() => {
    if (isDemo) {
      setState(createDemo())
      setHydratedKey('demo')
    } else {
      setState(readStored(storageKey) ?? createEmpty())
      setHydratedKey(storageKey)
    }
  }, [isDemo, storageKey])

  useEffect(() => {
    if (isDemo || !storageKey || hydratedKey !== storageKey || typeof window === 'undefined') return
    window.localStorage.setItem(storageKey, JSON.stringify(state))
  }, [state, hydratedKey, isDemo, storageKey])

  const addAttendanceRecord = useCallback((r: AttendanceRecord) => {
    setState(prev => ({ ...prev, attendanceRecords: [...prev.attendanceRecords, r] }))
  }, [])

  const updateAttendanceRecord = useCallback((r: AttendanceRecord) => {
    setState(prev => ({
      ...prev,
      attendanceRecords: prev.attendanceRecords.map(x => x.id === r.id ? r : x),
    }))
  }, [])

  const addPatientAlert = useCallback((a: PatientAlert) => {
    setState(prev => ({ ...prev, patientAlerts: [...prev.patientAlerts, a] }))
  }, [])

  const updatePatientAlert = useCallback((a: PatientAlert) => {
    setState(prev => ({
      ...prev,
      patientAlerts: prev.patientAlerts.map(x => x.id === a.id ? a : x),
    }))
  }, [])

  const addPatientMedication = useCallback((m: PatientMedication) => {
    setState(prev => ({ ...prev, patientMedications: [...prev.patientMedications, m] }))
  }, [])

  const getPatientAttendances = useCallback((patientId: string, cId: string) => {
    return state.attendanceRecords
      .filter(r => r.patientId === patientId && r.companyId === cId)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  }, [state.attendanceRecords])

  const getPatientAlertsFn = useCallback((patientId: string, cId?: string) => {
    return state.patientAlerts.filter(a =>
      a.patientId === patientId && a.isActive && (!cId || !a.companyId || a.companyId === cId)
    )
  }, [state.patientAlerts])

  const getPatientMedicationsFn = useCallback((patientId: string) => {
    return state.patientMedications.filter(m => m.patientId === patientId)
  }, [state.patientMedications])

  const getPatientExamResultsFn = useCallback((patientId: string) => {
    return state.examResults.filter(e => e.patientId === patientId)
  }, [state.examResults])

  return (
    <MedicalContext.Provider value={{
      ...state,
      isDemo,
      addAttendanceRecord,
      updateAttendanceRecord,
      addPatientAlert,
      updatePatientAlert,
      addPatientMedication,
      getPatientAttendances,
      getPatientAlerts: getPatientAlertsFn,
      getPatientMedications: getPatientMedicationsFn,
      getPatientExamResults: getPatientExamResultsFn,
    }}>
      {children}
    </MedicalContext.Provider>
  )
}

export function useMedical() {
  const ctx = useContext(MedicalContext)
  if (!ctx) throw new Error('useMedical must be used within MedicalProvider')
  return ctx
}
