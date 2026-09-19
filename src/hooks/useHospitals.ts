import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'

export interface HospitalRow { id: string; name: string }
export interface HospitalSectorRow { id: string; name: string; hospital_id: string }

export function useHospitals() {
  const { user } = useAuth()
  const companyId = user?.companyId
  const [hospitals, setHospitals] = useState<HospitalRow[]>([])
  const [sectors, setSectors] = useState<HospitalSectorRow[]>([])
  const [loading, setLoading] = useState(false)

  const loadHospitals = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    const { data } = await (supabase.from('hospitals' as any) as any)
      .select('id, name')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name')
    setHospitals((data as HospitalRow[]) || [])
    setLoading(false)
  }, [companyId])

  const loadSectors = useCallback(async (hospitalId?: string) => {
    if (!companyId || !hospitalId) { setSectors([]); return }
    const { data } = await (supabase.from('hospital_sectors' as any) as any)
      .select('id, name, hospital_id')
      .eq('company_id', companyId)
      .eq('hospital_id', hospitalId)
      .eq('is_active', true)
      .order('name')
    setSectors((data as HospitalSectorRow[]) || [])
  }, [companyId])

  useEffect(() => { loadHospitals() }, [loadHospitals])

  const createHospital = useCallback(async (name: string): Promise<HospitalRow | null> => {
    if (!companyId || !name.trim()) return null
    const { data, error } = await (supabase.from('hospitals' as any) as any)
      .insert({ company_id: companyId, name: name.trim().toUpperCase(), created_by: user?.id })
      .select('id, name')
      .maybeSingle()
    if (error || !data) return null
    setHospitals(prev => [...prev, data as HospitalRow].sort((a, b) => a.name.localeCompare(b.name)))
    return data as HospitalRow
  }, [companyId, user?.id])

  const createSector = useCallback(async (hospitalId: string, name: string): Promise<HospitalSectorRow | null> => {
    if (!companyId || !hospitalId || !name.trim()) return null
    const { data, error } = await (supabase.from('hospital_sectors' as any) as any)
      .insert({ company_id: companyId, hospital_id: hospitalId, name: name.trim().toUpperCase(), created_by: user?.id })
      .select('id, name, hospital_id')
      .maybeSingle()
    if (error || !data) return null
    setSectors(prev => [...prev, data as HospitalSectorRow].sort((a, b) => a.name.localeCompare(b.name)))
    return data as HospitalSectorRow
  }, [companyId, user?.id])

  return { hospitals, sectors, loading, loadSectors, createHospital, createSector }
}

export const FASTING_HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')} h`)

export const FASTING_TYPES = [
  'Jejum mínimo de 12h',
  'Jejum de menos de 12h',
  'Jejum de 0 a 4 horas',
  'Jejum de 4 a 8 horas',
  'Jejum de 8 a 12 horas',
  'Jejum acima de 12h',
]
