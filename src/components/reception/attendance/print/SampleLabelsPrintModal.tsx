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

  /** Imprime pelo navegador imagens fiéis das etiquetas, no tamanho exato em mm */
  const printImagensNoNavegador = async (nodes: HTMLElement[]) => {
    const imgs: string[] = []
    for (const el of nodes) {
      const rect = el.getBoundingClientRect()
      const canvas = await html2canvas(el, {
        scale: 4,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        width: rect.width,
        height: rect.height,
      })
      imgs.push(canvas.toDataURL('image/png'))
    }

    const d = window.document
    const portal = d.createElement('div')
    portal.id = 'receipt-print-portal'
    portal.innerHTML = imgs
      .map(
        (src) =>
          `<div style="width:${config.widthMm}mm;height:${config.heightMm}mm;overflow:hidden;page-break-after:always;break-after:page;">
             <img src="${src}" style="width:${config.widthMm}mm;height:${config.heightMm}mm;display:block;" />
           </div>`,
      )
      .join('')
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
      setTimeout(cleanup, 1000)
    }, 80)
  }

  const handlePrint = async () => {
    if (enviando) return
    setEnviando(true)
    try {
      const nodes = Array.from(
        window.document.querySelectorAll<HTMLElement>('#labels-print-root .label-sheet > div'),
      )
      if (nodes.length) {
        const ativo = await servidorImpressaoAtivo()
        if (ativo) {
          const pdf = await gerarPdfEtiquetas(nodes, config.widthMm, config.heightMm)
          const r = await imprimirDireto(TIPOS_DOCUMENTO.etiquetaCliente, pdf)
          toast.success(r.mensagem || 'Etiquetas enviadas para a impressora.')
          return
        }
        await printImagensNoNavegador(nodes)
        return
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
              @page { size: ${config.widthMm}mm ${config.heightMm}mm; margin: 0; }
              body.printing-receipt #receipt-print-portal { width: ${config.widthMm}mm !important; }
              body.printing-receipt #receipt-print-portal > div { gap: 0 !important; }
              body.printing-receipt #receipt-print-portal .label-sheet {
                width: ${config.widthMm}mm !important;
                height: ${config.heightMm}mm !important;
                overflow: hidden !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              body.printing-receipt #receipt-print-portal .label-sheet > div {
                width: ${config.widthMm}mm !important;
                height: ${config.heightMm}mm !important;
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
                  config={config}
                  labName={labName}
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
