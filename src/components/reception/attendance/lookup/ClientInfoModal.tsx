import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, User, Info, History } from 'lucide-react'
import type { Patient } from '@/types/patient.types'
import type { AttendanceOrder } from '@/types/attendance-cadastro.types'
import { supabase } from '@/integrations/supabase/client'
import { format } from 'date-fns'

export type ClientInfoMode = 'info' | 'edit' | 'history'

const TITLES: Record<ClientInfoMode, string> = {
  info: 'Mais Informações do Cliente',
  edit: 'Perfil do Cliente',
  history: 'Histórico de Consultas',
}

const ICONS: Record<ClientInfoMode, typeof Info> = {
  info: Info,
  edit: User,
  history: History,
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border bg-muted/30 px-3 py-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground break-words">{value || '—'}</span>
    </div>
  )
}

function fmt(d?: string | null) {
  if (!d) return ''
  try { return format(new Date(d), 'dd/MM/yyyy HH:mm') } catch { return d }
}

interface Props {
  open: boolean
  mode: ClientInfoMode
  onClose: () => void
  order: AttendanceOrder
  patient?: Patient
}

export function ClientInfoModal({ open, mode, onClose, order, patient }: Props) {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const Icon = ICONS[mode]

  useEffect(() => {
    if (!open || mode !== 'history') return
    let active = true
    setLoading(true)
    ;(async () => {
      const { data } = await supabase
        .from('attendance_orders')
        .select('id, order_number, status, service_type, created_at, convenio_name, doctor_name')
        .eq('patient_id', order.patientId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (active) {
        setHistory(data || [])
        setLoading(false)
      }
    })()
    return () => { active = false }
  }, [open, mode, order.patientId])

  const address = patient?.address
    ? [patient.address.street, patient.address.number, patient.address.neighborhood, patient.address.city, patient.address.state]
        .filter(Boolean).join(', ')
    : undefined

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Icon className="h-4 w-4 text-primary" />
            {TITLES[mode]}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-3">
          {mode === 'history' ? (
            loading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nenhum atendimento anterior encontrado para este cliente.
              </p>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {h.order_number}
                        {h.id === order.id && <span className="ml-2 text-[10px] font-bold uppercase text-primary">atual</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {fmt(h.created_at)} · {h.convenio_name || 'Particular'}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{h.status}</span>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Row label="Nome" value={patient?.fullName || order.patientName} />
              <Row label="Nome Social" value={patient?.socialName} />
              <Row label="CPF" value={patient?.cpf} />
              <Row label="RG" value={patient?.rg} />
              <Row label="Nascimento" value={patient?.birthDate || order.patientBirthDate} />
              <Row label="Sexo" value={patient?.gender || order.patientGender} />
              <Row label="Nome da Mãe" value={patient?.motherName} />
              <Row label="Telefone" value={patient?.phone1 || patient?.phone2} />
              <Row label="E-mail" value={patient?.email} />
              <Row label="Convênio" value={order.convenioName} />
              <Row label="Carteirinha" value={order.cardNumber} />
              <Row label="Endereço" value={address} />
            </div>
          )}
        </ScrollArea>

        {mode === 'edit' && (
          <p className="text-xs text-muted-foreground">
            Edição do cadastro do cliente disponível no módulo de Pacientes.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
