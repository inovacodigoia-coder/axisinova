import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GradientButton } from '@/components/ui/GradientButton';
import { OutlineButton } from '@/components/ui/OutlineButton';
import { Play, Check, Calendar, TrendingUp, Users, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [showDemo, setShowDemo] = useState(false);

  return (
    <>
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
                A gestão completa de{' '}
                <span className="gradient-text">Clínicas, Hospitais e Laboratórios</span>
                {' '}em um só lugar
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg" style={{ textWrap: 'pretty' }}>
                Do agendamento e totem à coleta laboratorial, do faturamento TISS ao BI estratégico. Multi-unidades, tudo integrado e em tempo real.
              </p>


              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
                <Link to="/cadastro">
                  <GradientButton className="h-12 px-8 text-base">Começar Grátis por 14 Dias</GradientButton>
                </Link>
                <OutlineButton variant="gray" className="h-12 px-6 text-base" onClick={() => setShowDemo(true)}>
                  <Play className="h-4 w-4" /> Assista a Demonstração
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
      </section>

      {/* Video Demo Modal */}
      <AnimatePresence>
        {showDemo && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDemo(false)}
          >
            <motion.div
              className="relative w-full max-w-4xl mx-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowDemo(false)}
                className="absolute -top-12 right-0 text-white/80 hover:text-white transition-colors"
              >
                <X className="h-8 w-8" />
              </button>
              <div className="rounded-2xl overflow-hidden shadow-2xl bg-[#F8FAFC] border border-white/20 aspect-video relative group">
                {/* Interface Mockup Animation */}
                <div className="absolute inset-0 bg-white overflow-hidden p-4 md:p-8 flex flex-col gap-6">
                  {/* Top Bar Mockup */}
                  <div className="h-12 w-full bg-slate-50 border border-slate-200 rounded-lg flex items-center px-4 gap-4">
                    <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
                    <div className="flex-1" />
                    <div className="h-8 w-8 rounded-full bg-primary/20 animate-pulse" />
                  </div>

                  <div className="flex-1 flex gap-6">
                    {/* Sidebar Mockup */}
                    <div className="w-48 flex flex-col gap-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-10 w-full bg-slate-50 border border-slate-100 rounded-md animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                      ))}
                    </div>

                    {/* Main Content Mockup */}
                    <div className="flex-1 flex flex-col gap-6">
                      <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-24 bg-white border border-slate-200 rounded-xl p-4 shadow-sm animate-pulse" style={{ animationDelay: `${i * 200}ms` }}>
                             <div className="h-3 w-16 bg-slate-100 rounded mb-2" />
                             <div className="h-6 w-24 bg-slate-200 rounded" />
                          </div>
                        ))}
                      </div>

                      <div className="flex-1 bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
                        {/* Simulated Navigation/Interaction Overlay */}
                        <motion.div 
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center"
                          animate={{ 
                            y: [0, -20, 0],
                            scale: [1, 1.05, 1]
                          }}
                          transition={{ duration: 4, repeat: Infinity }}
                        >
                          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <Play className="h-8 w-8 text-primary fill-primary/20" />
                          </div>
                          <h4 className="text-xl font-bold text-slate-800">Navegação em Tempo Real</h4>
                          <p className="text-sm text-slate-500">Veja como é fácil operar o sistema Axis Inova</p>
                        </motion.div>

                        <div className="space-y-4 opacity-30">
                          <div className="h-4 w-1/2 bg-slate-100 rounded" />
                          <div className="h-4 w-full bg-slate-50 rounded" />
                          <div className="h-4 w-3/4 bg-slate-50 rounded" />
                          <div className="h-4 w-full bg-slate-50 rounded" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Video Progress Bar Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-100">
                    <motion.div 
                      className="h-full bg-primary shadow-[0_0_10px_rgba(0,122,255,0.5)]"
                      animate={{ width: ["0%", "100%"] }}
                      transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                </div>

                {/* Content Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent flex flex-col justify-end p-8 pointer-events-none">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-red-500 h-2 w-2 rounded-full animate-pulse" />
                      <span className="text-white text-xs font-bold tracking-wider uppercase">Live Demo em Execução</span>
                    </div>
                    <span className="text-white/80 text-xs font-mono">Simulação de Fluxo de Atendimento</span>
                  </div>
                </div>
              </div>
              <p className="text-center text-white/50 text-sm mt-4">
                Demonstração Completa Axis Inova — Aumente sua produtividade em até 3x
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}