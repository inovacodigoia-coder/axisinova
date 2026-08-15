import { useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, X } from 'lucide-react'
import { SampleLabel } from '@/components/lab/print/SampleLabel'

export interface SampleLabelData {
  sampleId: string
  labelIndex: number
  material: string
  tube: string
  workbench: string
  examRefs?: string[]
}

interface Props {
  open: boolean
  onClose: () => void
  orderNumber: string
  patientName: string
  birthDate?: string
  hash?: string
  originSigla?: string
  isUrgent?: boolean
  labels: SampleLabelData[]
  autoPrint?: boolean
}

export function SampleLabelsPrintModal({
  open,
  onClose,
  orderNumber,
  patientName,
  birthDate,
  hash,
  originSigla = 'H',
  isUrgent,
  labels,
  autoPrint,
}: Props) {
  const handlePrint = () => {
    const d = window.document
    const source = d.getElementById('labels-print-root')
    if (!source) { window.print(); return }

    const portal = d.createElement('div')
    portal.id = 'receipt-print-portal'
    portal.innerHTML = source.innerHTML
    d.body.appendChild(portal)
    d.body.classList.add('printing-receipt')

    const cleanup = () => {
      d.body.classList.remove('printing-receipt')
      portal.remove()
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)
    setTimeout(() => {
      window.print()
      setTimeout(cleanup, 800)
    }, 60)
  }

  useEffect(() => {
    if (open && autoPrint && labels.length) {
      const t = setTimeout(() => handlePrint(), 400)
      return () => clearTimeout(t)
    }
  }, [open, autoPrint, labels.length])

  if (!open) return null

  const printDate = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[720px] w-[95vw] max-h-[90vh] p-0 flex flex-col gap-0 [&>button[type=button]]:hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card no-print">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Printer className="h-5 w-5 text-primary" />
              Impressão de Etiquetas
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pedido {orderNumber} — {labels.length} etiqueta(s) selecionada(s)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} disabled={!labels.length}>
              <Printer className="h-4 w-4 mr-1" /> Imprimir
            </Button>
            <button onClick={onClose} className="rounded-md p-1.5 hover:bg-muted text-muted-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-muted/20 p-6">
          <style>{`
            @media print {
              @page { size: 50mm 30mm; margin: 0; }
              body.printing-receipt #receipt-print-portal { width: 50mm !important; }
              body.printing-receipt #receipt-print-portal > div { gap: 0 !important; }
              body.printing-receipt #receipt-print-portal .label-sheet {
                width: 50mm !important;
                height: 30mm !important;
                overflow: hidden !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              body.printing-receipt #receipt-print-portal .label-sheet > div {
                width: 50mm !important;
                height: 30mm !important;
                border: none !important;
                box-shadow: none !important;
              }
              body.printing-receipt #receipt-print-portal svg { max-width: 100% !important; }
            }
          `}</style>
          <div id="labels-print-root" className="flex flex-col items-center gap-3">
            {labels.map((l, idx) => (
              <div
                key={l.sampleId}
                className={`label-sheet ${idx < labels.length - 1 ? 'print:break-after-page' : ''}`}
                style={idx === labels.length - 1 ? { breakAfter: 'avoid', pageBreakAfter: 'avoid' } : undefined}
              >
                <SampleLabel
                  orderNumber={orderNumber}
                  patientName={patientName}
                  birthDate={birthDate ? new Date(birthDate).toLocaleDateString('pt-BR') : ''}
                  material={l.material}
                  tube={l.tube}
                  workbench={l.workbench}
                  sampleCode={l.sampleId}
                  printDate={printDate}
                  isUrgent={isUrgent}
                  labelIndex={l.labelIndex}
                  originSigla={originSigla}
                  examRefs={l.examRefs}
                />
              </div>
            ))}
            {!labels.length && (
              <p className="text-sm text-muted-foreground">Nenhuma amostra selecionada.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
