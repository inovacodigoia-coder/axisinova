import { Box, Refrigerator, Snowflake, Thermometer } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { desenhoDoArmario, localDaEstante, type EquipamentoSoroteca } from '@/lib/soroteca'

type TipoArmario = Exclude<EquipamentoSoroteca['tipo'], 'estante'>

/** Aparência por tipo (mesmo esquema; só cor e ícone mudam). */
const APARENCIA: Record<TipoArmario, { icone: typeof Box; rotulo: string; corpo: string; topo: string }> = {
  geladeira: { icone: Refrigerator, rotulo: 'Geladeira', corpo: 'border-info/50 bg-info/5', topo: 'bg-info/15 text-info' },
  freezer: { icone: Snowflake, rotulo: 'Freezer', corpo: 'border-primary/50 bg-primary/5', topo: 'bg-primary/15 text-primary' },
  outro: { icone: Box, rotulo: 'Equipamento', corpo: 'border-border bg-muted/40', topo: 'bg-muted text-muted-foreground' },
}
const aparencia = (tipo: EquipamentoSoroteca['tipo']) => APARENCIA[tipo === 'estante' ? 'outro' : tipo]

const tubos = (e: EquipamentoSoroteca) => `${e.ocupadas.toLocaleString('pt-BR')}/${e.capacidade.toLocaleString('pt-BR')} tubos`

export interface EquipamentoDesenhoProps {
  armario: EquipamentoSoroteca
  equipamentos: EquipamentoSoroteca[]
  /** Estante destacada (vaga desta estante). */
  destaqueEstanteId?: string | null
  /** Prateleira destacada (a da estante, ou a escolhida no Finalizar). */
  destaquePrateleiraId?: string | null
  /** Clique numa vaga ocupada abre aquela estante. */
  onEstante?: (estanteId: string) => void
  /** Modo escolha (Finalizar): clicar na prateleira seleciona; prateleira cheia fica bloqueada. */
  onPrateleira?: (prateleiraId: string) => void
  /** Não conta esta estante nas vagas (Finalizar). */
  ignorarEstanteId?: string | null
  /** Texto do rodapé (endereço por extenso). */
  rodape?: string | null
  className?: string
}

