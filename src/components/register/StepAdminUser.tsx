import { useFormContext } from 'react-hook-form';
import { InputField } from '@/components/ui/InputField';
import { PlanCard } from '@/components/ui/PlanCard';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { GradientButton } from '@/components/ui/GradientButton';

const plans = [
  { name: 'Starter', price: 490, annualPrice: 392, features: ['Até 3 usuários', 'Prontuário básico', 'Suporte chat'] },
  { name: 'Pro', price: 990, annualPrice: 792, popular: true, features: ['Usuários ilimitados', 'Todos os módulos', 'Suporte prioritário'] },
  { name: 'Enterprise', price: 2490, annualPrice: 1992, features: ['Multi-unidades', 'API integração', 'Suporte 24/7'] },
];

function maskCpf(v: string) {
  return v
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14);
}

function getPasswordStrength(pw: string) {
  const checks = [
    { label: '8+ caracteres', ok: pw.length >= 8 },
    { label: 'Letra maiúscula', ok: /[A-Z]/.test(pw) },
    { label: 'Número', ok: /\d/.test(pw) },
    { label: 'Caractere especial', ok: /[^A-Za-z0-9]/.test(pw) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const levels = ['Fraca', 'Média', 'Forte', 'Muito Forte'];
  const colors = ['bg-destructive', 'bg-[hsl(var(--axis-warning))]', 'bg-primary', 'bg-[hsl(var(--axis-success))]'];
  return { checks, score, level: score > 0 ? levels[score - 1] : '', color: score > 0 ? colors[score - 1] : '' };
}

interface StepAdminUserProps {
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function StepAdminUser({ onSubmit, isSubmitting }: StepAdminUserProps) {
  const { register, formState: { errors, isValid }, setValue, watch } = useFormContext();
  const [termos, setTermos] = useState(false);
  const selectedPlan = watch('plano') || 'Pro';
  const senha = watch('senha') || '';
  const confirmarSenha = watch('confirmarSenha') || '';
  const strength = useMemo(() => getPasswordStrength(senha), [senha]);
  const passwordsMatch = senha && confirmarSenha && senha === confirmarSenha;

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground">Conta do Administrador</h2>
      <p className="mt-1 text-sm text-muted-foreground mb-8">Será o responsável principal pelo sistema</p>

      <div className="space-y-5">
        <InputField
          label="Nome Completo"
          placeholder="Seu nome"
          error={errors.nomeCompleto?.message as string}
          shake={!!errors.nomeCompleto}
          {...register('nomeCompleto')}
          value={watch('nomeCompleto') || ''}
        />

        <InputField
          label="CPF"
          placeholder="XXX.XXX.XXX-XX"
          value={watch('cpf') || ''}
          onChange={(e) => setValue('cpf', maskCpf(e.target.value), { shouldValidate: true })}
          error={errors.cpf?.message as string}
          showValidIcon={!!watch('cpf') && watch('cpf').length === 14}
          isValid={!errors.cpf && watch('cpf')?.length === 14}
          shake={!!errors.cpf}
        />

        <InputField
          label="E-mail"
          type="email"
          placeholder="seu@email.com"
          error={errors.emailAdmin?.message as string}
          shake={!!errors.emailAdmin}
          {...register('emailAdmin')}
          value={watch('emailAdmin') || ''}
        />

        {/* Password */}
        <div>
          <InputField
            label="Senha"
            isPassword
            placeholder="Crie uma senha segura"
            error={errors.senha?.message as string}
            shake={!!errors.senha}
            {...register('senha')}
            value={watch('senha') || ''}
          />
          {senha && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn('h-1 flex-1 rounded-full transition-colors', i < strength.score ? strength.color : 'bg-border')}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mb-1">{strength.level}</p>
              <ul className="space-y-0.5">
                {strength.checks.map((c) => (
                  <li key={c.label} className={cn('text-xs flex items-center gap-1', c.ok ? 'text-[hsl(var(--axis-success))]' : 'text-muted-foreground')}>
                    {c.ok ? '✅' : '○'} {c.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <InputField
          label="Confirmar Senha"
          isPassword
          placeholder="Repita a senha"
          error={errors.confirmarSenha?.message as string}
          showValidIcon={!!confirmarSenha}
          isValid={!!passwordsMatch}
          shake={!!errors.confirmarSenha}
          {...register('confirmarSenha')}
          value={watch('confirmarSenha') || ''}
        />

        {/* Plan selection */}
        <div>
          <label className="mb-3 block text-[13px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
            Selecione seu plano
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            {plans.map((p) => (
              <PlanCard
                key={p.name}
                {...p}
                isAnnual={false}
                compact
                selected={selectedPlan === p.name}
                onSelect={() => setValue('plano', p.name)}
              />
            ))}
          </div>
        </div>

        {/* Terms */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={termos}
            onChange={(e) => setTermos(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border accent-secondary"
          />
          <span className="text-sm text-muted-foreground">
            Li e concordo com os{' '}
            <a href="#" className="text-secondary underline">Termos de Uso</a> e{' '}
            <a href="#" className="text-secondary underline">Política de Privacidade</a>
          </span>
        </label>

        <GradientButton
          type="button"
          fullWidth
          disabled={!isValid || !termos || isSubmitting}
          onClick={onSubmit}
          className="h-12 text-base mt-4"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Criando sua conta...
            </>
          ) : (
            'Criar Minha Conta'
          )}
        </GradientButton>
      </div>
    </div>
  );
}
