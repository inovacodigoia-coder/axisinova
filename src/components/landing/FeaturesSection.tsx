import { Calendar, Monitor, ClipboardList, CreditCard, FileText, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  {
    icon: Calendar,
    title: 'Agendamento Inteligente',
    desc: 'Agenda multi-profissional com detecção automática de primeira vez ou retorno, confirmação por WhatsApp/SMS e controle de faltosos.',
  },
  {
    icon: Monitor,
    title: 'Totem e Recepção Digital',
    desc: 'Check-in autônomo pelo totem, fila digital com painel de chamada para TV e painel exclusivo do médico.',
  },
  {
    icon: ClipboardList,
    title: 'Prontuário Eletrônico',
    desc: 'Linha do tempo completa do paciente, inserção de dados clínicos, histórico de exames e prescrições integradas.',
  },
  {
    icon: CreditCard,
    title: 'Faturamento TISS/TUSS',
    desc: 'Gestão completa de guias, controle de glosas, ciclo de correção recepção↔faturamento e lotes de cobrança.',
  },
  {
    icon: FileText,
    title: 'Digitalização de Guias',
    desc: 'Upload e indexação de documentos por atendimento, com regras configuráveis por convênio para reduzir erros.',
  },
  {
    icon: BarChart3,
    title: 'BI Estratégico em Tempo Real',
    desc: 'Dashboard executivo com indicadores de produção, faturamento, faltosos, convênios e performance por médico.',
  },
];

const subFeatures = [
  { title: 'Gestão Laboratorial', desc: 'Módulo completo com Soroteca, Interfaceamento e Laudos.' },
  { title: 'Gestão Hospitalar', desc: 'Controle de leitos, Farmácia e Prontuário de Alta Complexidade.' },
  { title: 'Conformidade LGPD', desc: 'Dados criptografados e controle de acesso rigoroso.' },
  { title: 'Multi-unidades', desc: 'Gerencie múltiplas filiais em um único painel central.' },
  { title: 'API Aberta', desc: 'Integre com outros softwares e laboratórios parceiros.' },
  { title: 'Suporte VIP', desc: 'Atendimento humanizado em menos de 5 minutos por chat.' },
];

export function FeaturesSection() {
  return (
    <section id="features" className="bg-muted py-20 md:py-24">
      <div className="mx-auto max-w-[1200px] px-4 md:px-6">
        <motion.div
          className="mb-14 text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="text-3xl font-bold text-foreground md:text-4xl" style={{ textWrap: 'balance' }}>
            Tudo que sua operação precisa
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Módulos integrados que cobrem todo o fluxo da sua clínica.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="group rounded-2xl border border-border bg-card p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_hsl(var(--axis-secondary)/0.15)]"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl gradient-bg-subtle`}>
                <f.icon className={`h-6 w-6 ${i % 2 === 0 ? 'text-primary' : 'text-secondary'}`} />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div 
          className="mt-16 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          {subFeatures.map((sf) => (
            <div key={sf.title} className="text-center p-4 rounded-xl bg-white/50 border border-border/50">
              <h4 className="font-bold text-foreground text-sm">{sf.title}</h4>
              <p className="text-[11px] text-muted-foreground mt-1">{sf.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
