import { useFormContext } from 'react-hook-form';
import { InputField } from '@/components/ui/InputField';
import { SelectField } from '@/components/ui/SelectField';

const segmentos = [
  { value: 'clinica_medica', label: 'Clínica Médica' },
  { value: 'laboratorio', label: 'Laboratório' },
  { value: 'clinica_odonto', label: 'Clínica Odontológica' },
  { value: 'consultorio', label: 'Consultório Particular' },
  { value: 'hospital', label: 'Hospital/UPA' },
  { value: 'clinica_imagem', label: 'Clínica de Imagem' },
  { value: 'outro', label: 'Outro' },
];

function maskCnpj(v: string) {
  return v
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .slice(0, 18);
}

function maskPhone(v: string) {
  return v
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 15);
}

export function StepCompanyData() {
  const { register, formState: { errors }, setValue, watch } = useFormContext();

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground">Dados da Empresa</h2>
      <p className="mt-1 text-sm text-muted-foreground mb-8">Informações do estabelecimento de saúde</p>

      <div className="space-y-5">
        <InputField
          label="Razão Social"
          placeholder="Nome jurídico completo"
          error={errors.razaoSocial?.message as string}
          shake={!!errors.razaoSocial}
          {...register('razaoSocial')}
        />
        <InputField
          label="Nome Fantasia"
          placeholder="Como é conhecida no mercado"
          error={errors.nomeFantasia?.message as string}
          shake={!!errors.nomeFantasia}
          {...register('nomeFantasia')}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <InputField
            label="CNPJ"
            placeholder="XX.XXX.XXX/XXXX-XX"
            value={watch('cnpj') || ''}
            onChange={(e) => setValue('cnpj', maskCnpj(e.target.value), { shouldValidate: true })}
            error={errors.cnpj?.message as string}
            showValidIcon={!!watch('cnpj') && watch('cnpj').length === 18}
            isValid={!errors.cnpj && watch('cnpj')?.length === 18}
            shake={!!errors.cnpj}
          />
          <SelectField
            label="Segmento"
            options={segmentos}
            placeholder="Selecione o segmento"
            error={errors.segmento?.message as string}
            shake={!!errors.segmento}
            {...register('segmento')}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <InputField
            label="Telefone Comercial"
            placeholder="(XX) XXXXX-XXXX"
            value={watch('telefone') || ''}
            onChange={(e) => setValue('telefone', maskPhone(e.target.value), { shouldValidate: true })}
            error={errors.telefone?.message as string}
            shake={!!errors.telefone}
          />
          <InputField
            label="E-mail Comercial"
            type="email"
            placeholder="email@suaclinica.com.br"
            error={errors.emailComercial?.message as string}
            shake={!!errors.emailComercial}
            {...register('emailComercial')}
          />
        </div>
        <InputField
          label="Website"
          optional
          placeholder="https://suaclinica.com.br"
          {...register('website')}
        />
      </div>
    </div>
  );
}
