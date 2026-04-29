import { memo } from 'react'
import { Eye, Pencil, Phone, CreditCard, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Patient } from '@/types/patient.types'
import { GENDER_LABELS, STATUS_LABELS, STATUS_COLORS } from '@/types/patient.types'
import { calculateAge, formatPhoneDisplay } from '@/utils/patient.validators'

interface Props {
  patient: Patient
  onView: () => void
  onEdit: () => void
  onClick: () => void
}

function Card({ patient, onView, onEdit, onClick }: Props) {
  const age = calculateAge(patient.birthDate)
  const conv = patient.convenios[0]
  return (
    <div
      onClick={onClick}
      className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-lg hover:border-primary/40 transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full gradient-bg text-white text-lg font-bold">
          {patient.fullName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-foreground truncate">{patient.fullName}</p>
          {patient.socialName && (
            <p className="text-[11px] text-muted-foreground truncate">({patient.socialName})</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            {age !== undefined ? `${age} anos` : 'idade —'} · {GENDER_LABELS[patient.gender]}
          </p>
          <span className={cn('inline-block mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold', STATUS_COLORS[patient.status])}>
            {STATUS_LABELS[patient.status]}
          </span>
        </div>
      </div>

      <div className="border-t border-border my-3" />

      <div className="space-y-1.5 text-xs">
        <Row icon={<Phone className="h-3.5 w-3.5" />}>{formatPhoneDisplay(patient.phone1)}</Row>
        {conv && (
          <Row icon={<CreditCard className="h-3.5 w-3.5" />}>
            {conv.convenioName}{conv.planName ? ` · ${conv.planName}` : ''}
          </Row>
        )}
        <Row icon={<Calendar className="h-3.5 w-3.5" />}>
          Último: {patient.lastAttendance ? new Date(patient.lastAttendance).toLocaleDateString('pt-BR') : 'Nunca'}
        </Row>
      </div>

      <div className="border-t border-border my-3" />

      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
        <button
          onClick={onView}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
        >
          <Eye className="h-3.5 w-3.5" /> Ver
        </button>
        <button
          onClick={onEdit}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" /> Editar
        </button>
      </div>
    </div>
  )
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-foreground">
      <span className="text-muted-foreground">{icon}</span>
      <span className="truncate">{children}</span>
    </p>
  )
}

export const PatientCard = memo(Card)
