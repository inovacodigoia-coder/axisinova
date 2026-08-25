import { X, Eye, Pencil, Calendar, PowerOff, Power } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Patient } from '@/types/patient.types'
import { STATUS_LABELS, STATUS_COLORS } from '@/types/patient.types'
import { calculateAge, formatPhoneDisplay, maskCPFPrivate, maskCardPrivate } from '@/utils/patient.validators'
import { GradientButton } from '@/components/ui/GradientButton'

interface Props {
  patient: Patient | null
  onClose: () => void
  onView: (p: Patient) => void
  onEdit: (p: Patient) => void
  onSchedule: (p: Patient) => void
  onToggleStatus?: (p: Patient) => void
}

export function QuickViewDrawer({ patient, onClose, onView, onEdit, onSchedule, onToggleStatus }: Props) {
  if (!patient) return null
  const age = calculateAge(patient.birthDate)
  const conv = patient.convenios[0]

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="absolute right-0 top-0 bottom-0 w-full sm:w-[400px] bg-card shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-card border-b border-border">
          <h3 className="font-bold text-foreground">Visão rápida</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full gradient-bg text-white text-2xl font-bold">
              {patient.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-lg font-bold text-foreground leading-tight">{patient.fullName}</h4>
              {patient.socialName && (
                <p className="text-xs text-muted-foreground">({patient.socialName})</p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', STATUS_COLORS[patient.status])}>
                  {STATUS_LABELS[patient.status]}
                </span>
                {age !== undefined && (
                  <span className="text-xs text-muted-foreground">{age} anos</span>
                )}
              </div>
            </div>
          </div>

          {/* Dados */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <Field label="CPF">{maskCPFPrivate(patient.cpf)}</Field>
            <Field label="Nascimento">
              {patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('pt-BR') : '—'}
            </Field>
            <Field label="Telefone 1">{formatPhoneDisplay(patient.phone1)}</Field>
            <Field label="Telefone 2">{patient.phone2 ? formatPhoneDisplay(patient.phone2) : '—'}</Field>
            <Field label="E-mail" full>{patient.email || '—'}</Field>
            <Field label="Cidade/UF">
              {patient.address?.city ? `${patient.address.city}/${patient.address.state}` : '—'}
            </Field>
            <Field label="Mãe">{patient.motherName || '—'}</Field>
            {conv && (
              <Field label={conv.convenioName} full>
                Cartão: {maskCardPrivate(conv.cardNumber)}
              </Field>
            )}
          </div>

          {/* Alertas clínicos */}
          {(patient.clinicalData.allergies.length > 0 || patient.clinicalData.chronicConditions.length > 0) && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-destructive mb-2">Alertas clínicos</p>
              <div className="flex flex-wrap gap-1.5">
                {patient.clinicalData.allergies.map(a => (
                  <span key={a.id} className="rounded-full bg-destructive/15 text-destructive px-2 py-0.5 text-[10px] font-bold">
                    🔴 {a.substance}
                  </span>
                ))}
                {patient.clinicalData.chronicConditions.map(c => (
                  <span key={c} className="rounded-full bg-orange-500/15 text-orange-700 dark:text-orange-300 px-2 py-0.5 text-[10px] font-bold">
                    🟠 {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Mini timeline placeholder */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Últimos atendimentos</p>
            {patient.lastAttendance ? (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span className="text-foreground">{new Date(patient.lastAttendance).toLocaleDateString('pt-BR')}</span>
                <span className="text-muted-foreground">· Último registro</span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Nenhum atendimento registrado.</p>
            )}
          </div>

          {/* Ações */}
          <div className="space-y-2 pt-2 border-t border-border">
            <GradientButton onClick={() => onView(patient)} className="w-full">
              <Eye className="h-4 w-4 mr-2" /> Ver perfil completo
            </GradientButton>
            <button
              onClick={() => onSchedule(patient)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <Calendar className="h-4 w-4" /> Novo agendamento
            </button>
            <button
              onClick={() => onEdit(patient)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <Pencil className="h-4 w-4" /> Editar cadastro
            </button>
            {onToggleStatus && (
              <button
                onClick={() => onToggleStatus(patient)}
                className={cn(
                  'w-full inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors',
                  patient.status === 'active'
                    ? 'border-destructive/30 text-destructive hover:bg-destructive/10'
                    : 'border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10'
                )}
              >
                {patient.status === 'active'
                  ? <><PowerOff className="h-4 w-4" /> Desativar cadastro</>
                  : <><Power className="h-4 w-4" /> Reativar cadastro</>}
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={cn(full && 'col-span-2')}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-foreground truncate">{children}</p>
    </div>
  )
}
