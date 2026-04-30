// =====================================================================
// ResponsibleSection — Aparece automaticamente para menores de 18
// =====================================================================
import { useEffect } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Field, FormSection } from './Field'
import type { PatientFormValues } from '@/utils/patient.schema'
import { isMinor, maskCPF, maskPhone } from '@/utils/patient.validators'
import { AlertCircle } from 'lucide-react'

export function ResponsibleSection() {
  const { control, watch, setValue } = useFormContext<PatientFormValues>()
  const birthDate = watch('birthDate')
  const minor = isMinor(birthDate)
  const responsible = watch('responsible')

  // Inicializa o objeto responsable se for menor e ainda não existir
  useEffect(() => {
    if (minor && !responsible) {
      setValue('responsible', {
        name: '', cpf: '', relationship: '', phone1: '',
        birthDate: '', phone2: '', email: '',
      } as any, { shouldValidate: false })
    }
  }, [minor, responsible, setValue])

  return (
    <FormSection
      title="Responsável Legal"
      description={minor ? 'Obrigatório — paciente menor de 18 anos' : 'Opcional para maiores de idade'}
    >
      {minor && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning-foreground">
          <AlertCircle className="h-4 w-4 mt-0.5 text-warning shrink-0" />
          <p>Pacientes menores de 18 anos exigem cadastro completo de um responsável legal para validade dos atendimentos.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field name="responsible.name" label="Nome do responsável" required={minor}>
          <Controller name="responsible.name" control={control}
            render={({ field }) => <Input {...field} value={field.value ?? ''} placeholder="Nome completo" maxLength={200} />} />
        </Field>
        <Field name="responsible.cpf" label="CPF do responsável" required={minor}>
          <Controller name="responsible.cpf" control={control}
            render={({ field }) => (
              <Input {...field} value={field.value ?? ''} placeholder="000.000.000-00" inputMode="numeric"
                onChange={e => field.onChange(maskCPF(e.target.value))} />
            )} />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field name="responsible.relationship" label="Parentesco" required={minor}>
          <Controller name="responsible.relationship" control={control}
            render={({ field }) => (
              <select {...field} value={field.value ?? ''} className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="">—</option>
                <option value="mother">Mãe</option>
                <option value="father">Pai</option>
                <option value="grandparent">Avô/Avó</option>
                <option value="sibling">Irmão/Irmã</option>
                <option value="legal_guardian">Tutor legal</option>
                <option value="other">Outro</option>
              </select>
            )} />
        </Field>
        <Field name="responsible.birthDate" label="Data de nascimento">
          <Controller name="responsible.birthDate" control={control}
            render={({ field }) => <Input {...field} value={field.value ?? ''} type="date" />} />
        </Field>
        <Field name="responsible.email" label="E-mail">
          <Controller name="responsible.email" control={control}
            render={({ field }) => <Input {...field} value={field.value ?? ''} type="email" />} />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field name="responsible.phone1" label="Telefone 1" required={minor}>
          <Controller name="responsible.phone1" control={control}
            render={({ field }) => (
              <Input {...field} value={field.value ?? ''} placeholder="(11) 99999-9999" inputMode="tel"
                onChange={e => field.onChange(maskPhone(e.target.value))} />
            )} />
        </Field>
        <Field name="responsible.phone2" label="Telefone 2">
          <Controller name="responsible.phone2" control={control}
            render={({ field }) => (
              <Input {...field} value={field.value ?? ''} placeholder="(11) 0000-0000" inputMode="tel"
                onChange={e => field.onChange(maskPhone(e.target.value))} />
            )} />
        </Field>
      </div>
    </FormSection>
  )
}
