import { AlertTriangle, X } from 'lucide-react'
import { GradientButton } from './GradientButton'
import { OutlineButton } from './OutlineButton'

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  variant?: 'danger' | 'warning'
  isLoading?: boolean
}

export function ConfirmModal({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirmar', variant = 'danger', isLoading }: ConfirmModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${variant === 'danger' ? 'bg-destructive/10' : 'bg-[hsl(var(--warning))]/10'}`}>
            <AlertTriangle className={`h-5 w-5 ${variant === 'danger' ? 'text-destructive' : 'text-[hsl(var(--warning))]'}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <OutlineButton variant="gray" onClick={onClose}>Cancelar</OutlineButton>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-50 ${variant === 'danger' ? 'bg-destructive hover:bg-destructive/90' : 'bg-[hsl(var(--warning))] hover:bg-[hsl(var(--warning))]/90'}`}
          >
            {isLoading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
