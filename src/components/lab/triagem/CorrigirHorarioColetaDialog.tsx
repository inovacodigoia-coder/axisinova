import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAttendanceCadastro } from '@/hooks/useAttendanceCadastro'

const paraLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

/** Corrige o horário de coleta (passado) ou, com permissão coleta.programar, programa a coleta para data futura */
export function CorrigirHorarioColetaDialog({ pedidoId, examId, examNome, atual, onClose }: { pedidoId: string; examId: string; examNome: string; atual: string; onClose: () => void }) {
  const { refresh } = useAttendanceCadastro() as any
  const [modo, setModo] = useState<'corrigir' | 'programar'>('corrigir')
  const [podeProgramar, setPodeProgramar] = useState(false)
  const [valor, setValor] = useState(paraLocal(new Date(atual)))
  const [just, setJust] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    ;(supabase as any).rpc('coleta_tem_permissao', { _perm: 'coleta.programar' }).then(({ data }: any) => setPodeProgramar(!!data))
  }, [])

  const salvar = async () => {
    const d = new Date(valor)
    if (isNaN(d.getTime())) return toast.error('Informe a data')
    if (modo === 'corrigir' && d.getTime() > Date.now() + 5 * 60000) return toast.error('O horário da coleta não pode estar no futuro')
    if (modo === 'programar' && d.getTime() <= Date.now()) return toast.error('A coleta programada precisa ser em data futura')
    if (just.trim().length < 5) return toast.error('Justificativa obrigatória (mínimo 5 caracteres)')
    setSalvando(true)
    const rpc = modo === 'programar' ? 'lab_coleta_programar' : 'lab_coleta_corrigir_horario'
    const args = modo === 'programar'
      ? { _pedido: pedidoId, _exame_ids: [examId], _data: d.toISOString(), _justificativa: just.trim() }
      : { _pedido: pedidoId, _exame_ids: [examId], _novo: d.toISOString(), _justificativa: just.trim() }
    const { error } = await (supabase as any).rpc(rpc, args)
    setSalvando(false)
    if (error) return toast.error(error.message || 'Não foi possível salvar')
    toast.success(modo === 'programar' ? 'Coleta programada' : 'Horário da coleta corrigido')
    await refresh?.()
    onClose()
  }

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{modo === 'programar' ? 'Programar coleta' : 'Corrigir horário da coleta'}</DialogTitle>
          <DialogDescription>{examNome} · atual: {new Date(atual).toLocaleString('pt-BR')}. A alteração fica nos Logs de Auditoria.</DialogDescription>
        </DialogHeader>
        {podeProgramar && (
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={modo === 'corrigir' ? 'default' : 'outline'} onClick={() => { setModo('corrigir'); setValor(paraLocal(new Date(atual))) }}>Corrigir horário</Button>
            <Button type="button" size="sm" variant={modo === 'programar' ? 'default' : 'outline'} onClick={() => { setModo('programar'); setValor(paraLocal(new Date(Date.now() + 86400000))) }}>
              <Clock className="mr-1 h-4 w-4" />Programar para data futura
            </Button>
          </div>
        )}
        <div className="space-y-3">
          <div>
            <Label>{modo === 'programar' ? 'Data da coleta programada *' : 'Novo horário *'}</Label>
            <Input type="datetime-local" value={valor}
              className={cn(modo === 'programar' && 'text-scheduled font-semibold')}
              {...(modo === 'programar' ? { min: paraLocal(new Date()) } : { max: paraLocal(new Date()) })}
              onChange={e => setValor(e.target.value)} />
            {modo === 'programar' && <p className="mt-1 text-[11px] text-muted-foreground">A data programada passa a ser a data da coleta (etiqueta e prazo do resultado). Até essa data o pedido não gera pendência.</p>}
          </div>
          <div><Label>Justificativa *</Label><Textarea value={just} onChange={e => setJust(e.target.value)} placeholder={modo === 'programar' ? 'Ex.: paciente retorna em 02/11 para coleta' : 'Ex.: horário lançado errado na recepção'} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={salvar} disabled={salvando}>{salvando && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}{modo === 'programar' ? 'Programar' : 'Corrigir'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
