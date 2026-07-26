import { useMemo, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, Search, Eye, Printer, Pencil, Plus, ChevronDown, ChevronRight, Calendar, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useAttendanceCadastro } from '@/hooks/useAttendanceCadastro'
import { usePatients } from '@/hooks/usePatients'
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

function normalize(s: string) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, '')
}

function buildDoc(order: AttendanceOrder, patient: Patient | undefined, unitName?: string, guicheName?: string): AttendanceControlDocument {
  const created = new Date(order.registeredAt)
  return {
    orderNumber: order.orderNumber,
    orderDate: created.toLocaleDateString('pt-BR'),
    orderTime: created.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    patientId: order.patientId,
    patientName: order.patientName,
    patientBirthDate: patient?.birthDate,
    patientAge: patient?.age,
    patientCPF: patient?.cpf,
    patientPhone: patient?.phone1,
    motherName: patient?.motherName,
    serviceType: order.serviceType === 'consultation' ? 'Consulta' : order.serviceType === 'exam' ? 'Exame' : 'Procedimento',
    procedureName: order.procedureName || '',
    procedureCode: order.procedureCode || '',
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
    companyName: 'CLÍNICA AXIS INOVA',
    companyAddress: 'Rua das Flores, 123 · Natal/RN',
    companyCNPJ: '00.000.000/0001-00',
    companyPhone: '(84) 3333-0000',
  }
}

export function AttendanceLookupModal({ open, onClose, unitName, guicheName, onAddProcedure }: AttendanceLookupModalProps) {
  const { orders, updateOrder, loading } = useAttendanceCadastro()
  const { patients, loading: patientsLoading } = usePatients()
  const [search, setSearch] = useState('')
  const [patientSearch, setPatientSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<AttendanceOrder | null>(null)
  const [printDoc, setPrintDoc] = useState<AttendanceControlDocument | null>(null)
  const [detailsOrder, setDetailsOrder] = useState<AttendanceOrder | null>(null)

  const patientById = useMemo(() => {
    const m = new Map<string, Patient>()
    patients.forEach(p => m.set(p.id, p))
    return m
  }, [patients])

  const grouped = useMemo(() => {
    const term = normalize(search.trim())
    const pTerm = normalize(patientSearch.trim())
    const list = orders.filter(o => {
      const p = patientById.get(o.patientId)
      
      if (term) {
        const haystack = [
          o.orderNumber,
          p?.cpf,
          p?.motherName,
        ].filter(Boolean).map(v => normalize(String(v))).join(' ')
        if (!haystack.includes(term)) return false
      }

      if (pTerm) {
        const pName = normalize(o.patientName || '')
        if (!pName.includes(pTerm)) return false
      }

      return true
    })
    const byPatient = new Map<string, AttendanceOrder[]>()
    list.forEach(o => {
      const arr = byPatient.get(o.patientId) || []
      arr.push(o)
      byPatient.set(o.patientId, arr)
    })
    return Array.from(byPatient.entries())
      .map(([pid, items]) => ({
        patientId: pid,
        patient: patientById.get(pid),
        patientName: items[0].patientName,
        items: items.sort((a, b) => b.registeredAt.localeCompare(a.registeredAt)),
      }))
      .sort((a, b) => a.patientName.localeCompare(b.patientName))
  }, [orders, patientById, search, patientSearch])

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
                  placeholder="Buscar por protocolo, CPF ou nome da mãe..."
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

            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {grouped.length} paciente{grouped.length === 1 ? '' : 's'} · {grouped.reduce((s, g) => s + g.items.length, 0)} atendimento{grouped.reduce((s, g) => s + g.items.length, 0) === 1 ? '' : 's'}
          </p>
        </div>

        {/* Results Table Header */}
        <div className="bg-muted/10 border-b border-border px-6 py-2">
          <div className="grid grid-cols-[120px_140px_1fr_100px_120px_100px_140px_120px] gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            <div>Pedido / Amostra</div>
            <div>Dt. Atend.</div>
            <div>Cliente</div>
            <div>Nascimento</div>
            <div>Convênio</div>
            <div>Prev. Entrega</div>
            <div>Origem</div>
            <div className="text-right">Ações</div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto bg-background">
          {(loading || patientsLoading) ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : !grouped.length && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {search || patientSearch ? 'Nenhum cadastro encontrado para sua busca.' : 'Digite para buscar atendimentos.'}
            </div>
          )}

          
          <div className="divide-y divide-border">
            {grouped.flatMap(g => g.items.map(order => (
              <OrderRowModern
                key={order.id}
                order={order}
                patient={g.patient}
                onPrint={() => setDetailsOrder(order)}
                onEdit={() => setEditing(order)}
                onDetails={() => setDetailsOrder(order)}
                onAddProcedure={() => g.patient && onAddProcedure(g.patient)}
              />
            )))}
          </div>
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
      <div className="grid grid-cols-[120px_140px_1fr_100px_120px_100px_140px_120px] gap-4 px-6 py-3 items-center text-xs">
        <div className="font-mono text-primary font-bold hover:underline" onClick={(e) => { e.stopPropagation(); onDetails(); }}>{order.orderNumber}-1</div>
        <div className="text-muted-foreground">
          {date.toLocaleDateString('pt-BR')} {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="font-semibold text-foreground truncate uppercase">{order.patientName}</div>
        <div className="text-muted-foreground">{patient?.birthDate ? new Date(patient.birthDate).toLocaleDateString('pt-BR') : '-'}</div>
        <div className="truncate uppercase">{order.convenioName || 'Particular'}</div>
        <div className="text-muted-foreground">{deliveryDate ? deliveryDate.toLocaleDateString('pt-BR') : '-'}</div>
        <div className="truncate text-muted-foreground uppercase">{order.originName || 'Apartamentos'}</div>
        <div className="flex items-center justify-end gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={onEdit} title="Editar">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={onPrint} title="Imprimir">
            <Printer className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-emerald-600" onClick={onAddProcedure} title="Adicionar">
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setOpen(!open)} title="Ver detalhes">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="px-6 pb-4 pt-1">
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-8">
              <Detail label="Tipo" value={order.serviceType === 'consultation' ? 'Consulta' : order.serviceType === 'exam' ? 'Exame' : 'Procedimento'} />
              <Detail label="Procedimento" value={order.procedureName || '-'} />
              <Detail label="Médico" value={order.doctorName || '-'} />
              <Detail label="Status" value={order.status === 'authorized' ? 'Autorizado' : order.status === 'open' ? 'Aberto' : order.status === 'completed' ? 'Concluído' : 'Cancelado'} />
              <Detail label="Pagamento" value={order.paymentType === 'convenio' ? `Convênio · ${order.convenioName || ''}` : order.paymentType === 'private' ? `Particular${order.privateValue ? ` · R$ ${order.privateValue.toFixed(2)}` : ''}` : `Cortesia${order.freeReason ? ` · ${order.freeReason}` : ''}`} />
              {order.cardNumber && <Detail label="Carteirinha" value={order.cardNumber} />}
              {patient?.motherName && <Detail label="Nome da Mãe" value={patient.motherName} />}
              {order.registeredByName && <Detail label="Registrado por" value={order.registeredByName} />}
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
            <select value={status} onChange={e => setStatus(e.target.value as AttendanceOrder['status'])} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="open">Aberto</option>
              <option value="authorized">Autorizado</option>
              <option value="completed">Concluído</option>
              <option value="cancelled">Cancelado</option>
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
