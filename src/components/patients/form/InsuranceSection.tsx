// =====================================================================
// InsuranceSection — Convênios múltiplos do paciente
// =====================================================================
import { useEffect, useState } from 'react'
import { Controller, useFieldArray, useFormContext } from 'react-hook-form'
import { Plus, Trash2, ShieldCheck } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Field, FormSection } from './Field'
import type { PatientFormValues } from '@/utils/patient.schema'
import { maskCPF, maskMonthYear, maskCNS } from '@/utils/patient.validators'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { resolveCompanyId } from '@/utils/companyId'

interface ConvenioOption { id: string; name: string }

export function InsuranceSection() {
  const { control } = useFormContext<PatientFormValues>()
  const { user } = useAuth()
  const { fields, append, remove } = useFieldArray({ control, name: 'convenios' })
  const [options, setOptions] = useState<ConvenioOption[]>([])

  useEffect(() => {
    const cid = resolveCompanyId(user?.companyId)
    if (!cid) return
    supabase.from('convenios').select('id,name')
      .eq('company_id', cid).eq('is_active', true)
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error('[InsuranceSection] convenios error:', error)
        setOptions((data || []).map(c => ({ id: c.id, name: c.name })))
      })
  }, [user?.companyId])

  return (
    <FormSection title="Convênios" description="Cadastre todos os planos de saúde do paciente">
      {fields.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-3">Nenhum convênio adicionado</p>
        </div>
      )}

      <div className="space-y-4">
        {fields.map((f, i) => (
          <div key={f.id} className="rounded-xl border border-border p-4 space-y-3 bg-background/60">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Convênio {i + 1}</h3>
              <button type="button" onClick={() => remove(i)}
                className="text-destructive hover:bg-destructive/10 rounded-md p-1.5">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field name={`convenios.${i}.convenioId`} label="Convênio" required>
                <Controller name={`convenios.${i}.convenioId`} control={control}
                  render={({ field }) => (
                    <select {...field}
                      onChange={e => {
                        const opt = options.find(o => o.id === e.target.value)
                        field.onChange(e.target.value)
                        // also patch convenioName via DOM? Use react-hook-form setValue instead — handled below
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                      <option value="">Selecione…</option>
                      {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  )} />
              </Field>
              <Field name={`convenios.${i}.planName`} label="Plano">
                <Controller name={`convenios.${i}.planName`} control={control}
                  render={({ field }) => <Input {...field} placeholder="Ex: Pleno, Premium" />} />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field name={`convenios.${i}.cardNumber`} label="Número do cartão" required>
                <Controller name={`convenios.${i}.cardNumber`} control={control}
                  render={({ field }) => <Input {...field} placeholder="0000 0000 0000 0000" inputMode="numeric" />} />
              </Field>
              <Field name={`convenios.${i}.cardExpiry`} label="Validade (MM/AAAA)">
                <Controller name={`convenios.${i}.cardExpiry`} control={control}
                  render={({ field }) => (
                    <Input {...field} placeholder="MM/AAAA" inputMode="numeric"
                      onChange={e => field.onChange(maskMonthYear(e.target.value))} />
                  )} />
              </Field>
              <Field name={`convenios.${i}.nationalHealthCard`} label="CNS (Cartão Nacional Saúde)">
                <Controller name={`convenios.${i}.nationalHealthCard`} control={control}
                  render={({ field }) => (
                    <Input {...field} placeholder="000 0000 0000 0000" inputMode="numeric"
                      onChange={e => field.onChange(maskCNS(e.target.value))} />
                  )} />
              </Field>
            </div>

            <div className="flex items-center gap-2">
              <Controller name={`convenios.${i}.isHolder`} control={control}
                render={({ field }) => (
                  <input id={`isHolder-${i}`} type="checkbox" checked={!!field.value}
                    onChange={e => field.onChange(e.target.checked)}
                    className="h-4 w-4 rounded border-input text-primary" />
                )} />
              <label htmlFor={`isHolder-${i}`} className="text-xs text-foreground">É o titular do plano</label>
            </div>

            <NonHolderFields index={i} />

            <ConvenioNameSync index={i} options={options} />
          </div>
        ))}
      </div>

      <button type="button"
        onClick={() => append({ convenioId: '', convenioName: '', cardNumber: '', cardExpiry: '', planName: '', isHolder: true, holderName: '', holderCPF: '', nationalHealthCard: '' })}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-input bg-background px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted">
        <Plus className="h-4 w-4" /> Adicionar convênio
      </button>
    </FormSection>
  )
}

function NonHolderFields({ index }: { index: number }) {
  const { control, watch } = useFormContext<PatientFormValues>()
  const isHolder = watch(`convenios.${index}.isHolder`)
  if (isHolder) return null
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border">
      <Field name={`convenios.${index}.holderName`} label="Nome do titular">
        <Controller name={`convenios.${index}.holderName`} control={control}
          render={({ field }) => <Input {...field} placeholder="Nome completo" />} />
      </Field>
      <Field name={`convenios.${index}.holderCPF`} label="CPF do titular">
        <Controller name={`convenios.${index}.holderCPF`} control={control}
          render={({ field }) => (
            <Input {...field} placeholder="000.000.000-00"
              onChange={e => field.onChange(maskCPF(e.target.value))} />
          )} />
      </Field>
    </div>
  )
}

// Sincroniza convenioName quando convenioId muda
function ConvenioNameSync({ index, options }: { index: number; options: ConvenioOption[] }) {
  const { watch, setValue } = useFormContext<PatientFormValues>()
  const id = watch(`convenios.${index}.convenioId`)
  useEffect(() => {
    const opt = options.find(o => o.id === id)
    if (opt) setValue(`convenios.${index}.convenioName`, opt.name, { shouldValidate: false })
  }, [id, options, index, setValue])
  return null
}
