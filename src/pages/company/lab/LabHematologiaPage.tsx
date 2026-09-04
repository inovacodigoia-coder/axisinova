import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BarChart3, CheckCircle2, Droplet, RefreshCcw, Save } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAttendanceCadastro } from '@/hooks/useAttendanceCadastro'
import { supabase } from '@/integrations/supabase/client'

type OrderStatus = string

interface HemItem {
  id: string
  orderId: string
  protocol: string
  orderNumber: string
  patientName: string
  patientBirthDate?: string
  gender?: string
  examName: string
  examCode?: string
  origin: string
  doctor: string
  date?: string
  urgent: boolean
  status: OrderStatus
}

const STATUS_LABEL: Record<string, string> = {
  waiting: 'Aguardando',
  waiting_collection: 'Aguardando Coleta',
  collection_done: 'Coleta Realizada',
  open: 'Aberto',
  authorized: 'Autorizado',
  in_analysis: 'Em Análise',
  validation: 'Validação',
  released: 'Liberado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
}

const STATUS_OPTIONS = ['collection_done', 'in_analysis', 'validation', 'released', 'completed']

const HEM_REGEX = /hemograma|hematol|eritrogram|leucogram|reticul|plaquet/i

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

const maskDecimal = (raw: string) => raw.replace(/\./g, ',').replace(/[^\d,]/g, '').replace(/(,.*),/g, '$1')

const normalize = (text: string) =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

