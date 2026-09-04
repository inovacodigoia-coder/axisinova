import { useMemo, useState } from 'react'
import { AlertTriangle, BarChart3, CheckCircle2, Droplet, Save } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

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

const MOCK_EXAMS: HemItem[] = [
  { id: '1', protocol: '20260715-756-75', patientName: 'FRANCISCO RUBIAN', patientBirthDate: '1985-05-15', gender: 'M', examName: 'Hemograma Completo', examCode: 'HEM', origin: 'Matriz', doctor: 'Dr. Henrique Lima', date: '2026-07-15', waitingMinutes: 12, urgent: true, status: 'pending' },
  { id: '2', protocol: '20260715-569-65', patientName: 'AILSON MENEZES', patientBirthDate: '1970-10-20', gender: 'M', examName: 'Hemograma Completo', examCode: 'HEM', origin: 'Posto Centro', doctor: 'Dra. Mariana Lopes', date: '2026-07-15', waitingMinutes: 10, urgent: false, status: 'analysis' },
  { id: '3', protocol: '20260715-431-12', patientName: 'MARIA DE FÁTIMA SOUZA', patientBirthDate: '1992-02-08', gender: 'F', examName: 'Hemograma + Reticulócitos', examCode: 'HEM', origin: 'Matriz', doctor: 'Dr. Pedro Almeida', date: '2026-07-15', waitingMinutes: 34, urgent: false, status: 'pending' },
]

const STATUS_LABEL: Record<QueueStatus, string> = {
  pending: 'Pendente',
  analysis: 'Em Análise',
  validated: 'Validado',
}

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
  { key: 'ret_abs', label: 'Contagem absoluta', unit: '/mm³' },
  { key: 'ret_irf', label: 'IRF', unit: '%' },
  { key: 'ret_lfr', label: 'LFR', unit: '%' },
  { key: 'ret_mfr', label: 'MFR', unit: '%' },
  { key: 'ret_hfr', label: 'HFR', unit: '%' },
  { key: 'ret_hb', label: 'Hb reticulocitária', unit: 'pg' },
]
const PLATELET_FIELDS = [
  { key: 'plaquetas', label: 'Plaquetas', unit: '/mm³' },
  { key: 'mpv', label: 'M.P.V.', unit: 'fL' },
  { key: 'pct', label: 'P.C.T.', unit: '%' },
  { key: 'pdw', label: 'P.D.W.', unit: 'ratio' },
]
const GRAPH_AREAS = ['RBC (# versus fL)', 'WBC (# versus fL)', 'BASO (# versus fL)', 'PLAQUETAS (# versus fL)']
const FLAGS = ['Anisocitose', 'Blastos presentes', 'Plaquetas agregadas']

const maskDecimal = (raw: string) => raw.replace(/\./g, ',').replace(/[^\d,]/g, '').replace(/(,.*),/g, '$1')

const ageFromBirthDate = (birthDate: string) => {
  const birth = new Date(`${birthDate}T12:00:00`)
  const today = new Date()
  let years = today.getFullYear() - birth.getFullYear()
  const beforeBirthday = today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  if (beforeBirthday) years -= 1
  return `${years} anos`
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="border-b border-border pb-1 text-[11px] font-bold uppercase text-muted-foreground">
    {children}
  </h2>
)

