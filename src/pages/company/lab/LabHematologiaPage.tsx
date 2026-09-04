import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Droplet, Search, Clock, BarChart3, AlertTriangle, CheckCircle2, Save } from 'lucide-react'

type QueueStatus = 'pending' | 'analysis' | 'validated'

interface HemItem {
  id: string
  protocol: string
  patientName: string
  patientBirthDate: string
  gender: 'M' | 'F'
  examName: string
  examCode: string
  origin: string
  doctor: string
  date: string
  waitingMinutes: number
  urgent: boolean
  status: QueueStatus
}

const MOCK_QUEUE: HemItem[] = [
  { id: '1', protocol: '20260715-756-75', patientName: 'FRANCISCO RUBIAN', patientBirthDate: '1985-05-15', gender: 'M', examName: 'Hemograma Completo', examCode: 'HEM', origin: 'Matriz', doctor: 'Dr. Henrique Lima', date: '2026-07-15', waitingMinutes: 12, urgent: true, status: 'pending' },
  { id: '2', protocol: '20260715-569-65', patientName: 'AILSON MENEZES', patientBirthDate: '1970-10-20', gender: 'M', examName: 'Hemograma Completo', examCode: 'HEM', origin: 'Posto Centro', doctor: 'Dra. Mariana Lopes', date: '2026-07-15', waitingMinutes: 10, urgent: false, status: 'analysis' },
  { id: '3', protocol: '20260715-431-12', patientName: 'MARIA DE FÁTIMA SOUZA', patientBirthDate: '1992-02-08', gender: 'F', examName: 'Hemograma + Reticulócitos', examCode: 'HEM', origin: 'Matriz', doctor: 'Dr. Pedro Almeida', date: '2026-07-15', waitingMinutes: 34, urgent: false, status: 'pending' },
]

const STATUS_LABEL: Record<QueueStatus, string> = { pending: 'Pendente', analysis: 'Em Análise', validated: 'Validado' }

const WHITE_ROWS = ['Neutrófilos', 'Mielócitos', 'Metamielócitos', 'Bastões', 'Segmentados', 'Linfócitos (T/A)', 'Monócitos', 'Eosinófilos', 'Basófilos']
const OTHER_ROWS = ['Promielócitos', 'Mieloblastos', 'Blastos', 'ALY', 'LIC', 'Gran. Imaturos']
const RED_FIELDS = [
  { key: 'hemacias', label: 'Hemácias', unit: '/mm³' },
  { key: 'eritroblastos_pct', label: 'Eritroblastos', unit: '%' },
  { key: 'eritroblastos_abs', label: 'Eritroblastos', unit: '/mm³' },
  { key: 'hb', label: 'Hemoglobina', unit: 'g/dL' },
  { key: 'ht', label: 'Hematócrito', unit: '%' },
  { key: 'vcm', label: 'V.C.M.', unit: 'fL' },
  { key: 'hcm', label: 'H.C.M.', unit: 'pg' },
  { key: 'chcm', label: 'C.H.C.M.', unit: 'g/dL' },
  { key: 'rdwcv', label: 'R.D.W. (cv)', unit: '%' },
  { key: 'rdwsd', label: 'R.D.W. (sd)', unit: 'fL' },
]
const RETIC_FIELDS = [
  { key: 'ret_pct', label: 'Reticulócitos', unit: '%' },
  { key: 'ret_abs', label: 'Reticulócitos (absoluto)', unit: '/mm³' },
  { key: 'ret_irf', label: 'IRF (fração imatura)', unit: '%' },
  { key: 'ret_lfr', label: 'LFR', unit: '%' },
  { key: 'ret_mfr', label: 'MFR', unit: '%' },
  { key: 'ret_hfr', label: 'HFR', unit: '%' },
  { key: 'ret_hb', label: 'Conteúdo de Hb reticulocitária', unit: 'pg' },
]
const PLT_FIELDS = [
  { key: 'plaquetas', label: 'Plaquetas', unit: '/mm³' },
  { key: 'mpv', label: 'M.P.V.', unit: 'fL' },
  { key: 'pct', label: 'P.C.T.', unit: '%' },
  { key: 'pdw', label: 'P.D.W.', unit: 'ratio' },
]
const GRAPH_AREAS = ['RBC (# versus fL)', 'WBC (# versus fL)', 'BASO (# versus fL)', 'PLAQUETAS (# versus fL)']
const MOCK_FLAGS = ['Anisocitose', 'Blastos presentes', 'Plaquetas agregadas']

