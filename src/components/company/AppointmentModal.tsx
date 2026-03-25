import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { GradientButton } from '@/components/ui/GradientButton'

const doctors = ['Dr. Carlos Mendes', 'Dra. Ana Paula', 'Dr. Roberto Lima', 'Dra. Maria Souza']
const types = ['Consulta', 'Retorno', 'Exame', 'Primeira vez']
const statuses = [
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'waiting', label: 'Aguardando' },
  { value: 'cancelled', label: 'Cancelado' },
]

export interface AppointmentFormData {
  id?: string
  patient: string
  doctor: string
  date: string
  time: string
  type: string
  duration: number
  status: 'confirmed' | 'waiting' | 'cancelled'
  notes?: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: AppointmentFormData) => void
  initial?: AppointmentFormData | null
}

export function AppointmentModal({ open, onClose, onSave, initial }: Props) {
  const [form, setForm] = useState<AppointmentFormData>({
    patient: '', doctor: doctors[0], date: '', time: '08:00',
    type: 'Consulta', duration: 30, status: 'confirmed', notes: '',
  })

  useEffect(() => {
    if (initial) setForm(initial)
    else setForm({ patient: '', doctor: doctors[0], date: '', time: '08:00', type: 'Consulta', duration: 30, status: 'confirmed', notes: '' })
  }, [initial, open])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
  }

  const set = (field: keyof AppointmentFormData, value: any) => setForm(prev => ({ ...prev, [field]: value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">{initial ? 'Editar Agendamento' : 'Novo Agendamento'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors"><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Paciente *</label>
            <input value={form.patient} onChange={e => set('patient', e.target.value)} required
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Nome do paciente" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Médico</label>
              <select value={form.doctor} onChange={e => set('doctor', e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
                {doctors.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Tipo</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Data *</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Horário *</label>
              <input type="time" value={form.time} onChange={e => set('time', e.target.value)} required
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Duração (min)</label>
              <input type="number" value={form.duration} onChange={e => set('duration', Number(e.target.value))} min={15} step={15}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
              {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Observações</label>
            <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={2}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm resize-none" placeholder="Observações opcionais..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-input px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
            <GradientButton type="submit">{initial ? 'Salvar Alterações' : 'Criar Agendamento'}</GradientButton>
          </div>
        </form>
      </div>
    </div>
  )
}
