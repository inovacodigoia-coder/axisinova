import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAttendanceCadastro } from '@/hooks/useAttendanceCadastro'

const paraLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

/** Corrige o horário de coleta já confirmado: exige justificativa; o banco grava antes/depois/quem/quando */
export function CorrigirHorarioColetaDialog({ pedidoId, examId, examNome, atual, onClose }: { pedidoId: string; examId: string; examNome: string; atual: string; onClose: () => void }) {
  const { refresh } = useAttendanceCadastro() as any
  const [valor, setValor] = useState(paraLocal(new Date(atual)))
  const [just, setJust] = useState('')
  const [salvando, setSalvando] = useState(false)
  const salvar = async () => {
    const d = new Date(valor)
    if (isNaN(d.getTime())) return toast.error('Informe o novo horário')
    if (d.getTime() > Date.now() + 5 * 60000) return toast.error('O horário da coleta não pode estar no futuro')
    if (just.trim().length < 5) return toast.error('Justificativa obrigatória (mínimo 5 caracteres)')
    setSalvando(true)
    const { error } = await (supabase as any).rpc('lab_coleta_corrigir_horario', { _pedido: pedidoId, _exame_ids: [examId], _novo: d.toISOString(), _justificativa: just.trim() })
    setSalvando(false)
    if (error) return toast.error(error.message || 'Não foi possível corrigir o horário')
    toast.success('Horário da coleta corrigido')
    await refresh?.()
    onClose()
  }
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Corrigir horário da coleta</DialogTitle>
          <DialogDescription>{examNome} · atual: {new Date(atual).toLocaleString('pt-BR')}. A correção fica nos Logs de Auditoria.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Novo horário *</Label><Input type="datetime-local" value={valor} max={paraLocal(new Date())} onChange={e => setValor(e.target.value)} /></div>
          <div><Label>Justificativa *</Label><Textarea value={just} onChange={e => setJust(e.target.value)} placeholder="Ex.: horário lançado errado na recepção" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={salvar} disabled={salvando}>{salvando && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Corrigir</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
