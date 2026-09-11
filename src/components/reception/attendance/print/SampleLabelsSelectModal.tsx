import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, X, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TUBE_TYPES } from '@/types/lab.types'
import { buildSampleCode } from '@/utils/orderHash'
import { useCompanySequenceId } from '@/hooks/useCompanySequenceId'
import { useLabSettings } from '@/hooks/useLabSettings'
import { SampleLabelsPrintModal } from './SampleLabelsPrintModal'
import { tubeTypeForMaterial } from './AttendancePrintSelectionModal'

interface Props {
  open: boolean
  onClose: () => void
  order: any
  /** Data de nascimento do paciente (fallback quando o pedido nao a possui). */
  birthDate?: string
  /** Imprime direto todas as amostras coletadas, sem tela de selecao. */
  autoPrint?: boolean
}

export function SampleLabelsSelectModal({ open, onClose, order, birthDate, autoPrint }: Props) {
  const companySequenceId = useCompanySequenceId()
  const { settings } = useLabSettings()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [printOpen, setPrintOpen] = useState(false)

  const exams: any[] = useMemo(
    () => ((order?.labGuides || []) as any[]).flatMap((g: any) => g.exams || []),
    [order],
  )

  const tubes = useMemo(() => {
    const types = new Set(exams.map((e: any) => tubeTypeForMaterial(e.material)))
    const list = TUBE_TYPES.filter(t => types.has(t.type))
    return (list.length ? list : TUBE_TYPES.filter(t => t.type === 'gel')).map((tube, idx) => {
      const tubeExams = exams.filter((e: any) => tubeTypeForMaterial(e.material) === tube.type)
      return {
        ...tube,
        index: idx + 1,
        code: buildSampleCode(order?.orderNumber || '', idx + 1, companySequenceId),
        exams: tubeExams,
        collected: tubeExams.length > 0 && tubeExams.every((e: any) => !!e.collected),
      }
    })
  }, [exams, order?.orderNumber, companySequenceId])

  useEffect(() => {
    if (open) setSelected(new Set(tubes.filter(t => t.collected).map(t => t.code)))
  }, [open, tubes])

  // Modo automatico: abre direto a impressao com todas as amostras coletadas.
  // Se nenhuma amostra estiver coletada, encerra para nao travar o fluxo numa tela vazia.
  useEffect(() => {
    if (!open || !autoPrint || printOpen) return
    if (tubes.some(t => t.collected)) setPrintOpen(true)
    else onClose()
  }, [open, autoPrint, printOpen, tubes, onClose])

  const toggle = (code: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })

  const chosen = tubes.filter(t => selected.has(t.code))

  if (!open) return null

  return (
    <>
      <Dialog open={open && !printOpen && !autoPrint} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-[560px] p-0 overflow-hidden [&>button]:hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              Selecionar Etiquetas
            </h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[50vh] overflow-y-auto p-4 space-y-2">
            {tubes.map(t => (
              <label
                key={t.code}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-md border px-3 py-2 cursor-pointer transition-all',
                  selected.has(t.code) ? 'border-primary bg-primary/5' : 'border-border',
                )}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-current"
                    checked={selected.has(t.code)}
                    onChange={() => toggle(t.code)}
                  />
                  <span className={cn('h-2.5 w-2.5 rounded-full', t.color)} />
                  <div>
                    <p className="text-xs font-bold uppercase text-foreground">{t.label} · {t.code}</p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[320px]">
                      {t.exams.map((e: any) => e.name).join(', ')}
                    </p>
                  </div>
                </div>
                <span className={cn('text-[10px] font-bold uppercase', t.collected ? 'text-emerald-600' : 'text-amber-500')}>
                  {t.collected ? 'Coletado' : 'Pendente'}
                </span>
              </label>
            ))}
            {!tubes.length && <p className="text-sm text-muted-foreground">Nenhuma amostra no pedido.</p>}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs font-bold uppercase">Cancelar</Button>
            <Button size="sm" disabled={!chosen.length} onClick={() => setPrintOpen(true)} className="text-xs font-bold uppercase">
              <Printer className="h-4 w-4 mr-1" /> Imprimir ({chosen.length})
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SampleLabelsPrintModal
        open={printOpen}
        autoPrint={autoPrint}
        onClose={() => { setPrintOpen(false); if (autoPrint) onClose() }}
        orderNumber={order?.orderNumber || ''}
        patientName={order?.patientName || ''}
        birthDate={order?.patientBirthDate || birthDate}
        hash={order?.hash}
        isUrgent={order?.isUrgent}
        labName={settings?.lab_name || ''}
        labels={chosen.map(t => ({
          sampleId: t.code,
          labelIndex: t.index,
          material: t.label,
          tube: t.type,
          workbench: t.exams[0]?.workbench || 'GERAL',
          examRefs: t.exams.map((e: any) => e.code || String(e.name || '').slice(0, 12)),
        }))}
      />
    </>
  )
}
