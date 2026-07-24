import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import type { Patient, PatientListFilters } from '@/types/patient.types'
import { dbToPatient } from '@/utils/patient.adapter'
import { resolveCompanyId } from '@/utils/companyId'

interface UsePatientsOptions {
  autoFetch?: boolean
}

interface UsePatientsResult {
  patients: Patient[]
  filtered: Patient[]
  loading: boolean
  error: string | null
  filters: PatientListFilters
  setFilters: (f: PatientListFilters) => void
  updateFilter: <K extends keyof PatientListFilters>(key: K, value: PatientListFilters[K]) => void
  refresh: () => Promise<void>
  clearFilters: () => void
}

const EMPTY_FILTERS: PatientListFilters = {}

export function usePatients(options: UsePatientsOptions = {}): UsePatientsResult {
  const { autoFetch = true } = options
  const { user } = useAuth()
  const companyId = resolveCompanyId(user?.companyId) || (user?.companyId === 'comp_001' ? '00000000-0000-0000-0000-000000000001' : null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<PatientListFilters>(EMPTY_FILTERS)

  const refresh = useCallback(async () => {
    if (!companyId) {
      setPatients([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('patients')
      .select('*')
      .eq('company_id', companyId)
      .order('name', { ascending: true })
    if (err) {
      console.error('[usePatients] fetch error:', err)
      setError(err.message)
      setLoading(false)
      return
    }
    setPatients((data || []).map(dbToPatient))
    setLoading(false)
  }, [companyId])

  useEffect(() => {
    if (autoFetch) refresh()
  }, [autoFetch, refresh])

  const filtered = useMemo(() => applyFilters(patients, filters), [patients, filters])

  const updateFilter = useCallback(<K extends keyof PatientListFilters>(key: K, value: PatientListFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), [])

  return { patients, filtered, loading, error, filters, setFilters, updateFilter, refresh, clearFilters }
}

// ─── Filtragem em memória ────────────────────────────────────────────
function applyFilters(list: Patient[], f: PatientListFilters): Patient[] {
  return list.filter(p => {
    if (f.search) {
      const q = f.search.toLowerCase().trim()
      const haystack = [
        p.fullName, p.socialName, p.cpf, p.rg, p.motherName,
        p.phone1, p.phone2, ...p.convenios.map(c => c.cardNumber),
      ].filter(Boolean).join(' ').toLowerCase()
      if (!haystack.includes(q)) return false
    }
    if (f.status?.length && !f.status.includes(p.status)) return false
    if (f.gender?.length && !f.gender.includes(p.gender)) return false
    if (f.convenioIds?.length) {
      const ids = p.convenios.map(c => c.convenioId)
      if (!f.convenioIds.some(id => ids.includes(id))) return false
    }
    if (f.bloodType && p.clinicalData.bloodType !== f.bloodType) return false
    if (f.hasAllergy && p.clinicalData.allergies.length === 0) return false
    if (f.city && p.address?.city?.toLowerCase() !== f.city.toLowerCase()) return false
    if (f.birthDateFrom && p.birthDate < f.birthDateFrom) return false
    if (f.birthDateTo && p.birthDate > f.birthDateTo) return false

    if (f.ageRanges?.length) {
      const age = calcAge(p.birthDate)
      const inRange = f.ageRanges.some(r => ageInRange(age, r))
      if (!inRange) return false
    }

    if (f.lastAttendance) {
      const ok = matchAttendance(p.lastAttendance, f.lastAttendance)
      if (!ok) return false
    }
    return true
  })
}

function calcAge(birthDate: string): number {
  const b = new Date(birthDate)
  const t = new Date()
  let a = t.getFullYear() - b.getFullYear()
  const m = t.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--
  return a
}

function ageInRange(age: number, range: string): boolean {
  switch (range) {
    case '0-12': return age >= 0 && age <= 12
    case '13-17': return age >= 13 && age <= 17
    case '18-30': return age >= 18 && age <= 30
    case '31-45': return age >= 31 && age <= 45
    case '46-60': return age >= 46 && age <= 60
    case '60+': return age > 60
    default: return true
  }
}

function matchAttendance(last: string | undefined, key: string): boolean {
  if (key === 'never') return !last
  if (!last) return false
  const d = new Date(last)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  switch (key) {
    case 'week': return diffDays <= 7
    case 'month': return diffDays <= 30
    case '3months': return diffDays <= 90
    case '6months': return diffDays > 180
    default: return true
  }
}
