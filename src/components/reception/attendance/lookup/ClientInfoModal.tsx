import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Loader2, User, Info, History, Pencil, Save, X } from 'lucide-react'
import type { Patient } from '@/types/patient.types'
import type { AttendanceOrder } from '@/types/attendance-cadastro.types'
import { supabase } from '@/integrations/supabase/client'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { usePatientRegistryPermissions } from '@/hooks/usePatientRegistryPermissions'

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

function EditField({
  label, value, onChange, type = 'text', options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  options?: { value: string; label: string }[]
}) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-white px-3 py-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      {options ? (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-transparent text-sm font-medium text-foreground outline-none"
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-transparent text-sm font-medium text-foreground outline-none"
        />
      )}
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
  onPatientUpdated?: (patient: Patient) => void
}

export function ClientInfoModal({ open, mode, onClose, order, patient, onPatientUpdated }: Props) {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [current, setCurrent] = useState<Patient | undefined>(patient)
  const [form, setForm] = useState<Record<string, string>>({})
  const Icon = ICONS[mode]
  const { canEdit } = usePatientRegistryPermissions()

  useEffect(() => { setCurrent(patient) }, [patient])
  useEffect(() => { if (!open) { setEditing(false) } }, [open])

  const buildForm = (p?: Patient) => ({
    fullName: p?.fullName || order.patientName || '',
    socialName: p?.socialName || '',
    cpf: p?.cpf || '',
    rg: p?.rg || '',
    birthDate: (p?.birthDate || order.patientBirthDate || '').slice(0, 10),
    gender: p?.gender || (order.patientGender as string) || 'not_informed',
    motherName: p?.motherName || '',
    phone1: p?.phone1 || '',
    email: p?.email || '',
  })

  useEffect(() => {
    if (editing) setForm(buildForm(current))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

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

  const address = useMemo(() => current?.address
    ? [current.address.street, current.address.number, current.address.neighborhood, current.address.city, current.address.state]
        .filter(Boolean).join(', ')
    : undefined, [current])

  const patientId = current?.id || order.patientId

  const handleUpdate = async () => {
    if (!patientId) {
      toast.error('Cliente sem cadastro vinculado a este atendimento.')
      return
    }
    if (!form.fullName?.trim()) {
      toast.error('Informe o nome completo do cliente.')
      return
    }
    setSaving(true)
    try {
      const { patientToDb, dbToPatient } = await import('@/utils/patient.adapter')
      const payload = patientToDb({
        fullName: form.fullName.trim(),
        socialName: form.socialName,
        cpf: form.cpf,
        rg: form.rg,
        birthDate: form.birthDate || undefined,
        gender: form.gender as Patient['gender'],
        motherName: form.motherName,
        phone1: form.phone1,
        email: form.email,
      })
      const { data, error } = await supabase
        .from('patients')
        .update(payload as any)
        .eq('id', patientId)
        .select()
        .single()
      if (error) throw error
      const updated = dbToPatient(data)
      setCurrent(updated)
      onPatientUpdated?.(updated)
      setEditing(false)
      toast.success('Cadastro do paciente atualizado com sucesso!')
    } catch (e: any) {
      toast.error(`Falha ao atualizar cadastro: ${e?.message || e}`)
    } finally {
      setSaving(false)
    }
  }

  const showEditTools = mode !== 'history'

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
          ) : editing ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <EditField label="Nome" value={form.fullName} onChange={v => setForm(f => ({ ...f, fullName: v }))} />
              <EditField label="Nome Social" value={form.socialName} onChange={v => setForm(f => ({ ...f, socialName: v }))} />
              <EditField label="CPF" value={form.cpf} onChange={v => setForm(f => ({ ...f, cpf: v }))} />
              <EditField label="RG" value={form.rg} onChange={v => setForm(f => ({ ...f, rg: v }))} />
              <EditField label="Nascimento" type="date" value={form.birthDate} onChange={v => setForm(f => ({ ...f, birthDate: v }))} />
              <EditField
                label="Sexo"
                value={form.gender}
                onChange={v => setForm(f => ({ ...f, gender: v }))}
                options={[
                  { value: 'female', label: 'Feminino' },
                  { value: 'male', label: 'Masculino' },
                  { value: 'other', label: 'Outro' },
                  { value: 'not_informed', label: 'Não informado' },
                ]}
              />
              <EditField label="Nome da Mãe" value={form.motherName} onChange={v => setForm(f => ({ ...f, motherName: v }))} />
              <EditField label="Telefone" value={form.phone1} onChange={v => setForm(f => ({ ...f, phone1: v }))} />
              <EditField label="E-mail" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} />
              <Row label="Convênio" value={order.convenioName} />
              <Row label="Carteirinha" value={order.cardNumber} />
              <Row label="Endereço" value={address} />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Row label="Nome" value={current?.fullName || order.patientName} />
              <Row label="Nome Social" value={current?.socialName} />
              <Row label="CPF" value={current?.cpf} />
              <Row label="RG" value={current?.rg} />
              <Row label="Nascimento" value={current?.birthDate || order.patientBirthDate} />
              <Row label="Sexo" value={current?.gender || order.patientGender} />
              <Row label="Nome da Mãe" value={current?.motherName} />
              <Row label="Telefone" value={current?.phone1 || current?.phone2} />
              <Row label="E-mail" value={current?.email} />
              <Row label="Convênio" value={order.convenioName} />
              <Row label="Carteirinha" value={order.cardNumber} />
              <Row label="Endereço" value={address} />
            </div>
          )}
        </ScrollArea>

        {showEditTools && (
          <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
            {!editing ? (
              canEdit ? (
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">Seu perfil não permite editar o cadastro do cliente.</p>
              )
            ) : (
              <>
                <Button variant="ghost" size="sm" className="gap-2" onClick={() => setEditing(false)} disabled={saving}>
                  <X className="h-3.5 w-3.5" /> Cancelar
                </Button>
                <Button size="sm" className="gap-2" onClick={handleUpdate} disabled={saving}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Atualizar Cadastro
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
