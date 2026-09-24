import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRegisters } from '@/context/RegistersContext'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  pedidoId: string
  guideIndex: number
  examIndex: number
  exam: any
  onDone: (item: any) => void
}

/** Troca a bancada de um exame só neste pedido (motivo obrigatório) */
export default function TrocaBancadaPontualDialog({ open, onOpenChange, pedidoId, guideIndex, examIndex, exam, onDone }: Props) {
  const { workbenches } = useRegisters() as any
  const [opcoes, setOpcoes] = useState<{ id: string; name: string; tipo?: string; motivo?: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [bancada, setBancada] = useState('')
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)
  const examId = exam?.examId || exam?.id
  const atual = exam?.bancadaId || exam?.workbenchId

  useEffect(() => {
    if (!open || !examId) return
    setBancada(''); setMotivo('')
    const candidatas = ((workbenches || []) as any[]).filter(w => w.isActive !== false && w.id !== atual)
    setLoading(true)
    Promise.all(candidatas.map(async w => {
      const { data } = await supabase.rpc('bancada_prontidao' as any, { _exam: examId, _bancada: w.id })
      const bl = ((data as any)?.bloqueios || []) as string[]
      return { id: w.id, name: w.name, tipo: w.tipo, motivo: bl[0] }
    })).then(r => { setOpcoes(r); setLoading(false) })
  }, [open, examId, atual, workbenches])

  const confirmar = async () => {
    if (!bancada) { toast.error('Escolha a bancada nova'); return }
    if (!motivo.trim()) { toast.error('Informe o motivo da troca'); return }
    setSaving(true)
    const { data, error } = await supabase.rpc('bancada_trocar_pontual' as any, {
      _pedido: pedidoId, _gi: guideIndex, _ei: examIndex, _bancada: bancada, _motivo: motivo.trim(),
    })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Bancada deste exame trocada')
    onDone((data as any)?.item)
    onOpenChange(false)
  }

  const prontas = opcoes.filter(o => !o.motivo)
  const bloqueadas = opcoes.filter(o => o.motivo)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Trocar bancada deste exame</DialogTitle>
          <DialogDescription>
            {exam?.name} — vale só para este pedido. Permitido mesmo depois da coleta, desde que o exame ainda não tenha resultado.
          </DialogDescription>
        </DialogHeader>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> : (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Bancada nova *</Label>
              <select value={bancada} onChange={e => setBancada(e.target.value)} className="w-full h-10 px-3 rounded-md border bg-background text-sm">
                <option value="">Selecione…</option>
                <optgroup label="Internas">{prontas.filter(o => o.tipo !== 'apoio').map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</optgroup>
                <optgroup label="Apoio">{prontas.filter(o => o.tipo === 'apoio').map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</optgroup>
              </select>
              {bloqueadas.length > 0 && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer">{bloqueadas.length} bancada(s) indisponível(is)</summary>
                  <ul className="mt-1 space-y-0.5">{bloqueadas.map(o => <li key={o.id}><b>{o.name}:</b> {o.motivo}</li>)}</ul>
                </details>
              )}
            </div>
            <div className="space-y-1">
              <Label>Motivo *</Label>
              <Textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={2} placeholder="Ex.: Equipamento em manutenção" />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirmar} disabled={saving || !bancada || !motivo.trim()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Trocar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
