import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import type { LinhaRelatorio } from '@/lib/relatoriosGerenciais'

/** Permissão lab.relatorios_gerenciais (ou administrador), checada no banco. null = carregando. */
export function useRelatoriosGerenciaisAcesso(): boolean | null {
  const { user } = useAuth()
  const [ok, setOk] = useState<boolean | null>(null)
  useEffect(() => {
    let vivo = true
    if (!user?.id) { setOk(false); return }
    void (supabase.rpc as any)('lab_relatorios_tem_permissao').then(({ data }: any) => { if (vivo) setOk(data === true) })
    return () => { vivo = false }
  }, [user?.id, user?.companyId])
  return ok
}

export interface DadosRelatorio {
  exames: LinhaRelatorio[]
  criticos: number[]
  responsavel: { nome: string | null; registro: string | null; logo: string | null } | null
}

/** Um único valor do servidor (sem limite de 1.000 linhas). Minuto arredondado para reaproveitar o cache. */
export function useRelatorioGerencial(de: number, ate: number, habilitado: boolean) {
  const { user } = useAuth()
  const companyId = user?.companyId
  const deMin = Math.floor(de / 60_000) * 60_000
  const ateMin = Math.ceil(ate / 60_000) * 60_000
  return useQuery({
    queryKey: ['lab_relatorio_gerencial', companyId, deMin, ateMin],
    enabled: habilitado && !!companyId,
    staleTime: 5 * 60_000,
    placeholderData: (anterior) => anterior,
    queryFn: async (): Promise<DadosRelatorio> => {
      const { data, error } = await (supabase.rpc as any)('lab_relatorio_gerencial', {
        p_de: new Date(deMin).toISOString(), p_ate: new Date(ateMin).toISOString(),
      })
      if (error) throw error
      const d = (data || {}) as any
      return {
        exames: Array.isArray(d.exames) ? d.exames : [],
        criticos: (Array.isArray(d.criticos) ? d.criticos : []).map((t: string) => new Date(t).getTime()).filter(Number.isFinite),
        responsavel: d.responsavel || null,
      }
    },
  })
}
