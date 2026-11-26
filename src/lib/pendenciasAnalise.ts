import { exameDisponivelParaAnalise } from './coletaProgramadaAnalise'
import { matchesExamWorkbench, resolveExamWorkbench } from './labExamWorkbench'

export interface ExameFilaAnalise {
  id: string
  examId: string
  orderId: string
  protocol: string
  patientId?: string
  patientName?: string
  patientBirthDate?: string
  patientGender?: string
  registeredAt?: string
  orderDeliveryDate?: string | null
  collectedAt?: string | null
  coletaProgramada?: boolean
  expectedDeliveryDate?: string | null
  deliveryDate?: string | null
  previsaoEntrega?: string | null
  originId?: string
  originName?: string
  workbenchId?: string
  workbench?: string
  code?: string
  name?: string
  status?: string
  orderStatus?: string
  [key: string]: any
}

const STATUS_FINAIS_EXAME = new Set(['released', 'liberado', 'completed', 'concluded', 'cancelled', 'cancelado', 'retificado'])
const STATUS_PEDIDO_PERMITIDOS = ['collection_done', 'in_analysis', 'validation', 'released', 'completed', 'concluded']

/** Data ISO com horário ou data-only sem o deslocamento de um dia causado por UTC. */
export function parseDataLocal(value?: string | Date | null): Date | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const dataOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (dataOnly) return new Date(Number(dataOnly[1]), Number(dataOnly[2]) - 1, Number(dataOnly[3]))
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function inicioDoDia(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

export function chaveDoDia(value?: string | Date | null): string {
  const date = parseDataLocal(value)
  if (!date) return ''
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Regra única do período da fila: inclusive os pendentes respeitam a data escolhida. */
export function dataEstaNoPeriodo(
  value: string | Date | null | undefined,
  period: string,
  dateFrom?: Date,
  dateTo?: Date,
  agora = new Date(),
): boolean {
  if (period === 'todos') return true
  const examDate = parseDataLocal(value)
  if (!examDate) return period === 'custom' && !dateFrom && !dateTo

  const examDay = inicioDoDia(examDate)
  const today = inicioDoDia(agora)
  if (period === 'hoje') return examDay.getTime() === today.getTime()
  if (period === '7d' || period === '30d') {
    const from = new Date(today)
    from.setDate(from.getDate() - (period === '7d' ? 6 : 29))
    return examDay >= from && examDay <= today
  }
  if (period === 'este-mes') {
    return examDay.getMonth() === today.getMonth() && examDay.getFullYear() === today.getFullYear()
  }
  if (period === 'mes-passado') {
    const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastDayPrevMonth = new Date(firstDayThisMonth.getTime() - 1)
    const firstDayPrevMonth = new Date(lastDayPrevMonth.getFullYear(), lastDayPrevMonth.getMonth(), 1)
    return examDay >= firstDayPrevMonth && examDay <= lastDayPrevMonth
  }
  if (period === 'custom') {
    const from = dateFrom ? inicioDoDia(dateFrom) : null
    const to = dateTo ? inicioDoDia(dateTo) : null
    return (!from || examDay >= from) && (!to || examDay <= to)
  }
  return true
}

/** Monta uma única fonte para a fila de hoje e para o relatório de pendências antigas. */
export function achatarExamesAnalise(orders: any[], catalogExams: any[]): ExameFilaAnalise[] {
  const allExams: ExameFilaAnalise[] = []
  for (const order of orders || []) {
    if (order.status === 'deleted') continue
    const orderStatus = order.status === 'concluded' ? 'completed' : order.status
    if (!STATUS_PEDIDO_PERMITIDOS.includes(orderStatus)) continue
    const orderCollected = STATUS_PEDIDO_PERMITIDOS.includes(orderStatus)

    for (const guide of order.labGuides || []) {
      for (const item of guide.exams || []) {
        const exam: ExameFilaAnalise = {
          ...item,
          workbenchId: resolveExamWorkbench(item, catalogExams),
          examId: item.examId || item.id,
          id: `${order.id}:${item.examId || item.id}`,
          orderId: order.id,
          protocol: order.protocol,
          patientId: order.patientId,
          patientName: order.patientName,
          patientBirthDate: order.patientBirthDate,
          patientGender: order.patientGender,
          isFasting: order.isFasting,
          registeredAt: order.registeredAt,
          collectionDate: order.updatedAt,
          orderDeliveryDate: order.deliveryDate,
          originId: order.originId,
          originName: order.originName,
          doctorName: guide.doctorName || order.doctorName || order.requestingDoctor,
          doctorCRM: guide.doctorCRM || guide.doctorCrm || order.doctorCRM,
          status: item.status || 'pending',
          orderStatus,
        }
        if (exameDisponivelParaAnalise(exam, orderCollected)) allExams.push(exam)
      }
    }
  }
  return allExams
}

export function exameAindaPendente(exam: Pick<ExameFilaAnalise, 'status' | 'orderStatus'>): boolean {
  if (['completed', 'concluded'].includes(String(exam.orderStatus || '').toLowerCase())) return false
  return !STATUS_FINAIS_EXAME.has(String(exam.status || 'pending').toLowerCase())
}

/** Somente exames ainda pendentes cujo atendimento é de um dia anterior. */
export function pendenciasDeDiasAnteriores(exams: ExameFilaAnalise[], agora = new Date()): ExameFilaAnalise[] {
  const hoje = chaveDoDia(agora)
  return exams
    .filter(exam => exameAindaPendente(exam) && !!chaveDoDia(exam.registeredAt) && chaveDoDia(exam.registeredAt) < hoje)
    .sort((a, b) => (parseDataLocal(a.registeredAt)?.getTime() || 0) - (parseDataLocal(b.registeredAt)?.getTime() || 0))
}

export function previsaoDoExame(exam: ExameFilaAnalise): string | null {
  return exam.expectedDeliveryDate || exam.deliveryDate || exam.previsaoEntrega || exam.orderDeliveryDate || null
}

/** Atraso real em horas: pedido; com coleta programada, a Data Coleta informada no cadastro. */
export function horasAtrasoReal(exam: ExameFilaAnalise, agora = new Date()): number {
  const coletaProgramada = exam.coletaProgramada ? parseDataLocal(exam.collectedAt) : null
  const base = coletaProgramada || parseDataLocal(exam.registeredAt)
  if (!base) return 0
  return Math.max(0, Math.floor((agora.getTime() - base.getTime()) / 3_600_000))
}

export function formatarAtrasoReal(hours: number): string {
  const total = Math.max(0, Math.floor(hours))
  if (total === 0) return 'No prazo'
  if (total < 24) return `${total} h`
  const days = Math.floor(total / 24)
  const remaining = total % 24
  return `${days} ${days === 1 ? 'dia' : 'dias'}${remaining ? ` ${remaining} h` : ''}`
}

export interface FiltrosPendenciasAnalise {
  workbenches?: string[]
  origins?: string[]
  search?: string
  day?: string
}

const normalizarBusca = (value: unknown) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function filtrarPendenciasAnalise(exams: ExameFilaAnalise[], filters: FiltrosPendenciasAnalise): ExameFilaAnalise[] {
  const workbenches = filters.workbenches || []
  const origins = filters.origins || []
  const query = normalizarBusca(filters.search?.trim())
  return exams.filter(exam => {
    const matchesOrigin = origins.length === 0 || origins.includes(exam.originId || '')
    const matchesDay = !filters.day || chaveDoDia(exam.registeredAt) === filters.day
    const matchesSearch = !query || normalizarBusca(`${exam.patientName} ${exam.protocol} ${exam.name} ${exam.code}`).includes(query)
    return matchesExamWorkbench(exam, workbenches) && matchesOrigin && matchesDay && matchesSearch
  })
}

export interface PendenciasDoDia { dia: string; quantidade: number }

export function pendenciasPorDia(exams: ExameFilaAnalise[]): PendenciasDoDia[] {
  const counts = new Map<string, number>()
  for (const exam of exams) {
    const dia = chaveDoDia(exam.registeredAt)
    if (dia) counts.set(dia, (counts.get(dia) || 0) + 1)
  }
  return [...counts].map(([dia, quantidade]) => ({ dia, quantidade })).sort((a, b) => a.dia.localeCompare(b.dia))
}