const CompactInput = ({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) => (
  <Input
    aria-label={label}
    inputMode="decimal"
    value={value}
    onChange={(event) => onChange(maskDecimal(event.target.value))}
    className="h-7 min-w-0 px-2 text-right font-mono text-xs"
  />
)

export default function LabHematologiaPage() {
  const [exams, setExams] = useState(MOCK_EXAMS)
  const [selectedId, setSelectedId] = useState(MOCK_EXAMS[0].id)
  const [values, setValues] = useState<Record<string, string>>({})
  const [laudo, setLaudo] = useState('')
  const [observacao, setObservacao] = useState('')

  const selected = useMemo(() => exams.find((exam) => exam.id === selectedId) ?? exams[0], [exams, selectedId])
  const getValue = (key: string) => values[key] ?? ''
  const setValue = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }))

  const handleExamChange = (id: string) => {
    setSelectedId(id)
    setValues({})
    setLaudo('')
    setObservacao('')
  }

  const handleValidate = () => {
    setExams((current) => current.map((exam) => exam.id === selected.id ? { ...exam, status: 'validated' } : exam))
    toast.success(`Resultado validado — ${selected.patientName}`)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Droplet className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Equipamento da Hematologia</h1>
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <header className="bg-sidebar px-4 py-3 text-sidebar-foreground">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-5 gap-y-2 md:grid-cols-4">
              <div>
                <span className="block text-[9px] font-bold uppercase text-sidebar-foreground/60">Paciente</span>
                <strong className="block truncate text-xs">{selected.patientName}</strong>
              </div>
              <div>
                <span className="block text-[9px] font-bold uppercase text-sidebar-foreground/60">Pedido</span>
                <strong className="block font-mono text-xs">{selected.protocol}</strong>
              </div>
              <div>
                <span className="block text-[9px] font-bold uppercase text-sidebar-foreground/60">Nascimento / Idade</span>
                <strong className="block text-xs">{new Date(`${selected.patientBirthDate}T12:00:00`).toLocaleDateString('pt-BR')} · {ageFromBirthDate(selected.patientBirthDate)}</strong>
              </div>
              <div>
                <span className="block text-[9px] font-bold uppercase text-sidebar-foreground/60">Sexo / Origem</span>
                <strong className="block truncate text-xs">{selected.gender === 'M' ? 'Masculino' : 'Feminino'} · {selected.origin}</strong>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              {selected.urgent && <Badge variant="destructive" className="h-5 text-[9px]">URGENTE</Badge>}
              <Badge variant="secondary" className="h-5 text-[9px]">{STATUS_LABEL[selected.status]}</Badge>
              <Select value={selected.id} onValueChange={handleExamChange}>
                <SelectTrigger aria-label="Selecionar exame" className="h-8 w-full border-sidebar-border bg-sidebar-accent text-xs text-sidebar-accent-foreground sm:w-[280px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {exams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>{exam.protocol} · {exam.patientName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 border-t border-sidebar-border pt-3 md:grid-cols-4 xl:grid-cols-6">
            <label className="space-y-1">
              <span className="block text-[9px] font-bold uppercase text-sidebar-foreground/60">Exame</span>
              <Input value={selected.examName} readOnly className="h-7 border-sidebar-border bg-sidebar-accent text-xs text-sidebar-accent-foreground" />
            </label>
            <label className="space-y-1">
              <span className="block text-[9px] font-bold uppercase text-sidebar-foreground/60">Data do exame</span>
              <Input type="date" defaultValue={selected.date} className="h-7 border-sidebar-border bg-sidebar-accent text-xs text-sidebar-accent-foreground" />
            </label>
            <label className="space-y-1">
              <span className="block text-[9px] font-bold uppercase text-sidebar-foreground/60">Médico solicitante</span>
              <Input defaultValue={selected.doctor} className="h-7 border-sidebar-border bg-sidebar-accent text-xs text-sidebar-accent-foreground" />
            </label>
            <label className="space-y-1">
              <span className="block text-[9px] font-bold uppercase text-sidebar-foreground/60">Equipamento / Máquina</span>
              <Input defaultValue="DC5 Pro" className="h-7 border-sidebar-border bg-sidebar-accent text-xs text-sidebar-accent-foreground" />
            </label>
            <label className="space-y-1">
              <span className="block text-[9px] font-bold uppercase text-sidebar-foreground/60">Diluição</span>
              <Input inputMode="decimal" value={getValue('diluicao')} onChange={(event) => setValue('diluicao', maskDecimal(event.target.value))} className="h-7 border-sidebar-border bg-sidebar-accent text-xs text-sidebar-accent-foreground" />
            </label>
            <label className="space-y-1">
              <span className="block text-[9px] font-bold uppercase text-sidebar-foreground/60">Indicação clínica</span>
              <Input className="h-7 border-sidebar-border bg-sidebar-accent text-xs text-sidebar-accent-foreground" />
            </label>
          </div>
        </header>

        <div className="grid grid-cols-1 divide-y divide-border bg-border xl:grid-cols-12 xl:divide-x xl:divide-y-0">
          <div className="space-y-4 bg-card p-3 xl:col-span-3">
            <section className="space-y-2">
              <SectionTitle>Série Branca (Leucócitos)</SectionTitle>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1 text-[9px] font-bold uppercase text-muted-foreground">
                  Leucócitos (/mm³)
                  <CompactInput label="Leucócitos" value={getValue('leuco')} onChange={(value) => setValue('leuco', value)} />
                </label>
                <label className="space-y-1 text-[9px] font-bold uppercase text-muted-foreground">
                  TNC
                  <CompactInput label="TNC" value={getValue('tnc')} onChange={(value) => setValue('tnc', value)} />
                </label>
              </div>
              <div className="overflow-hidden rounded border border-border">
                <div className="grid grid-cols-[minmax(100px,1fr)_72px_82px] bg-muted/60 px-2 py-1 text-[9px] font-bold uppercase text-muted-foreground">
                  <span>Célula</span><span className="text-right">%</span><span className="text-right">/mm³</span>
                </div>
                {WHITE_ROWS.map((row) => {
                  const key = row.toLowerCase().replace(/\W+/g, '_')
                  return (
                    <div key={row} className="grid grid-cols-[minmax(100px,1fr)_72px_82px] items-center gap-1 border-t border-border px-2 py-1">
                      <span className="truncate text-[11px]">{row}</span>
                      <CompactInput label={`${row} percentual`} value={getValue(`${key}_pct`)} onChange={(value) => setValue(`${key}_pct`, value)} />
                      <CompactInput label={`${row} absoluto`} value={getValue(`${key}_abs`)} onChange={(value) => setValue(`${key}_abs`, value)} />
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="space-y-2">
              <SectionTitle>Outras Células</SectionTitle>
              <div className="overflow-hidden rounded border border-border">
                {OTHER_ROWS.map((row) => {
                  const key = row.toLowerCase().replace(/\W+/g, '_')
                  return (
                    <div key={row} className="grid grid-cols-[minmax(100px,1fr)_72px_82px] items-center gap-1 border-b border-border px-2 py-1 last:border-b-0">
                      <span className="truncate text-[11px]">{row}</span>
                      <CompactInput label={`${row} percentual`} value={getValue(`${key}_pct`)} onChange={(value) => setValue(`${key}_pct`, value)} />
                      <CompactInput label={`${row} absoluto`} value={getValue(`${key}_abs`)} onChange={(value) => setValue(`${key}_abs`, value)} />
                    </div>
                  )
                })}
              </div>
            </section>
          </div>

          <div className="space-y-4 bg-card p-3 xl:col-span-3">
            <section className="space-y-2">
              <SectionTitle>Série Vermelha (Eritrograma)</SectionTitle>
              <Tabs defaultValue="hemacias">
                <TabsList className="h-8 w-full">
                  <TabsTrigger value="hemacias" className="h-7 flex-1 text-xs">Hemácias</TabsTrigger>
                  <TabsTrigger value="reticulocitos" className="h-7 flex-1 text-xs">Reticulócitos</TabsTrigger>
                </TabsList>
                <TabsContent value="hemacias" className="mt-2">
                  <div className="overflow-hidden rounded border border-border">
                    {RED_FIELDS.map((field) => (
                      <div key={field.key} className="grid grid-cols-[minmax(104px,1fr)_84px_58px] items-center gap-1 border-b border-border px-2 py-1 last:border-b-0">
                        <span className="truncate text-[11px]">{field.label}</span>
                        <CompactInput label={field.label} value={getValue(field.key)} onChange={(value) => setValue(field.key, value)} />
                        <span className="text-right text-[9px] text-muted-foreground">{field.unit}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="reticulocitos" className="mt-2">
                  <div className="overflow-hidden rounded border border-border">
                    {RETIC_FIELDS.map((field) => (
                      <div key={field.key} className="grid grid-cols-[minmax(104px,1fr)_84px_58px] items-center gap-1 border-b border-border px-2 py-1 last:border-b-0">
                        <span className="truncate text-[11px]">{field.label}</span>
                        <CompactInput label={field.label} value={getValue(field.key)} onChange={(value) => setValue(field.key, value)} />
                        <span className="text-right text-[9px] text-muted-foreground">{field.unit}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </section>

            <section className="space-y-2">
              <SectionTitle>Plaquetas</SectionTitle>
              <div className="overflow-hidden rounded border border-border">
                {PLATELET_FIELDS.map((field) => (
                  <div key={field.key} className="grid grid-cols-[minmax(104px,1fr)_84px_58px] items-center gap-1 border-b border-border px-2 py-1 last:border-b-0">
                    <span className="truncate text-[11px]">{field.label}</span>
                    <CompactInput label={field.label} value={getValue(field.key)} onChange={(value) => setValue(field.key, value)} />
                    <span className="text-right text-[9px] text-muted-foreground">{field.unit}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-3 bg-card p-3 xl:col-span-4">
            <SectionTitle>Gráficos</SectionTitle>
            <Tabs defaultValue="histograma">
              <TabsList className="h-8 w-full">
                <TabsTrigger value="histograma" className="h-7 flex-1 text-xs">Histograma</TabsTrigger>
                <TabsTrigger value="scattergram" className="h-7 flex-1 text-xs">Scattergram</TabsTrigger>
              </TabsList>
              {['histograma', 'scattergram'].map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-2">
                  <div className="grid grid-cols-2 gap-2">
                    {GRAPH_AREAS.map((graph) => (
                      <div key={graph} className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded border border-border bg-muted">
                        <span className="absolute left-2 top-2 text-[9px] font-bold uppercase text-primary">{graph}</span>
                        <BarChart3 className="h-7 w-7 text-muted-foreground/40" />
                      </div>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            <section className="space-y-2 pt-1">
              <SectionTitle>Observação</SectionTitle>
              <Textarea rows={4} value={observacao} onChange={(event) => setObservacao(event.target.value)} placeholder="Observações técnicas da análise..." className="resize-none text-xs" />
            </section>
          </div>

          <aside className="space-y-3 bg-muted/30 p-3 xl:col-span-2">
            <SectionTitle>Flags Definitivos</SectionTitle>
            <div className="space-y-1.5">
              {FLAGS.map((flag) => (
                <div key={flag} className="flex items-center gap-1.5 rounded-r border-l-2 border-destructive bg-destructive/10 px-2 py-1.5 text-[10px] font-semibold text-destructive">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span>{flag}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <section className="border-t border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <SectionTitle>Laudo do Eritrograma</SectionTitle>
            <div className="h-px flex-1 bg-border" />
          </div>
          <Textarea
            rows={4}
            value={laudo}
            onChange={(event) => setLaudo(event.target.value)}
            placeholder="Descrição morfológica e conclusões..."
            className="resize-none text-xs"
          />
        </section>

        <footer className="flex flex-col justify-end gap-2 border-t border-border bg-muted/50 px-4 py-3 sm:flex-row">
          <Button variant="outline" className="gap-2" onClick={() => toast.success('Resultado salvo parcialmente')}>
            <Save className="h-4 w-4" /> SALVAR PARCIAL
          </Button>
          <Button className="gradient-bg gap-2 text-primary-foreground" onClick={handleValidate}>
            <CheckCircle2 className="h-4 w-4" /> Validar Resultado
          </Button>
        </footer>
      </section>
    </div>
  )
}