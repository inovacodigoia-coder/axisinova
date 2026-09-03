import { useState } from 'react';
import { PlanCard } from '@/components/ui/PlanCard';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { usePricingPlans } from '@/hooks/usePricingPlans';
import { useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { fetchPricingVisibility, loadPricingVisibility } from '@/utils/pricingVisibilityConfig';

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [pricesHidden, setPricesHidden] = useState(() => loadPricingVisibility().hidden);
  const navigate = useNavigate();
  const { plans, loading } = usePricingPlans({ onlyVisible: true });

  useEffect(() => {
    fetchPricingVisibility().then(cfg => setPricesHidden(cfg.hidden));
    const onChange = () => setPricesHidden(loadPricingVisibility().hidden);
    window.addEventListener('pricing-visibility-changed', onChange);
    return () => window.removeEventListener('pricing-visibility-changed', onChange);
  }, []);

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

        {pricesHidden ? (
          <motion.div
            className="mx-auto max-w-xl rounded-2xl border border-border bg-muted/30 p-10 text-center shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full gradient-bg">
              <MessageCircle className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Fale com nosso comercial</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Para saber mais, entre em contato com o nosso comercial e veja a melhor solução para o seu negócio.
            </p>
            <button
              onClick={() => document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' })}
              className="mt-6 rounded-xl gradient-bg px-8 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02]"
            >
              Falar com o comercial
            </button>
          </motion.div>
        ) : (
        <>
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

        {loading ? (
          <div className="grid items-center gap-6 md:grid-cols-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-[480px] rounded-2xl border border-border bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid items-center gap-6 md:grid-cols-3 md:gap-4">
            {plans.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <PlanCard
                  name={p.name}
                  price={Number(p.price_monthly)}
                  annualPrice={Number(p.price_annual)}
                  features={p.features}
                  popular={p.is_popular}
                  isAnnual={isAnnual}
                  onSelect={() => navigate('/cadastro')}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