/** Desenho do equipamento visto de frente: prateleiras numeradas de cima para baixo, uma vaga por estante. */
export function EquipamentoDesenho({
  armario, equipamentos, destaqueEstanteId, destaquePrateleiraId, onEstante, onPrateleira, ignorarEstanteId, rodape, className,
}: EquipamentoDesenhoProps) {
  const ap = aparencia(armario.tipo)
  const Icone = ap.icone
  const prateleiras = desenhoDoArmario(armario, equipamentos, ignorarEstanteId)
  const escolher = !!onPrateleira

  return (
    <figure className={cn('w-full space-y-2', className)} aria-label={`Desenho de ${armario.nome}`}>
      <div className={cn('overflow-hidden rounded-xl border-2 shadow-sm', ap.corpo)}>
        <div className={cn('flex items-center gap-2 px-3 py-2 text-sm font-semibold', ap.topo)}>
          <Icone className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">{armario.nome}</span>
          <span className="ml-auto text-[11px] font-normal opacity-80">{ap.rotulo}</span>
        </div>
        <div className="space-y-1.5 p-2">
          {prateleiras.map(p => {
            const destacada = p.id === destaquePrateleiraId
            const bloqueada = escolher && p.cheia && !destacada
            const conteudo = (
              <>
                <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                  destacada ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground')}>{p.numero}</span>
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span className="truncate font-medium text-foreground">{p.nome}</span>
                    <span className="whitespace-nowrap">{p.estantes.length}/{p.capacidade}{p.cheia ? ' · cheia' : ''}</span>
                  </span>
                  <span className="flex flex-wrap gap-1">
                    {p.vagas.map((e, i) => {
                      const desta = !!e && e.id === destaqueEstanteId
                      // No Finalizar, a 1ª vaga livre da prateleira escolhida mostra onde a estante vai ficar.
                      const aqui = escolher && destacada && !e && i === p.estantes.length
                      const cls = cn('flex h-8 w-14 items-center justify-center rounded border text-[10px] font-mono leading-none',
                        !e && !aqui && 'border-dashed border-border bg-background/60 text-muted-foreground',
                        aqui && 'border-primary bg-primary/15 font-semibold text-primary',
                        e && !desta && 'border-border bg-card font-semibold text-foreground shadow-sm',
                        desta && 'border-primary bg-primary font-semibold text-primary-foreground ring-2 ring-primary ring-offset-1 ring-offset-background')
                      if (!e) return <span key={`l${i}`} className={cls} aria-label={aqui ? 'Vaga onde a estante vai ficar' : 'Vaga livre'}>{aqui ? 'aqui' : 'livre'}</span>
                      const rotulo = `${e.codigo || e.nome} · ${tubos(e)}`
                      if (escolher || !onEstante) return <span key={e.id} className={cls} title={rotulo} aria-label={rotulo}>{e.codigo || e.nome}</span>
                      return (
                        <Tooltip key={e.id}>
                          <TooltipTrigger asChild>
                            <button type="button" className={cn(cls, 'transition-colors hover:border-primary')} aria-label={`Abrir estante ${rotulo}`}
                              onClick={() => onEstante(e.id)}>{e.codigo || e.nome}</button>
                          </TooltipTrigger>
                          <TooltipContent><span className="font-mono font-semibold">{e.codigo || e.nome}</span> — {tubos(e)}</TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </span>
                </span>
              </>
            )
            const caixa = cn('flex w-full items-start gap-2 rounded-lg border p-1.5 text-left',
              destacada ? 'border-primary bg-primary/10 ring-2 ring-primary/60' : 'border-border/70 bg-background/40')
            return escolher ? (
              <button key={p.id} type="button" disabled={bloqueada} aria-pressed={destacada}
                aria-label={`${p.nome} — ${p.estantes.length}/${p.capacidade} estantes${p.cheia ? ' (cheia)' : ''}`}
                onClick={() => onPrateleira!(p.id)}
                className={cn(caixa, bloqueada ? 'cursor-not-allowed opacity-50' : 'transition-colors hover:border-primary')}>{conteudo}</button>
            ) : <div key={p.id} className={caixa}>{conteudo}</div>
          })}
        </div>
      </div>
      {(rodape || armario.temperatura) && (
        <figcaption className="space-y-0.5 text-xs">
          {rodape && <p className="font-medium text-foreground">{rodape}</p>}
          {armario.temperatura && <p className="flex items-center gap-1 text-muted-foreground"><Thermometer className="h-3.5 w-3.5" aria-hidden />Temperatura: {armario.temperatura}</p>}
        </figcaption>
      )}
    </figure>
  )
}

/**
 * Onde a estante está: desenho do equipamento com a prateleira e a vaga destacadas,
 * ou o aviso "Fora da geladeira — em preenchimento".
 */
export function LocalDaEstanteDesenho({ estante, equipamentos, onEstante, className }: {
  estante: EquipamentoSoroteca
  equipamentos: EquipamentoSoroteca[]
  onEstante?: (estanteId: string) => void
  className?: string
}) {
  const armario = estante.situacao === 'armazenada' ? equipamentos.find(e => e.id === estante.local_equipamento_id) : null
  if (!armario) {
    return (
      <div className={cn('flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-warning/50 bg-warning/10 p-6 text-center', className)}>
        <Refrigerator className="h-8 w-8 text-warning" aria-hidden />
        <p className="text-sm font-semibold text-foreground">{estante.situacao === 'armazenada' ? 'Equipamento não encontrado' : 'Fora da geladeira — em preenchimento'}</p>
      </div>
    )
  }
  return (
    <EquipamentoDesenho armario={armario} equipamentos={equipamentos} destaqueEstanteId={estante.id} destaquePrateleiraId={estante.local_prateleira_id}
      onEstante={onEstante} rodape={localDaEstante(estante)} className={className} />
  )
}
