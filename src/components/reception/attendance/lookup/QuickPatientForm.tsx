import { useState } from 'react'
import { toast } from 'sonner'
import { UserCheck, AlertTriangle } from 'lucide-react'
import { useRegisters } from '@/context/RegistersContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { resolveCompanyId } from '@/utils/companyId'
import { isValidCPF, formatCPFDisplay } from '@/utils/patient.validators'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Patient } from '@/types/patient.types'

function dbToPatient(data: any): Patient {
  return {
    id: data.id,
    companyId: data.company_id,
    fullName: data.name,
    birthDate: data.birth_date,
    motherName: data.mother_name || undefined,
    cpf: data.cpf || undefined,
    gender: data.gender as any,
    phone1: data.phone || '',
    phone1Type: 'mobile',
    email: data.email || undefined,
    status: (data.status as any) || 'active',
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    convenios: [],
    clinicalData: { allergies: [], chronicConditions: [], continuousMedications: [] },
    tags: [],
  } as Patient
}

interface Props { onCreate: (patient: Patient) => void }

function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) => [a && `(${a}`, a && ') ', b, c && '-' + c].filter(Boolean).join(''))
  return d.replace(/^(\d{0,2})(\d{0,5})(\d{0,4}).*/, (_, a, b, c) => [a && `(${a}`, a && ') ', b, c && '-' + c].filter(Boolean).join(''))
}
function maskCpf(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  return d.replace(/^(\d{0,3})(\d{0,3})(\d{0,3})(\d{0,2}).*/, (_, a, b, c, e) =>
    [a, b && '.' + b, c && '.' + c, e && '-' + e].filter(Boolean).join(''))
}
function maskDate(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.replace(/^(\d{0,2})(\d{0,2})(\d{0,4}).*/, (_, a, b, c) => [a, b && '/' + b, c && '/' + c].filter(Boolean).join(''))
}

