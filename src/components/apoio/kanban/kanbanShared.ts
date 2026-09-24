export interface KCard {
  id: string; pedido_id: string; exame_id: string; apoio_id: string; apoio_nome: string; apoio_manual: boolean; unidade_id: string | null
  status: string; status_apoio_cod: string | null; status_apoio_desc: string | null; pedido_numero: string | null; pedido_protocolo: string | null
  paciente_nome: string | null; exame_nome: string | null; exame_codigo: string | null; codigo_apoio: string | null; cod_ped_apoio: string | null
  cod_barras: string[] | null; remessa_id: string | null; cod_lote_lab: string | null; modo: string; prazo_previsto: string | null
  situacao_prazo: string | null; dias_em_atraso: number; critico: boolean; responsavel_id: string | null; responsavel_nome: string | null
  tem_pdf: boolean; tem_pendencia: boolean; retificado: boolean; divergente: boolean; status_desconhecido: boolean
  acao_pendente: string | null; acao_pendente_id: string | null; created_at: string; updated_at: string
}

export interface Filtros { apoio_id?: string; unidade_id?: string; status?: string[]; atrasados?: boolean; meus?: boolean; excecoes?: boolean; desde?: string; ate?: string }
export interface Visao { id: string; nome: string; filtros: Filtros; compartilhada: boolean; dono_id: string | null; ordem: number; padrao?: boolean }

export const VISOES_PADRAO: Visao[] = [
  { id: 'todos', nome: 'Todos', filtros: {}, compartilhada: true, dono_id: null, ordem: -4, padrao: true },
  { id: 'atrasados', nome: 'Atrasados', filtros: { atrasados: true }, compartilhada: true, dono_id: null, ordem: -3, padrao: true },
  { id: 'excecoes', nome: 'Exceções', filtros: { excecoes: true }, compartilhada: true, dono_id: null, ordem: -2, padrao: true },
  { id: 'meus', nome: 'Meus', filtros: { meus: true }, compartilhada: true, dono_id: null, ordem: -1, padrao: true },
]

export const COLUNAS: { key: string; label: string; status: string[] }[] = [
  { key: 'aguardando_remessa', label: 'Aguardando remessa', status: ['aguardando_remessa'] },
  { key: 'em_remessa', label: 'Em remessa', status: ['em_remessa'] },
  { key: 'transmitido', label: 'Transmitido', status: ['transmitido'] },
  { key: 'recebido_apoio', label: 'No apoio', status: ['recebido_apoio'] },
  { key: 'em_analise', label: 'Em análise', status: ['em_analise'] },
  { key: 'liberado_apoio', label: 'Liberado pelo apoio', status: ['liberado_apoio'] },
  { key: 'importado', label: 'Importado', status: ['importado', 'importado_com_pendencia'] },
  { key: 'liberado_local', label: 'Liberado', status: ['liberado_local'] },
]

export const EXCECOES: { key: string; label: string; test: (c: KCard) => boolean }[] = [
  { key: 'acao', label: 'Ação manual pendente', test: c => !!c.acao_pendente_id },
  { key: 'pendencia_tecnica', label: 'Pendência técnica', test: c => c.status === 'pendencia_tecnica' },
  { key: 'nova_coleta', label: 'Nova coleta', test: c => c.status === 'nova_coleta' },
  { key: 'erro_transmissao', label: 'Erro de transmissão', test: c => c.status === 'erro_transmissao' },
  { key: 'atrasado', label: 'Atrasado', test: c => c.situacao_prazo === 'atrasado' },
  { key: 'desconhecido', label: 'Status desconhecido', test: c => c.status_desconhecido },
  { key: 'divergente', label: 'Resultado divergente', test: c => c.divergente },
  { key: 'orfao', label: 'Órfão (resultado sem pedido)', test: () => false },
]

export const ehExcecao = (c: KCard) => EXCECOES.some(e => e.test(c))

export function passaFiltro(c: KCard, f: Filtros, userId?: string) {
  if (f.apoio_id && c.apoio_id !== f.apoio_id) return false
  if (f.unidade_id && c.unidade_id !== f.unidade_id) return false
  if (f.status?.length && !f.status.includes(c.status)) return false
  if (f.atrasados && c.situacao_prazo !== 'atrasado') return false
  if (f.meus && (!userId || c.responsavel_id !== userId)) return false
  if (f.desde && c.created_at.slice(0, 10) < f.desde) return false
  if (f.ate && c.created_at.slice(0, 10) > f.ate) return false
  return true
}

export function corPrazo(c: KCard) {
  if (c.situacao_prazo === 'atrasado') return { barra: 'bg-destructive', texto: `+${Math.max(1, c.dias_em_atraso)} dia${c.dias_em_atraso > 1 ? 's' : ''}`, cls: 'text-destructive' }
  if (c.situacao_prazo === 'vence_hoje') return { barra: 'bg-warning', texto: 'Vence hoje', cls: 'text-warning' }
  if (c.situacao_prazo === 'vence_amanha') return { barra: 'bg-warning', texto: 'Vence amanhã', cls: 'text-warning' }
  if (c.situacao_prazo === 'no_prazo') return { barra: 'bg-success', texto: 'No prazo', cls: 'text-success' }
  return { barra: 'bg-muted', texto: '', cls: 'text-muted-foreground' }
}

export const nomeCurto = (n?: string | null) => {
  const p = String(n || '').trim().split(/\s+/)
  return p.length <= 2 ? p.join(' ') : `${p[0]} ${p[p.length - 1]}`
}
export const fmtDataHora = (d?: string | null) => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''
export const fmtData = (d?: string | null) => d ? d.slice(0, 10).split('-').reverse().join('/') : ''
