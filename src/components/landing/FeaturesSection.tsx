import { Calendar, Monitor, ClipboardList, CreditCard, FlaskConical, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  {
    icon: Calendar,
    title: 'Agendamento Inteligente',
    desc: 'Agenda multi-profissional com regras por convênio, bloqueios, intervalos e exceções de feriado, além de controle de faltosos e confirmações.',
  },
  {
    icon: Monitor,
    title: 'Totem, Fila e Painel de TV',
    desc: 'Check-in autônomo no totem, senhas por prioridade, chamada por voz e painel de TV com logo, split-screen de Últimas/Próximos e modo mídia.',
  },
  {
    icon: FlaskConical,
    title: 'Laboratório Completo',
    desc: 'Cadastro de atendimento em 6 passos, fila de coleta com tubos e bancadas, digitação de resultados com delta check, laudos em PDF e soroteca.',
  },
  {
    icon: ClipboardList,
    title: 'Recepção e Prontuário',
    desc: 'Busca de cadastros por protocolo, CPF ou nome, guichês, impressão térmica/A4, etiquetas de amostra e prontuário com linha do tempo do paciente.',
  },
  {
    icon: CreditCard,
    title: 'Faturamento TISS/TUSS e Financeiro',
    desc: 'Guias, lotes, glosas com prazos e recursos, tabelas de preço particular, pagamentos com QR Code e dashboard financeiro integrado.',
  },
  {
    icon: BarChart3,
    title: 'BI Estratégico em Tempo Real',
    desc: 'Indicadores de produção, faturamento, faltosos, filas e performance por médico, com exportação em CSV/PDF e modo claro/escuro.',
  },
];

const subFeatures = [
  { title: 'Multi-estabelecimentos', desc: 'Origens com código próprio e numeração de pedidos independente.' },
  { title: 'Portal do Paciente', desc: 'PWA de resultados com acesso por CPF e data de nascimento.' },
  { title: 'Estoque e Farmácia', desc: 'Controle de insumos, lotes e dispensação integrados.' },
  { title: 'Perfis e Permissões', desc: 'RBAC por módulo, ação e setor, com auditoria de acessos.' },
  { title: 'Conformidade LGPD', desc: 'Dados protegidos por RLS e isolamento total por empresa.' },
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
