import { useCallback, useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Pencil, X } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { LabStep2ExamData } from '@/components/lab/attendance/steps/LabStep2ExamData'
import { LabStep3GuidesProcedures } from '@/components/lab/attendance/steps/LabStep3GuidesProcedures'
import { validarApoio, aplicarNomeEnvio } from '@/lib/apoioAtendimento'
import { examesRepetidosNasGuias } from '@/lib/guiaExames'
import { estadoDoPedido, alteracoesDoPedido, examesRemovidosComResultado, type EstadoEdicao } from '@/lib/editarAtendimento'
import type { Patient } from '@/types/patient.types'

interface Props {
  orderId: string
  orderNumber?: string
  patient?: Patient
  onClose: () => void
  onSaved: (row: any) => void
}

export function EditarAtendimentoDialog({ orderId, orderNumber, patient, onClose, onSaved }: Props) {
  const queryClient = useQueryClient()
  const [row, setRow] = useState<any>(null)
  const [resultados, setResultados] = useState<any[]>([])
  const [state, setState] = useState<EstadoEdicao | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let ativo = true
    ;(async () => {
      const [{ data, error }, res] = await Promise.all([
        (supabase.from('attendance_orders' as any) as any).select('*').eq('id', orderId).maybeSingle(),
        (supabase.from('lab_exam_results' as any) as any).select('exam_ref, exam_catalog_id, exam_code, exam_name').eq('order_id', orderId),
      ])
      if (!ativo) return
      if (error || !data) { setErro('Não foi possível carregar o atendimento.'); return }
      setRow(data)
      setResultados(res?.data || [])
      setState(estadoDoPedido(data, patient))
    })()
    return () => { ativo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  const update = useCallback((patch: Partial<EstadoEdicao>) => {
    setState(s => (s ? { ...s, ...patch } : s))
  }, [])

  const salvar = async () => {
    if (!row || !state || salvando) return
    const guias = state.apoioNomeEnvio !== undefined ? aplicarNomeEnvio(state.guides, state) : state.guides
    if (!guias.some((g: any) => !!String(g.plan || '').trim() && (g.exams?.length || 0) > 0)) {
      toast.error('Informe o plano e ao menos um exame na guia.')
      return
    }
    const repetidos = examesRepetidosNasGuias(guias)
    if (repetidos.length) { toast.error(`Exame repetido na guia: ${repetidos.join(', ')}.`); return }
    const errosApoio = validarApoio({ ...state, guides: guias })
    if (errosApoio.length) { toast.error(errosApoio[0]); return }
    const bloqueados = examesRemovidosComResultado(row.lab_guides || [], guias, resultados)
    if (bloqueados.length) {
      toast.error(`Não dá para tirar do pedido exame que já tem resultado digitado: ${bloqueados.join(', ')}.`)
      return
    }
    const patch = alteracoesDoPedido(row, { ...state, guides: guias })
    if (Object.keys(patch).length === 0) { toast.info('Nenhuma alteração para salvar.'); onClose(); return }
    setSalvando(true)
    try {
      const { data, error } = await (supabase.from('attendance_orders' as any) as any)
        .update(patch).eq('id', orderId).neq('status', 'deleted').select('*').maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Atendimento não encontrado ou excluído.')
      queryClient.invalidateQueries({ queryKey: ['attendance_orders'] })
      toast.success('Atendimento atualizado.')
      onSaved(data)
      onClose()
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + (e?.message || 'tente novamente'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !salvando) onClose() }}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[92vh] p-0 flex flex-col gap-0 overflow-hidden [&>button]:hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full gradient-bg flex items-center justify-center text-primary-foreground">
              <Pencil className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Editar Atendimento</DialogTitle>
              <DialogDescription className="text-xs">
                Pedido {orderNumber || ''} · Guias e Procedimentos
              </DialogDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={salvando} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto bg-background">
          {erro && <p className="p-6 text-sm text-destructive">{erro}</p>}
          {!erro && !state && (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando informações do atendimento...
            </div>
          )}
          {state && (
            <>
              <LabStep2ExamData state={state} update={update} />
              <LabStep3GuidesProcedures state={state} update={update} />
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-3 bg-card">
          <Button variant="outline" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button onClick={salvar} disabled={!state || salvando}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
