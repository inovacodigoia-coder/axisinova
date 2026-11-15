import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import type { AmostraSoroteca, EquipamentoSoroteca, PedidoLocalizado, RastreioSoroteca } from '@/lib/soroteca'

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

export interface AcessoSoroteca {
  ver: boolean; armazenar: boolean; descartar: boolean; configurar: boolean
  /** Módulo ligado para a empresa (desligado: só TI/Administração continua vendo). */
  modulo_ativo: boolean
  /** TI/Administração: pode ligar/desligar o módulo da empresa. */
  pode_ativar: boolean
}

const EVENTO_ACESSO = 'soroteca-acesso-alterado'
const SEM_ACESSO: AcessoSoroteca = { ver: false, armazenar: false, descartar: false, configurar: false, modulo_ativo: false, pode_ativar: false }

/** Permissões da Soroteca checadas no banco (administrador tem todas). null = carregando. */
export function useSorotecaAcesso(): AcessoSoroteca | null {
  const { user } = useAuth()
  const [acesso, setAcesso] = useState<AcessoSoroteca | null>(null)
  const [versao, setVersao] = useState(0)
  useEffect(() => {
    const recarregar = () => setVersao(v => v + 1)
    window.addEventListener(EVENTO_ACESSO, recarregar)
    return () => window.removeEventListener(EVENTO_ACESSO, recarregar)
  }, [])
  useEffect(() => {
    let vivo = true
    if (!user?.id) { setAcesso(SEM_ACESSO); return }
    void rpc('soroteca_acesso').then(({ data }) => {
      if (vivo) setAcesso({
        ver: !!data?.ver, armazenar: !!data?.armazenar, descartar: !!data?.descartar, configurar: !!data?.configurar,
        modulo_ativo: !!data?.modulo_ativo, pode_ativar: !!data?.pode_ativar,
      })
    })
    return () => { vivo = false }
  }, [user?.id, user?.companyId, versao])
  return acesso
}

/** Liga/desliga a Soroteca da empresa (só TI/Administração) e atualiza menu e telas. */
export async function definirModuloSoroteca(ativo: boolean) {
  await chamar<boolean>('soroteca_modulo_definir', { p_ativo: ativo })
  window.dispatchEvent(new Event(EVENTO_ACESSO))
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
  /** Estante (os tubos só ficam em estantes). */
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
    /** Cria (id null) ou edita uma estante: grade única linhas × colunas e etiqueta própria. */
    salvarEstante: (e: { id: string | null; codigo: string; nome: string; linhas: number; colunas: number; workbench_id: string | null; ativo: boolean }) =>
      depois(chamar<string>('soroteca_estante_gravar', {
        p_id: e.id, p_codigo: e.codigo.trim().toUpperCase(), p_nome: e.nome.trim() || null, p_linhas: e.linhas, p_colunas: e.colunas,
        p_workbench_id: e.workbench_id, p_ativo: e.ativo,
      })),
    /** Geladeira / freezer / outro: N prateleiras com X posições de estante. */
    salvarArmario: (e: { id: string | null; nome: string; tipo: string; temperatura: string; prateleiras: number; posicoes: number; ativo: boolean }) =>
      depois(chamar<string>('soroteca_armario_gravar', {
        p_id: e.id, p_nome: e.nome, p_tipo: e.tipo, p_temperatura: e.temperatura || null, p_prateleiras: e.prateleiras, p_posicoes: e.posicoes, p_ativo: e.ativo,
      })),
    /** Estante guardada bipada de novo: sai da geladeira para receber tubos. */
    abrirEstante: (id: string) => depois(chamar<{ aberta: boolean; de: string | null }>('soroteca_estante_abrir', { p_id: id })),
    /** Finalizar: guarda a estante na prateleira escolhida. */
    guardarEstante: (id: string, equipamentoId: string, prateleiraId: string) =>
      depois(chamar<{ equipamento_nome: string; prateleira_nome: string; tubos: number }>('soroteca_estante_guardar', {
        p_id: id, p_equipamento_id: equipamentoId, p_prateleira_id: prateleiraId,
      })),
    salvarConfig: (aviso: number, responsavel: string, retencao: Record<string, number>) =>
      depois(chamar<void>('soroteca_config_salvar', { p_aviso_dias: aviso, p_responsavel: responsavel || null, p_retencao: retencao })),
  }
}
