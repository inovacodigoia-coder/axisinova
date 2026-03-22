import { Link } from 'react-router-dom';
import { GradientButton } from '@/components/ui/GradientButton';
import { OutlineButton } from '@/components/ui/OutlineButton';
import { Play, Check, Calendar, TrendingUp, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const badges = [
'Sem cartão de crédito',
'Configuração em 10 min',
'Suporte incluso'];


function DashboardMockup() {
  return (
    <div className="rounded-[20px] border border-secondary/20 bg-gradient-to-br from-primary/5 to-secondary/5 p-5 shadow-[0_24px_80px_hsl(var(--axis-secondary)/0.12)]">
      {/* Top metrics */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
        { label: 'Atendimentos', value: '1.284', icon: Users, color: 'text-primary' },
        { label: 'Faturamento', value: 'R$ 89k', icon: TrendingUp, color: 'text-secondary' },
        { label: 'Agendados', value: '47', icon: Calendar, color: 'text-primary' }].
        map((m) =>
        <div key={m.label} className="rounded-xl bg-white p-3 shadow-sm">
            <m.icon className={`h-4 w-4 ${m.color} mb-1`} />
            <p className="text-lg font-bold text-foreground leading-tight">{m.value}</p>
            <p className="text-[11px] text-muted-foreground">{m.label}</p>
          </div>
        )}
      </div>
      {/* Mini chart */}
      <div className="rounded-xl bg-white p-3 shadow-sm mb-3">
        <p className="text-xs font-semibold text-foreground mb-2">Atendimentos / semana</p>
        <div className="flex items-end gap-1.5 h-12">
          {[40, 65, 50, 80, 60, 90, 75].map((h, i) =>
          <div
            key={i}
            className="flex-1 rounded-t gradient-bg opacity-70"
            style={{ height: `${h}%` }} />

          )}
        </div>
      </div>
      {/* Appointments list */}
      <div className="rounded-xl bg-white p-3 shadow-sm">
        <p className="text-xs font-semibold text-foreground mb-2">Próximos agendamentos</p>
        {[
        { name: 'Maria S.', time: '09:00', type: 'Retorno' },
        { name: 'Carlos R.', time: '09:30', type: '1ª vez' },
        { name: 'Ana L.', time: '10:00', type: 'Retorno' }].
        map((a) =>
        <div key={a.name} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full gradient-bg flex items-center justify-center text-[10px] font-bold text-white">
                {a.name[0]}
              </div>
              <span className="text-xs text-foreground">{a.name}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">{a.time} · {a.type}</span>
          </div>
        )}
      </div>
    </div>);

}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white py-16 md:py-24">
      {/* Decorative blurs */}
      <div className="pointer-events-none absolute -top-20 right-0 h-[400px] w-[400px] rounded-full bg-primary/[0.08] blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-[300px] w-[300px] rounded-full bg-secondary/[0.06] blur-[100px]" />

      <div className="relative mx-auto max-w-[1200px] px-4 md:px-6">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
          {/* Left */}
          <motion.div
            className="flex-[3] text-center lg:text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
            
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-gradient-to-r from-primary/[0.08] to-secondary/[0.08] px-4 py-1.5 text-[13px] font-semibold text-foreground">
              🚀 Novo · Plataforma 2026
            </div>

            <h1 className="text-4xl font-extrabold leading-[1.1] text-foreground md:text-[56px]" style={{ textWrap: 'balance' }}>
              A gestão completa da sua{' '}
              <span className="gradient-text">clínica</span>
              {' '}em um só lugar
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg" style={{ textWrap: 'pretty' }}>
              Do agendamento ao faturamento TISS, da recepção ao BI estratégico. Tudo integrado, tudo em tempo real.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
              <Link to="/cadastro">
                <GradientButton className="h-12 px-8 text-base">Começar Grátis por 14 Dias</GradientButton>
              </Link>
              <OutlineButton variant="gray" className="h-12 px-6 text-base">
                <Play className="h-4 w-4" /> Ver Demo de 2 min
              </OutlineButton>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-4 lg:justify-start">
              {badges.map((b) =>
              <span key={b} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-[hsl(var(--axis-success))]" /> {b}
                </span>
              )}
            </div>
          </motion.div>

          {/* Right — Dashboard mockup */}
          <motion.div
            className="flex-[2] w-full max-w-md lg:max-w-none"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}>
            
            <DashboardMockup />
          </motion.div>
        </div>
      </div>
    </section>);

}