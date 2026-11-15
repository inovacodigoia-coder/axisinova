import { cn } from '@/lib/utils'
import { prateleirasDe, type PrateleiraSoroteca } from '@/lib/soroteca'

interface Props {
  prateleiras: PrateleiraSoroteca[]
  valor: string | null
  onChange: (prateleiraId: string) => void
  /** Ocupação extra por prateleira (ex.: reservas do lote na Entrada). */
  extra?: Record<string, number>
  className?: string
}

/** Abas das prateleiras de um equipamento: [ Prateleira 1 ] [ Prateleira 2 ] … com ocupação. */
export function PrateleiraAbas({ prateleiras, valor, onChange, extra, className }: Props) {
  const lista = prateleirasDe({ prateleiras })
  if (!lista.length) return null
  return (
    <div role="tablist" aria-label="Prateleiras" className={cn('flex flex-wrap gap-1 border-b border-border', className)}>
      {lista.map(p => {
        const ativo = p.id === valor
        return (
          <button key={p.id} type="button" role="tab" aria-selected={ativo} onClick={() => onChange(p.id)}
            className={cn('-mb-px rounded-t-md border border-b-0 px-3 py-1.5 text-xs font-medium transition-colors',
              ativo ? 'border-border bg-card text-foreground' : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground')}>
            {p.nome} · {p.ocupadas + (extra?.[p.id] ?? 0)}/{p.linhas * p.colunas}
          </button>
        )
      })}
    </div>
  )
}

/** Prateleira escolhida, caindo na primeira quando a escolhida não existe mais. */
export function prateleiraAtual(prateleiras: PrateleiraSoroteca[] | undefined, id: string | null | undefined) {
  const lista = prateleirasDe({ prateleiras: prateleiras ?? [] })
  return lista.find(p => p.id === id) ?? lista[0] ?? null
}
