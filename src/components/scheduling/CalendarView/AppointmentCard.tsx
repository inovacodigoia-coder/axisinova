import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { SchedulingAppointment } from '@/types/scheduling.types'
import { STATUS_CONFIG, APPOINTMENT_TYPE_CONFIG } from '@/types/scheduling.types'
import { Check, Phone, Edit2, Trash2, Eye } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface Props {
  appointment: SchedulingAppointment
  onClick: (apt: SchedulingAppointment) => void
  compact?: boolean
}

export function AppointmentCard({ appointment: apt, onClick, compact }: Props) {
  const cfg = STATUS_CONFIG[apt.status]
  const typeCfg = APPOINTMENT_TYPE_CONFIG[apt.type]
  const heightClass = apt.duration <= 20 ? 'min-h-[52px]' : apt.duration <= 30 ? 'min-h-[72px]' : 'min-h-[96px]'

  if (compact) {
    return (
      <button
        onClick={() => onClick(apt)}
        className={cn('w-full text-left rounded-md border-l-[3px] px-2 py-1 text-xs transition-all hover:-translate-y-px hover:shadow-md', cfg.bg, cfg.border)}
      >
        <span className="font-semibold">{apt.time}</span>
        <span className="ml-1 text-muted-foreground truncate">{apt.patientName.split(' ')[0]}</span>
      </button>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => onClick(apt)}
          className={cn(
            'w-full text-left rounded-lg border-l-[3px] px-2 py-1.5 text-xs cursor-pointer transition-all hover:-translate-y-px hover:shadow-md group',
            cfg.bg, cfg.border, heightClass,
            apt.status === 'cancelled' && 'opacity-60 line-through'
          )}
        >
          <div className="flex items-center gap-1">
            <span className="font-bold text-foreground">{apt.time}</span>
            {apt.visitType === 'first_visit' ? (
              <span className="rounded-full gradient-bg px-1.5 py-0 text-[9px] font-bold text-white leading-tight">1ª VEZ</span>
            ) : (
              <span className="rounded-full bg-muted px-1.5 py-0 text-[9px] font-medium text-muted-foreground leading-tight">RET</span>
            )}
            {apt.confirmedAt && <Check className="h-3 w-3 text-green-500 ml-auto" />}
            {apt.confirmationSentAt && !apt.confirmedAt && <Phone className="h-3 w-3 text-blue-400 ml-auto" />}
          </div>
          <p className="font-semibold text-foreground truncate mt-0.5">{apt.patientName}</p>
          <p className="text-muted-foreground truncate">{apt.convenioName}</p>
          {apt.duration > 20 && (
            <p className="text-muted-foreground/70 mt-0.5">
              {typeCfg.icon} {typeCfg.label}{apt.examName ? ` · ${apt.examName}` : ''} · {apt.duration}min
            </p>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[250px]">
        <p className="font-bold">{apt.patientName}</p>
        <p className="text-xs">{typeCfg.label} · {apt.doctorName}</p>
        <p className="text-xs">{apt.convenioName} · {apt.duration}min</p>
        <p className={cn('text-xs font-medium', cfg.color)}>{cfg.label}</p>
      </TooltipContent>
    </Tooltip>
  )
}
