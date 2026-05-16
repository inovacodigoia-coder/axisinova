import { cn } from '@/lib/utils'
import type { Patient } from '@/types/patient.types'
import { calcAge } from '@/utils/helpers'

interface Props {
  patient: Patient
  compact?: boolean
  rightSlot?: React.ReactNode
}

function maskCpf(cpf?: string) {
  if (!cpf) return '—'
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11) return cpf
  return `${d.slice(0, 3)}.***.***.${d.slice(9)}`
}

export function PatientResultCard({ patient, compact = true, rightSlot }: Props) {
  const age = patient.age ?? (patient.birthDate ? calcAge(patient.birthDate) : null)
  const primaryConv = patient.convenios?.[0]
  const initials = patient.fullName.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()

  return (
    <div className={cn(
      'rounded-lg border border-border bg-card p-3 transition-all hover:border-primary hover:shadow-sm',
      compact ? 'flex items-center gap-3' : 'flex items-center gap-4'
    )}>
      <div className={cn(
        'rounded-full gradient-bg flex items-center justify-center text-white font-bold shrink-0',
        compact ? 'w-10 h-10 text-xs' : 'w-16 h-16 text-lg'
      )}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground truncate">{patient.fullName}</span>
          {age != null && <span className="text-xs text-muted-foreground">{age} anos</span>}
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">● Ativo</span>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">CPF: {maskCpf(patient.cpf)}</div>
        {patient.phone1 && <div className="text-xs text-muted-foreground">📞 {patient.phone1}</div>}
        {primaryConv && (
          <div className="text-xs text-muted-foreground">💳 {primaryConv.convenioName} · Nº {primaryConv.cardNumber}</div>
        )}
        {!compact && patient.clinicalData?.bloodType && (
          <div className="text-xs text-muted-foreground">🩸 {patient.clinicalData.bloodType}</div>
        )}
      </div>
      {rightSlot}
    </div>
  )
}
