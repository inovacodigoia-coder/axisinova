import { useState } from 'react';
import { PlanCard } from '@/components/ui/PlanCard';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const plans = [
  {
    name: 'Starter',
    price: 490,
    annualPrice: 392,
    features: [
      'Até 3 usuários simultâneos',
      '1 médico cadastrado',
      'Agendamento e recepção',
      'Prontuário básico',
      'Relatórios essenciais',
      'Suporte via chat (horário comercial)',
      'Armazenamento: 10 GB',
    ],
  },
  {
    name: 'Pro',
    price: 990,
    annualPrice: 792,
    popular: true,
    features: [
      'Usuários ilimitados',
      'Até 15 médicos',
      'Todos os módulos inclusos',
      'BI com dashboards em tempo real',
      'Digitalização de guias ilimitada',
      'Integração com convênios',
      'Suporte prioritário (chat + WhatsApp)',
      'Armazenamento: 100 GB',
    ],
  },
  {
    name: 'Enterprise',
    price: 2490,
    annualPrice: 1992,
    features: [
      'Médicos ilimitados',
      'Multi-unidades (até 5 CNPJs)',
      'Tudo do Pro +',
      'API de integração',
      'Onboarding dedicado com consultor',
      'SLA de uptime 99,9%',
      'Treinamento presencial/remoto incluso',
      'Armazenamento: 1 TB',
      'Suporte 24/7 com gerente de conta',
    ],
  },
];

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);
  const navigate = useNavigate();

  return (
    <section id="pricing" className="bg-white py-20 md:py-24">
      <div className="mx-auto max-w-[1200px] px-4 md:px-6">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold text-foreground md:text-4xl" style={{ textWrap: 'balance' }}>
            Invista na eficiência da sua operação
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Planos desenhados para cada porte de clínica. Sem surpresas, sem letras miúdas.
          </p>
        </motion.div>

        {/* Toggle */}
        <div className="mb-10 flex items-center justify-center gap-3">
          <span className={`text-sm font-medium ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>Mensal</span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className={`relative h-7 w-14 rounded-full transition-colors duration-300 ${isAnnual ? 'gradient-bg' : 'bg-border'}`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-300 ${isAnnual ? 'translate-x-7' : 'translate-x-0.5'}`}
            />
          </button>
          <span className={`text-sm font-medium ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
            Anual
          </span>
          {isAnnual && (
            <span className="rounded-full bg-[hsl(var(--axis-success))] px-2.5 py-0.5 text-xs font-bold text-white">
              Economize 20%
            </span>
          )}
        </div>

        <div className="grid items-center gap-6 md:grid-cols-3 md:gap-4">
          {plans.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <PlanCard {...p} isAnnual={isAnnual} onSelect={() => navigate('/cadastro')} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
