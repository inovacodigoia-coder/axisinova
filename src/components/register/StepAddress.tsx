import { useFormContext } from 'react-hook-form';
import { InputField } from '@/components/ui/InputField';
import { SelectField } from '@/components/ui/SelectField';
import { useCepLookup } from '@/hooks/useCepLookup';
import { Loader2, Search } from 'lucide-react';
import { useEffect } from 'react';

const estados = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
].map((s) => ({ value: s, label: s }));

function maskCep(v: string) {
  return v.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9);
}

export function StepAddress() {
  const { register, formState: { errors }, setValue, watch } = useFormContext();
  const { lookup, loading, error: cepError } = useCepLookup();
  const cepValue = watch('cep') || '';
  const cidadeLocked = !!watch('cidade');

  const handleCepSearch = async () => {
    const result = await lookup(cepValue);
    if (result) {
      setValue('logradouro', result.logradouro, { shouldValidate: true });
      setValue('bairro', result.bairro, { shouldValidate: true });
      setValue('cidade', result.localidade, { shouldValidate: true });
      setValue('estado', result.uf, { shouldValidate: true });
      if (result.complemento) setValue('complemento', result.complemento);
    }
  };

  // Auto-search when 8 digits typed
  const cleanCep = cepValue.replace(/\D/g, '');
  useEffect(() => {
    if (cleanCep.length === 8 && !watch('logradouro')) {
      handleCepSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanCep]);

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground">Localização</h2>
      <p className="mt-1 text-sm text-muted-foreground mb-8">Endereço principal da empresa</p>

      <div className="space-y-5">
        <div className="relative">
          <InputField
            label="CEP"
            placeholder="XXXXX-XXX"
            value={cepValue}
            onChange={(e) => setValue('cep', maskCep(e.target.value), { shouldValidate: true })}
            error={(errors.cep?.message as string) || cepError || undefined}
            shake={!!errors.cep}
          />
          <button
            type="button"
            onClick={handleCepSearch}
            disabled={loading}
            className="absolute right-3 top-[34px] text-muted-foreground hover:text-primary transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </button>
        </div>

        <InputField
          label="Logradouro"
          placeholder="Rua, Avenida..."
          error={errors.logradouro?.message as string}
          shake={!!errors.logradouro}
          {...register('logradouro')}
          value={watch('logradouro') || ''}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <InputField
            label="Número"
            placeholder="Nº"
            error={errors.numero?.message as string}
            shake={!!errors.numero}
            {...register('numero')}
            value={watch('numero') || ''}
          />
          <InputField
            label="Complemento"
            optional
            placeholder="Sala, andar..."
            {...register('complemento')}
            value={watch('complemento') || ''}
          />
        </div>

        <InputField
          label="Bairro"
          error={errors.bairro?.message as string}
          shake={!!errors.bairro}
          {...register('bairro')}
          value={watch('bairro') || ''}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <InputField
            label="Cidade"
            locked={cidadeLocked}
            error={errors.cidade?.message as string}
            {...register('cidade')}
            value={watch('cidade') || ''}
          />
          <SelectField
            label="Estado"
            options={estados}
            placeholder="UF"
            error={errors.estado?.message as string}
            shake={!!errors.estado}
            {...register('estado')}
            value={watch('estado') || ''}
          />
        </div>
      </div>
    </div>
  );
}