/** Aceita apenas números com vírgula decimal (padrão brasileiro). */
const maskDecimal = (raw: string) => raw.replace(/\./g, ',').replace(/[^\d,]/g, '').replace(/(,.*),/g, '$1')

const NumField = ({ label, unit, value, onChange }: { label: string; unit?: string; value: string; onChange: (v: string) => void }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      {label} {unit && <span className="font-normal normal-case">({unit})</span>}
    </label>
    <Input inputMode="decimal" value={value} onChange={(e) => onChange(maskDecimal(e.target.value))} className="h-8 text-sm" />
  </div>
)

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card className="p-4 space-y-3">
    <h3 className="text-xs font-black uppercase tracking-wide text-primary">{title}</h3>
    {children}
  </Card>
)

export default function LabHematologiaPage() {
  const [queue, setQueue] = useState<HemItem[]>(MOCK_QUEUE)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | QueueStatus>('all')
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'urgent'>('all')
  const [dateFilter, setDateFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [laudo, setLaudo] = useState('')
  const [observacao, setObservacao] = useState('')

  const setVal = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }))
  const get = (k: string) => values[k] ?? ''

  const filtered = useMemo(() => queue.filter((i) => {
    const q = search.trim().toLowerCase()
    if (q && !i.patientName.toLowerCase().includes(q) && !i.protocol.includes(q)) return false
    if (statusFilter !== 'all' && i.status !== statusFilter) return false
    if (urgencyFilter === 'urgent' && !i.urgent) return false
    if (dateFilter && i.date !== dateFilter) return false
    return true
  }), [queue, search, statusFilter, urgencyFilter, dateFilter])

  const selected = queue.find((i) => i.id === selectedId) || null

  const handleValidate = () => {
    if (!selected) return
    setQueue((prev) => prev.map((i) => (i.id === selected.id ? { ...i, status: 'validated' } : i)))
    setSelectedId(null)
    setValues({})
    setLaudo('')
    toast.success(`Resultado validado — ${selected.patientName}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Droplet className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Hematologia</h1>
      </div>

      {/* Barra de filtros horizontal */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 h-9" placeholder="Protocolo ou paciente..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="analysis">Em Análise</SelectItem>
              <SelectItem value="validated">Validado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={urgencyFilter} onValueChange={(v) => setUrgencyFilter(v as any)}>
            <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Urgência" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="urgent">Somente urgentes</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" className="h-9 w-[160px]" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          <Button variant="outline" size="sm" className="h-9 text-[10px] font-bold uppercase" onClick={() => setSelectedIds(filtered.map((i) => i.id))}>Selecionar Tudo</Button>
          <Button variant="outline" size="sm" className="h-9 text-[10px] font-bold uppercase" onClick={() => setSelectedIds([])}>Limpar Seleção</Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 items-start">
        {/* Fila */}
        <Card className="p-3">
          <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Fila ({filtered.length})</p>
          <ScrollArea className="max-h-[70vh] pr-2">
            <div className="space-y-2">
              {filtered.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Nenhum registro encontrado.</p>}
              {filtered.map((item) => (
                <div key={item.id} className="space-y-1">
                  <div className="px-1 flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="accent-primary h-3 w-3" checked={selectedIds.includes(item.id)} onChange={() => setSelectedIds((p) => p.includes(item.id) ? p.filter((x) => x !== item.id) : [...p, item.id])} />
                      <span>{item.protocol}</span>
                    </label>
                    <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{item.waitingMinutes}m</span>
                  </div>
                  <button
                    onClick={() => setSelectedId(item.id)}
                    className={cn('w-full text-left p-3 rounded-lg border transition-all hover:border-primary/50',
                      selectedId === item.id ? 'bg-primary/5 border-primary shadow-sm' : 'bg-card border-border')}
                  >
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <span className="font-bold text-sm truncate">{item.patientName}</span>
                      <div className="flex gap-1 shrink-0">
                        {item.urgent && <Badge variant="destructive" className="text-[9px] h-4">URGENTE</Badge>}
                        <Badge variant="secondary" className="text-[9px] h-4">{STATUS_LABEL[item.status]}</Badge>
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{item.examName}</span>
                      <span className="font-mono">{item.examCode}</span>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Formulário */}
        {!selected ? (
          <Card className="h-[60vh] flex flex-col items-center justify-center border-dashed">
            <Droplet className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="font-semibold">Selecione um exame</p>
            <p className="text-sm text-muted-foreground">Escolha um registro na fila para abrir o Equipamento da Hematologia.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Dados do paciente e exame */}
            <SectionCard title="Dados do Paciente e Exame">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase text-muted-foreground">Pedido</label>
                  <Input className="h-8 text-sm" value={selected.protocol} readOnly />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase text-muted-foreground">Exame</label>
                  <Select defaultValue={selected.examCode}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value={selected.examCode}>{selected.examName}</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase text-muted-foreground">Data do Exame</label>
                  <Input type="date" className="h-8 text-sm" defaultValue={selected.date} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase text-muted-foreground">Nome</label>
                  <Input className="h-8 text-sm" value={selected.patientName} readOnly />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase text-muted-foreground">Nascimento</label>
                  <Input type="date" className="h-8 text-sm" defaultValue={selected.patientBirthDate} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase text-muted-foreground">Sexo</label>
                  <Input className="h-8 text-sm" value={selected.gender === 'M' ? 'Masculino' : 'Feminino'} readOnly />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase text-muted-foreground">Origem</label>
                  <Input className="h-8 text-sm" value={selected.origin} readOnly />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase text-muted-foreground">Médico Solicitante</label>
                  <Input className="h-8 text-sm" defaultValue={selected.doctor} />
                </div>
                <NumField label="Diluição" value={get('diluicao')} onChange={(v) => setVal('diluicao', v)} />
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase text-muted-foreground">Equipamento / Máq.</label>
                  <Input className="h-8 text-sm" defaultValue="DC5 Pro" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase text-muted-foreground">Indicação Clínica</label>
                  <Input className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase text-muted-foreground">Urgente</label>
                  <div className="h-8 flex items-center">
                    {selected.urgent
                      ? <Badge variant="destructive" className="text-[10px]">URGENTE</Badge>
                      : <Badge variant="secondary" className="text-[10px]">Rotina</Badge>}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase text-muted-foreground">Observação</label>
                <Textarea rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
              </div>
            </SectionCard>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-4 items-start">
              <div className="space-y-4">
                {/* Série branca */}
                <SectionCard title="Série Branca (Leucócitos)">
                  <div className="grid grid-cols-2 gap-3">
                    <NumField label="Leucócitos" unit="/mm³" value={get('leuco')} onChange={(v) => setVal('leuco', v)} />
                    <NumField label="TNC" value={get('tnc')} onChange={(v) => setVal('tnc', v)} />
                  </div>
                  <div className="rounded-lg border divide-y">
                    <div className="grid grid-cols-[1fr_100px_120px] gap-2 px-3 py-1.5 bg-muted/50 text-[10px] font-bold uppercase text-muted-foreground">
                      <span>Célula</span><span>%</span><span>/mm³</span>
                    </div>
                    {WHITE_ROWS.map((row) => {
                      const k = row.toLowerCase().replace(/\W+/g, '_')
                      return (
                        <div key={row} className="grid grid-cols-[1fr_100px_120px] gap-2 px-3 py-1.5 items-center">
                          <span className="text-xs">{row}</span>
                          <Input inputMode="decimal" className="h-7 text-xs" value={get(`${k}_pct`)} onChange={(e) => setVal(`${k}_pct`, maskDecimal(e.target.value))} />
                          <Input inputMode="decimal" className="h-7 text-xs" value={get(`${k}_abs`)} onChange={(e) => setVal(`${k}_abs`, maskDecimal(e.target.value))} />
                        </div>
                      )
                    })}
                  </div>
                </SectionCard>

                {/* Plaquetas */}
                <SectionCard title="Plaquetas">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {PLT_FIELDS.map((f) => (
                      <NumField key={f.key} label={f.label} unit={f.unit} value={get(f.key)} onChange={(v) => setVal(f.key, v)} />
                    ))}
                  </div>
                </SectionCard>

                {/* Outras células */}
                <SectionCard title="Outras Células">
                  <div className="rounded-lg border divide-y">
                    <div className="grid grid-cols-[1fr_100px_120px] gap-2 px-3 py-1.5 bg-muted/50 text-[10px] font-bold uppercase text-muted-foreground">
                      <span>Célula</span><span>%</span><span>/mm³</span>
                    </div>
                    {OTHER_ROWS.map((row) => {
                      const k = row.toLowerCase().replace(/\W+/g, '_')
                      return (
                        <div key={row} className="grid grid-cols-[1fr_100px_120px] gap-2 px-3 py-1.5 items-center">
                          <span className="text-xs">{row}</span>
                          <Input inputMode="decimal" className="h-7 text-xs" value={get(`${k}_pct`)} onChange={(e) => setVal(`${k}_pct`, maskDecimal(e.target.value))} />
                          <Input inputMode="decimal" className="h-7 text-xs" value={get(`${k}_abs`)} onChange={(e) => setVal(`${k}_abs`, maskDecimal(e.target.value))} />
                        </div>
                      )
                    })}
                  </div>
                </SectionCard>

                {/* Série vermelha */}
                <SectionCard title="Série Vermelha">
                  <Tabs defaultValue="hemacias">
                    <TabsList>
                      <TabsTrigger value="hemacias">Hemácias</TabsTrigger>
                      <TabsTrigger value="reticulocitos">Reticulócitos</TabsTrigger>
                    </TabsList>
                    <TabsContent value="hemacias" className="pt-3">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {RED_FIELDS.map((f) => (
                          <NumField key={f.key} label={f.label} unit={f.unit} value={get(f.key)} onChange={(v) => setVal(f.key, v)} />
                        ))}
                      </div>
                    </TabsContent>
                    <TabsContent value="reticulocitos" className="pt-3">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {RETIC_FIELDS.map((f) => (
                          <NumField key={f.key} label={f.label} unit={f.unit} value={get(f.key)} onChange={(v) => setVal(f.key, v)} />
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </SectionCard>

                {/* Laudo do eritrograma */}
                <SectionCard title="Laudo do Eritrograma">
                  <Textarea rows={5} placeholder="Descrição morfológica e conclusões..." value={laudo} onChange={(e) => setLaudo(e.target.value)} />
                </SectionCard>
              </div>

              {/* Painel lateral: gráficos + flags */}
              <div className="space-y-4">
                <SectionCard title="Gráficos">
                  <Tabs defaultValue="histograma">
                    <TabsList className="w-full">
                      <TabsTrigger className="flex-1" value="histograma">Histograma</TabsTrigger>
                      <TabsTrigger className="flex-1" value="scattergram">Scattergram</TabsTrigger>
                    </TabsList>
                    {['histograma', 'scattergram'].map((tab) => (
                      <TabsContent key={tab} value={tab} className="pt-3 space-y-3">
                        {GRAPH_AREAS.map((g) => (
                          <div key={g} className="space-y-1">
                            <p className="text-[10px] font-bold text-primary">{g}</p>
                            <div className="h-20 rounded-lg bg-muted flex items-center justify-center">
                              <BarChart3 className="h-6 w-6 text-muted-foreground/40" />
                            </div>
                          </div>
                        ))}
                      </TabsContent>
                    ))}
                  </Tabs>
                </SectionCard>

                <SectionCard title="Flags Definitivos">
                  <div className="flex flex-wrap gap-2">
                    {MOCK_FLAGS.map((f) => (
                      <span key={f} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-destructive/10 text-destructive">
                        <AlertTriangle className="h-3 w-3" />{f}
                      </span>
                    ))}
                  </div>
                </SectionCard>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button variant="outline" className="gap-2" onClick={() => toast.success('Rascunho salvo')}>
                <Save className="h-4 w-4" /> Salvar Rascunho
              </Button>
              <Button className="gradient-bg text-white gap-2" onClick={handleValidate}>
                <CheckCircle2 className="h-4 w-4" /> Validar Resultado
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
