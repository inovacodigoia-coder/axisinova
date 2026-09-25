import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'

const db = supabase as any

export interface InpUnit { id: string; name: string; hospital_id: string | null; is_active: boolean }
export interface InpBed { id: string; unit_id: string; name: string; sort_order: number; status: 'free' | 'reserved' | 'occupied' | 'cleaning'; current_request_id: string | null; is_active: boolean }
export interface AdmissionRequest {
  id: string; patient_name: string; patient_id: string | null; origin_type: 'post' | 'consultorio' | 'inpatient'; origin_label: string | null
  origin_occupancy_id: string | null; origin_inpatient_bed_id: string | null; requested_unit_id: string; approved_unit_id: string | null; bed_id: string | null
  reason: string; urgency: 'eletiva' | 'urgente'; notes: string | null; doctor_name: string | null; status: string; refusal_reason: string | null
  suggested_unit_id: string | null; requested_at: string; decided_at: string | null; admitted_at: string | null
}

/** Setores de internação pré-cadastrados por padrão (editáveis/inativáveis) */
export const DEFAULT_INPATIENT_UNITS = ['UTI', 'Centro Cirúrgico', 'Internação Pediátrica', 'Clínica Médica', 'Maternidade', 'UTI Neonatal']
export const INP_STATUS_LABEL: Record<InpBed['status'], string> = { free: 'Livre', reserved: 'Reservado', occupied: 'Ocupado', cleaning: 'Em higienização' }

export function useInpatient() {
  const { user } = useAuth()
  const companyId = user?.companyId
  const [units, setUnits] = useState<InpUnit[]>([])
  const [beds, setBeds] = useState<InpBed[]>([])
  const [requests, setRequests] = useState<AdmissionRequest[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!companyId) return
    const since = new Date(Date.now() - 30 * 86400000).toISOString()
    const [u, b, r] = await Promise.all([
      db.from('inpatient_units').select('*').eq('company_id', companyId).order('name'),
      db.from('inpatient_beds').select('*').eq('company_id', companyId).order('sort_order').order('name'),
      db.from('admission_requests').select('*').eq('company_id', companyId)
        .or(`status.in.(pending,approved,admitted),requested_at.gte.${since}`).order('requested_at', { ascending: false }).limit(500),
    ])
    let list: InpUnit[] = u.data || []
    const missing = DEFAULT_INPATIENT_UNITS.filter(n => !list.some(x => x.name.trim().toLowerCase() === n.toLowerCase()))
    if (!u.error && missing.length > 0) {
      await db.from('inpatient_units').insert(missing.map(name => ({ company_id: companyId, name })))
      const { data } = await db.from('inpatient_units').select('*').eq('company_id', companyId).order('name')
      list = data || list
    }
    setUnits(list); setBeds(b.data || []); setRequests(r.data || []); setLoading(false)
  }, [companyId])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!companyId) return
    const ch = supabase.channel('inp-' + companyId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inpatient_beds', filter: `company_id=eq.${companyId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admission_requests', filter: `company_id=eq.${companyId}` }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [companyId, load])

  const addUnit = async (name: string, hospitalId: string | null, bedCount: number) => {
    if (!companyId || !name.trim()) return
    const { data, error } = await db.from('inpatient_units').insert({ company_id: companyId, name: name.trim(), hospital_id: hospitalId }).select().single()
    if (error) return toast.error(error.message)
    if (bedCount > 0) await db.from('inpatient_beds').insert(Array.from({ length: bedCount }, (_, i) => ({ company_id: companyId, unit_id: data.id, name: `Leito ${String(i + 1).padStart(2, '0')}`, sort_order: i + 1 })))
    toast.success('Setor de internação criado'); load()
  }
  const renameUnit = async (u: InpUnit, name: string) => { if (name.trim()) { await db.from('inpatient_units').update({ name: name.trim() }).eq('id', u.id); load() } }
  const toggleUnit = async (u: InpUnit) => {
    if (u.is_active && beds.some(b => b.unit_id === u.id && (b.status === 'reserved' || b.status === 'occupied'))) return toast.error('Há leitos reservados ou ocupados neste setor')
    await db.from('inpatient_units').update({ is_active: !u.is_active }).eq('id', u.id); load()
  }
  const addBed = async (unitId: string) => {
    if (!companyId) return
    const n = beds.filter(b => b.unit_id === unitId).length + 1
    const { error } = await db.from('inpatient_beds').insert({ company_id: companyId, unit_id: unitId, name: `Leito ${String(n).padStart(2, '0')}`, sort_order: n })
    if (error) return toast.error(error.message)
    load()
  }
  const toggleBed = async (b: InpBed) => {
    const { error } = await db.from('inpatient_beds').update({ is_active: !b.is_active }).eq('id', b.id)
    if (error) return toast.error(error.message)
    load()
  }

  return { companyId, units, beds, requests, loading, reload: load, addUnit, renameUnit, toggleUnit, addBed, toggleBed }
}
