// =====================================================================
// NotesSection — Origem, observações, alertas internos e tags
// =====================================================================
import { useState } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, FormSection } from './Field'
import type { PatientFormValues } from '@/utils/patient.schema'
import { Tag, X, Bell } from 'lucide-react'

const ALERT_COLORS = [
  { value: 'red', label: 'Crítico (vermelho)', bg: 'bg-destructive', text: 'text-destructive-foreground' },
  { value: 'yellow', label: 'Atenção (amarelo)', bg: 'bg-warning', text: 'text-warning-foreground' },
  { value: 'blue', label: 'Informativo (azul)', bg: 'bg-primary', text: 'text-primary-foreground' },
] as const

export function NotesSection() {
  const { control, watch, setValue } = useFormContext<PatientFormValues>()
  const tags = watch('tags') || []
  const alert = watch('internalAlerts')
  const [tagInput, setTagInput] = useState('')

  const addTag = () => {
    const v = tagInput.trim()
    if (!v) return
    if (tags.includes(v)) { setTagInput(''); return }
    setValue('tags', [...tags, v], { shouldDirty: true })
    setTagInput('')
  }
  const removeTag = (t: string) => setValue('tags', tags.filter(x => x !== t), { shouldDirty: true })

  return (
    <FormSection title="Origem e Observações" description="Informações administrativas e tags">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field name="referralSource" label="Como conheceu a clínica?">
          <Controller name="referralSource" control={control}
            render={({ field }) => (
              <select {...field} className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="">—</option>
                <option value="indication">Indicação</option>
                <option value="convenio">Convênio</option>
                <option value="google">Google / Internet</option>
                <option value="social">Redes sociais</option>
                <option value="walk_in">Passou em frente</option>
                <option value="other">Outro</option>
              </select>
            )} />
        </Field>
        <Field name="referralBy" label="Indicado por (nome)">
          <Controller name="referralBy" control={control}
            render={({ field }) => <Input {...field} placeholder="Quem indicou?" />} />
        </Field>
      </div>

      <Field name="generalNotes" label="Observações gerais">
        <Controller name="generalNotes" control={control}
          render={({ field }) => <Textarea {...field} rows={3} maxLength={2000} placeholder="Anotações gerais sobre o paciente..." />} />
      </Field>

      <Field name="financialNotes" label="Observações financeiras">
        <Controller name="financialNotes" control={control}
          render={({ field }) => <Textarea {...field} rows={2} maxLength={1000} placeholder="Particularidades de cobrança, descontos, acordos..." />} />
      </Field>

      {/* Alerta interno */}
      <div className="space-y-2 pt-3 border-t border-border">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Bell className="h-4 w-4 text-warning" /> Alerta interno
        </h3>
        <p className="text-xs text-muted-foreground">Aparecerá em destaque para a recepção e médico ao atender o paciente.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <Input value={alert?.message || ''}
              placeholder="Ex: Devedor — bloquear novos agendamentos"
              onChange={e => setValue('internalAlerts',
                e.target.value ? { message: e.target.value, color: alert?.color || 'yellow' } : undefined,
                { shouldDirty: true })} />
          </div>
          <div className="flex flex-wrap gap-2">
            {ALERT_COLORS.map(c => (
              <button key={c.value} type="button"
                onClick={() => setValue('internalAlerts',
                  { message: alert?.message || '', color: c.value }, { shouldDirty: true })}
                className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold border ${
                  alert?.color === c.value
                    ? `${c.bg} ${c.text} border-transparent`
                    : 'bg-background text-foreground border-input hover:bg-muted'
                }`}>
                {c.label.split(' ')[0]}
              </button>
            ))}
            {alert && (
              <button type="button" onClick={() => setValue('internalAlerts', undefined, { shouldDirty: true })}
                className="inline-flex items-center rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-destructive">
                <X className="h-3.5 w-3.5" /> Limpar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-2 pt-3 border-t border-border">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" /> Tags
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {tags.map(t => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
              {t}
              <button type="button" onClick={() => removeTag(t)} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {tags.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma tag</span>}
        </div>
        <div className="flex gap-2">
          <Input value={tagInput} onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
            placeholder="Adicionar tag e pressionar Enter" maxLength={40} />
          <button type="button" onClick={addTag}
            className="rounded-lg border border-input bg-background px-3 text-sm font-semibold hover:bg-muted">
            Adicionar
          </button>
        </div>
      </div>
    </FormSection>
  )
}
