import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { resolveCompanyId } from '@/utils/companyId'

export type ExternalAccessType = 'parceiro' | 'local' | 'medico' | 'paciente'

export interface ExternalAccessRecord {
  id: string
  company_id: string
  type: ExternalAccessType
  name: string
  email: string | null
  status: 'active' | 'inactive'
  access_code: string
  access_password: string
  patient_id: string | null
  doctor_id: string | null
  origin_id: string | null
  partner_origin_ids: string[]
  partner_type: string | null
  cnpj: string | null
  responsible_name: string | null
  phone: string | null
  crm: string | null
  specialty: string | null
  last_access_at: string | null
  created_at: string
}

export type ExternalAccessInput = Omit<
  ExternalAccessRecord,
  'id' | 'company_id' | 'access_code' | 'access_password' | 'last_access_at' | 'created_at'
>

export function generatePassword(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

export function buildPortalUrl(code: string): string {
  return `${window.location.origin}/portal/${code}`
}

export function useExternalAccesses() {
  const { user } = useAuth()
  const companyId = resolveCompanyId(user?.companyId)
  const [accesses, setAccesses] = useState<ExternalAccessRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!companyId) {
      setAccesses([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('external_accesses')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    if (err) {
      console.error('[useExternalAccesses] fetch error:', err)
      setError(err.message)
    } else {
      setAccesses((data || []) as unknown as ExternalAccessRecord[])
    }
    setLoading(false)
  }, [companyId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const generateCode = useCallback(async () => {
    const { data, error: err } = await supabase.rpc('generate_external_access_code')
    if (err || !data) throw new Error(err?.message || 'Falha ao gerar código de acesso')
    return data as string
  }, [])

  const createAccess = useCallback(
    async (input: ExternalAccessInput) => {
      if (!companyId) throw new Error('Empresa não identificada')
      const access_code = await generateCode()
      const access_password = generatePassword()
      const { data, error: err } = await supabase
        .from('external_accesses')
        .insert({
          ...input,
          company_id: companyId,
          access_code,
          access_password,
        } as never)
        .select('*')
        .single()
      if (err) throw new Error(err.message)
      const record = data as unknown as ExternalAccessRecord
      setAccesses((prev) => [record, ...prev])
      return record
    },
    [companyId, generateCode],
  )

  const updateAccess = useCallback(async (id: string, patch: Partial<ExternalAccessInput>) => {
    const { data, error: err } = await supabase
      .from('external_accesses')
      .update(patch as never)
      .eq('id', id)
      .select('*')
      .single()
    if (err) throw new Error(err.message)
    const record = data as unknown as ExternalAccessRecord
    setAccesses((prev) => prev.map((a) => (a.id === id ? record : a)))
    return record
  }, [])

  const regenerateCredentials = useCallback(
    async (id: string) => {
      const access_code = await generateCode()
      const access_password = generatePassword()
      const { data, error: err } = await supabase
        .from('external_accesses')
        .update({ access_code, access_password } as never)
        .eq('id', id)
        .select('*')
        .single()
      if (err) throw new Error(err.message)
      const record = data as unknown as ExternalAccessRecord
      setAccesses((prev) => prev.map((a) => (a.id === id ? record : a)))
      return record
    },
    [generateCode],
  )

  const deleteAccess = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('external_accesses').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setAccesses((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const toggleStatus = useCallback(
    async (id: string, current: 'active' | 'inactive') => {
      const next = current === 'active' ? 'inactive' : 'active'
      const { error: err } = await supabase
        .from('external_accesses')
        .update({ status: next } as never)
        .eq('id', id)
      if (err) throw new Error(err.message)
      setAccesses((prev) => prev.map((a) => (a.id === id ? { ...a, status: next } : a)))
      return next
    },
    [],
  )

  return {
    accesses,
    loading,
    error,
    companyId,
    refresh,
    createAccess,
    updateAccess,
    regenerateCredentials,
    deleteAccess,
    toggleStatus,
  }
}
