import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BarChart3, CheckCircle2, Droplet, RefreshCcw, Save, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAttendanceCadastro } from '@/hooks/useAttendanceCadastro'
import { useAuth } from '@/context/AuthContext'
import { useResultEntryPermissions } from '@/hooks/useResultEntryPermissions'
import { resolveCompanyId } from '@/utils/companyId'
import { buildExamParams, evaluateFormula, findCatalogExam, type ResolvedParam } from '@/utils/examParameters'
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

const rowKey = (row: string) => row.toLowerCase().replace(/\W+/g, '_')

/** Apelidos de nomenclatura entre o catálogo de exames e os campos da tela. */
const ROW_ALIASES: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  WHITE_ROWS.concat(OTHER_ROWS).forEach((row) => {
    map[normalize(row)] = rowKey(row)
  })
  map.neutrofilos = rowKey('Neutrófilos')
  map.neutrofilosbastonetes = rowKey('Bastões')
  map.bastonetes = rowKey('Bastões')
  map.bastoes = rowKey('Bastões')
  map.neutrofilossegmentados = rowKey('Segmentados')
  map.segmentados = rowKey('Segmentados')
  map.linfocitos = rowKey('Linfócitos (T/A)')
  map.granulocitosimaturos = rowKey('Gran. Imaturos')
  map.granimaturos = rowKey('Gran. Imaturos')
  return map
})()

const DIRECT_ALIASES: Record<string, string> = {
  leucocitos: 'leuco',
  leucocitostotais: 'leuco',
  tnc: 'tnc',
  hemacias: 'hemacias',
  hemoglobina: 'hb',
  hematocrito: 'ht',
  vcm: 'vcm',
  vcmvolumecorpuscularmedio: 'vcm',
  volumecorpuscularmedio: 'vcm',
  hcm: 'hcm',
  hcmhemoglobinacorpuscularmedia: 'hcm',
  hemoglobinacorpuscularmedia: 'hcm',
  chcm: 'chcm',
  chcmconcdehbcorpuscularmedia: 'chcm',
  concdehbcorpuscularmedia: 'chcm',
  rdw: 'rdwcv',
  rdwcv: 'rdwcv',
  rdwsd: 'rdwsd',
  plaquetas: 'plaquetas',
  vpm: 'mpv',
  mpv: 'mpv',
  vpmvolumeplaquetariomedio: 'mpv',
  volumeplaquetariomedio: 'mpv',
  pct: 'pct',
  pdw: 'pdw',
  pdwamplitudededistribuicaoplaquetaria: 'pdw',
  amplitudededistribuicaoplaquetaria: 'pdw',
  reticulocitos: 'ret_pct',
  irf: 'ret_irf',
}

