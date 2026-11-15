import { useMemo } from 'react'
import { Check, Clock, Send } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  alertaValidade, chavePosicao, dataBR, gradeComprimida, letraLinha, primeiroNome, rotuloPosicao, STATUS_LABEL,
  type AmostraSoroteca, type PrateleiraSoroteca, type StatusResultado,
} from '@/lib/soroteca'

export const COR_CELULA: Record<StatusResultado, string> = {
  liberado: 'bg-info text-info-foreground border-info',
  parcial: 'bg-warning text-warning-foreground border-warning',
  em_analise: 'bg-destructive text-destructive-foreground border-destructive',
}

export interface Reserva { linha: number; coluna: number; rotulo?: string }

interface Props {
  /** Prateleira desenhada (cada prateleira tem a própria grade A01…). */
  prateleira: Pick<PrateleiraSoroteca, 'id' | 'nome' | 'linhas' | 'colunas'>
  /** Nome do equipamento, só para leitura de tela. */
  equipamentoNome?: string
  amostras: AmostraSoroteca[]
  avisoDias?: number
  /** 'selecionar': células livres pontilhadas e clicáveis (Entrada / Armazenar). */
  modo?: 'ver' | 'selecionar'
  selecionada?: { linha: number; coluna: number } | null
  sugestao?: { linha: number; coluna: number } | null
  reservas?: Reserva[]
  destaqueId?: string | null
  /** Força o tamanho (true = comprimida; false = com rótulos). Padrão: comprimida acima de 200 posições. */
  comprimida?: boolean
  grande?: boolean
  onCelula?: (linha: number, coluna: number, amostra: AmostraSoroteca | null) => void
}

