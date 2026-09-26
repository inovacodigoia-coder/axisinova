// Conservação por tubo (12C). Ordem fixa das colunas/sacos.
export const ORDEM_CONSERVACAO = ['ambiente', 'refrigerado', 'congelado'] as const
export type Conservacao = 'ambiente' | 'refrigerado' | 'congelado' | 'verificar' | 'nao_informado'

export const CONSERVACAO: Record<string, { label: string; icon: string; cls: string }> = {
  ambiente: { label: 'Ambiente', icon: '🌡️', cls: 'bg-muted text-muted-foreground border-border' },
  refrigerado: { label: 'Refrigerado', icon: '❄️', cls: 'bg-[hsl(210,90%,50%)]/10 text-[hsl(210,90%,38%)] border-[hsl(210,90%,50%)]/40' },
  congelado: { label: 'Congelado', icon: '🧊', cls: 'bg-[hsl(270,70%,55%)]/10 text-[hsl(270,70%,40%)] border-[hsl(270,70%,55%)]/40' },
  verificar: { label: 'Verificar', icon: '⚠️', cls: 'bg-warning/15 text-[hsl(38,92%,30%)] border-warning/50' },
  nao_informado: { label: 'Não informado', icon: '·', cls: 'bg-background text-muted-foreground border-dashed border-border' },
}

export const ORIGEM_CONSERVACAO: Record<string, string> = { etiqueta: 'Etiqueta do apoio', cadastro: 'Cadastro', manual: 'Manual' }

/** Resumo "🧊1 ❄️2 🌡️1" a partir de um mapa conservação → quantidade */
export function resumoSacos(sacos: Record<string, number> | null | undefined): string {
  if (!sacos) return '—'
  const ordem = ['congelado', 'refrigerado', 'ambiente', 'verificar', 'nao_informado']
  const partes = ordem.filter(k => sacos[k]).map(k => `${CONSERVACAO[k].icon}${sacos[k]}`)
  return partes.join(' ') || '—'
}

/** Próximo horário do motoboy (HH:MM) em formato datetime-local; vazio se não houver horários. */
export function proximaSaida(horarios: string[] | null | undefined, agora = new Date()): string {
  const hs = (horarios || []).filter(h => /^\d{2}:\d{2}$/.test(h)).sort()
  if (!hs.length) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  const hhmm = `${pad(agora.getHours())}:${pad(agora.getMinutes())}`
  const hoje = hs.find(h => h > hhmm)
  const d = new Date(agora)
  if (!hoje) d.setDate(d.getDate() + 1)
  const dia = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return `${dia}T${hoje || hs[0]}`
}

const limpa = (s: string) => String(s || '').replace(/"/g, "'").normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()

/** Etiqueta EPL2 do saco (mesma impressora das etiquetas do apoio). */
export function eplSaco(o: { remessa: string | number; apoio: string; conservacao: string; tubos: number; saco: number; total: number; saida?: string | null }): string {
  const saida = o.saida ? new Date(o.saida).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '') : 'a definir'
  return [
    '', 'N', 'q400', 'Q200,24',
    `A10,10,0,3,1,1,N,"REMESSA ${limpa(String(o.remessa))}"`,
    `A10,40,0,2,1,1,N,"${limpa(o.apoio).slice(0, 28)}"`,
    `A10,70,0,4,1,1,R,"${limpa(CONSERVACAO[o.conservacao]?.label || o.conservacao)}"`,
    `A10,115,0,2,1,1,N,"${o.tubos} TUBO(S) - SACO ${o.saco}/${o.total}"`,
    `A10,145,0,2,1,1,N,"SAIDA PREVISTA ${limpa(saida)}"`,
    'P1', '',
  ].join('\n')
}
