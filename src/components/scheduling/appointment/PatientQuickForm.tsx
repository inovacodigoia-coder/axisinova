import { useState } from 'react'
import { GradientButton } from '@/components/ui/GradientButton'
import type { SchedulingPatient } from '@/types/scheduling.types'
import { MOCK_CONVENIOS } from '@/mocks/company.mock'

interface Props {
  onSave: (patient: SchedulingPatient) => void
  onCancel: () => void
}

export function PatientQuickForm({ onSave, onCancel }: Props) {
  const [form, setForm] = useState({
    fullName: '', birthDate: '', motherName: '', phone1: '', phone2: '',
    convenioId: '', convenioCardNumber: '', cpf: '', email: '', gender: '' as 'M' | 'F' | 'O' | '',
  })
  const [showMore, setShowMore] = useState(false)

  const set = (f: string, v: string) => setForm(prev => ({ ...prev, [f]: v }))

  const getAge = () => {
    if (!form.birthDate) return ''
    const age = Math.floor((Date.now() - new Date(form.birthDate).getTime()) / 31536000000)
    return `(${age} anos)`
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const patient: SchedulingPatient = {
      id: `pat_new_${Date.now()}`,
      fullName: form.fullName,
      birthDate: form.birthDate,
      motherName: form.motherName,
      phone1: form.phone1,
      phone2: form.phone2 || undefined,
      convenioId: form.convenioId || undefined,
      convenioCardNumber: form.convenioCardNumber || undefined,
      cpf: form.cpf || undefined,
      email: form.email || undefined,
      gender: (form.gender as any) || undefined,
      companyId: 'comp_001',
      createdAt: new Date().toISOString().split('T')[0],
    }
    onSave(patient)
  }

  const selectedConvenio = MOCK_CONVENIOS.find(c => c.id === form.convenioId)
  const needsCard = selectedConvenio && selectedConvenio.type !== 'private'

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border p-4 space-y-3 bg-muted/30">
      <h4 className="font-bold text-foreground text-sm">Cadastro Rápido de Paciente</h4>

      <div>
        <label className="text-xs font-medium text-foreground">Nome completo *</label>
        <input value={form.fullName} onChange={e => set('fullName', e.target.value)} required
          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-foreground">Data de nascimento * {getAge()}</label>
          <input type="date" value={form.birthDate} onChange={e => set('birthDate', e.target.value)} required
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground">Nome da mãe *</label>
          <input value={form.motherName} onChange={e => set('motherName', e.target.value)} required
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-foreground">Telefone 1 *</label>
          <input value={form.phone1} onChange={e => set('phone1', e.target.value)} required placeholder="(84) 99999-0000"
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground">Telefone 2</label>
          <input value={form.phone2} onChange={e => set('phone2', e.target.value)} placeholder="(84) 3200-0000"
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-foreground">Convênio *</label>
          <select value={form.convenioId} onChange={e => set('convenioId', e.target.value)} required
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
            <option value="">Selecione...</option>
            {MOCK_CONVENIOS.filter(c => c.isActive).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {needsCard && (
          <div>
            <label className="text-xs font-medium text-foreground">Nº Carteirinha</label>
            <input value={form.convenioCardNumber} onChange={e => set('convenioCardNumber', e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
        )}
      </div>

      {!showMore && (
        <button type="button" onClick={() => setShowMore(true)} className="text-xs text-primary font-medium hover:underline">
          Mais informações ▼
        </button>
      )}

      {showMore && (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-foreground">CPF</label>
            <input value={form.cpf} onChange={e => set('cpf', e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">E-mail</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Gênero</label>
            <select value={form.gender} onChange={e => set('gender', e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="">--</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
              <option value="O">Outro</option>
            </select>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-input px-3 py-2 text-xs font-medium hover:bg-muted transition-colors">Cancelar</button>
        <GradientButton type="submit" className="text-xs">Salvar e Selecionar</GradientButton>
      </div>
    </form>
  )
}
