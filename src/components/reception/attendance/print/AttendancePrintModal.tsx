import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, X, FileText } from 'lucide-react'
import { AttendanceReceiptVia } from './AttendanceReceiptVia'
import { usePrinterConfig } from '@/hooks/usePrinterConfig'
import type { AttendanceControlDocument, PrinterConfig } from '@/types/payment-print.types'

interface Props {
  open: boolean
  onClose: () => void
  document: AttendanceControlDocument
  autoPrint?: boolean
  testMode?: boolean
  overrideConfig?: PrinterConfig
  vias?: ('patient' | 'establishment')[]
}

export function AttendancePrintModal({ open, onClose, document: doc, autoPrint, testMode, overrideConfig, vias: propVias }: Props) {
  const { printers, getDefault } = usePrinterConfig()
  const defaultConfig = useMemo(() => overrideConfig || getDefault(), [overrideConfig, getDefault])
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>(defaultConfig.id)
  const [copies, setCopies] = useState<number>(1)

  const selectedConfig = overrideConfig
    || printers.find(p => p.id === selectedPrinterId)
    || defaultConfig

  useEffect(() => {
    if (open && autoPrint) {
      const t = setTimeout(() => {
        window.print();
        // After printing, we can set autoPrint to false or just rely on onClose
      }, 500);
      return () => clearTimeout(t);
    }
  }, [open, autoPrint]);

  if (!open) return null

  const vias = propVias || (['patient', 'establishment'] as ('patient' | 'establishment')[])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[940px] w-[95vw] h-[90vh] p-0 flex flex-col gap-0 [&>button[type=button]]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card no-print">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Printer className="h-5 w-5 text-primary" />
              Controle de Atendimento — Impressão
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {testMode ? 'Modo de teste' : `Pedido: ${doc.orderNumber}`}
            </p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-muted text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 border-b border-border px-6 py-3 bg-muted/30 no-print flex-wrap">
          <label className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Impressora:</span>
            <select
              value={selectedPrinterId}
              onChange={(e) => setSelectedPrinterId(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs"
              disabled={!!overrideConfig}
            >
              {(printers.length ? printers : [defaultConfig]).map(p => (
                <option key={p.id} value={p.id}>
                  {p.printerName} {p.isDefault ? '(padrão)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Cópias:</span>
            <select value={copies} onChange={(e) => setCopies(parseInt(e.target.value))}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs">
              {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <FileText className="h-4 w-4 mr-1" /> Ver PDF
          </Button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1 rounded-md gradient-bg px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
          >
            <Printer className="h-4 w-4" /> Imprimir
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto bg-muted/20 p-6">
          <div className="print-receipt flex flex-col gap-0 items-center">
            {Array.from({ length: copies }).map((_, copyIdx) => (
              vias.map((via) => (
                <div key={`${copyIdx}-${via}`} className="print:break-after-page print:mb-0">
                  <AttendanceReceiptVia document={doc} config={selectedConfig} via={via} />
                </div>
              ))
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
