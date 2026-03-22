import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ProgressBar } from '@/components/register/ProgressBar';
import { StepCompanyData } from '@/components/register/StepCompanyData';
import { StepAddress } from '@/components/register/StepAddress';
import { StepAdminUser } from '@/components/register/StepAdminUser';
import { SuccessScreen } from '@/components/register/SuccessScreen';
import { GradientButton } from '@/components/ui/GradientButton';
import { OutlineButton } from '@/components/ui/OutlineButton';
import { ArrowLeft, ArrowRight, Shield, Zap, HeadphonesIcon, BarChart3 } from 'lucide-react';

function validateCnpj(cnpj: string) {
  const d = cnpj.replace(/\D/g, '');
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += +d[i] * (i < 4 ? 5 - i : 13 - i);
  let r = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (r !== +d[12]) return false;
  sum = 0;
  for (let i = 0; i < 13; i++) sum += +d[i] * (i < 5 ? 6 - i : 14 - i);
  r = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return r === +d[13];
}

function validateCpf(cpf: string) {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += +d[i] * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10) r = 0;
  if (r !== +d[9]) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += +d[i] * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10) r = 0;
  return r === +d[10];
}

const step1Schema = z.object({
  razaoSocial: z.string().min(3, 'Razão social é obrigatória').max(200),
  nomeFantasia: z.string().min(2, 'Nome fantasia é obrigatório').max(200),
  cnpj: z.string().length(18, 'CNPJ inválido').refine((v) => validateCnpj(v), 'CNPJ inválido'),
  segmento: z.string().min(1, 'Selecione o segmento'),
  telefone: z.string().min(14, 'Telefone inválido'),
  emailComercial: z.string().email('E-mail inválido'),
  website: z.string().optional(),
});

const step2Schema = z.object({
  cep: z.string().min(9, 'CEP inválido'),
  logradouro: z.string().min(3, 'Logradouro obrigatório'),
  numero: z.string().min(1, 'Número obrigatório'),
  complemento: z.string().optional(),
  bairro: z.string().min(2, 'Bairro obrigatório'),
  cidade: z.string().min(2, 'Cidade obrigatória'),
  estado: z.string().min(2, 'Estado obrigatório'),
});

const step3Schema = z.object({
  nomeCompleto: z.string().min(3, 'Nome é obrigatório').max(150),
  cpf: z.string().length(14, 'CPF inválido').refine((v) => validateCpf(v), 'CPF inválido'),
  emailAdmin: z.string().email('E-mail inválido'),
  senha: z.string().min(8, 'Mínimo 8 caracteres').regex(/[A-Z]/, 'Precisa de maiúscula').regex(/\d/, 'Precisa de número').regex(/[^A-Za-z0-9]/, 'Precisa de caractere especial'),
  confirmarSenha: z.string(),
  plano: z.string().default('Pro'),
}).refine((d) => d.senha === d.confirmarSenha, { message: 'Senhas não coincidem', path: ['confirmarSenha'] });

const fullSchema = step1Schema.merge(step2Schema).and(step3Schema);
type FormData = z.infer<typeof fullSchema>;

const schemas = [step1Schema, step2Schema, step3Schema];
const stepFields: (keyof FormData)[][] = [
  ['razaoSocial', 'nomeFantasia', 'cnpj', 'segmento', 'telefone', 'emailComercial'],
  ['cep', 'logradouro', 'numero', 'bairro', 'cidade', 'estado'],
  ['nomeCompleto', 'cpf', 'emailAdmin', 'senha', 'confirmarSenha'],
];

const benefits = [
  { icon: Zap, text: 'Setup em menos de 10 minutos' },
  { icon: Shield, text: 'Dados protegidos com criptografia' },
  { icon: HeadphonesIcon, text: 'Suporte humano desde o dia 1' },
  { icon: BarChart3, text: 'BI e relatórios inclusos' },
];

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [completed, setCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direction, setDirection] = useState(1);

  const methods = useForm<FormData>({
    resolver: zodResolver(schemas[step - 1] as any),
    mode: 'onChange',
    defaultValues: { plano: 'Pro' },
  });

  const handleNext = async () => {
    const fields = stepFields[step - 1];
    const valid = await methods.trigger(fields as any);
    if (!valid) return;
    if (step < 3) {
      setDirection(1);
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setDirection(-1);
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    const fields = stepFields[2];
    const valid = await methods.trigger(fields as any);
    if (!valid) return;
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 2000));
    setIsSubmitting(false);
    setCompleted(true);
  };

  if (completed) {
    const vals = methods.getValues();
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <div className="w-full max-w-lg">
          <SuccessScreen
            companyName={vals.nomeFantasia}
            cnpj={vals.cnpj}
            plan={vals.plano || 'Pro'}
            email={vals.emailAdmin}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left sidebar */}
      <div className="hidden lg:flex lg:w-[40%] gradient-bg relative overflow-hidden flex-col justify-between p-10 text-white">
        <div>
          <Link to="/" className="text-2xl font-bold">
            <span className="text-white">Axis</span>
            <span className="text-white/80">Inova</span>
          </Link>
          <h2 className="mt-12 text-3xl font-bold leading-tight">
            Transforme a gestão da sua clínica em minutos
          </h2>
          <ul className="mt-8 space-y-4">
            {benefits.map((b) => (
              <li key={b.text} className="flex items-center gap-3 text-white/90">
                <b.icon className="h-5 w-5" />
                <span className="text-sm">{b.text}</span>
              </li>
            ))}
          </ul>
        </div>
        {/* Decorative step number */}
        <span className="absolute bottom-8 right-8 text-[200px] font-extrabold leading-none text-white/[0.07] select-none">
          {step}
        </span>
      </div>

      {/* Right form */}
      <div className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 p-4 border-b border-border">
          <Link to="/" className="text-lg font-bold">
            <span className="text-foreground">Axis</span>
            <span className="gradient-text">Inova</span>
          </Link>
        </div>

        <div className="mx-auto max-w-xl p-6 md:p-10">
          <ProgressBar currentStep={step} steps={['Empresa', 'Endereço', 'Administrador']} />

          <FormProvider {...methods}>
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -40 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                {step === 1 && <StepCompanyData />}
                {step === 2 && <StepAddress />}
                {step === 3 && <StepAdminUser onSubmit={handleSubmit} isSubmitting={isSubmitting} />}
              </motion.div>
            </AnimatePresence>
          </FormProvider>

          {/* Navigation buttons (steps 1 & 2) */}
          {step < 3 && (
            <div className="mt-8 flex justify-between">
              {step > 1 ? (
                <OutlineButton variant="gray" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </OutlineButton>
              ) : (
                <div />
              )}
              <GradientButton onClick={handleNext}>
                Próximo <ArrowRight className="h-4 w-4" />
              </GradientButton>
            </div>
          )}
          {step === 3 && step > 1 && (
            <div className="mt-4">
              <OutlineButton variant="gray" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" /> Voltar
              </OutlineButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
