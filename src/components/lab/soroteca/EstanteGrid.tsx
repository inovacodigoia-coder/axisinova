import { useMemo } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { chavePosicao, rotuloPosicao, STATUS_LABEL, type AmostraSoroteca, type PrateleiraSoroteca } from '@/lib/soroteca'
import { COR_CELULA } from './SorotecaGrid'

interface Props {
  /** Grade única da estante. */
  grade: Pick<PrateleiraSoroteca, 'id' | 'nome' | 'linhas' | 'colunas'>
  amostras: AmostraSoroteca[]
  /** Última posição preenchida: pisca com borda destacada. */
  atual?: { linha: number; coluna: number } | null
  /** Tubo selecionado pelo clique: borda de destaque. */
  selecionada?: string | null
  /** Clique num círculo ocupado (posição livre não faz nada). O clique não tira o foco do campo de bipe. */
  onAmostra?: (a: AmostraSoroteca) => void
}

/** Estante em círculos (A01…D16): cinza livre, azul liberado, amarelo parcial, vermelho sem resultado. */
export function EstanteGrid({ grade, amostras, atual, selecionada, onAmostra }: Props) {
  const mapa = useMemo(() => {
    const m = new Map<string, AmostraSoroteca>()
    for (const a of amostras) if (a.status === 'armazenada' && a.prateleira_id === grade.id && a.linha && a.coluna) m.set(chavePosicao(a.linha, a.coluna), a)
    return m
  }, [amostras, grade.id])
  const tamanho = grade.colunas > 16 ? 'h-8 w-8 text-[9px]' : grade.colunas > 12 ? 'h-9 w-9 text-[10px]' : 'h-11 w-11 text-xs'
  const linhas = Array.from({ length: grade.linhas }, (_, i) => i + 1)
  const colunas = Array.from({ length: grade.colunas }, (_, i) => i + 1)

  return (
    <TooltipProvider delayDuration={100}>
      <div className="overflow-auto">
        <div className="inline-grid gap-1.5" style={{ gridTemplateColumns: `repeat(${grade.colunas}, max-content)` }} role="grid" aria-label="Posições da estante">
          {linhas.flatMap(l => colunas.map(c => {
            const k = chavePosicao(l, c)
            const a = mapa.get(k) || null
            const rotulo = rotuloPosicao(l, c)
            const eAtual = !!a && atual?.linha === l && atual?.coluna === c
            const eSel = !!a && !!selecionada && a.id === selecionada
            const circulo = (
              <button
                key={`${k}:${a?.id ?? 'livre'}`}
                type="button"
                role="gridcell"
                aria-label={a ? `${rotulo}: ${a.patient_name || 'paciente'}, amostra ${a.codigo_amostra}, ${STATUS_LABEL[a.status_resultado]}${eAtual ? ' (última preenchida)' : ''}${eSel ? ' (selecionado)' : ''}` : `${rotulo}: livre`}
                aria-pressed={a && onAmostra ? eSel : undefined}
                disabled={!a || !onAmostra}
                onMouseDown={e => { if (onAmostra) e.preventDefault() }}
                onClick={() => a && onAmostra?.(a)}
                className={cn(
                  'flex items-center justify-center rounded-full border-2 font-semibold leading-none transition-colors disabled:cursor-default',
                  tamanho,
                  a ? cn(COR_CELULA[a.status_resultado], 'animate-in fade-in zoom-in-75 duration-500') : 'border-transparent bg-muted text-muted-foreground',
                  eAtual && !eSel && 'animate-pulse ring-4 ring-primary ring-offset-2 ring-offset-background',
                  eSel && 'scale-110 border-foreground ring-4 ring-foreground/70 ring-offset-2 ring-offset-background',
                  a && onAmostra && 'cursor-pointer hover:brightness-95',
                )}
              >
                {rotulo}
              </button>
            )
            if (!a) return circulo
            return (
              <Tooltip key={`${k}:${a.id}`}>
                <TooltipTrigger asChild>{circulo}</TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p className="font-semibold">{a.patient_name || '—'}</p>
                  <p className="font-mono">{a.codigo_amostra} · {rotulo}</p>
                </TooltipContent>
              </Tooltip>
            )
          }))}
        </div>
      </div>
    </TooltipProvider>
  )
}
