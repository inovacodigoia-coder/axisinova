import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { GradientButton } from '@/components/ui/GradientButton'
import { formatCPF, formatPhone } from '@/utils/formatters'

const maskCPFInput = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
}

const maskPhoneInput = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) {
    return d
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }
  return d
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

export interface PatientFormData {
  name: string
  cpf: string
  birthDate: string
  phone: string
  bloodType: string
  allergies: string[]
  email?: string
  address?: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: PatientFormData) => void
}

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export function PatientModal({ open, onClose, onSave }: Props) {
  const [form, setForm] = useState<PatientFormData>({
    name: '', cpf: '', birthDate: '', phone: '', bloodType: 'O+', allergies: [], email: '', address: '',
  })
  const [newAllergy, setNewAllergy] = useState('')

  useEffect(() => {
    if (open) setForm({ name: '', cpf: '', birthDate: '', phone: '', bloodType: 'O+', allergies: [], email: '', address: '' })
  }, [open])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
  }

  const addAllergy = () => {
    if (newAllergy.trim()) {
      setForm(prev => ({ ...prev, allergies: [...prev.allergies, newAllergy.trim()] }))
      setNewAllergy('')
    }
  }

  const removeAllergy = (idx: number) => {
    setForm(prev => ({ ...prev, allergies: prev.allergies.filter((_, i) => i !== idx) }))
  }

  const set = (field: keyof PatientFormData, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">Novo Paciente</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors"><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Nome Completo *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} required
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" placeholder="Nome do paciente" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">CPF *</label>
              <input value={form.cpf} onChange={e => set('cpf', maskCPFInput(e.target.value))} required inputMode="numeric"
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" placeholder="000.000.000-00" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Data de Nascimento *</label>
              <input type="date" value={form.birthDate} onChange={e => set('birthDate', e.target.value)} required
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Telefone *</label>
              <input value={form.phone} onChange={e => set('phone', maskPhoneInput(e.target.value))} required inputMode="numeric"
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" placeholder="(00) 00000-0000" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Tipo Sanguíneo</label>
              <select value={form.bloodType} onChange={e => set('bloodType', e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
                {bloodTypes.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">E-mail</label>
            <input value={form.email} onChange={e => set('email', e.target.value)} type="email"
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" placeholder="paciente@email.com" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Alergias</label>
            <div className="mt-1 flex gap-2">
              <input value={newAllergy} onChange={e => setNewAllergy(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2.5 text-sm" placeholder="Adicionar alergia..." />
              <button type="button" onClick={addAllergy} className="rounded-lg border border-input px-3 py-2.5 hover:bg-muted transition-colors">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {form.allergies.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.allergies.map((a, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                    {a}
                    <button type="button" onClick={() => removeAllergy(i)}><Trash2 className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-input px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
            <GradientButton type="submit">Cadastrar Paciente</GradientButton>
          </div>
        </form>
      </div>
    </div>
  )
}