/** Converte o nome de um parâmetro do catálogo na chave do campo da tela. */
function mapParamToFormKey(name: string): string | null {
  const raw = normalize(name)
  const isAbs = raw.includes('absoluto')
  const base = raw.replace('absoluto', '').replace('percentual', '')

  if (base === 'eritroblastos') return isAbs ? 'eritroblastos_abs' : 'eritroblastos_pct'

  const direct = DIRECT_ALIASES[base]
  if (direct) return direct

  const row = ROW_ALIASES[base]
  if (row) return `${row}${isAbs ? '_abs' : '_pct'}`

  const field = RED_FIELDS.concat(RETIC_FIELDS, PLATELET_FIELDS).find((f) => normalize(f.label) === base)
  return field ? field.key : null
}


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
  const { user } = useAuth()
  const { canType, canRelease } = useResultEntryPermissions()

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
  const [catalogList, setCatalogList] = useState<any[]>([])
  const [examStatus, setExamStatus] = useState<string | null>(null)
  const [instrumentKeys, setInstrumentKeys] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [equipments, setEquipments] = useState<any[]>([])
  const [equipmentId, setEquipmentId] = useState<string>('')

  // Equipamentos do tipo Hematológico cadastrados/compartilhados para a empresa
  useEffect(() => {
    let active = true
    ;(async () => {
      const cid = resolveCompanyId(user?.companyId)
      if (!cid) return
      const { data } = await supabase
        .from('lab_equipments' as any)
        .select('id, name, serial_number, connection_type, manufacturer')
        .eq('company_id', cid)
        .order('name')
      if (!active || !data) return
      const hema = (data as any[]).filter((e) => /hematol/i.test(String(e.connection_type || '')))
      setEquipments(hema)
      setEquipmentId((current) => {
        if (current && hema.some((e) => e.id === current)) return current
        const p8000 = hema.find((e) => String(e.serial_number || '').toLowerCase() === 'p8000')
        return p8000?.id || hema[0]?.id || ''
      })
    })()
    return () => { active = false }
  }, [user?.companyId])

  const selectedEquipment = useMemo(
    () => equipments.find((e) => e.id === equipmentId) || null,
    [equipments, equipmentId],
  )
  /** Somente o layout do p8000 (Yumizen P8000) está implementado hoje. */
  const hasEquipmentLayout =
    equipments.length === 0 || String(selectedEquipment?.serial_number || '').toLowerCase() === 'p8000'

  // Catálogo de Exames (mesma fonte usada na Digitação de Resultados)
  useEffect(() => {
    let active = true
    ;(async () => {
      const { data } = await supabase
        .from('exams')
        .select('id, name, internal_code, measurement_unit, parameters, reference_values')
      if (active && data) setCatalogList(data as any[])
    })()
    return () => { active = false }
  }, [])



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

  // Parâmetros e faixas de referência do catálogo (idênticos à Digitação de Resultados)
  const resolvedParams = useMemo<ResolvedParam[]>(() => {
    if (!selected) return []
    const age = selected.patientBirthDate
      ? (() => {
          const birth = new Date(`${selected.patientBirthDate}T12:00:00`)
          if (isNaN(birth.getTime())) return undefined
          const today = new Date()
          let years = today.getFullYear() - birth.getFullYear()
          const before = today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
          if (before) years -= 1
          return years
        })()
      : undefined
    const catalogExam = findCatalogExam(catalogList, {
      examId: selected.id.split(':')[1],
      code: selected.examCode,
      name: selected.examName,
    })
    return buildExamParams(catalogExam, selected.examName, { gender: selected.gender, age })
  }, [selected, catalogList])

  const formKeyOfParam = (param: ResolvedParam) => mapParamToFormKey(param.name) || `p_${param.id}`

  const paramByFormKey = useMemo(() => {
    const map: Record<string, ResolvedParam> = {}
    resolvedParams.forEach((param) => {
      const key = formKeyOfParam(param)
      if (!map[key]) map[key] = param
    })
    return map
  }, [resolvedParams])

  // Parâmetros do catálogo que não têm campo fixo na tela do equipamento
  const extraParams = useMemo(
    () => resolvedParams.filter((param) => !mapParamToFormKey(param.name)),
    [resolvedParams],
  )

  // Carrega valores já digitados/recebidos do equipamento para o exame selecionado
  useEffect(() => {
    let cancelled = false
    setValues({})
    setLaudo('')
    setObservacao('')
    setFlags([])
    setExamStatus(null)
    setInstrumentKeys(new Set())
    if (!selected) return
    const cid = resolveCompanyId(user?.companyId)
    if (!cid) return

    ;(async () => {
      const { data: results } = await supabase
        .from('lab_exam_results')
        .select('id, status, notes, lab_result_values(parameter_key, parameter_name, value, flag, source)')
        .eq('company_id', cid)
        .eq('exam_ref', selected.id)
      const match = (results || [])[0] as any
      if (!match || cancelled) return

      const byId: Record<string, ResolvedParam> = {}
      resolvedParams.forEach((param) => { byId[String(param.id)] = param })

      const next: Record<string, string> = {}
      const nextFlags: string[] = []
      const nextInstrument = new Set<string>()
      ;(match.lab_result_values || []).forEach((row: any) => {
        const param = byId[String(row.parameter_key)]
        const key = param ? formKeyOfParam(param) : mapParamToFormKey(String(row.parameter_name || ''))
        if (key && row.value != null && String(row.value) !== '') {
          next[key] = String(row.value)
          if (row.source === 'instrument') nextInstrument.add(key)
        }
        if (row.flag && !nextFlags.includes(row.flag)) nextFlags.push(String(row.flag))
      })
      setValues(next)
      setFlags(nextFlags)
      setInstrumentKeys(nextInstrument)
      setObservacao(match.notes || '')
      setExamStatus(match.status || null)
    })()

    return () => { cancelled = true }
  }, [selected, resolvedParams, user?.companyId])

  // Calcula automaticamente os parâmetros com fórmula do catálogo
  useEffect(() => {
    if (resolvedParams.length === 0) return
    const valueOf = (paramId: string) => {
      const param = resolvedParams.find((p) => String(p.id) === String(paramId))
      return param ? (values[formKeyOfParam(param)] || '') : ''
    }
    const updates: Record<string, string> = {}
    resolvedParams.forEach((param) => {
      if (!param.isCalculated) return
      const key = formKeyOfParam(param)
      if (instrumentKeys.has(key)) return
      const computed = evaluateFormula(param.formula, resolvedParams, valueOf)
      if (computed && values[key] !== computed) updates[key] = computed
    })
    if (Object.keys(updates).length > 0) setValues((current) => ({ ...current, ...updates }))
  }, [values, resolvedParams, instrumentKeys])

  const getValue = (key: string) => values[key] ?? ''
  const setValue = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }))
  const referenceOf = (key: string) => paramByFormKey[key]?.reference || ''

  // ===== Diferencial de Glóbulos Brancos =====
  // Neutrófilos bastonetes (%) = 100 - (segmentados + linfócitos + monócitos + eosinófilos)
  const numBR = (v?: string) => {
    const n = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.'))
    return isNaN(n) ? null : n
  }
  const DIFF_PCT_KEYS = ['segmentados_pct', 'linf_citos_t_a_pct', 'mon_citos_pct', 'eosin_filos_pct']
  const diffSum = DIFF_PCT_KEYS.reduce((acc, k) => acc + (numBR(values[k]) ?? 0), 0)
  const diffAnyFilled = DIFF_PCT_KEYS.some((k) => numBR(values[k]) != null)
  const diffTotal = diffSum + (numBR(values['bast_es_pct']) ?? 0)
  const diffOver = diffSum > 100

  useEffect(() => {
    if (!diffAnyFilled) return
    const auto = String(Math.round((100 - diffSum) * 100) / 100).replace('.', ',')
    if ((values['bast_es_pct'] ?? '') !== auto) {
      setValues((current) => ({ ...current, bast_es_pct: auto }))
    }
  }, [diffSum, diffAnyFilled, values])

  /** Salva o exame selecionado no mesmo formato da Digitação de Resultados. */
  const persistExam = async (status: 'draft' | 'digitized' | 'released') => {
    if (!selected) return
    const cid = resolveCompanyId(user?.companyId)
    if (!cid) throw new Error('Empresa não identificada')

    const nowIso = new Date().toISOString()
    const payload: any = {
      company_id: cid,
      order_id: selected.orderId,
      protocol: selected.protocol || null,
      exam_ref: selected.id,
      exam_code: selected.examCode || null,
      exam_name: selected.examName || null,
      patient_name: selected.patientName || null,
      status,
      notes: observacao || null,
    }
    if (status === 'digitized') { payload.typed_by = user?.id || null; payload.typed_at = nowIso }
    if (status === 'released') { payload.released_by = user?.id || null; payload.released_at = nowIso }

    const { data: saved, error } = await supabase
      .from('lab_exam_results')
      .upsert(payload, { onConflict: 'company_id,exam_ref' })
      .select('id')
      .single()
    if (error || !saved) throw error || new Error('Falha ao salvar resultado')

    const rows = resolvedParams.map((param, idx) => {
      const key = formKeyOfParam(param)
      return {
        company_id: cid,
        result_id: saved.id,
        parameter_key: String(param.id),
        parameter_name: param.name || null,
        value: values[key] || '',
        unit: param.unit || null,
        reference: param.reference || null,
        sort_order: idx,
        source: instrumentKeys.has(key) ? 'instrument' : 'manual',
      }
    })
    if (rows.length > 0) {
      const { error: vErr } = await supabase
        .from('lab_result_values')
        .upsert(rows, { onConflict: 'result_id,parameter_key' })
      if (vErr) throw vErr
    }

    await updateOrderStatus()
  }

  /** Recalcula o status do pedido conforme os exames digitados/liberados. */
  const updateOrderStatus = async () => {
    if (!selected) return
    const cid = resolveCompanyId(user?.companyId)
    if (!cid) return
    const order: any = (orders || []).find((o: any) => o.id === selected.orderId)
    const total = (order?.labGuides || []).reduce(
      (acc: number, guide: any) =>
        acc + (guide?.exams || []).filter((e: any) => String(e.status || '').toLowerCase() !== 'cancelled').length,
      0,
    )
    const { data } = await supabase
      .from('lab_exam_results')
      .select('status')
      .eq('company_id', cid)
      .eq('order_id', selected.orderId)
    const statuses = (data || []).map((r: any) => r.status)
    const released = statuses.filter((s) => s === 'released').length

    let next = 'validation'
    if (total > 0 && released >= total) next = 'completed'
    else if (released > 0) next = 'released'

    await supabase.from('attendance_orders').update({ status: next }).eq('id', selected.orderId)
  }

  const allFilled = resolvedParams.length > 0 && resolvedParams.every((param) => (values[formKeyOfParam(param)] || '').trim() !== '')

  const runAction = async (status: 'draft' | 'digitized' | 'released', message: string) => {
    setSaving(true)
    try {
      await persistExam(status)
      setExamStatus(status)
      toast.success(message)
      await Promise.resolve(refresh())
    } catch {
      toast.error('Erro ao salvar o resultado no banco de dados.')
    } finally {
      setSaving(false)
    }
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

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-rose-50 px-3 py-1.5">
          <span className="text-[11px] font-black uppercase tracking-wide text-rose-600">
            Glóbulos Brancos (Total: {diffTotal.toFixed(2).replace('.', ',')} %)
          </span>
          {diffOver && (
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-rose-600">
              <AlertTriangle className="h-3 w-3 shrink-0" /> A soma do diferencial ultrapassou 100% — verifique os valores
            </span>
          )}
        </div>

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
                      <div key={field.key} className="grid grid-cols-[minmax(96px,1fr)_80px_96px] items-center gap-1 border-b border-border px-2 py-1 last:border-b-0">
                        <span className="truncate text-[11px]">{field.label}</span>
                        <CompactInput label={field.label} value={getValue(field.key)} onChange={(value) => setValue(field.key, value)} />
                        <span className="truncate text-right text-[9px] text-muted-foreground" title={referenceOf(field.key)}>{field.unit}{referenceOf(field.key) ? ` · ${referenceOf(field.key)}` : ''}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="reticulocitos" className="mt-2">
                  <div className="overflow-hidden rounded border border-border">
                    {RETIC_FIELDS.map((field) => (
                      <div key={field.key} className="grid grid-cols-[minmax(96px,1fr)_80px_96px] items-center gap-1 border-b border-border px-2 py-1 last:border-b-0">
                        <span className="truncate text-[11px]">{field.label}</span>
                        <CompactInput label={field.label} value={getValue(field.key)} onChange={(value) => setValue(field.key, value)} />
                        <span className="truncate text-right text-[9px] text-muted-foreground" title={referenceOf(field.key)}>{field.unit}{referenceOf(field.key) ? ` · ${referenceOf(field.key)}` : ''}</span>
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
                  <div key={field.key} className="grid grid-cols-[minmax(96px,1fr)_80px_96px] items-center gap-1 border-b border-border px-2 py-1 last:border-b-0">
                    <span className="truncate text-[11px]">{field.label}</span>
                    <CompactInput label={field.label} value={getValue(field.key)} onChange={(value) => setValue(field.key, value)} />
                    <span className="truncate text-right text-[9px] text-muted-foreground" title={referenceOf(field.key)}>{field.unit}{referenceOf(field.key) ? ` · ${referenceOf(field.key)}` : ''}</span>
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

            {extraParams.length > 0 && (
              <section className="space-y-2 pt-1">
                <SectionTitle>Outros Parâmetros do Exame</SectionTitle>
                <div className="overflow-hidden rounded border border-border">
                  {extraParams.map((param) => {
                    const key = `p_${param.id}`
                    return (
                      <div key={key} className="grid grid-cols-[minmax(104px,1fr)_84px_84px] items-center gap-1 border-b border-border px-2 py-1 last:border-b-0">
                        <span className="truncate text-[11px]" title={param.name}>{param.name}</span>
                        <CompactInput label={param.name} value={getValue(key)} onChange={(value) => setValue(key, value)} />
                        <span className="truncate text-right text-[9px] text-muted-foreground" title={param.reference}>
                          {param.unit} {param.reference ? `· ${param.reference}` : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

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

        <footer className="flex flex-col items-stretch justify-between gap-2 border-t border-border bg-muted/50 px-4 py-3 sm:flex-row sm:items-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {resolvedParams.filter((param) => (values[formKeyOfParam(param)] || '').trim() !== '').length} de {resolvedParams.length} campos preenchidos
            {examStatus === 'digitized' && ' · digitado'}
            {examStatus === 'released' && ' · liberado'}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            {canType && (
              <Button
                variant="outline"
                className="gap-2"
                disabled={saving || !selected}
                onClick={() => runAction('draft', 'Resultado salvo parcialmente.')}
              >
                <Save className="h-4 w-4" /> SALVAR PARCIAL
              </Button>
            )}
            {canRelease && (
              <Button
                variant="outline"
                className="gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50"
                disabled={saving || examStatus !== 'digitized'}
                onClick={() => runAction('released', 'Exame liberado com sucesso!')}
              >
                <ShieldCheck className="h-4 w-4" /> Liberar Digitados
              </Button>
            )}
            {canType && (
              <Button
                className="gradient-bg gap-2 text-primary-foreground"
                disabled={saving || !allFilled || examStatus === 'released'}
                onClick={() => runAction('digitized', 'Digitação concluída e salva com sucesso!')}
              >
                <CheckCircle2 className="h-4 w-4" /> Concluir Digitação
              </Button>
            )}
          </div>
        </footer>

      </section>
      )}
    </div>
  )
}
