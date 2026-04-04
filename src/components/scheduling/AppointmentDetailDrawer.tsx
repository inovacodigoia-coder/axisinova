import { useState } from 'react'
import { X, Phone, Calendar, Clock, User, FileText, Edit2 } from 'lucide-react'
import type { SchedulingAppointment } from '@/types/scheduling.types'
import { STATUS_CONFIG, APPOINTMENT_TYPE_CONFIG } from '@/types/scheduling.types'
import { FirstVisitBadge } from './appointment/FirstVisitBadge'
import { MOCK_APPOINTMENTS } from '@/mocks/scheduling.mock'
import { GradientButton } from '@/components/ui/GradientButton'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface Props {
  appointment: SchedulingAppointment | null
  onClose: () => void
  onStatusChange: (id: string, status: SchedulingAppointment['status'], reason?: string) => void
}

export function AppointmentDetailDrawer({ appointment: apt, onClose, onStatusChange }: Props) {
  const [cancelReason, setCancelReason] = useState('')
  const [showCancelInput, setShowCancelInput] = useState(false)
  const [showAbsentInput, setShowAbsentInput] = useState(false)

  if (!apt) return null

  const cfg = STATUS_CONFIG[apt.status]
  const typeCfg = APPOINTMENT_TYPE_CONFIG[apt.type]

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-[380px] bg-card shadow-2xl overflow-y-auto"
      >
        <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between z-10">
          <span className={cn('rounded-full px-3 py-1 text-xs font-bold', cfg.bg, cfg.color)}>{cfg.label}</span>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted"><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        <div className="p-4 space-y-5">
          {/* Patient */}
          <div>
            <h3 className="text-lg font-bold text-foreground">{apt.patientName}</h3>
            <p className="text-sm text-muted-foreground">{typeCfg.label} · {apt.doctorName} · {apt.date.split('-').reverse().join('/')} às {apt.time}</p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Dados do Paciente</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span>{apt.patientName}</span></div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><a href={`tel:${apt.patientPhone1}`} className="text-primary hover:underline">{apt.patientPhone1}</a></div>
              {apt.patientPhone2 && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><a href={`tel:${apt.patientPhone2}`} className="text-primary hover:underline">{apt.patientPhone2}</a></div>}
              <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><span>{apt.convenioName}</span></div>
              <FirstVisitBadge patientId={apt.patientId} doctorId={apt.doctorId} appointments={MOCK_APPOINTMENTS} />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Dados do Agendamento</h4>
            <div className="space-y-2 text-sm">
              <div className="flex gap-2"><Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" /><span>{apt.date.split('-').reverse().join('/')} às {apt.time} · {apt.duration}min</span></div>
              <div className="flex gap-2"><span className="text-muted-foreground">Tipo:</span><span>{typeCfg.icon} {typeCfg.label}{apt.examName ? ` · ${apt.examName}` : ''}</span></div>
              {apt.observations && <div className="rounded-lg bg-muted p-2 text-xs">{apt.observations}</div>}
            </div>
          </div>

          {/* Confirmation timeline */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Confirmação</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span>Agendado em {apt.createdAt.split('-').reverse().join('/')}</span>
              </div>
              {apt.confirmationSentAt && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-400" />
                  <span>Confirmação enviada em {apt.confirmationSentAt.split('-').reverse().join('/')}</span>
                </div>
              )}
              {apt.confirmedAt && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span>Paciente confirmou em {apt.confirmedAt.split('-').reverse().join('/')}{apt.confirmedBy ? ` (${apt.confirmedBy})` : ''}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {!['completed', 'cancelled', 'absent'].includes(apt.status) && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ações</h4>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { onStatusChange(apt.id, 'confirmed'); onClose() }}
                  className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors">
                  ✅ Confirmar Presença
                </button>
                <button onClick={() => setShowAbsentInput(true)}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors">
                  ❌ Registrar Falta
                </button>
                <button onClick={() => toast.info('Função de remarcar em desenvolvimento')}
                  className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors">
                  🔄 Remarcar
                </button>
                <button onClick={() => setShowCancelInput(true)}
                  className="rounded-lg border border-border bg-muted px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/80 transition-colors">
                  🚫 Cancelar
                </button>
              </div>

              {showCancelInput && (
                <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
                  <label className="text-xs font-medium">Motivo do cancelamento</label>
                  <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs resize-none" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowCancelInput(false)} className="rounded-lg border border-input px-3 py-1.5 text-xs hover:bg-muted">Voltar</button>
                    <button onClick={() => { onStatusChange(apt.id, 'cancelled', cancelReason); onClose() }}
                      className="rounded-lg bg-destructive px-3 py-1.5 text-xs text-white hover:bg-destructive/90">Confirmar Cancelamento</button>
                  </div>
                </div>
              )}

              {showAbsentInput && (
                <div className="flex gap-2 p-3 rounded-lg border border-border bg-muted/30">
                  <button onClick={() => setShowAbsentInput(false)} className="rounded-lg border border-input px-3 py-1.5 text-xs hover:bg-muted">Voltar</button>
                  <button onClick={() => { onStatusChange(apt.id, 'absent'); onClose() }}
                    className="rounded-lg bg-destructive px-3 py-1.5 text-xs text-white hover:bg-destructive/90">Confirmar Falta</button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
