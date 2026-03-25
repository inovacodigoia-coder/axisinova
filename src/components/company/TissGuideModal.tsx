import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { GradientButton } from '@/components/ui/GradientButton'

export interface TissGuideFormData {
  id?: string
  patient: string
  procedure: string
  procedureCode: string
  operator: string
  value: number
  doctor: string
  authorization?: string
  notes?: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: TissGuideFormData) => void
  initial?: TissGuideFormData | null
}

const operators = ['Unimed', 'Bradesco Saúde', 'SulAmérica', 'Amil', 'Hapvida', 'NotreDame Intermédica', 'Porto Seguro Saúde']
const doctors = ['Dr. Carlos Mendes', 'Dra. Ana Paula', 'Dr. Roberto Lima', 'Dra. Maria Souza']

export function TissGuideModal({ open, onClose, onSave, initial }: Props) {
  const [form, setForm] = useState<TissGuideFormData>({
    patient: '', procedure: '', procedureCode: '', operator: operators[0],
    value: 0, doctor: doctors[0], authorization: '', notes: '',
  })

  useEffect(() => {
    if (initial) setForm(initial)
    else setForm({ patient: '', procedure: '', procedureCode: '', operator: operators[0], value: 0, doctor: doctors[0], authorization: '', notes: '' })
  }, [initial, open])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
  }

  const set = (field: keyof TissGuideFormData, value: any) => setForm(prev => ({ ...prev, [field]: value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">{initial ? 'Editar Guia TISS' : 'Nova Guia TISS'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors"><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Paciente *</label>
            <input value={form.patient} onChange={e => set('patient', e.target.value)} required
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" placeholder="Nome do paciente" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Procedimento *</label>
              <input value={form.procedure} onChange={e => set('procedure', e.target.value)} required
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" placeholder="Ex: Consulta Médica" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Código TUSS</label>
              <input value={form.procedureCode} onChange={e => set('procedureCode', e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" placeholder="Ex: 10101012" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Operadora *</label>
              <select value={form.operator} onChange={e => set('operator', e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
                {operators.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Médico Executante</label>
              <select value={form.doctor} onChange={e => set('doctor', e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
                {doctors.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Valor (R$) *</label>
              <input type="number" value={form.value} onChange={e => set('value', Number(e.target.value))} required min={0} step={0.01}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Nº Autorização</label>
              <input value={form.authorization} onChange={e => set('authorization', e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" placeholder="Opcional" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Observações</label>
            <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={2}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-input px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
            <GradientButton type="submit">{initial ? 'Salvar Alterações' : 'Criar Guia'}</GradientButton>
          </div>
        </form>
      </div>
    </div>
  )
}
