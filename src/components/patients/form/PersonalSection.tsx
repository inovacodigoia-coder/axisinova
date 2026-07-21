// =====================================================================
// PersonalSection — Identificação e dados pessoais
// =====================================================================
import { Controller, useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Field, FormSection } from './Field'
import {
  BRAZIL_STATES, EDUCATION_LABELS, ETHNICITY_LABELS, GENDER_LABELS, MARITAL_LABELS, STATUS_LABELS,
} from '@/types/patient.types'
import type { PatientFormValues } from '@/utils/patient.schema'
import { calculateAge, maskCPF, maskRG } from '@/utils/patient.validators'

export function PersonalSection() {
  const { control, watch, setValue } = useFormContext<PatientFormValues>()
  const birthDate = watch('birthDate')
  const age = calculateAge(birthDate)

  return (
    <FormSection title="Identificação" description="Dados pessoais e documentos">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field name="fullName" label="Nome completo" required>
          <Controller name="fullName" control={control}
            render={({ field }) => <Input {...field} placeholder="Maria da Silva" maxLength={200} />} />
        </Field>
        <Field name="socialName" label="Nome social">
          <Controller name="socialName" control={control}
            render={({ field }) => <Input {...field} placeholder="Opcional" maxLength={200} />} />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field name="cpf" label="CPF" required>
          <Controller name="cpf" control={control}
            render={({ field }) => (
              <Input {...field} placeholder="000.000.000-00" inputMode="numeric"
                onChange={e => {
                  const masked = maskCPF(e.target.value)
                  field.onChange(masked)
                  
                  // Auto lookup when CPF is complete (14 chars with mask: 000.000.000-00)
                  if (masked.length === 14) {
                    window.dispatchEvent(new CustomEvent('patient-cpf-lookup', { detail: masked }))
                  }
                }} />
            )} />
        </Field>
        <Field name="rg" label="RG">
          <Controller name="rg" control={control}
            render={({ field }) => (
              <Input {...field} placeholder="00.000.000-0"
                onChange={e => field.onChange(maskRG(e.target.value))} />
            )} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field name="rgIssuer" label="Órgão expedidor">
            <Controller name="rgIssuer" control={control}
              render={({ field }) => <Input {...field} placeholder="SSP" maxLength={20} />} />
          </Field>
          <Field name="rgState" label="UF">
            <Controller name="rgState" control={control}
              render={({ field }) => (
                <select {...field} className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                  <option value="">—</option>
                  {BRAZIL_STATES.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
                </select>
              )} />
          </Field>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Field name="birthDate" label="Data de nascimento" required hint={age !== undefined ? `${age} anos` : undefined}>
          <Controller name="birthDate" control={control}
            render={({ field }) => <Input {...field} type="date" />} />
        </Field>
        <Field name="gender" label="Gênero" required>
          <Controller name="gender" control={control}
            render={({ field }) => (
              <select {...field} className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                {Object.entries(GENDER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            )} />
        </Field>
        <Field name="ethnicity" label="Etnia">
          <Controller name="ethnicity" control={control}
            render={({ field }) => (
              <select {...field} value={field.value ?? ''} className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="">—</option>
                {Object.entries(ETHNICITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            )} />
        </Field>
        <Field name="maritalStatus" label="Estado civil">
          <Controller name="maritalStatus" control={control}
            render={({ field }) => (
              <select {...field} value={field.value ?? ''} className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="">—</option>
                {Object.entries(MARITAL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            )} />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field name="nationality" label="Nacionalidade">
          <Controller name="nationality" control={control}
            render={({ field }) => <Input {...field} placeholder="Brasileira" />} />
        </Field>
        <Field name="birthCity" label="Cidade de nascimento">
          <Controller name="birthCity" control={control}
            render={({ field }) => <Input {...field} placeholder="São Paulo" />} />
        </Field>
        <Field name="birthState" label="UF de nascimento">
          <Controller name="birthState" control={control}
            render={({ field }) => (
              <select {...field} className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="">—</option>
                {BRAZIL_STATES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            )} />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field name="education" label="Escolaridade">
          <Controller name="education" control={control}
            render={({ field }) => (
              <select {...field} value={field.value ?? ''} className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="">—</option>
                {Object.entries(EDUCATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            )} />
        </Field>
        <Field name="motherName" label="Nome da mãe">
          <Controller name="motherName" control={control}
            render={({ field }) => <Input {...field} placeholder="Nome completo" maxLength={200} />} />
        </Field>
        <Field name="fatherName" label="Nome do pai">
          <Controller name="fatherName" control={control}
            render={({ field }) => <Input {...field} placeholder="Nome completo" maxLength={200} />} />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field name="status" label="Status do paciente" required>
          <Controller name="status" control={control}
            render={({ field }) => (
              <select {...field} className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            )} />
        </Field>
      </div>
    </FormSection>
  )
}
