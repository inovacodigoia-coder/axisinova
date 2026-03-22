import { Star } from 'lucide-react';
import { motion } from 'framer-motion';

const testimonials = [
  {
    name: 'Dra. Beatriz Monteiro',
    role: 'Cardiologista · São Paulo, SP',
    initials: 'BM',
    text: 'Antes do Axis Inova, perdíamos horas com papelada e glosas. Hoje o faturamento TISS roda praticamente sozinho e recuperamos mais de R$ 40 mil por mês em guias que antes eram glosadas.',
  },
  {
    name: 'Dr. Rafael Andrade',
    role: 'Ortopedista · Belo Horizonte, MG',
    initials: 'RA',
    text: 'A integração entre agendamento, prontuário e faturamento eliminou retrabalho. Minha equipe de recepção ficou 3x mais produtiva e os pacientes elogiam o totem de check-in.',
  },
  {
    name: 'Dra. Camila Ferreira',
    role: 'Diretora Clínica · Curitiba, PR',
    initials: 'CF',
    text: 'O BI em tempo real mudou a forma como tomamos decisões. Consigo ver a performance de cada médico, taxa de faltosos e faturamento por convênio — tudo em um painel só.',
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="bg-muted py-20 md:py-24">
      <div className="mx-auto max-w-[1200px] px-4 md:px-6">
        <motion.div
          className="mb-14 text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">
            Quem usa, recomenda
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Veja como profissionais de saúde estão transformando suas operações.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              className="relative rounded-2xl border border-border bg-card p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_hsl(var(--axis-secondary)/0.1)]"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              {/* Decorative quote */}
              <span className="absolute top-4 right-6 text-6xl font-serif leading-none gradient-text opacity-20 select-none">"</span>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full gradient-bg text-lg font-bold text-white">
                  {t.initials}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{t.name}</p>
                  <p className="text-sm text-muted-foreground">{t.role}</p>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground mb-4">"{t.text}"</p>

              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-[#F6AD55] text-[#F6AD55]" />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
