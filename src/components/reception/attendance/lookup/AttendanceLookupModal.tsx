import { useAuth } from '@/context/AuthContext'
import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, Search, Eye, Printer, Pencil, Plus, ChevronDown, ChevronRight, Calendar, User, Filter, FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useAttendanceCadastro } from '@/hooks/useAttendanceCadastro'
import { usePatients } from '@/hooks/usePatients'
import { useLabSettings } from '@/hooks/useLabSettings'
import { useCompanySequenceId } from '@/hooks/useCompanySequenceId'
import { TUBE_TYPES } from '@/types/lab.types'
import { buildSampleCode, generateSampleHash } from '@/utils/orderHash'
import { AttendancePrintModal } from '../print/AttendancePrintModal'
import { AttendanceDetailsModal } from './AttendanceDetailsModal'
import type { AttendanceOrder } from '@/types/attendance-cadastro.types'
import type { Patient } from '@/types/patient.types'
import type { AttendanceControlDocument } from '@/types/payment-print.types'

interface AttendanceLookupModalProps {
  open: boolean
  onClose: () => void
  unitName?: string
  guicheName?: string
  onAddProcedure: (patient: Patient) => void
}

type DatePreset = 'today' | '7' | '15' | '30' | 'custom' | 'all'

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: '7', label: '7 dias' },
  { value: '15', label: '15 dias' },
  { value: '30', label: '30 dias' },
  { value: 'custom', label: 'Personalizado' },
  { value: 'all', label: 'Todos' },
]

/** Mesma regra do modal de detalhes: material do exame -> tipo de tubo/amostra */
function tubeTypeForMaterial(material: any): string {
  const m = String(material || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
  if (!m) return 'gel'
  if (m.includes('fezes') || m.includes('fecal')) return 'fezes'
  if (m.includes('escarro') || m.includes('secrec') || m.includes('swab') || m.includes('saliva')) return 'escarro'
  if (m.includes('urina')) return 'urina'
  if (m.includes('edta') || m.includes('sangue total') || m.includes('hemograma')) return 'edta'
  if (m.includes('citrat') || m.includes('coagulacao')) return 'citrato'
  if (m.includes('plasma')) return 'citrato'
  if (m.includes('soro') || m.includes('gel') || m.includes('sangue')) return 'gel'
  if (m.includes('frasco')) return 'urina'
  return 'gel'
}

/** Códigos e hashes alfanuméricos das amostras (etiquetas) de um pedido */
function sampleCodesAndHashesForOrder(order: AttendanceOrder, companySequenceId: number | null): string[] {
  const exams = (order.labGuides || []).flatMap((g: any) => g?.exams || [])
  const types = new Set(exams.map((e: any) => tubeTypeForMaterial(e?.material)))
  const tubes = TUBE_TYPES.filter((t: any) => types.has(t.type))
  const list = tubes.length > 0 ? tubes : (exams.length > 0 ? TUBE_TYPES.filter((t: any) => t.type === 'gel') : [])
  const out: string[] = []
  list.forEach((_: any, idx: number) => {
    const code = buildSampleCode(order.orderNumber, idx + 1, companySequenceId)
    if (code) {
      out.push(code)
      const hash = generateSampleHash(code)
      if (hash) out.push(hash)
    }
  })
  return out
}

function normalize(s: string) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, '')
}

function buildDoc(order: AttendanceOrder, patient: Patient | undefined, unitName?: string, guicheName?: string, settings?: any): AttendanceControlDocument {
  const created = new Date(order.registeredAt)
  return {
    orderNumber: order.orderNumber,
    orderDate: created.toLocaleDateString('pt-BR'),
    orderTime: created.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    patientId: order.patientId,
    patientName: order.patientName,
    patientBirthDate: patient?.birthDate,
    patientAge: patient?.age?.toString() || '0 anos',
    patientCPF: patient?.cpf,
    patientPhone: patient?.phone1,
    motherName: patient?.motherName,
    serviceType: order.serviceType === 'consultation' ? 'Consulta' : order.serviceType === 'exam' ? 'Exame' : 'Procedimento',
    exams: order.labGuides?.flatMap(guide => 
      (guide.exams || []).map((exam: any) => ({
        name: exam.name,
        code: exam.code || '',
        forecastDate: exam.forecastDate || '',
        doctorName: guide.doctorName || order.doctorName,
        doctorCRM: guide.doctorCRM || order.doctorCRM
      }))
    ) || [],
    doctorName: order.doctorName,
    doctorCRM: order.doctorCRM,
    specialty: order.specialty,
    unitName: unitName || '',
    guicheName,
    ticketCode: order.ticketCode,
    paymentType: order.paymentType === 'convenio' ? 'Convênio' : order.paymentType === 'private' ? 'Particular' : 'Cortesia',
    convenioName: order.convenioName,
    cardNumber: order.cardNumber,
    authorizationCode: order.authorizationCode,
    authorizationExpiry: order.authorizationExpiry,
    attachments: order.attachments.map(a => ({ name: a.documentType, type: 'document' })),
    registeredByName: order.registeredByName,
    companyName: settings?.lab_name || 'AXIS INOVA',
    companyAddress: settings?.address_street ? `${settings.address_street}, ${settings.address_number} · ${settings.address_city}/${settings.address_state}` : 'Rua das Flores, 123 · Natal/RN',
    companyCNPJ: settings?.cnpj || '00.000.000/0001-00',
    companyPhone: settings?.phone || '(84) 3333-0000',
    companyLogo: settings?.report_logo_primary_url || undefined,
  }
}