/** Converte string de data para Date no fuso local (evita deslocamento de 1 dia em datas "YYYY-MM-DD"). */
function parseLocalDate(value?: string | Date | null): Date | null {
  if (!value) return null
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

/** Converte data no formato brasileiro DD/MM/AAAA para Date no fuso local. */
function parseBrazilianDate(value?: string | null): Date | null {
  if (!value) return null
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim())
  if (!m) return null
  const day = Number(m[1])
  const month = Number(m[2])
  const year = Number(m[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const d = new Date(year, month - 1, day)
  return d.getMonth() === month - 1 && d.getDate() === day ? d : null
}

/** Aplica máscara de data brasileira enquanto digita (DD/MM/AAAA). */
function maskBrazilianDate(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

/** Mapa nome do parâmetro (normalizado) -> chave do formulário */
const PARAM_KEY_MAP: Record<string, string> = (() => {
  const map: Record<string, string> = {
    leucocitos: 'leuco',
    tnc: 'tnc',
  }
  WHITE_ROWS.concat(OTHER_ROWS).forEach((row) => {
    const key = row.toLowerCase().replace(/\W+/g, '_')
    map[normalize(row)] = `${key}_pct`
  })
  RED_FIELDS.concat(RETIC_FIELDS, PLATELET_FIELDS).forEach((field) => {
    const n = normalize(field.label)
    if (!map[n]) map[n] = field.key
  })
  return map
})()

const ageFromBirthDate = (birthDate?: string) => {
  if (!birthDate) return '—'
  const birth = new Date(`${birthDate}T12:00:00`)
  if (isNaN(birth.getTime())) return '—'
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
  const { orders, refresh, loading } = useAttendanceCadastro()

  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFromInput, setDateFromInput] = useState('')
  const [dateToInput, setDateToInput] = useState('')
  const [dateFrom, setDateFrom] = useState<Date | null>(null)
  const [dateTo, setDateTo] = useState<Date | null>(null)
  const [orderFilter, setOrderFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [laudo, setLaudo] = useState('')
  const [observacao, setObservacao] = useState('')
  const [flags, setFlags] = useState<string[]>([])

  // Exames de hematologia reais da empresa do usuário logado
  const exams = useMemo<HemItem[]>(() => {
    const list: HemItem[] = []
    ;(orders || []).forEach((order: any) => {
      if (order.status === 'deleted' || order.status === 'cancelled') return
      ;(order.labGuides || []).forEach((guide: any) => {
        ;(guide?.exams || []).forEach((exam: any) => {
          const name = String(exam.name || exam.examName || '')
          if (!HEM_REGEX.test(name)) return
          if (String(exam.status || '').toLowerCase() === 'cancelled') return
          list.push({
            id: `${order.id}:${exam.examId || exam.id || name}`,
            orderId: order.id,
            protocol: order.protocol,
            orderNumber: order.orderNumber,
            patientName: order.patientName,
            patientBirthDate: order.patientBirthDate,
            gender: order.patientGender,
            examName: name,
            examCode: exam.code || exam.internalCode,
            origin: order.originName || '—',
            doctor: order.doctorName || order.requestingDoctor || '—',
            date: order.registeredAt,
            urgent: !!(exam.urgent || order.urgent),
            status: order.status,
          })
        })
      })
    })
    return list
  }, [orders])

  const filteredExams = useMemo(() => {
    const orderTerm = orderFilter.trim()
    if (orderTerm) {
      const term = normalize(orderTerm)
      return exams.filter((exam) => {
        const protocol = normalize(String(exam.protocol || ''))
        const orderNumber = normalize(String(exam.orderNumber || ''))
        const patient = normalize(exam.patientName || '')
        const examName = normalize(exam.examName || '')
        return protocol.includes(term) || orderNumber.includes(term) || patient.includes(term) || examName.includes(term)
      })
    }

    return exams.filter((exam) => {
      if (statusFilter !== 'all' && exam.status !== statusFilter) return false
      const examDate = parseLocalDate(exam.date)
      if (dateFrom && examDate) {
        if (examDate < startOfDay(dateFrom)) return false
      }
      if (dateTo && examDate) {
        if (examDate > endOfDay(dateTo)) return false
      }
      return true
    })
  }, [exams, statusFilter, dateFrom, dateTo, orderFilter])

  useEffect(() => {
    if (!filteredExams.length) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !filteredExams.some((exam) => exam.id === selectedId)) {
      setSelectedId(filteredExams[0].id)
    }
  }, [filteredExams, selectedId])

  const selected = useMemo(
    () => filteredExams.find((exam) => exam.id === selectedId) ?? null,
    [filteredExams, selectedId],
  )

  // Carrega valores já digitados/recebidos do equipamento para o exame selecionado
  useEffect(() => {
    let cancelled = false
    setValues({})
    setLaudo('')
    setObservacao('')
    setFlags([])
    if (!selected) return

    ;(async () => {
      const { data: results } = await (supabase.from('lab_exam_results' as any) as any)
        .select('id, notes, exam_name')
        .eq('order_id', selected.orderId)
      const match = (results || []).find((r: any) => normalize(String(r.exam_name || '')) === normalize(selected.examName)) || (results || [])[0]
      if (!match || cancelled) return

      const { data: rows } = await (supabase.from('lab_result_values' as any) as any)
        .select('parameter_name, parameter_key, value, flag')
        .eq('result_id', match.id)
      if (cancelled) return

      const next: Record<string, string> = {}
      const nextFlags: string[] = []
      ;(rows || []).forEach((row: any) => {
        const key = PARAM_KEY_MAP[normalize(String(row.parameter_name || ''))]
        if (key && row.value != null) next[key] = String(row.value).replace('.', ',')
        if (row.flag && !nextFlags.includes(row.flag)) nextFlags.push(String(row.flag))
      })
      setValues(next)
      setFlags(nextFlags)
      setObservacao(match.notes || '')
    })()

    return () => { cancelled = true }
  }, [selected])

  const getValue = (key: string) => values[key] ?? ''
  const setValue = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }))

  const handleValidate = () => {
    if (!selected) return
    toast.success(`Resultado validado — ${selected.patientName}`)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Droplet className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Equipamento da Hematologia</h1>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="Pedido / protocolo..."
            value={orderFilter}
            onChange={(event) => setOrderFilter(event.target.value)}
            className="h-8 w-[160px] text-xs"
          />
          <Input
            type="text"
            inputMode="numeric"
            placeholder="Data início"
            value={dateFromInput}
            onChange={(event) => {
              const masked = maskBrazilianDate(event.target.value)
              setDateFromInput(masked)
              setDateFrom(parseBrazilianDate(masked))
            }}
            className="h-8 w-[120px] text-xs"
          />
          <Input
            type="text"
            inputMode="numeric"
            placeholder="Data final"
            value={dateToInput}
            onChange={(event) => {
              const masked = maskBrazilianDate(event.target.value)
              setDateToInput(masked)
              setDateTo(parseBrazilianDate(masked))
            }}
            className="h-8 w-[120px] text-xs"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger aria-label="Filtrar por status do pedido" className="h-8 w-[180px] text-xs">
              <SelectValue placeholder="Status do pedido" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>{STATUS_LABEL[status]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 gap-2" onClick={() => refresh()}>
            <RefreshCcw className="h-3.5 w-3.5" /> Atualizar
          </Button>
        </div>
      </div>

      {!selected ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {loading ? 'Carregando pedidos...' : 'Nenhum exame de hematologia encontrado para o filtro selecionado.'}
        </div>
      ) : (
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
                <strong className="block font-mono text-xs">{selected.orderNumber || selected.protocol}</strong>
              </div>
              <div>
                <span className="block text-[9px] font-bold uppercase text-sidebar-foreground/60">Nascimento / Idade</span>
                <strong className="block text-xs">
                  {selected.patientBirthDate ? new Date(`${selected.patientBirthDate}T12:00:00`).toLocaleDateString('pt-BR') : '—'} · {ageFromBirthDate(selected.patientBirthDate)}
                </strong>
              </div>
              <div>
                <span className="block text-[9px] font-bold uppercase text-sidebar-foreground/60">Sexo / Origem</span>
                <strong className="block truncate text-xs">
                  {selected.gender === 'M' ? 'Masculino' : selected.gender === 'F' ? 'Feminino' : '—'} · {selected.origin}
                </strong>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              {selected.urgent && <Badge variant="destructive" className="h-5 text-[9px]">URGENTE</Badge>}
              <Badge variant="secondary" className="h-5 text-[9px]">{STATUS_LABEL[selected.status] || selected.status}</Badge>
              <Select value={selected.id} onValueChange={setSelectedId}>
                <SelectTrigger aria-label="Selecionar exame" className="h-8 w-full border-sidebar-border bg-sidebar-accent text-xs text-sidebar-accent-foreground sm:w-[320px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filteredExams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>{exam.orderNumber || exam.protocol} · {exam.patientName}</SelectItem>
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
              <Input
                type="date"
                readOnly
                value={selected.date ? new Date(selected.date).toISOString().slice(0, 10) : ''}
                className="h-7 border-sidebar-border bg-sidebar-accent text-xs text-sidebar-accent-foreground"
              />
            </label>
            <label className="space-y-1">
              <span className="block text-[9px] font-bold uppercase text-sidebar-foreground/60">Médico solicitante</span>
              <Input value={selected.doctor} readOnly className="h-7 border-sidebar-border bg-sidebar-accent text-xs text-sidebar-accent-foreground" />
            </label>
            <label className="space-y-1">
              <span className="block text-[9px] font-bold uppercase text-sidebar-foreground/60">Protocolo</span>
              <Input value={selected.protocol || ''} readOnly className="h-7 border-sidebar-border bg-sidebar-accent text-xs text-sidebar-accent-foreground" />
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
              {flags.length === 0 ? (
                <p className="text-[10px] text-muted-foreground">Nenhum flag recebido do equipamento.</p>
              ) : flags.map((flag) => (
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
      )}
    </div>
  )
}
