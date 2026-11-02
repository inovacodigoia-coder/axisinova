import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'

export interface Medicamento {
  id: string
  codigo: number
  nome: string
  principio_ativo: string | null
  apresentacao: string | null
  forma: string | null
  unidade: string
  custo: number | null
  ativo: boolean
}

export const medicamentoLabel = (m: Pick<Medicamento, 'nome' | 'apresentacao'>) =>
  m.nome + (m.apresentacao ? ` ${m.apresentacao}` : '')

/** Cadastro real de medicamentos da empresa (Farmácia → Medicamentos). */
export function useMedicamentos(somenteAtivos = false) {
  const { user } = useAuth()
  const companyId = user?.companyId
  const [itens, setItens] = useState<Medicamento[]>([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    if (!companyId) return
    let q = (supabase as any).from('farmacia_medicamentos').select('*').eq('company_id', companyId).order('nome')
    if (somenteAtivos) q = q.eq('ativo', true)
    const { data } = await q
    setItens(data || [])
    setLoading(false)
  }, [companyId, somenteAtivos])
  useEffect(() => { load() }, [load])
  return { itens, loading, reload: load }
}

/** Permissões do cadastro (checadas também no banco). */
export function useFarmaciaPermissoes() {
  const [perm, setPerm] = useState({ ver: false, criar: false, editar: false, inativar: false })
  useEffect(() => {
    const db = supabase as any
    Promise.all(['ver', 'criar', 'editar', 'inativar'].map(a => db.rpc('farmacia_tem_permissao', { _acao: a })))
      .then(r => setPerm({ ver: !!r[0].data, criar: !!r[1].data, editar: !!r[2].data, inativar: !!r[3].data }))
  }, [])
  return perm
}
