import { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { SampleLabel } from '@/components/lab/print/SampleLabel'
import { ServidorImpressaoStatus } from '@/components/print/ServidorImpressaoStatus'
import { servidorImpressaoAtivo, imprimirEtiquetas, TIPOS_DOCUMENTO, DadosEtiqueta } from '@/lib/impressaoLocal'
import { useLabelConfig } from '@/hooks/useLabelConfig'
import { generateSampleHash } from '@/utils/orderHash'
import { dadosEtiquetaExtra, etiquetaExtraDoPaciente, qtdEtiquetasValida, type CamposEtiquetaExtra } from '@/lib/etiquetaExtra'


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
  examNames?: string[]
  collectedAt?: string
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
  onPrinted?: () => void
  /** Etiqueta extra: campos escolhidos pelo usuário */
  extra?: CamposEtiquetaExtra
  /** Total de etiquetas que vai sair (1 a 50); os tubos se repetem até chegar nele. Padrão 1. */
  total?: number
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
  onPrinted,
  extra,
  total,
}: Props) {
  // Sem quantidade pedida: uma etiqueta por tubo, como sempre foi.
  const quantidade = extra ? qtdEtiquetasValida(total ?? 1) : labels.length
  // Total pedido: os tubos se repetem na ordem até chegar na quantidade.
  // A prévia e o envio à impressora usam exatamente a mesma lista.
  const labelsFinais = useMemo(() => extra ? etiquetaExtraDoPaciente(labels, total ?? 1) : labels, [labels, quantidade, extra, total])
  const ex = (l: SampleLabelData) => extra ? dadosEtiquetaExtra({ patientName, examNames: l.examNames, collectedAt: l.collectedAt }, extra) : null

  const [enviando, setEnviando] = useState(false)
  const envioAutomatico = useRef(false)
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
      if (ativo && labelsFinais.length) {
        // Envia TODAS as etiquetas do pedido em uma única chamada (um trabalho só).
        const lista: DadosEtiqueta[] = labelsFinais.map((l, i) => { const e = ex(l); return {
          codigoAmostra: l.sampleId,
          codigoAlfanumerico: generateSampleHash(l.sampleId) || undefined,
          painel: l.workbench || undefined,
          dataHora: e ? e.dataHora : new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }),
          codigoExterno: orderNumber || undefined,
          paciente: (e ? e.paciente : patientName) || undefined,
          nascimento: (e && !e.paciente ? '' : formatBirthDate(birthDate)) || undefined,
          tipoAmostra: [l.material, l.tube ? `(${String(l.tube).toUpperCase()})` : '']
            .filter(Boolean)
            .join(' ') || undefined,
          exames: (e ? e.exames : (l.examRefs || [])).join(' ') || undefined,
          laboratorio: labName || undefined,
          urgente: !!isUrgent,
          fimPedido: i === labelsFinais.length - 1,
        } })
        const r = await imprimirEtiquetas(TIPOS_DOCUMENTO.etiquetaCliente, lista)
        toast.success(r.mensagem || `${r.etiquetas} etiqueta(s) enviada(s) para impressão.`)
        onPrinted?.()
        return
      }
      if (!ativo) {
        toast.warning(autoPrint
          ? 'Servidor local não detectado. Abra o AisAxius e clique em Imprimir; a etiqueta ainda não foi enviada.'
          : 'Servidor de Impressão AisAxius não está aberto. Usando a impressão do navegador.')
      }
      if (!autoPrint) printNavegador()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível confirmar o envio da etiqueta. Confira a impressora antes de tentar novamente.')
    } finally {
      setEnviando(false)
    }
  }

  useEffect(() => {
    if (!open) envioAutomatico.current = false
    if (open && autoPrint && labelsFinais.length && !envioAutomatico.current) {
      const t = setTimeout(() => { envioAutomatico.current = true; void handlePrint() }, 400)
      return () => clearTimeout(t)
    }
  }, [open, autoPrint, labelsFinais.length])


  if (!open) return null

  const printDate = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[720px] w-[95vw] max-h-[90vh] p-0 flex flex-col gap-0 [&>button[type=button]]:hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card no-print">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Printer className="h-5 w-5 text-primary" />
              {extra ? 'Etiqueta Extra' : 'Impressão de Etiquetas'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pedido {orderNumber} — {labelsFinais.length} etiqueta(s)
              {quantidade > 1 && labels.length ? ` (${labels.length} tubo(s) repetidos até ${quantidade})` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ServidorImpressaoStatus />
            <Button size="sm" onClick={handlePrint} disabled={!labelsFinais.length || enviando}>
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
            {labelsFinais.map((l, idx) => (
              <div
                key={`${l.sampleId}-${idx}`}
                className={`label-sheet flex items-center justify-center overflow-hidden ${idx < labelsFinais.length - 1 ? 'print:break-after-page' : ''}`}
                style={{
                  width: `${sheetW}mm`,
                  height: `${sheetH}mm`,
                  ...(idx === labelsFinais.length - 1 ? { breakAfter: 'avoid' as const, pageBreakAfter: 'avoid' as const } : {}),
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
                  printDate={ex(l)?.dataHora || printDate}
                  isUrgent={isUrgent}
                  labelIndex={l.labelIndex}
                  originSigla={originSigla}
                  examRefs={extra ? ex(l)?.exames : l.examRefs}
                  hidePatient={!!extra && !extra.paciente}
                  labName={labName}
                  config={config}
                />
                </div>
              </div>
            ))}
            {!labelsFinais.length && (
              <p className="text-sm text-muted-foreground">Nenhuma amostra selecionada.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
