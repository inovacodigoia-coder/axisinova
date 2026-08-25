// =====================================================================
// DuplicateWarningModal — Avisa quando há paciente similar já cadastrado
// =====================================================================
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertTriangle, ExternalLink } from 'lucide-react'
import type { Patient } from '@/types/patient.types'
import { formatCPFDisplay } from '@/utils/patient.validators'

interface Props {
  open: boolean
  candidates: Array<{ patient: Patient; reason: string; score?: number }>
  onCancel: () => void
  onContinue: () => void
  onOpen: (patient: Patient) => void
  /** Quando true, impede salvar (ex.: CPF já cadastrado) */
  blocking?: boolean
}

export function DuplicateWarningModal({ open, candidates, onCancel, onContinue, onOpen, blocking }: Props) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            Possíveis pacientes duplicados
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {blocking
              ? 'Já existe um paciente cadastrado com este CPF. Não é possível cadastrar duas vezes o mesmo CPF — abra o cadastro existente.'
              : `Encontramos ${candidates.length === 1 ? 'um paciente' : `${candidates.length} pacientes`} com dados muito parecidos. Verifique se não é o mesmo paciente antes de salvar.`}
          </p>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {candidates.map(({ patient, reason, score }) => (
              <div key={patient.id}
                className="flex items-start justify-between rounded-lg border border-border bg-background p-3 gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-foreground truncate">{patient.fullName}</div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {patient.cpf && <div>CPF: {formatCPFDisplay(patient.cpf)}</div>}
                    {patient.birthDate && <div>Nasc: {new Date(patient.birthDate).toLocaleDateString('pt-BR')}</div>}
                    {patient.motherName && <div>Mãe: {patient.motherName}</div>}
                  </div>
                  <div className="mt-1 inline-flex items-center rounded-full bg-warning/10 text-warning px-2 py-0.5 text-[10px] font-semibold">
                    {reason}{score !== undefined ? ` • ${(score * 100).toFixed(0)}% similar` : ''}
                  </div>
                </div>
                <button type="button" onClick={() => onOpen(patient)}
                  className="shrink-0 inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-xs font-semibold text-foreground hover:bg-muted">
                  <ExternalLink className="h-3 w-3" /> Abrir
                </button>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <button type="button" onClick={onCancel}
            className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted">
            Revisar dados
          </button>
          <button type="button" onClick={onContinue}
            className="rounded-lg bg-warning px-4 py-2 text-sm font-semibold text-warning-foreground hover:opacity-90">
            Continuar e salvar mesmo assim
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
