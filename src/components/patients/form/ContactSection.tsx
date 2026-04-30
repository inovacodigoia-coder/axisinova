// =====================================================================
// ContactSection — Telefones, e-mail, endereço (com ViaCEP) e profissão
// =====================================================================
import { useState } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Field, FormSection } from './Field'
import { BRAZIL_STATES } from '@/types/patient.types'
import type { PatientFormValues } from '@/utils/patient.schema'
import { detectPhoneType, fetchCEP, maskCEP, maskPhone } from '@/utils/patient.validators'
import { Loader2 } from 'lucide-react'

export function ContactSection() {
  const { control, setValue, getValues } = useFormContext<PatientFormValues>()
  const [cepLoading, setCepLoading] = useState(false)

  const lookupCep = async (cep: string) => {
    if (cep.replace(/\D/g, '').length !== 8) return
    setCepLoading(true)
    const data = await fetchCEP(cep)
    setCepLoading(false)
    if (!data) return
    setValue('address.street', data.logradouro || '', { shouldValidate: true })
    setValue('address.neighborhood', data.bairro || '', { shouldValidate: true })
    setValue('address.city', data.localidade || '', { shouldValidate: true })
    setValue('address.state', data.uf || '', { shouldValidate: true })
    setValue('address.ibgeCode', data.ibge || '', { shouldValidate: false })
  }

  return (
    <FormSection title="Contato e Endereço" description="Telefones, e-mails e localização">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field name="phone1" label="Telefone principal" required>
          <Controller name="phone1" control={control}
            render={({ field }) => (
              <Input {...field} placeholder="(11) 99999-9999" inputMode="tel"
                onChange={e => {
                  const masked = maskPhone(e.target.value)
                  field.onChange(masked)
                  setValue('phone1Type', detectPhoneType(masked))
                }} />
            )} />
        </Field>
        <Field name="phone2" label="Telefone secundário">
          <Controller name="phone2" control={control}
            render={({ field }) => (
              <Input {...field} placeholder="(11) 0000-0000" inputMode="tel"
                onChange={e => {
                  const masked = maskPhone(e.target.value)
                  field.onChange(masked)
                  if (masked.replace(/\D/g, '').length >= 10) setValue('phone2Type', detectPhoneType(masked))
                }} />
            )} />
        </Field>
        <Field name="phone3" label="WhatsApp / Recado">
          <Controller name="phone3" control={control}
            render={({ field }) => (
              <Input {...field} placeholder="(11) 00000-0000" inputMode="tel"
                onChange={e => field.onChange(maskPhone(e.target.value))} />
            )} />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field name="email" label="E-mail principal">
          <Controller name="email" control={control}
            render={({ field }) => <Input {...field} type="email" placeholder="paciente@email.com" />} />
        </Field>
        <Field name="emailSecondary" label="E-mail secundário">
          <Controller name="emailSecondary" control={control}
            render={({ field }) => <Input {...field} type="email" placeholder="alternativo@email.com" />} />
        </Field>
      </div>

      {/* Endereço */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Field name="address.cep" label="CEP" hint={cepLoading ? 'Buscando...' : 'Auto-preenche endereço'}>
          <Controller name="address.cep" control={control}
            render={({ field }) => (
              <div className="relative">
                <Input {...field} placeholder="00000-000" inputMode="numeric"
                  onChange={e => {
                    const v = maskCEP(e.target.value)
                    field.onChange(v)
                    if (v.replace(/\D/g, '').length === 8) lookupCep(v)
                  }} />
                {cepLoading && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
            )} />
        </Field>
        <Field name="address.street" label="Logradouro" className="md:col-span-2">
          <Controller name="address.street" control={control}
            render={({ field }) => <Input {...field} placeholder="Rua / Avenida" />} />
        </Field>
        <Field name="address.number" label="Número">
          <Controller name="address.number" control={control}
            render={({ field }) => <Input {...field} placeholder="123" />} />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Field name="address.complement" label="Complemento">
          <Controller name="address.complement" control={control}
            render={({ field }) => <Input {...field} placeholder="Apto / Bloco" />} />
        </Field>
        <Field name="address.neighborhood" label="Bairro">
          <Controller name="address.neighborhood" control={control}
            render={({ field }) => <Input {...field} />} />
        </Field>
        <Field name="address.city" label="Cidade">
          <Controller name="address.city" control={control}
            render={({ field }) => <Input {...field} />} />
        </Field>
        <Field name="address.state" label="UF">
          <Controller name="address.state" control={control}
            render={({ field }) => (
              <select {...field} className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="">—</option>
                {BRAZIL_STATES.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
              </select>
            )} />
        </Field>
      </div>

      {/* Profissão */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border">
        <Field name="occupation" label="Profissão">
          <Controller name="occupation" control={control}
            render={({ field }) => <Input {...field} placeholder="Ex: Professor" />} />
        </Field>
        <Field name="employer" label="Empregador / Empresa">
          <Controller name="employer" control={control}
            render={({ field }) => <Input {...field} />} />
        </Field>
        <Field name="workPhone" label="Telefone comercial">
          <Controller name="workPhone" control={control}
            render={({ field }) => (
              <Input {...field} placeholder="(11) 0000-0000"
                onChange={e => field.onChange(maskPhone(e.target.value))} />
            )} />
        </Field>
      </div>
    </FormSection>
  )
}
