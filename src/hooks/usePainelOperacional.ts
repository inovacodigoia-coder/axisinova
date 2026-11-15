import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { buscarEmBlocos } from '@/lib/buscarEmBlocos'
import { janelaDoPeriodo, type LinhaPainelRpc, type PeriodoPainel } from '@/lib/painelOperacional'

/** Intervalo de atualização automática do painel (sem recarregar a página). */
export const PAINEL_ATUALIZACAO_MS = 60_000
const DIAS_CRITICOS = 7

/** Permissão lab.painel_operacional (ou administrador), checada no banco. null = carregando. */
export function usePainelOperacionalAcesso(): boolean | null {
  const { user } = useAuth()
  const [ok, setOk] = useState<boolean | null>(null)
  useEffect(() => {
    let vivo = true
    if (!user?.id) { setOk(false); return }
    void (supabase.rpc as any)('lab_painel_tem_permissao').then(({ data }: any) => { if (vivo) setOk(data === true) })
    return () => { vivo = false }
  }, [user?.id, user?.companyId])
  return ok
}

/** Painel Operacional liberado para a empresa (desligado: some do menu e das permissões). null = carregando. */
export function usePainelOperacionalModuloAtivo(): boolean | null {
  const { user } = useAuth()
  const [ok, setOk] = useState<boolean | null>(null)
  useEffect(() => {
    let vivo = true
    if (!user?.id) { setOk(false); return }
    void (supabase.rpc as any)('lab_painel_modulo_ativo').then(({ data }: any) => { if (vivo) setOk(data === true) })
    return () => { vivo = false }
  }, [user?.id, user?.companyId])
  return ok
}

export interface CriticoPainel {
  value_id: string
  result_id: string
  order_id: string | null
  protocol: string | null
  patient_name: string | null
  is_urgent: boolean | null
  exam_name: string | null
  workbench_id: string | null
  parameter_name: string | null
  valor: string | null
  unidade: string | null
  referencia: string | null
  limite_critico: string | null
  resultado_em: string | null
}

export function usePainelOperacional(periodo: PeriodoPainel, habilitado: boolean) {
  const { user } = useAuth()
  const companyId = user?.companyId
  const qc = useQueryClient()

  const exames = useQuery({
    queryKey: ['lab_painel_operacional', companyId, periodo],
    enabled: habilitado && !!companyId,
    refetchInterval: PAINEL_ATUALIZACAO_MS,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      // Desde o início do período anterior (para as setas de comparação); pendentes vêm de qualquer data.
      const desde = new Date(janelaDoPeriodo(periodo, Date.now()).anteriorInicio).toISOString()
      const { linhas, limitado } = await buscarEmBlocos<LinhaPainelRpc>((de, ate) =>
        ((supabase.rpc as any)('lab_painel_operacional', { p_desde: desde }) as any)
          .order('order_id').order('exam_id').range(de, ate),
        { chave: (l) => `${l.order_id}:${l.exam_id}`, tela: 'Painel Operacional' })
      return { linhas, limitado }
    },
  })

  const criticos = useQuery({
    queryKey: ['lab_painel_criticos', companyId],
    enabled: habilitado && !!companyId,
    refetchInterval: PAINEL_ATUALIZACAO_MS,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const desde = new Date(Date.now() - DIAS_CRITICOS * 86_400_000).toISOString()
      const { linhas } = await buscarEmBlocos<CriticoPainel>((de, ate) =>
        ((supabase.rpc as any)('lab_painel_criticos', { p_desde: desde }) as any)
          .order('value_id').range(de, ate),
        { tela: 'Painel Operacional' })
      return linhas
    },
  })

  const marcarNotificado = async (valueId: string) => {
    const { error } = await (supabase.rpc as any)('lab_critico_marcar_notificado', { p_value_id: valueId })
    if (error) throw error
    await qc.invalidateQueries({ queryKey: ['lab_painel_criticos', companyId] })
  }

  return {
    linhas: exames.data?.linhas ?? [],
    limitado: exames.data?.limitado ?? false,
    carregando: exames.isLoading,
    erro: exames.error as Error | null,
    atualizadoEm: exames.dataUpdatedAt || null,
    atualizando: exames.isFetching,
    recarregar: () => { void exames.refetch(); void criticos.refetch() },
    criticos: criticos.data ?? [],
    marcarNotificado,
  }
}

export interface AparelhoPainel {
  equipment_id: string
  nome: string
  bancada: string | null
  identificador: string | null
  ultima_comunicacao: string | null
  ultimo_status: string | null
  ultimo_erro: string | null
}

export interface LogAparelho {
  criado_em: string
  status: string | null
  mensagem: string | null
  amostra: string | null
  exame: string | null
  codigo_teste: string | null
  valor: string | null
  protocolo: string | null
}

/** Aparelhos ativos com a última mensagem recebida (atualiza junto com o painel). */
export function usePainelAparelhos(habilitado: boolean) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['lab_painel_aparelhos', user?.companyId],
    enabled: habilitado && !!user?.companyId,
    refetchInterval: PAINEL_ATUALIZACAO_MS,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('lab_painel_aparelhos')
      if (error) throw error
      return (data ?? []) as AparelhoPainel[]
    },
  })
}

/** Últimas 10 mensagens do aparelho. */
export function usePainelAparelhoLog(equipmentId: string | null) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['lab_painel_aparelho_log', user?.companyId, equipmentId],
    enabled: !!equipmentId && !!user?.companyId,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('lab_painel_aparelho_log', { p_equipment_id: equipmentId })
      if (error) throw error
      return (data ?? []) as LogAparelho[]
    },
  })
}
