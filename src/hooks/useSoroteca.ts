import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import type { AmostraSoroteca, EquipamentoSoroteca, PedidoLocalizado, PrateleiraForm, RastreioSoroteca } from '@/lib/soroteca'

const rpc = (nome: string, args?: Record<string, unknown>) => (supabase.rpc as any)(nome, args) as Promise<{ data: any; error: any }>

/** Mensagem do servidor (as RPCs já devolvem texto em português). */
export function mensagemErro(e: any): string {
  const m = String(e?.message || e || '')
  if (/permission denied|42501/i.test(m) && !/Sem permissão/.test(m)) return 'Sem permissão para esta ação na Soroteca'
  return m || 'Não foi possível concluir agora. Tente de novo.'
}

async function chamar<T>(nome: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await rpc(nome, args)
  if (error) throw new Error(mensagemErro(error))
  return data as T
}

export interface AcessoSoroteca { ver: boolean; armazenar: boolean; descartar: boolean; configurar: boolean }

/** Permissões da Soroteca checadas no banco (administrador tem todas). null = carregando. */
export function useSorotecaAcesso(): AcessoSoroteca | null {
  const { user } = useAuth()
  const [acesso, setAcesso] = useState<AcessoSoroteca | null>(null)
  useEffect(() => {
    let vivo = true
    if (!user?.id) { setAcesso({ ver: false, armazenar: false, descartar: false, configurar: false }); return }
    void rpc('soroteca_acesso').then(({ data }) => {
      if (vivo) setAcesso({ ver: !!data?.ver, armazenar: !!data?.armazenar, descartar: !!data?.descartar, configurar: !!data?.configurar })
    })
    return () => { vivo = false }
  }, [user?.id, user?.companyId])
  return acesso
}

export interface ResumoSoroteca {
  aviso_dias: number
  armazenadas: number
  vencidas: number
  vencendo_aviso: number
  vencendo_30: number
  descartadas_mes: number
  equipamentos: EquipamentoSoroteca[]
}

export function useSorotecaResumo(habilitado: boolean) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['soroteca', 'resumo', user?.companyId],
    enabled: habilitado && !!user?.companyId,
    refetchInterval: 60_000,
    queryFn: () => chamar<ResumoSoroteca>('soroteca_resumo'),
  })
}

export interface FiltrosAmostras {
  situacao?: 'ativas' | 'armazenada' | 'retirada' | 'descartada' | 'todas'
  codigo?: string
  paciente?: string
  de?: string
  ate?: string
  equipamento_id?: string
  workbench_id?: string
  status_resultado?: string
  vence_ate?: string
  order_id?: string
}

export function useSorotecaAmostras(filtros: FiltrosAmostras | null, habilitado = true) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['soroteca', 'amostras', user?.companyId, filtros],
    enabled: habilitado && !!filtros && !!user?.companyId,
    refetchInterval: 60_000,
    queryFn: () => buscarAmostras(filtros!),
  })
}

export const buscarAmostras = (filtros: FiltrosAmostras) =>
  chamar<{ amostras: AmostraSoroteca[]; limitado: boolean }>('soroteca_amostras', { p_filtros: filtros })

export interface ConfigSoroteca {
  aviso_dias: number
  responsavel_descarte: string | null
  bancadas: { id: string; nome: string; dias: number; padrao: number; personalizado: boolean }[]
}

export function useSorotecaConfig(habilitado: boolean) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['soroteca', 'config', user?.companyId],
    enabled: habilitado && !!user?.companyId,
    queryFn: () => chamar<ConfigSoroteca>('soroteca_config_ler'),
  })
}

export function useSorotecaRastreio(amostraId: string | null) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['soroteca', 'rastreio', user?.companyId, amostraId],
    enabled: !!amostraId && !!user?.companyId,
    queryFn: () => chamar<RastreioSoroteca>('soroteca_rastreio', { p_amostra_id: amostraId }),
  })
}

export const localizarNaSoroteca = (termo: string) =>
  chamar<{ modo: 'tubo' | 'pedido' | 'paciente' | 'nenhum'; pedidos: PedidoLocalizado[] }>('soroteca_localizar', { p_termo: termo })

export interface ItemArmazenar {
  order_id: string
  tubo_indice: number
  exame_ids: string[]
  tubo_nome: string
  equipamento_id: string
  prateleira_id: string
  linha: number
  coluna: number
}

/** Ações (sempre RPC) que atualizam todas as telas da Soroteca ao terminar. */
export function useSorotecaAcoes() {
  const qc = useQueryClient()
  const depois = async <T,>(p: Promise<T>) => { const r = await p; await qc.invalidateQueries({ queryKey: ['soroteca'] }); return r }
  return {
    armazenar: (itens: ItemArmazenar[]) =>
      depois(chamar<{ id: string; codigo_amostra: string; equipamento_nome: string; prateleira_nome: string; linha: number; coluna: number; repetido: boolean }[]>('soroteca_armazenar', { p_itens: itens })),
    retirar: (id: string, motivo: string, observacao: string) =>
      depois(chamar<void>('soroteca_retirar', { p_amostra_id: id, p_motivo: motivo, p_observacao: observacao || null })),
    descartar: (ids: string[], motivo: string, responsavel: string, observacao: string) =>
      depois(chamar<number>('soroteca_descartar', { p_ids: ids, p_motivo: motivo, p_responsavel: responsavel, p_observacao: observacao || null })),
    salvarEquipamento: (e: { id: string | null; nome: string; tipo: string; temperatura: string; workbench_id: string | null; prateleiras: PrateleiraForm[]; ativo: boolean }) =>
      depois(chamar<string>('soroteca_equipamento_gravar', {
        p_id: e.id, p_nome: e.nome, p_tipo: e.tipo, p_temperatura: e.temperatura || null, p_workbench_id: e.workbench_id,
        p_prateleiras: e.prateleiras.map(p => ({ id: p.id || null, nome: p.nome.trim(), linhas: p.linhas, colunas: p.colunas })), p_ativo: e.ativo,
      })),
    salvarConfig: (aviso: number, responsavel: string, retencao: Record<string, number>) =>
      depois(chamar<void>('soroteca_config_salvar', { p_aviso_dias: aviso, p_responsavel: responsavel || null, p_retencao: retencao })),
  }
}
