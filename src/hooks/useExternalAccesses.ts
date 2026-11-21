import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { buscarEmBlocos } from '@/lib/buscarEmBlocos'
import { useAuth } from '@/context/AuthContext'
import { resolveCompanyId } from '@/utils/companyId'

export type PasswordKind = 'random' | 'cpf' | 'personal'

export function cpfLast4(cpf?: string | null): string | null {
  const d = (cpf || '').replace(/\D/g, '')
  return d.length >= 4 ? d.slice(-4) : null
}

/**
 * Texto da senha no comprovante. A senha guardada nunca volta do servidor: só a recém-gerada
 * (campo `senha` da resposta) é impressa; CPF e pessoal viram dica; aleatória antiga vira aviso.
 */
export function passwordHint(kind: PasswordKind | undefined | null, senhaGerada?: string | null): string {
  if (kind === 'cpf') return 'Os 4 últimos dígitos do CPF'
  if (kind === 'personal') return 'Senha pessoal'
  if (senhaGerada) return senhaGerada
  return 'Entregue no primeiro comprovante'
}

export type ExternalAccessType = 'parceiro' | 'local' | 'medico' | 'paciente'

export interface ExternalAccessRecord {
  id: string
  company_id: string
  type: ExternalAccessType
  name: string
  email: string | null
  status: 'active' | 'inactive'
  access_code: string
  password_kind?: PasswordKind
  /** Senha em claro: vem SÓ na resposta da geração/regeneração e nunca é guardada. */
  senha?: string
  senha_gerada_em?: string | null
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
  /** Dias somados ao prazo de cada exame dos pedidos novos (só via RPC). */
  prazo_dias_adicionais?: number
}

export type ExternalAccessInput = Omit<
  ExternalAccessRecord,
  'id' | 'company_id' | 'access_code' | 'password_kind' | 'senha' | 'senha_gerada_em' | 'last_access_at' | 'created_at' | 'prazo_dias_adicionais'
>

/** Colunas lidas pelas telas: nunca a senha (texto antigo ou protegida). */
export const EXTERNAL_ACCESS_COLUMNS =
  'id,company_id,type,name,email,status,access_code,password_kind,senha_gerada_em,patient_id,doctor_id,origin_id,' +
  'partner_origin_ids,partner_type,cnpj,responsible_name,phone,crm,specialty,permissions,last_access_at,' +
  'created_by,created_at,updated_at,prazo_dias_adicionais'

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
    // Blocos de 1.000 até acabar: nenhum acesso externo fica de fora da lista.
    try {
      const { linhas } = await buscarEmBlocos<any>((de, ate) => supabase
        .from('external_accesses')
        .select(EXTERNAL_ACCESS_COLUMNS)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(de, ate), { chave: (r) => r.id, tela: 'Portais Externos' })
      setAccesses(linhas as unknown as ExternalAccessRecord[])
    } catch (err: any) {
      console.error('[useExternalAccesses] fetch error:', err)
      setError(err?.message || String(err))
    }
    setLoading(false)
  }, [companyId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const createAccess = useCallback(
    async (input: ExternalAccessInput) => {
      if (!companyId) throw new Error('Empresa não identificada')
      // Código e senha nascem no servidor; a senha só volta nesta resposta.
      const { data, error: err } = await supabase.rpc('portal_acesso_criar' as never, { _dados: input } as never)
      if (err || !data) throw new Error(err?.message || 'Falha ao criar acesso')
      const record = data as unknown as ExternalAccessRecord
      setAccesses((prev) => [{ ...record, senha: undefined }, ...prev])
      return record
    },
    [companyId],
  )

  const updateAccess = useCallback(async (id: string, patch: Partial<ExternalAccessInput>) => {
    const { data, error: err } = await supabase
      .from('external_accesses')
      .update(patch as never)
      .eq('id', id)
      .select(EXTERNAL_ACCESS_COLUMNS)
      .single()
    if (err) throw new Error(err.message)
    const record = data as unknown as ExternalAccessRecord
    setAccesses((prev) => prev.map((a) => (a.id === id ? record : a)))
    return record
  }, [])

  /** Nova senha (e, se pedido, novo código). Devolve a senha uma única vez; a anterior deixa de valer. */
  const regenerateCredentials = useCallback(async (id: string, novoCodigo = false) => {
    const { data, error: err } = await supabase.rpc('portal_acesso_regenerar' as never, { _id: id, _novo_codigo: novoCodigo } as never)
    if (err || !data) throw new Error(err?.message || 'Falha ao gerar nova senha')
    const record = data as unknown as ExternalAccessRecord
    setAccesses((prev) => prev.map((a) => (a.id === id ? { ...record, senha: undefined } : a)))
    return record
  }, [])

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

  const setPrazoAdicional = useCallback(async (ids: string[], dias: number) => {
    const { data, error: err } = await supabase.rpc('portal_prazo_adicional_definir', { _ids: ids, _dias: dias })
    if (err) throw new Error(err.message)
    setAccesses((prev) => prev.map((a) => (ids.includes(a.id) ? { ...a, prazo_dias_adicionais: dias } : a)))
    return Number(data) || 0
  }, [])

  return {
    accesses,
    setPrazoAdicional,
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

/**
 * Garante que o paciente possua um acesso ao portal externo (no servidor).
 * Acesso existente volta sem senha e não muda; paciente novo recebe os 4 últimos dígitos do CPF
 * (sem CPF, senha aleatória devolvida só nesta resposta). `gerarNova` pede uma senha nova (modelo novo).
 */
export async function ensurePatientPortalAccess(params: {
  companyId: string
  patientId: string
  patientName: string
  email?: string | null
  cpf?: string | null
  gerarNova?: boolean
}): Promise<ExternalAccessRecord | null> {
  const { companyId, patientId, patientName, email, gerarNova } = params
  if (!companyId || !patientId) return null
  try {
    const { data, error } = await supabase.rpc('portal_acesso_paciente_garantir' as never, {
      _patient_id: patientId, _nome: patientName, _email: email || null, _gerar_nova: !!gerarNova,
    } as never)
    if (error || !data) {
      console.error('[ensurePatientPortalAccess] error:', error?.message)
      return null
    }
    return data as unknown as ExternalAccessRecord
  } catch (e) {
    console.error('[ensurePatientPortalAccess] error:', e)
    return null
  }
}
