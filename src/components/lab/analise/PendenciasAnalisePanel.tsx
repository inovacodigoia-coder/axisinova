import { useMemo, useState } from 'react'
import { AlertTriangle, Beaker, CalendarDays, ChevronDown, Clock3, Filter, MapPin, Search, Users, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { formatarPrevisao } from '@/lib/previsaoColeta'
import {
  filtrarPendenciasAnalise,
  formatarAtrasoReal,
  horasAtrasoReal,
  parseDataLocal,
  pendenciasPorDia,
  previsaoDoExame,
  type ExameFilaAnalise,
} from '@/lib/pendenciasAnalise'
import { OriginFilterDialog } from './OriginFilterDialog'

interface Option { id: string; name: string }

interface PendenciasAnalisePanelProps {
  exams: ExameFilaAnalise[]
  workbenches: Option[]
  origins: Option[]
  onDigitar: (exams: ExameFilaAnalise[]) => void
}

function nivelCalorPorProporcao(ratio: number): string {
  if (ratio <= 0.25) return 'bg-primary/10 text-foreground border-primary/15'
  if (ratio <= 0.5) return 'bg-primary/25 text-foreground border-primary/25'
  if (ratio <= 0.75) return 'bg-primary/45 text-foreground border-primary/35'
  return 'bg-primary/80 text-primary-foreground border-primary'
}

function nivelCalor(quantidade: number, maximo: number): string {
  return nivelCalorPorProporcao(maximo > 0 ? quantidade / maximo : 0)
}

function ResumoCard({ icon: Icon, label, value, detail, alert = false }: {
  icon: typeof Clock3
  label: string
  value: string | number
  detail: string
  alert?: boolean
}) {
  return (
    <Card className="p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className={cn('mt-1 truncate text-2xl font-black tracking-tight', alert && 'text-destructive')}>{value}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{detail}</p>
        </div>
        <div className={cn('rounded-xl bg-primary/10 p-2.5 text-primary', alert && 'bg-destructive/10 text-destructive')}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  )
}

export function PendenciasAnalisePanel({ exams, workbenches, origins, onDigitar }: PendenciasAnalisePanelProps) {
  const [selectedWorkbenches, setSelectedWorkbenches] = useState<string[]>([])
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>([])
  const [originDialogOpen, setOriginDialogOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState('')
  const [search, setSearch] = useState('')
  const agora = new Date()

  const filteredByMainFilters = useMemo(
    () => filtrarPendenciasAnalise(exams, { workbenches: selectedWorkbenches, origins: selectedOrigins, search }),
    [exams, selectedWorkbenches, selectedOrigins, search],
  )

  const visibleExams = useMemo(
    () => filtrarPendenciasAnalise(filteredByMainFilters, { day: selectedDay }),
    [filteredByMainFilters, selectedDay],
  )
  const days = useMemo(() => pendenciasPorDia(filteredByMainFilters), [filteredByMainFilters])
  const maxByDay = Math.max(0, ...days.map(day => day.quantidade))
  const patientCount = new Set(visibleExams.map(exam => exam.orderId || exam.patientId || exam.patientName)).size
  const lateExams = visibleExams.filter(exam => horasAtrasoReal(exam, agora) > 0)
  const longestDelay = Math.max(0, ...visibleExams.map(exam => horasAtrasoReal(exam, agora)))
  const hasFilters = selectedWorkbenches.length > 0 || selectedOrigins.length > 0 || !!selectedDay || !!search

  const clearFilters = () => {
    setSelectedWorkbenches([])
    setSelectedOrigins([])
    setSelectedDay('')
    setSearch('')
  }

  return (
    <div className="h-full overflow-y-auto pr-1">
      <div className="space-y-4 pb-2">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ResumoCard icon={Beaker} label="Exames pendentes" value={visibleExams.length} detail="Somente atendimentos de dias anteriores" />
          <ResumoCard icon={Users} label="Pacientes" value={patientCount} detail="Pacientes com exames na lista" />
          <ResumoCard icon={AlertTriangle} label="Com atraso" value={lateExams.length} detail="Tempo desde o pedido ou coleta programada" alert={lateExams.length > 0} />
          <ResumoCard icon={Clock3} label="Maior atraso" value={formatarAtrasoReal(longestDelay)} detail="Tempo real além da referência" alert={longestDelay > 0} />
        </div>

        <Card className="p-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[180px] flex-1">
              <label className="mb-1.5 block text-[10px] font-bold uppercase text-muted-foreground">Buscar pendência</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Paciente, pedido ou exame"
                  className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div className="w-full sm:w-[190px]">
              <label className="mb-1.5 block text-[10px] font-bold uppercase text-muted-foreground">Bancada</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 w-full justify-between text-xs font-medium">
                    {selectedWorkbenches.length === 0 ? 'Todas' : `${selectedWorkbenches.length} selecionada(s)`}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  {workbenches.map(workbench => (
                    <DropdownMenuCheckboxItem
                      key={workbench.id}
                      checked={selectedWorkbenches.includes(workbench.id)}
                      onCheckedChange={checked => setSelectedWorkbenches(current => checked ? [...current, workbench.id] : current.filter(id => id !== workbench.id))}
                    >
                      {workbench.name}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="w-full sm:w-[190px]">
              <label className="mb-1.5 block text-[10px] font-bold uppercase text-muted-foreground">Origem</label>
              <Button variant="outline" className="h-9 w-full justify-between text-xs font-medium" onClick={() => setOriginDialogOpen(true)}>
                {selectedOrigins.length === 0 ? 'Todas' : `${selectedOrigins.length} selecionada(s)`}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </div>
            {hasFilters && (
              <Button variant="ghost" className="h-9 gap-1.5 text-xs text-destructive" onClick={clearFilters}>
                <X className="h-3.5 w-3.5" /> Limpar
              </Button>
            )}
          </div>
        </Card>

        <Card className="p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                <CalendarDays className="h-4 w-4 text-primary" /> Mapa de calor por dia
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">Quantidade de exames pendentes pela data do atendimento. Clique em um dia para filtrar.</p>
            </div>
            {selectedDay && (
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setSelectedDay('')}>
                Mostrar todos os dias
              </Button>
            )}
          </div>
          {days.length === 0 ? (
            <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">Nenhuma pendência anterior para os filtros escolhidos.</div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7 xl:grid-cols-10">
                {days.map(day => {
                  const date = parseDataLocal(day.dia)!
                  return (
                    <button
                      type="button"
                      key={day.dia}
                      aria-pressed={selectedDay === day.dia}
                      aria-label={`${day.quantidade} pendências em ${date.toLocaleDateString('pt-BR')}`}
                      title={`${date.toLocaleDateString('pt-BR')}: ${day.quantidade} exame(s) pendente(s)`}
                      onClick={() => setSelectedDay(current => current === day.dia ? '' : day.dia)}
                      className={cn(
                        'rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus:ring-primary',
                        nivelCalor(day.quantidade, maxByDay),
                        selectedDay === day.dia && 'ring-2 ring-secondary ring-offset-2',
                      )}
                    >
                      <span className="block text-[10px] font-bold uppercase opacity-80">{date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                      <span className="mt-0.5 block text-xs font-bold">{date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                      <span className="mt-2 block text-xl font-black">{day.quantidade}</span>
                      <span className="block text-[9px] font-bold uppercase opacity-80">pendente(s)</span>
                    </button>
                  )
                })}
              </div>
              <div className="mt-3 flex items-center justify-end gap-2 text-[10px] font-medium text-muted-foreground">
                <span>Menos</span>
                {[0.2, 0.4, 0.6, 1].map(value => <span key={value} className={cn('h-3 w-6 rounded-sm border', nivelCalorPorProporcao(value))} />)}
                <span>Mais</span>
              </div>
            </>
          )}
        </Card>

        <Card className="overflow-hidden shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider"><Filter className="h-4 w-4 text-primary" /> Lista de pendências</h2>
              <p className="mt-1 text-xs text-muted-foreground">Mais antigas primeiro. Atraso desde o pedido; com coleta programada, desde a Data Coleta informada.</p>
            </div>
            <Button className="h-9 gap-2 text-xs font-bold" disabled={visibleExams.length === 0} onClick={() => onDigitar(visibleExams)}>
              <Beaker className="h-4 w-4" /> Digitar filtrados ({visibleExams.length})
            </Button>
          </div>
          {visibleExams.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center p-8 text-center">
              <Beaker className="mb-3 h-10 w-10 text-muted-foreground/30" />
              <h3 className="text-sm font-bold">Nenhuma pendência anterior</h3>
              <p className="mt-1 text-xs text-muted-foreground">Não há exames antigos para os filtros selecionados.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[560px]">
              <div className="divide-y">
                {visibleExams.map(exam => {
                  const delay = horasAtrasoReal(exam, agora)
                  const forecast = previsaoDoExame(exam)
                  return (
                    <div key={exam.id} className="p-4 transition-colors hover:bg-muted/30">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-black uppercase">{exam.patientName || 'Paciente sem nome'}</span>
                            <Badge variant="outline" className="font-mono text-[10px]">Pedido {exam.protocol}</Badge>
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-bold text-primary">{exam.code || '—'}</span>
                            <span className="text-muted-foreground">{exam.name || 'Exame sem nome'}</span>
                            <Badge variant="secondary" className="text-[9px] uppercase">{exam.workbench || exam.workbenchId || 'Sem bancada'}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={delay > 0 ? 'destructive' : 'secondary'} className="gap-1.5 text-[10px]">
                            <Clock3 className="h-3 w-3" /> {delay > 0 ? `Atraso: ${formatarAtrasoReal(delay)}` : 'No prazo'}
                          </Badge>
                          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[10px] font-bold uppercase" onClick={() => onDigitar([exam])}>
                            <Beaker className="h-3.5 w-3.5" /> Digitar
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 text-[11px] text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                        <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Pedido: {formatarPrevisao(exam.registeredAt)}</span>
                        <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> Previsão: {forecast ? formatarPrevisao(forecast) : 'Não informada'}</span>
                        <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Origem: {exam.originName || 'Não informada'}</span>
                        <span>Status: {exam.status === 'digitized' ? 'Digitado, aguardando liberação' : 'Aguardando digitação/liberação'}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </Card>
      </div>

      <OriginFilterDialog
        open={originDialogOpen}
        onOpenChange={setOriginDialogOpen}
        specialOptions={[]}
        origins={origins}
        selected={selectedOrigins}
        onApply={setSelectedOrigins}
      />
    </div>
  )
}
