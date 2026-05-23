import { useMemo, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, Search, Eye, Printer, Pencil, Plus, ChevronDown, ChevronRight, Calendar, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useAttendanceCadastro } from '@/hooks/useAttendanceCadastro'
import { usePatients } from '@/hooks/usePatients'
import { AttendancePrintModal } from '../print/AttendancePrintModal'
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
  const { orders, updateOrder } = useAttendanceCadastro()
  const { patients } = usePatients()
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<AttendanceOrder | null>(null)
  const [printDoc, setPrintDoc] = useState<AttendanceControlDocument | null>(null)

  const patientById = useMemo(() => {
    const m = new Map<string, Patient>()
    patients.forEach(p => m.set(p.id, p))
    return m
  }, [patients])

  const grouped = useMemo(() => {
    const term = normalize(search.trim())
    const list = orders.filter(o => {
      if (!term) return true
      const p = patientById.get(o.patientId)
      const haystack = [
        o.orderNumber,
        o.patientName,
        p?.cpf,
        p?.motherName,
      ].filter(Boolean).map(v => normalize(String(v))).join(' ')
      return haystack.includes(term)
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
  }, [orders, patientById, search])

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
              <h2 className="text-lg font-bold text-foreground">Buscar Cadastros de Atendimento</h2>
              <p className="text-xs text-muted-foreground">Consultas anteriores, procedimentos e exames realizados</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-muted text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="border-b border-border bg-muted/30 px-6 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por protocolo, nome do paciente, CPF ou nome da mãe..."
              className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {grouped.length} paciente{grouped.length === 1 ? '' : 's'} · {grouped.reduce((s, g) => s + g.items.length, 0)} atendimento{grouped.reduce((s, g) => s + g.items.length, 0) === 1 ? '' : 's'}
          </p>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto bg-background p-4 space-y-2">
          {!grouped.length && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {search ? 'Nenhum cadastro encontrado para sua busca.' : 'Digite para buscar cadastros de atendimento.'}
            </div>
          )}
          {grouped.map(g => {
            const isOpen = expanded.has(g.patientId)
            return (
              <div key={g.patientId} className="rounded-lg border border-border bg-card overflow-hidden">
                <button
                  onClick={() => togglePatient(g.patientId)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <User className="h-4 w-4 text-primary" />
                    <div>
                      <div className="font-semibold text-foreground text-sm">{g.patientName}</div>
                      <div className="text-xs text-muted-foreground">
                        {g.patient?.cpf && `CPF: ${g.patient.cpf}`}
                        {g.patient?.motherName && ` · Mãe: ${g.patient.motherName}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-primary/10 text-primary text-xs font-semibold px-2.5 py-0.5">
                      {g.items.length} atendimento{g.items.length === 1 ? '' : 's'}
                    </span>
                    {g.patient && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onAddProcedure(g.patient!) }}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1 hover:bg-emerald-600"
                      >
                        <Plus className="h-3 w-3" /> Adicionar exame/procedimento
                      </button>
                    )}
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-border divide-y divide-border">
                    {g.items.map(order => (
                      <OrderRow
                        key={order.id}
                        order={order}
                        onPrint={() => setPrintDoc(buildDoc(order, g.patient, unitName, guicheName))}
                        onEdit={() => setEditing(order)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
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
    </Dialog>
  )
}

function OrderRow({ order, onPrint, onEdit }: { order: AttendanceOrder; onPrint: () => void; onEdit: () => void }) {
  const [open, setOpen] = useState(false)
  const date = new Date(order.registeredAt)
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground truncate">
              {date.toLocaleDateString('pt-BR')} {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ·{' '}
              <span className="text-primary">{order.orderNumber}</span>
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {order.serviceType === 'consultation' ? 'Consulta' : order.serviceType === 'exam' ? 'Exame' : 'Procedimento'}
              {order.procedureName ? ` · ${order.procedureName}` : ''}
              {order.doctorName ? ` · ${order.doctorName}` : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn('rounded-full text-[10px] font-semibold px-2 py-0.5',
            order.status === 'authorized' && 'bg-emerald-100 text-emerald-700',
            order.status === 'open' && 'bg-amber-100 text-amber-700',
            order.status === 'completed' && 'bg-blue-100 text-blue-700',
            order.status === 'cancelled' && 'bg-red-100 text-red-700',
          )}>{order.status === 'authorized' ? 'Autorizado' : order.status === 'open' ? 'Aberto' : order.status === 'completed' ? 'Concluído' : 'Cancelado'}</span>
          <Button size="sm" variant="outline" onClick={() => setOpen(o => !o)}>
            <Eye className="h-3.5 w-3.5 mr-1" /> {open ? 'Ocultar' : 'Ver'}
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
          </Button>
          <Button size="sm" variant="outline" onClick={onPrint}>
            <Printer className="h-3.5 w-3.5 mr-1" /> Comprovante
          </Button>
        </div>
      </div>

      {open && (
        <div className="mt-3 rounded-md bg-muted/40 p-3 text-xs space-y-1.5">
          <Detail label="Pagamento" value={order.paymentType === 'convenio' ? `Convênio · ${order.convenioName || ''}` : order.paymentType === 'private' ? `Particular${order.privateValue ? ` · R$ ${order.privateValue.toFixed(2)}` : ''}` : `Cortesia${order.freeReason ? ` · ${order.freeReason}` : ''}`} />
          {order.cardNumber && <Detail label="Carteirinha" value={order.cardNumber} />}
          {order.authorizationCode && <Detail label="Autorização" value={`${order.authorizationCode}${order.authorizationExpiry ? ` (val. ${order.authorizationExpiry})` : ''}`} />}
          {order.procedureCode && <Detail label="TUSS" value={order.procedureCode} />}
          {order.specialty && <Detail label="Especialidade" value={order.specialty} />}
          {order.ticketCode && <Detail label="Ficha" value={order.ticketCode} />}
          {order.attachments.length > 0 && <Detail label="Anexos" value={`${order.attachments.length} arquivo(s)`} />}
          {order.registeredByName && <Detail label="Registrado por" value={order.registeredByName} />}
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
