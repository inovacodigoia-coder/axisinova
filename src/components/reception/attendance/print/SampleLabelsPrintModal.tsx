import { useEffect, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { SampleLabel } from '@/components/lab/print/SampleLabel'
import { ServidorImpressaoStatus } from '@/components/print/ServidorImpressaoStatus'
import { servidorImpressaoAtivo, imprimirDireto, TIPOS_DOCUMENTO } from '@/lib/impressaoLocal'
import { gerarPdfEtiquetas } from '@/lib/labelPdf'
import { useLabelConfig } from '@/hooks/useLabelConfig'


/** Formata a data de nascimento sem sofrer deslocamento de fuso horario. */
function formatBirthDate(value?: string): string {
  if (!value) return ''
  const iso = String(value).slice(0, 10)
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  const br = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (br) return String(value)
  const d = new Date(value)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR')
}

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
  labName?: string
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
  labName,
}: Props) {
  const [enviando, setEnviando] = useState(false)
  const { config } = useLabelConfig()
  const rotated = Math.abs(config.rotation) === 90
  const sheetW = rotated ? config.heightMm : config.widthMm
  const sheetH = rotated ? config.widthMm : config.heightMm

  const printNavegador = () => {
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

  const handlePrint = async () => {
    if (enviando) return
    setEnviando(true)
    try {
      const ativo = await servidorImpressaoAtivo()
      if (ativo) {
        const nodes = Array.from(
          window.document.querySelectorAll<HTMLElement>('#labels-print-root .label-sheet'),
        )
        if (nodes.length) {
          const pdf = await gerarPdfEtiquetas(nodes, sheetW, sheetH)
          const r = await imprimirDireto(TIPOS_DOCUMENTO.etiquetaCliente, pdf)
          toast.success(r.mensagem || 'Etiquetas enviadas para a impressora.')
          return
        }
      }
      printNavegador()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao imprimir pelo servidor local. Usando impressão do navegador.')
      printNavegador()
    } finally {
      setEnviando(false)
    }
  }

  useEffect(() => {
    if (open && autoPrint && labels.length) {
      const t = setTimeout(() => { void handlePrint() }, 400)
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
            <ServidorImpressaoStatus />
            <Button size="sm" onClick={handlePrint} disabled={!labels.length || enviando}>
              {enviando ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Printer className="h-4 w-4 mr-1" />}
              {enviando ? 'Enviando...' : 'Imprimir'}
            </Button>

            <button onClick={onClose} className="rounded-md p-1.5 hover:bg-muted text-muted-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-muted/20 p-6">
          <style>{`
            @media print {
              @page { size: ${sheetW}mm ${sheetH}mm; margin: 0; }
              body.printing-receipt #receipt-print-portal { width: ${sheetW}mm !important; }
              body.printing-receipt #receipt-print-portal > div { gap: 0 !important; }
              body.printing-receipt #receipt-print-portal .label-sheet {
                width: ${sheetW}mm !important;
                height: ${sheetH}mm !important;
                overflow: hidden !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              body.printing-receipt #receipt-print-portal .label-sheet > div {
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
                className={`label-sheet flex items-center justify-center overflow-hidden ${idx < labels.length - 1 ? 'print:break-after-page' : ''}`}
                style={{
                  width: `${sheetW}mm`,
                  height: `${sheetH}mm`,
                  ...(idx === labels.length - 1 ? { breakAfter: 'avoid' as const, pageBreakAfter: 'avoid' as const } : {}),
                }}
              >
                <div style={config.rotation ? { transform: `rotate(${config.rotation}deg)` } : undefined}>
                <SampleLabel
                  orderNumber={orderNumber}
                  patientName={patientName}
                  birthDate={formatBirthDate(birthDate)}
                  material={l.material}
                  tube={l.tube}
                  workbench={l.workbench}
                  sampleCode={l.sampleId}
                  printDate={printDate}
                  isUrgent={isUrgent}
                  labelIndex={l.labelIndex}
                  originSigla={originSigla}
                  examRefs={l.examRefs}
                  labName={labName}
                  config={config}
                />
                </div>
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