export function QuickPatientForm({ onCreate }: Props) {
  const { user } = useAuth()
  const { convenios } = useRegisters()
  const companyId = resolveCompanyId(user?.companyId)
  const [showMore, setShowMore] = useState(false)
  const [saving, setSaving] = useState(false)
  const [duplicate, setDuplicate] = useState<Patient | null>(null)
  const [f, setF] = useState({
    fullName: '', birthDate: '', motherName: '', phone1: '', cpf: '',
    phone2: '', email: '', gender: 'not_informed', rg: '',
    convenioId: '', cardNumber: '', cardExpiry: '',
  })
  const set = <K extends keyof typeof f>(k: K, v: string) => setF(s => ({ ...s, [k]: v }))

  const cpfDigits = f.cpf.replace(/\D/g, '')
  const cpfValid = isValidCPF(f.cpf)
  const isValid = f.fullName.trim().split(/\s+/).length >= 2 && 
    f.birthDate.length === 10 && 
    f.motherName.trim() && 
    cpfValid

  const lookupCpf = async (clean: string): Promise<Patient | null> => {
    if (!companyId || clean.length !== 11) return null
    const { data } = await supabase
      .from('patients').select('*')
      .eq('company_id', companyId).eq('cpf', clean).maybeSingle()
    return data ? dbToPatient(data) : null
  }

  const submit = async () => {
    if (!cpfValid) { toast.error('CPF inválido'); return }
    if (!isValid) { toast.error('Preencha os campos obrigatórios (incluindo CPF)'); return }
    if (!companyId) { toast.error('Empresa não identificada'); return }

    // Bloqueio: CPF já cadastrado
    try {
      const existing = await lookupCpf(cpfDigits)
      if (existing) { setDuplicate(existing); return }
    } catch (e) {
      console.warn('Duplicate CPF check error', e)
    }


    setSaving(true)
    const [dd, mm, yyyy] = f.birthDate.split('/')
    const birthIso = `${yyyy}-${mm}-${dd}`
    const newId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : `pat_${Date.now()}`
    const patient: Patient = {
      id: newId,
      companyId,
      fullName: f.fullName.trim(),
      birthDate: birthIso,
      motherName: f.motherName.trim() || undefined,
      gender: f.gender as any,
      cpf: f.cpf || undefined,
      rg: f.rg || undefined,
      phone1: f.phone1, phone1Type: 'mobile',
      phone2: f.phone2 || undefined,
      email: f.email || undefined,
      status: 'active',
      convenios: f.convenioId ? [{
        convenioId: f.convenioId,
        convenioName: convenios.find(c => c.id === f.convenioId)?.name || '',
        cardNumber: f.cardNumber, cardExpiry: f.cardExpiry, isHolder: true,
      }] : [],
      clinicalData: { allergies: [], chronicConditions: [], continuousMedications: [] },
      tags: [], importedFrom: 'reception_quick',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    // Salvar no supabase (best-effort, ignora erro detalhado)
    try {
      await supabase.from('patients').insert({
        id: newId, company_id: companyId, name: f.fullName.trim(),
        birth_date: birthIso, cpf: f.cpf || null, mother_name: f.motherName || null,
        phone: f.phone1, email: f.email || null, gender: f.gender, status: 'active',
      } as any)
    } catch (e) { console.warn('quick patient insert', e) }
    toast.success('Paciente cadastrado')
    onCreate(patient)
    setSaving(false)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Nome Completo *">
          <input value={f.fullName} onChange={e => set('fullName', e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </Field>
        <Field label="Data de Nascimento *">
          <input value={f.birthDate} onChange={e => set('birthDate', maskDate(e.target.value))} placeholder="DD/MM/AAAA"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </Field>
        <Field label="Nome da Mãe *">
          <input value={f.motherName} onChange={e => set('motherName', e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </Field>
        <Field label="Telefone 1">
          <input value={f.phone1} onChange={e => set('phone1', maskPhone(e.target.value))} placeholder="(00) 00000-0000"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </Field>
        <Field label="CPF *">
          <input value={f.cpf}
            onChange={e => set('cpf', maskCpf(e.target.value))}
            onBlur={async () => {
              if (cpfDigits.length !== 11) return
              if (!cpfValid) { toast.error('CPF inválido'); return }
              const existing = await lookupCpf(cpfDigits)
              if (existing) setDuplicate(existing)
            }}
            placeholder="000.000.000-00"
            className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${cpfDigits.length === 11 && !cpfValid ? 'border-destructive' : 'border-border'}`} />
          {cpfDigits.length === 11 && !cpfValid && (
            <p className="mt-1 text-xs text-destructive">CPF inválido</p>
          )}
        </Field>
      </div>

      <button type="button" onClick={() => setShowMore(s => !s)} className="text-xs text-primary font-medium">
        {showMore ? '▲ Menos dados' : '▼ Mais dados (opcionais)'}
      </button>

      {showMore && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <Field label="Telefone 2"><input value={f.phone2} onChange={e => set('phone2', maskPhone(e.target.value))} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" /></Field>
          <Field label="E-mail"><input value={f.email} onChange={e => set('email', e.target.value)} type="email" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" /></Field>
          <Field label="Gênero">
            <select value={f.gender} onChange={e => set('gender', e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
              <option value="not_informed">Não informado</option><option value="male">Masculino</option>
              <option value="female">Feminino</option><option value="other">Outro</option>
            </select>
          </Field>
          <Field label="RG"><input value={f.rg} onChange={e => set('rg', e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" /></Field>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-3 space-y-2">
        <h4 className="text-sm font-semibold text-foreground">Convênio (opcional)</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Convênio">
            <select value={f.convenioId} onChange={e => set('convenioId', e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
              <option value="">—</option>
              {convenios.filter(c => c.isActive).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Carteirinha"><input value={f.cardNumber} onChange={e => set('cardNumber', e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" /></Field>
          <Field label="Validade MM/AAAA"><input value={f.cardExpiry} onChange={e => set('cardExpiry', e.target.value)} placeholder="MM/AAAA" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" /></Field>
        </div>
      </div>

      <button onClick={submit} disabled={!isValid || saving}
        className="w-full rounded-md gradient-bg py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {saving ? 'Cadastrando...' : '✓ Cadastrar e Avançar'}
      </button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  )
}