/** Grade de posições de uma prateleira da soroteca (A01…). */
export function SorotecaGrid({
  prateleira, equipamentoNome, amostras, avisoDias = 7, modo = 'ver', selecionada, sugestao, reservas = [], destaqueId, comprimida, grande, onCelula,
}: Props) {
  const mapa = useMemo(() => {
    const m = new Map<string, AmostraSoroteca>()
    for (const a of amostras) if (a.status === 'armazenada' && a.prateleira_id === prateleira.id && a.linha && a.coluna) m.set(chavePosicao(a.linha, a.coluna), a)
    return m
  }, [amostras, prateleira.id])
  const reservaMap = useMemo(() => new Map(reservas.map(r => [chavePosicao(r.linha, r.coluna), r])), [reservas])
  const compacta = comprimida ?? gradeComprimida(prateleira.linhas, prateleira.colunas)
  const agora = Date.now()
  const linhas = Array.from({ length: prateleira.linhas }, (_, i) => i + 1)
  const colunas = Array.from({ length: prateleira.colunas }, (_, i) => i + 1)
  const tamanho = compacta ? (grande ? 'h-4 min-w-[0.75rem]' : 'h-2.5 min-w-[0.4rem]') : (grande ? 'h-9 min-w-[2.25rem] text-[10px]' : 'h-7 min-w-[1.6rem] text-[9px]')

  return (
    <TooltipProvider delayDuration={150}>
      <div className="overflow-auto">
        <div
          className={cn('inline-grid', compacta ? 'gap-px' : 'gap-1')}
          style={{ gridTemplateColumns: compacta ? `repeat(${prateleira.colunas}, minmax(0, 1fr))` : `auto repeat(${prateleira.colunas}, minmax(0, 1fr))` }}
          role="grid"
          aria-label={`Mapa de posições de ${[equipamentoNome, prateleira.nome].filter(Boolean).join(' > ')}`}
        >
          {!compacta && <span />}
          {!compacta && colunas.map(c => <span key={`h${c}`} className="text-center text-[9px] font-semibold text-muted-foreground">{String(c).padStart(2, '0')}</span>)}
          {linhas.map(l => [
            !compacta && <span key={`r${l}`} className="pr-1 text-right text-[10px] font-semibold leading-7 text-muted-foreground">{letraLinha(l)}</span>,
            ...colunas.map(c => {
              const k = chavePosicao(l, c)
              const a = mapa.get(k) || null
              const reserva = reservaMap.get(k)
              const sel = selecionada?.linha === l && selecionada?.coluna === c
              const sug = !sel && sugestao?.linha === l && sugestao?.coluna === c
              const rotulo = rotuloPosicao(l, c)
              const validade = a ? alertaValidade(a.validade, avisoDias, agora) : null
              const livreClicavel = modo === 'selecionar' && !a && !reserva
              const celula = (
                <button
                  key={k}
                  type="button"
                  role="gridcell"
                  aria-label={a ? `${rotulo}: amostra ${a.codigo_amostra}, ${STATUS_LABEL[a.status_resultado]}` : `${rotulo}: livre`}
                  onClick={() => onCelula?.(l, c, a)}
                  disabled={!onCelula || (modo === 'selecionar' && (!!a || !!reserva) && !sel)}
                  className={cn(
                    'relative flex items-center justify-center rounded-[3px] border font-semibold leading-none transition-colors',
                    tamanho,
                    a ? COR_CELULA[a.status_resultado] : 'border-border bg-card text-muted-foreground',
                    livreClicavel && 'cursor-pointer border-dashed border-muted-foreground/50 hover:border-success hover:bg-success/10',
                    !a && !livreClicavel && onCelula && 'hover:bg-muted',
                    reserva && 'border-success bg-success/30 text-foreground',
                    sug && 'ring-2 ring-success ring-offset-1',
                    sel && 'border-success bg-success text-success-foreground',
                    a && destaqueId === a.id && 'z-10 animate-pulse ring-4 ring-primary ring-offset-2',
                    a && modo === 'selecionar' && 'cursor-not-allowed opacity-80',
                  )}
                >
                  {sel ? <Check className={compacta ? 'h-2 w-2' : 'h-3.5 w-3.5'} /> : !compacta && reserva?.rotulo}
                  {a && !compacta && a.tem_apoio && <Send className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-card p-px text-primary" aria-label="Tem exame enviado ao apoio" />}
                  {a && !compacta && validade && <Clock className={cn('absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full bg-card p-px', validade === 'vencida' ? 'text-destructive' : 'text-warning')} aria-label={validade === 'vencida' ? 'Validade vencida' : 'Vence em breve'} />}
                </button>
              )
              if (!a) return celula
              return (
                <Tooltip key={k}>
                  <TooltipTrigger asChild>{celula}</TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    <p className="font-semibold">{rotulo} · {a.codigo_amostra}</p>
                    <p>Paciente: {primeiroNome(a.patient_name) || '—'}</p>
                    <p>Bancada: {a.bancada_nome || '—'}</p>
                    <p>Validade: {dataBR(a.validade)}{validade === 'vencida' ? ' (vencida)' : validade === 'vencendo' ? ' (vencendo)' : ''}</p>
                    <p>Status: {STATUS_LABEL[a.status_resultado]} ({a.liberados} de {a.total} liberado{a.total === 1 ? '' : 's'})</p>
                    {a.tem_apoio && <p>Tem exame enviado ao laboratório de apoio</p>}
                  </TooltipContent>
                </Tooltip>
              )
            }),
          ])}
        </div>
      </div>
    </TooltipProvider>
  )
}

export function SorotecaLegenda({ selecao }: { selecao?: boolean }) {
  const item = (cls: string, rotulo: string, desc: string) => (
    <span className="inline-flex items-center gap-1.5" title={desc}>
      <span className={cn('h-3.5 w-3.5 rounded-[3px] border', cls)} />
      <span>{rotulo}</span>
    </span>
  )
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
      {item('border-border bg-card', 'Livre', 'Posição vazia disponível')}
      {item(COR_CELULA.liberado, 'OK', 'Todos os resultados liberados')}
      {item(COR_CELULA.parcial, 'Parcial', 'Pelo menos um resultado ainda não liberado')}
      {item(COR_CELULA.em_analise, 'Em análise', 'Nenhum resultado liberado ainda')}
      {selecao && item('border-success bg-success', 'Selecionada', 'Posição escolhida')}
      <span className="inline-flex items-center gap-1"><Send className="h-3 w-3 text-primary" />Exame no apoio</span>
      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3 text-warning" />Vencida ou vencendo</span>
    </div>
  )
}
