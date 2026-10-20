/** Tipos e regras de exibição do CRM (as regras de negócio ficam no banco). */
export type Temperatura = 'frio' | 'morno' | 'quente'
export type TipoEtapa = 'aberta' | 'ganho' | 'perdido'

export interface CrmEtapa { id: string; nome: string; cor: string; ordem: number; tipo: TipoEtapa; inicial: boolean; ativa: boolean; automacao?: string | null }
export interface CrmTag { id: string; nome: string; cor: string; ativa: boolean }
export interface CrmMotivo { id: string; nome: string; ativo: boolean }
export interface CrmUsuario { id: string; nome: string }
export interface CrmLead {
  id: string; contato_id: string; paciente_id: string | null; nome: string; interesse: string | null; origem: string
  etapa_id: string; temperatura: Temperatura; responsavel_id: string | null; responsavel_nome: string | null
  valor_estimado: number | null; proximo_contato_em: string | null; motivo_perda_id: string | null; motivo_perda_texto: string | null
  criado_em: string; etapa_atualizada_em: string; fechado_em: string | null; telefone: string; tags: string[]
  nao_lida: boolean; pode_editar: boolean
  temperatura_origem?: string; temperatura_regra?: string | null; temperatura_travada_ate?: string | null
}
export interface CrmAcesso { ver: boolean; operar: boolean; gerenciar: boolean; criar: boolean; usuario_id?: string }

export const ORIGENS: { value: string; label: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp' }, { value: 'indicacao', label: 'Indicação' }, { value: 'instagram', label: 'Instagram' },
  { value: 'site', label: 'Site' }, { value: 'telefone', label: 'Telefone' }, { value: 'outro', label: 'Outro' },
]
export const origemLabel = (o: string) => ORIGENS.find(x => x.value === o)?.label ?? o

export const TEMPERATURAS: { value: Temperatura; label: string; cls: string }[] = [
  { value: 'frio', label: 'Frio', cls: 'text-primary' },
  { value: 'morno', label: 'Morno', cls: 'text-warning' },
  { value: 'quente', label: 'Quente', cls: 'text-destructive' },
]
export const tempInfo = (t: string) => TEMPERATURAS.find(x => x.value === t) ?? TEMPERATURAS[1]

export const CORES = ['#00D4FF', '#3B82F6', '#7B2FF7', '#EC4899', '#F59E0B', '#22C55E', '#EF4444', '#64748B']

/** Telefone do "Novo lead": +55 fixo, usuário digita só DDD + celular (11 dígitos). Nunca adiciona/remove 55. */
export function validarCelular(digitado: string): string | null {
  const d = digitado.replace(/\D/g, '')
  if (d.length !== 11) return 'Digite DDD + celular (11 dígitos).'
  return null
}

/** Dias inteiros desde a data (mínimo 0). */
export function diasDesde(iso: string, agora = new Date()) {
  return Math.max(0, Math.floor((agora.getTime() - new Date(iso).getTime()) / 86_400_000))
}
export const textoDias = (n: number) => n === 0 ? 'hoje na etapa' : `há ${n} dia${n > 1 ? 's' : ''} na etapa`

export const vencido = (iso: string | null, agora = new Date()) => !!iso && new Date(iso).getTime() < agora.getTime()

export const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const fmtDataHora = (iso: string | null) => iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''
export const iniciais = (n?: string | null) => String(n || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('') || '?'

/** datetime-local (fuso do navegador) → ISO, ou null. */
export const localParaIso = (v: string) => v ? new Date(v).toISOString() : null
export const isoParaLocal = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export interface CrmConfig { temperatura_modo: "manual" | "automatico"; travar_manual_dias: number; frio_apos_dias: number; palavras_quentes: string[]; evolucao_automatica: boolean; alerta_lead_quente: boolean }
