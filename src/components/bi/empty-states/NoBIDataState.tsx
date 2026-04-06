import { useNavigate } from 'react-router-dom'
import { BarChart3, Users, Calendar, Stethoscope } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NoBIDataStateProps {
  dark?: boolean
}

export function NoBIDataState({ dark }: NoBIDataStateProps) {
  const navigate = useNavigate()

  const steps = [
    { icon: Users, label: 'Cadastre médicos e convênios', route: '/app/cadastros/medicos' },
    { icon: Calendar, label: 'Crie os primeiros agendamentos', route: '/app/agendamento' },
    { icon: Stethoscope, label: 'Realize os primeiros atendimentos', route: '/app/recepcao' },
  ]

  return (
    <div className={cn(
      'rounded-xl border p-12 text-center flex flex-col items-center',
      dark ? 'bg-[#1A1F2E] border-white/[0.06]' : 'bg-card border-border'
    )}>
      <BarChart3 className={cn('h-16 w-16 mb-4', dark ? 'text-white/20' : 'text-muted-foreground/30')} />
      <h2 className={cn('text-lg font-bold mb-2', dark ? 'text-white' : 'text-foreground')}>
        Ainda sem dados para análise
      </h2>
      <p className={cn('text-sm mb-8 max-w-md', dark ? 'text-white/50' : 'text-muted-foreground')}>
        O Business Intelligence será alimentado automaticamente conforme você usar o sistema.
      </p>

      <p className={cn('text-xs font-semibold mb-4', dark ? 'text-white/40' : 'text-muted-foreground')}>
        Para começar:
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {steps.map((step, i) => {
          const Icon = step.icon
          return (
            <button
              key={i}
              onClick={() => navigate(step.route)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors',
                dark
                  ? 'bg-white/[0.04] text-white/70 hover:bg-white/[0.08]'
                  : 'bg-muted text-foreground hover:bg-accent'
              )}
            >
              <span className={cn('text-xs font-bold', dark ? 'text-white/30' : 'text-muted-foreground')}>{i + 1}.</span>
              <Icon className="h-4 w-4 shrink-0 text-primary" />
              {step.label}
            </button>
          )
        })}
      </div>

      <p className={cn('text-xs mt-8', dark ? 'text-white/30' : 'text-muted-foreground')}>
        Os dashboards serão preenchidos em tempo real conforme a operação acontece.
      </p>
    </div>
  )
}
