// =====================================================================
// ClinicalSection — Tipo sanguíneo, alergias, condições, medicações
// =====================================================================
import { Controller, useFieldArray, useFormContext } from 'react-hook-form'
import { Plus, Trash2, Pill, AlertTriangle, Heart } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Field, FormSection } from './Field'
import {
  ALLERGY_SEVERITY_LABELS, ALLERGY_TYPE_LABELS, CHRONIC_CONDITIONS_PRESET,
} from '@/types/patient.types'
import type { PatientFormValues } from '@/utils/patient.schema'

const BLOOD_TYPES: Array<{ value: string; label: string }> = [
  { value: '', label: '—' },
  { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' },
  { value: 'unknown', label: 'Não sabe' },
]

export function ClinicalSection() {
  const { control, watch, setValue } = useFormContext<PatientFormValues>()
  const allergies = useFieldArray({ control, name: 'clinicalData.allergies' })
  const meds = useFieldArray({ control, name: 'clinicalData.continuousMedications' })

  const conditions = watch('clinicalData.chronicConditions') || []
  const toggleCondition = (cond: string) => {
    const set = new Set(conditions)
    if (set.has(cond)) set.delete(cond); else set.add(cond)
    setValue('clinicalData.chronicConditions', Array.from(set), { shouldDirty: true })
  }

  const newId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  return (
    <FormSection title="Dados Clínicos" description="Informações relevantes para o atendimento">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field name="clinicalData.bloodType" label="Tipo sanguíneo">
          <Controller name="clinicalData.bloodType" control={control}
            render={({ field }) => (
              <select value={field.value ?? ''} onChange={e => field.onChange(e.target.value || undefined)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                {BLOOD_TYPES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            )} />
        </Field>
        <div className="flex items-end gap-4">
          <label className="inline-flex items-center gap-2 text-xs">
            <Controller name="clinicalData.needsPriority" control={control}
              render={({ field }) => (
                <input type="checkbox" checked={!!field.value} onChange={e => field.onChange(e.target.checked)}
                  className="h-4 w-4 rounded border-input text-primary" />
              )} />
            Necessita atendimento prioritário
          </label>
        </div>
        <div className="flex items-end gap-4">
          <label className="inline-flex items-center gap-2 text-xs">
            <Controller name="clinicalData.organDonor" control={control}
              render={({ field }) => (
                <input type="checkbox" checked={!!field.value} onChange={e => field.onChange(e.target.checked)}
                  className="h-4 w-4 rounded border-input text-primary" />
              )} />
            Doador de órgãos
          </label>
        </div>
      </div>

      {/* Alergias */}
      <div className="space-y-2 pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" /> Alergias
          </h3>
          <button type="button"
            onClick={() => allergies.append({ id: newId(), substance: '', type: 'medication', reaction: '', severity: 'moderate' })}
            className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-semibold hover:bg-muted">
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </button>
        </div>
        {allergies.fields.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhuma alergia registrada.</p>
        )}
        {allergies.fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start rounded-lg border border-border p-3 bg-background/60">
            <div className="md:col-span-3">
              <Field name={`clinicalData.allergies.${i}.substance`} label="Substância" required>
                <Controller name={`clinicalData.allergies.${i}.substance`} control={control}
                  render={({ field }) => <Input {...field} placeholder="Ex: Dipirona" />} />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field name={`clinicalData.allergies.${i}.type`} label="Tipo">
                <Controller name={`clinicalData.allergies.${i}.type`} control={control}
                  render={({ field }) => (
                    <select {...field} className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                      {Object.entries(ALLERGY_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  )} />
              </Field>
            </div>
            <div className="md:col-span-4">
              <Field name={`clinicalData.allergies.${i}.reaction`} label="Reação observada">
                <Controller name={`clinicalData.allergies.${i}.reaction`} control={control}
                  render={({ field }) => <Input {...field} placeholder="Ex: Urticária, anafilaxia" />} />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field name={`clinicalData.allergies.${i}.severity`} label="Severidade">
                <Controller name={`clinicalData.allergies.${i}.severity`} control={control}
                  render={({ field }) => (
                    <select {...field} className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                      {Object.entries(ALLERGY_SEVERITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  )} />
              </Field>
            </div>
            <div className="md:col-span-1 flex md:justify-end pt-6">
              <button type="button" onClick={() => allergies.remove(i)}
                className="text-destructive hover:bg-destructive/10 rounded-md p-1.5">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Condições Crônicas */}
      <div className="space-y-2 pt-3 border-t border-border">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Heart className="h-4 w-4 text-destructive" /> Condições crônicas
        </h3>
        <div className="flex flex-wrap gap-2">
          {CHRONIC_CONDITIONS_PRESET.map(c => {
            const active = conditions.includes(c)
            return (
              <button key={c} type="button" onClick={() => toggleCondition(c)}
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  active ? 'gradient-bg text-white border-transparent' : 'bg-background text-foreground border-input hover:bg-muted'
                }`}>
                {c}
              </button>
            )
          })}
        </div>
      </div>

      {/* Medicações Contínuas */}
      <div className="space-y-2 pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Pill className="h-4 w-4 text-primary" /> Medicações contínuas
          </h3>
          <button type="button"
            onClick={() => meds.append({ id: newId(), name: '', dosage: '', frequency: '' })}
            className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-semibold hover:bg-muted">
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </button>
        </div>
        {meds.fields.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhuma medicação registrada.</p>
        )}
        {meds.fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start rounded-lg border border-border p-3 bg-background/60">
            <div className="md:col-span-5">
              <Field name={`clinicalData.continuousMedications.${i}.name`} label="Nome do medicamento" required>
                <Controller name={`clinicalData.continuousMedications.${i}.name`} control={control}
                  render={({ field }) => <Input {...field} placeholder="Ex: Losartana" />} />
              </Field>
            </div>
            <div className="md:col-span-3">
              <Field name={`clinicalData.continuousMedications.${i}.dosage`} label="Dosagem">
                <Controller name={`clinicalData.continuousMedications.${i}.dosage`} control={control}
                  render={({ field }) => <Input {...field} placeholder="50mg" />} />
              </Field>
            </div>
            <div className="md:col-span-3">
              <Field name={`clinicalData.continuousMedications.${i}.frequency`} label="Frequência">
                <Controller name={`clinicalData.continuousMedications.${i}.frequency`} control={control}
                  render={({ field }) => <Input {...field} placeholder="1x ao dia" />} />
              </Field>
            </div>
            <div className="md:col-span-1 flex md:justify-end pt-6">
              <button type="button" onClick={() => meds.remove(i)}
                className="text-destructive hover:bg-destructive/10 rounded-md p-1.5">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-border">
        <Field name="clinicalData.disabilities" label="Deficiências / Necessidades especiais">
          <Controller name="clinicalData.disabilities" control={control}
            render={({ field }) => <Input {...field} placeholder="Descrever, se houver" />} />
        </Field>
        <Field name="clinicalData.notes" label="Observações clínicas">
          <Controller name="clinicalData.notes" control={control}
            render={({ field }) => <Input {...field} maxLength={500} />} />
        </Field>
      </div>
    </FormSection>
  )
}
