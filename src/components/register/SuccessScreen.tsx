import { motion } from 'framer-motion';
import { GradientButton } from '@/components/ui/GradientButton';
import { OutlineButton } from '@/components/ui/OutlineButton';

interface SuccessScreenProps {
  companyName: string;
  cnpj: string;
  plan: string;
  email: string;
}

export function SuccessScreen({ companyName, cnpj, plan, email }: SuccessScreenProps) {
  return (
    <motion.div
      className="flex flex-col items-center text-center py-8"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated check */}
      <svg viewBox="0 0 100 100" className="h-24 w-24 mb-6">
        <circle
          cx="50" cy="50" r="45"
          fill="none"
          stroke="url(#grad)"
          strokeWidth="3"
          strokeDasharray="283"
          strokeDashoffset="0"
          style={{ animation: 'circle-draw 0.8s ease-out forwards' }}
        />
        <path
          d="M30 50 L45 65 L70 35"
          fill="none"
          stroke="url(#grad)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="100"
          strokeDashoffset="0"
          style={{ animation: 'check-draw 0.5s ease-out 0.5s forwards' }}
        />
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(191, 100%, 50%)" />
            <stop offset="100%" stopColor="hsl(262, 92%, 56%)" />
          </linearGradient>
        </defs>
      </svg>

      <h2 className="text-3xl font-bold text-foreground">Conta criada com sucesso! 🎉</h2>
      <p className="mt-3 text-base text-muted-foreground max-w-md">
        Enviamos um e-mail de ativação para <strong className="text-foreground">{email}</strong>. Verifique sua caixa de entrada.
      </p>

      <div className="mt-8 w-full max-w-sm rounded-2xl bg-muted p-6 text-left">
        <h3 className="text-sm font-semibold text-foreground mb-3">Resumo</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Empresa</span>
            <span className="font-medium text-foreground">{companyName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">CNPJ</span>
            <span className="font-medium text-foreground">{cnpj}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Plano</span>
            <span className="font-medium text-foreground">{plan}</span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <GradientButton fullWidth>Acessar o Sistema</GradientButton>
        <OutlineButton fullWidth variant="purple">Reenviar E-mail</OutlineButton>
      </div>
    </motion.div>
  );
}
