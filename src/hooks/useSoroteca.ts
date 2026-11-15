import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import type { AmostraSoroteca, DestinoEstante, EquipamentoSoroteca, EstanteConferida, EstanteDescarte, FolhaDescarte, MovimentoEstante, PedidoLocalizado, RastreioSoroteca } from '@/lib/soroteca'

const rpc = (nome: string, args?: Record<string, unknown>) => (supabase.rpc as any)(nome, args) as Promise<{ data: any; error: any }>

const ERRO_GENERICO = 'Não foi possível concluir agora. Tente de novo; se continuar, avise a TI.'
/** Mensagens cruas do banco/navegador (em inglês) que nunca devem aparecer na tela. */
const TECNICO = /requires a WHERE clause|syntax error|violates|duplicate key|does not exist|relation |column |null value|invalid input|could not|deadlock|statement timeout|JWT|Cannot read|is not a function|undefined|unexpected/i

/**
 * Texto em português para a tela. As RPCs da Soroteca levantam mensagens próprias (código P0001/P0002/42501);
 * qualquer outra mensagem técnica do banco vira um aviso claro.
 */
export function mensagemErro(e: any): string {
  const m = String(e?.message || e || '').trim()
  const code = String(e?.code || '')
  if (/Sem permissão/.test(m)) return m
  if (code === '42501' || /permission denied/i.test(m)) return 'Sem permissão para esta ação na Soroteca'
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Sem conexão com o servidor. Confira a internet e tente de novo.'
  if (code === '23505' || /duplicate key/i.test(m)) return 'Essa posição acabou de ser ocupada. Bipe de novo.'
  if (code === '40P01' || code === '40001' || /deadlock|could not serialize/i.test(m)) return 'Outra pessoa gravou ao mesmo tempo. Tente de novo.'
  if (m && (code === 'P0001' || code === 'P0002' || (!code && !TECNICO.test(m)))) return m
  return ERRO_GENERICO
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

/** Estantes ativas para a aba "Por estante" do descarte. */
export function useSorotecaEstantesDescarte(habilitado: boolean) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['soroteca', 'estantes-descarte', user?.companyId],
    enabled: habilitado && !!user?.companyId,
    refetchInterval: 60_000,
    queryFn: () => chamar<{ aviso_dias: number; estantes: EstanteDescarte[] }>('soroteca_estantes_descarte'),
  })
}

/** Tubos de uma estante (com exames pendentes) para conferir antes de descartar. */
export function useSorotecaEstanteConferir(estanteId: string | null) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['soroteca', 'conferir', user?.companyId, estanteId],
    enabled: !!estanteId && !!user?.companyId,
    queryFn: () => chamar<EstanteConferida>('soroteca_estante_conferir', { p_id: estanteId }),
  })
}

export interface DescarteEstanteDados {
  id: string; motivo: string; responsavel: string; observacao: string; destino: DestinoEstante; forcar: boolean
}
export interface DescarteEstanteResultado { tubos: number; codigo: string; origem: string | null; destino: DestinoEstante; ids: string[]; descarte_id: string | null }

/** Folha de descarte: pelo id do descarte ou pelo último descarte da amostra (reimpressão). */
export function useSorotecaFolhaDescarte(alvo: { descarteId?: string | null; amostraId?: string | null } | null) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['soroteca', 'folha', user?.companyId, alvo?.descarteId ?? null, alvo?.amostraId ?? null],
    enabled: !!alvo && !!(alvo.descarteId || alvo.amostraId) && !!user?.companyId,
    queryFn: () => chamar<FolhaDescarte>('soroteca_descarte_folha', { p_descarte_id: alvo?.descarteId ?? null, p_amostra_id: alvo?.amostraId ?? null }),
  })
}

/** Histórico da estante (criada, guardada, aberta, descartada, inativada, reativada). */
export function useSorotecaEstanteHistorico(estanteId: string | null) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['soroteca', 'historico-estante', user?.companyId, estanteId],
    enabled: !!estanteId && !!user?.companyId,
    queryFn: () => chamar<MovimentoEstante[]>('soroteca_estante_historico', { p_id: estanteId }),
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
    /** Descarte em lote ou manual; devolve a folha gerada (descarte_id). */
    descartar: (ids: string[], motivo: string, responsavel: string, observacao: string, tipo: 'lote' | 'manual') =>
      depois(chamar<{ tubos: number; descarte_id: string | null }>('soroteca_descartar_amostras', {
        p_ids: ids, p_motivo: motivo, p_responsavel: responsavel, p_observacao: observacao || null, p_tipo: tipo,
      })),
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
    /** Descarta a estante inteira (todos os tubos viram "descartada"); reaproveitar deixa vazia, inativar aposenta. */
    descartarEstante: (d: DescarteEstanteDados) =>
      depois(chamar<DescarteEstanteResultado>('soroteca_estante_descartar', {
        p_id: d.id, p_motivo: d.motivo, p_responsavel: d.responsavel, p_observacao: d.observacao.trim() || null, p_destino: d.destino, p_forcar: d.forcar,
      })),
    /** Estante inativa volta a ser usada (vazia). */
    reativarEstante: (id: string) => depois(chamar<void>('soroteca_estante_reativar', { p_id: id })),
    salvarConfig: (aviso: number, responsavel: string, retencao: Record<string, number>) =>
      depois(chamar<void>('soroteca_config_salvar', { p_aviso_dias: aviso, p_responsavel: responsavel || null, p_retencao: retencao })),
  }
}
