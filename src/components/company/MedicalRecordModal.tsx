import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { GradientButton } from '@/components/ui/GradientButton'

export interface MedicalRecordFormData {
  date: string
  doctor: string
  type: string
  diagnosis: string
  notes: string
  prescription?: string
  exams?: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: MedicalRecordFormData) => void
  patientName: string
}

const doctors = ['Dr. Carlos Mendes', 'Dra. Ana Paula', 'Dr. Roberto Lima', 'Dra. Maria Souza']
const recordTypes = ['Consulta', 'Retorno', 'Exame', 'Internação', 'Procedimento', 'Emergência']

export function MedicalRecordModal({ open, onClose, onSave, patientName }: Props) {
  const [form, setForm] = useState<MedicalRecordFormData>({
    date: new Date().toISOString().split('T')[0], doctor: doctors[0],
    type: 'Consulta', diagnosis: '', notes: '', prescription: '', exams: '',
  })

  useEffect(() => {
    if (open) setForm({
      date: new Date().toISOString().split('T')[0], doctor: doctors[0],
      type: 'Consulta', diagnosis: '', notes: '', prescription: '', exams: '',
    })
  }, [open])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
  }

  const set = (field: keyof MedicalRecordFormData, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-foreground">Nova Entrada no Prontuário</h2>
            <p className="text-sm text-muted-foreground">Paciente: {patientName}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors"><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Data *</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
            </div>
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
                {recordTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Diagnóstico / CID *</label>
            <input value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)} required
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" placeholder="Ex: Hipertensão arterial - I10" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Evolução / Anamnese *</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} required rows={3}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm resize-none" placeholder="Descrição detalhada do atendimento..." />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Prescrição</label>
            <textarea value={form.prescription} onChange={e => set('prescription', e.target.value)} rows={2}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm resize-none" placeholder="Medicamentos, posologia..." />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Exames Solicitados</label>
            <textarea value={form.exams} onChange={e => set('exams', e.target.value)} rows={2}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm resize-none" placeholder="Exames laboratoriais, de imagem..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-input px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
            <GradientButton type="submit">Salvar Registro</GradientButton>
          </div>
        </form>
      </div>
    </div>
  )
}