const ATTENDANCE_STATUS_LABELS: Record<string, { label: string, color: string }> = {
  waiting_collection: { label: 'AGUARDANDO', color: 'bg-amber-500' },
  collection_done: { label: 'COLETA REALIZADA', color: 'bg-emerald-500' },
  in_analysis: { label: 'Em Análise', color: 'bg-blue-500' },
  validation: { label: 'Validação', color: 'bg-purple-500' },
  released: { label: 'Liberado', color: 'bg-emerald-600' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500' },
  open: { label: 'ABERTO', color: 'bg-blue-400' },
  authorized: { label: 'Autorizado', color: 'bg-indigo-500' },
  completed: { label: 'Concluído', color: 'bg-emerald-700' },
  deleted: { label: 'EXCLUÍDO', color: 'bg-slate-700' },
}

export function AttendanceLookupModal({ open, onClose, unitName, guicheName, onAddProcedure }: AttendanceLookupModalProps) {
  const { user } = useAuth()
  // Somente usuários com a atribuição ADM (checkbox no modal Editar Usuário) veem pedidos excluídos
  const isAdmin = user?.isAdmin === true || user?.role === 'super_admin'
  const { orders, updateOrder, loading } = useAttendanceCadastro()
  const { patients, loading: patientsLoading } = usePatients()
  const { settings } = useLabSettings()
  const companySequenceId = useCompanySequenceId()
  const [search, setSearch] = useState('')
  const [patientSearch, setPatientSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [partnerFilter, setPartnerFilter] = useState<string>('all')
  const [datePreset, setDatePreset] = useState<DatePreset>('today')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [pageSize, setPageSize] = useState(30)
  const [visibleCount, setVisibleCount] = useState(30)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<AttendanceOrder | null>(null)
  const [printDoc, setPrintDoc] = useState<AttendanceControlDocument | null>(null)
  const [detailsOrder, setDetailsOrder] = useState<AttendanceOrder | null>(null)

  // Mapeia pedido -> parceiro (atendimentos criados via integração de parceiros)
  const [partnerByOrderId, setPartnerByOrderId] = useState<Map<string, { id: string; name: string }>>(new Map())
  const companyId = user?.companyId

  useEffect(() => {
    if (!open || !companyId) return
    ;(supabase as any)
      .from('partner_orders')
      .select('attendance_order_id, partner_id, api_partners(id, name)')
      .eq('company_id', companyId)
      .not('attendance_order_id', 'is', null)
      .then(({ data }: any) => {
        const m = new Map<string, { id: string; name: string }>()
        ;(data || []).forEach((row: any) => {
          if (row.attendance_order_id && row.api_partners) {
            m.set(row.attendance_order_id, { id: row.api_partners.id, name: row.api_partners.name })
          }
        })
        setPartnerByOrderId(m)
      })
  }, [open, companyId])

  const partnerOptions = useMemo(() => {
    const seen = new Map<string, string>()
    partnerByOrderId.forEach(v => seen.set(v.id, v.name))
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [partnerByOrderId])

  const patientById = useMemo(() => {
    const m = new Map<string, Patient>()
    patients.forEach(p => m.set(p.id, p))
    return m
  }, [patients])

  const dateRange = useMemo(() => {
    if (datePreset === 'all') return null
    const to = new Date(); to.setHours(23, 59, 59, 999)
    const from = new Date(); from.setHours(0, 0, 0, 0)
    if (datePreset === 'custom') {
      if (!customFrom && !customTo) return null
      const f = customFrom ? new Date(`${customFrom}T00:00:00`) : new Date(0)
      const t = customTo ? new Date(`${customTo}T23:59:59.999`) : to
      return { from: f, to: t }
    }
    if (datePreset !== 'today') from.setDate(from.getDate() - (Number(datePreset) - 1))
    return { from, to }
  }, [datePreset, customFrom, customTo])

  const filtered = useMemo(() => {
    const term = normalize(search.trim())
    const termDigits = search.replace(/\D/g, '')
    const pTerm = normalize(patientSearch.trim())

    return orders.filter(o => {
      // Quando há busca por atendimento/amostra/integração/CPF, o período é ignorado
      if (dateRange && !term) {
        const d = new Date(o.registeredAt)
        if (d < dateRange.from || d > dateRange.to) return false
      }
      // Pedidos excluídos ficam ocultos para todos; apenas ADM pode visualizá-los
      if ((o.status as any) === 'deleted' && (!isAdmin || statusFilter !== 'deleted')) return false
      
      const p = patientById.get(o.patientId)
      
      if (statusFilter !== 'all' && o.status !== statusFilter) return false

      if (partnerFilter === 'partners' && !partnerByOrderId.has(o.id)) return false
      if (partnerFilter !== 'all' && partnerFilter !== 'partners' && partnerByOrderId.get(o.id)?.id !== partnerFilter) return false


      if (term) {
        const values = [
          o.orderNumber,
          o.hash,
          p?.cpf,
          p?.motherName,
          // Códigos e hashes alfanuméricos das etiquetas de amostra (ex.: N2RQ87134)
          ...sampleCodesAndHashesForOrder(o, companySequenceId),
        ].filter(Boolean).map(v => String(v))
        const haystack = values.map(v => normalize(v)).join(' ')
        const digitsHay = values.map(v => v.replace(/\D/g, '')).filter(Boolean).join(' ')
        const matches = haystack.includes(term) || (termDigits.length >= 3 && digitsHay.includes(termDigits))
        if (!matches) return false
      }

      if (pTerm) {
        const pName = normalize(p?.fullName || o.patientName || '')
        if (!pName.includes(pTerm)) return false
      }

      return true
    }).sort((a, b) => b.registeredAt.localeCompare(a.registeredAt))
  }, [orders, patientById, search, patientSearch, statusFilter, partnerFilter, partnerByOrderId, isAdmin, dateRange, companySequenceId])


  useEffect(() => { setVisibleCount(pageSize) }, [pageSize, datePreset, customFrom, customTo, statusFilter, partnerFilter, search, patientSearch])

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])
  const hasMore = filtered.length > visibleCount

  const togglePatient = (pid: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(pid)) next.delete(pid); else next.add(pid)
      return next
    })
  }

  const handleSaveEdit = (patch: Partial<AttendanceOrder>) => {
    if (!editing) return
    updateOrder(editing.id, patch)
    toast.success('Cadastro atualizado')
    setEditing(null)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[1100px] w-[95vw] h-[85vh] p-0 flex flex-col gap-0 [&>button[type=button]]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3">
            <div className="rounded-full gradient-bg p-2 text-white">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Busca de Atendimentos</h2>
              <p className="text-xs text-muted-foreground">Consultas anteriores, procedimentos e exames realizados</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-muted text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filters/Search bar */}
        <div className="border-b border-border bg-muted/30 px-6 py-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground ml-1">Atend./amostra/integração</label>
              <div className="relative">
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Pedido, amostra, CPF (com ou sem pontos) ou nome da mãe..."
                  className="w-full rounded-lg border border-input bg-background pl-3 pr-10 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground ml-1">Nome do Cliente</label>
              <div className="relative">
                <input
                  value={patientSearch}
                  onChange={e => setPatientSearch(e.target.value)}
                  placeholder="Nome do Cliente"
                  className="w-full rounded-lg border border-input bg-background pl-3 pr-10 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="flex-1 space-y-1.5 md:max-w-[180px]">
              <label className="text-xs font-medium text-muted-foreground ml-1">Status</label>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background pl-3 pr-8 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                >
                  <option value="all">Todos Status</option>
                  <option value="waiting_collection">AGUARDANDO</option>
                  <option value="collection_done">COLETA REALIZADA</option>
                  <option value="open">ABERTO</option>
                  {Object.entries(ATTENDANCE_STATUS_LABELS).map(([key, val]) => (
                    key !== 'waiting_collection' && key !== 'open' && key !== 'collection_done' && (key !== 'deleted' || isAdmin) && (
                      <option key={key} value={key}>{val.label}</option>
                    )
                  ))}

                </select>
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {partnerOptions.length > 0 && (
              <div className="flex-1 space-y-1.5 md:max-w-[200px]">
                <label className="text-xs font-medium text-muted-foreground ml-1">Parceiro</label>
                <div className="relative">
                  <select
                    value={partnerFilter}
                    onChange={e => setPartnerFilter(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background pl-3 pr-8 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                  >
                    <option value="all">Todos</option>
                    <option value="partners">Somente Parceiros</option>
                    {partnerOptions.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <FlaskConical className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            )}

            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">

              <Search className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground mr-1">
              <Calendar className="h-3.5 w-3.5" /> Período:
            </span>
            {DATE_PRESETS.map(p => (
              <button
                key={p.value}
                onClick={() => setDatePreset(p.value)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-all',
                  datePreset === p.value ? 'gradient-bg text-white shadow-sm' : 'bg-muted text-muted-foreground hover:bg-accent'
                )}
              >
                {p.label}
              </button>
            ))}
            {datePreset === 'custom' && (
              <div className="flex items-center gap-2">
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                  className="rounded-lg border border-input bg-background px-2 py-1 text-xs" />
                <span className="text-xs text-muted-foreground">até</span>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                  className="rounded-lg border border-input bg-background px-2 py-1 text-xs" />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Exibindo {Math.min(visibleCount, filtered.length)} de {filtered.length} atendimento{filtered.length === 1 ? '' : 's'}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Exibir:</span>
              {[30, 50, 100].map(n => (
                <button
                  key={n}
                  onClick={() => setPageSize(n)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-semibold transition-all',
                    pageSize === n ? 'gradient-bg text-white' : 'bg-muted text-muted-foreground hover:bg-accent'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Table Header */}
        <div className="bg-muted/10 border-b border-border px-6 py-2">
          <div className="grid grid-cols-[120px_100px_1fr_100px_120px_120px_100px_140px] gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            <div>Pedido</div>
            <div>Dt. Atend.</div>
            <div>Cliente</div>
            <div>Nascimento</div>
            <div>Convênio</div>
            <div>Status</div>
            <div>Prev. Entrega</div>
            <div>Origem</div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto bg-background">
          {(loading || patientsLoading) ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : !filtered.length ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {search || patientSearch ? 'Nenhum cadastro encontrado para sua busca.' : 'Nenhum atendimento no período selecionado.'}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {visible.map(order => (
                <OrderRowModern
                  key={order.id}
                  order={order}
                  patient={patientById.get(order.patientId)}
                  onPrint={() => setPrintDoc(buildDoc(order, patientById.get(order.patientId), unitName, guicheName, settings))}
                  onEdit={() => setEditing(order)}
                  onDetails={() => setDetailsOrder(order)}
                  onAddProcedure={() => {
                    const p = patientById.get(order.patientId)
                    if (p) onAddProcedure(p)
                  }}
                />
              ))}
              {hasMore && (
                <div className="flex items-center justify-center gap-3 py-4">
                  <Button variant="outline" size="sm" onClick={() => setVisibleCount(v => v + pageSize)}>
                    Ver mais ({Math.min(pageSize, filtered.length - visibleCount)})
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setVisibleCount(filtered.length)}>
                    Ver todos ({filtered.length})
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>

      {printDoc && (
        <AttendancePrintModal open onClose={() => setPrintDoc(null)} document={printDoc} />
      )}

      {editing && (
        <EditOrderModal
          order={editing}
          onClose={() => setEditing(null)}
          onSave={handleSaveEdit}
        />
      )}

      {detailsOrder && (
        <AttendanceDetailsModal
          open
          onClose={() => setDetailsOrder(null)}
          order={detailsOrder}
          patient={patientById.get(detailsOrder.patientId)}
        />
      )}
    </Dialog>
  )
}

function OrderRowModern({ 
  order, 
  patient, 
  onPrint, 
  onEdit, 
  onDetails,
  onAddProcedure 
}: { 
  order: AttendanceOrder; 
  patient?: Patient; 
  onPrint: () => void; 
  onEdit: () => void; 
  onDetails: () => void;
  onAddProcedure: () => void;
}) {
  const [open, setOpen] = useState(false)
  const date = new Date(order.registeredAt)
  const deliveryDate = order.deliveryDate ? new Date(order.deliveryDate) : null

  return (
    <div 
      className="group hover:bg-[#007AFF]/10 transition-colors cursor-pointer border-l-4 border-transparent hover:border-[#007AFF]"
      onClick={onDetails}
      onDoubleClick={onDetails}
    >
      <div className="grid grid-cols-[120px_100px_1fr_100px_120px_120px_100px_140px] gap-4 px-6 py-3 items-center text-xs">
        <div className="font-mono text-primary font-bold hover:underline" onClick={(e) => { e.stopPropagation(); onDetails(); }}>{order.orderNumber}</div>
        <div className="text-muted-foreground">
          {date.toLocaleDateString('pt-BR')}
        </div>
        <div className="font-semibold text-foreground truncate uppercase">{patient?.fullName || order.patientName}</div>
        <div className="text-muted-foreground">{patient?.birthDate ? new Date(patient.birthDate).toLocaleDateString('pt-BR') : '-'}</div>
        <div className="truncate uppercase font-medium">{order.convenioName || 'Particular'}</div>
        <div>
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-bold text-white uppercase whitespace-nowrap",
            ATTENDANCE_STATUS_LABELS[order.status]?.color || 'bg-slate-400'
          )}>
            {ATTENDANCE_STATUS_LABELS[order.status]?.label || order.status}
          </span>
        </div>
        <div className="text-muted-foreground font-bold">
          {['collection_done', 'released', 'waiting_collection', 'in_analysis', 'validation', 'completed'].includes(order.status) && order.deliveryDate 
            ? new Date(order.deliveryDate).toLocaleDateString('pt-BR') 
            : '-'}
        </div>
        <div className="truncate text-muted-foreground uppercase">{order.originName || 'MATRIZ'}</div>
      </div>

      {open && (
        <div className="px-6 pb-6 pt-1">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12">
              <div className="space-y-3">
                <Detail label="Tipo" value={order.serviceType === 'consultation' ? 'Consulta' : order.serviceType === 'exam' ? 'Exame' : 'Procedimento'} />
                <Detail label="Procedimento" value={order.procedureName || '-'} />
                <Detail label="Médico" value={order.doctorName || '-'} />
                <Detail label="Status" value={ATTENDANCE_STATUS_LABELS[order.status]?.label || order.status} />
              </div>
              <div className="space-y-3">
                <Detail label="Pagamento" value={order.paymentType === 'convenio' ? `Convênio · ${order.convenioName || ''}` : order.paymentType === 'private' ? `Particular${order.privateValue ? ` · R$ ${order.privateValue.toFixed(2)}` : ''}` : `Cortesia${order.freeReason ? ` · ${order.freeReason}` : ''}`} />
                {order.cardNumber && <Detail label="Carteirinha" value={order.cardNumber} />}
                {patient?.motherName && <Detail label="Nome da Mãe" value={patient.motherName} />}
                {order.registeredByName && <Detail label="Registrado por" value={order.registeredByName} />}
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-border mt-2 col-span-full">
                <Button size="sm" variant="outline" className="h-8 gap-2 text-primary border-primary/20 hover:bg-primary/5" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </Button>
                <Button size="sm" variant="outline" className="h-8 gap-2 text-primary border-primary/20 hover:bg-primary/5" onClick={(e) => { e.stopPropagation(); onPrint(); }}>
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir
                </Button>
                <Button size="sm" variant="outline" className="h-8 gap-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={(e) => { e.stopPropagation(); onAddProcedure(); }}>
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground min-w-[110px]">{label}:</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  )
}

function EditOrderModal({ order, onClose, onSave }: { order: AttendanceOrder; onClose: () => void; onSave: (patch: Partial<AttendanceOrder>) => void }) {
  const [authorizationCode, setAuthorizationCode] = useState(order.authorizationCode || '')
  const [authorizationExpiry, setAuthorizationExpiry] = useState(order.authorizationExpiry || '')
  const [cardNumber, setCardNumber] = useState(order.cardNumber || '')
  const [status, setStatus] = useState(order.status)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 [&>button[type=button]]:hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="text-base font-bold text-foreground">Editar Cadastro · {order.orderNumber}</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <Field label="Status">
            <select value={status} onChange={e => setStatus(e.target.value as AttendanceOrder['status'])} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm uppercase">
              {Object.entries(ATTENDANCE_STATUS_LABELS).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </Field>
          {order.paymentType === 'convenio' && (
            <>
              <Field label="Nº Carteirinha">
                <input value={cardNumber} onChange={e => setCardNumber(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </Field>
              <Field label="Código de Autorização">
                <input value={authorizationCode} onChange={e => setAuthorizationCode(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </Field>
              <Field label="Validade da Autorização">
                <input type="date" value={authorizationExpiry} onChange={e => setAuthorizationExpiry(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </Field>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3 bg-muted/30">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave({ status, cardNumber, authorizationCode, authorizationExpiry })}>Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}
