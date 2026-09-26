import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

export interface ItemCancelavel { id: string; paciente: string; order_number: string; exame: string; tubo: string }
type Resultado = { id: string; resultado: 'cancelado' | 'recusado' | 'sem_confirmacao'; mensagem: string }

const MOTIVOS = ['Erro de cadastro', 'Paciente desistiu', 'Amostra inadequada / perdida', 'Enviado por engano', 'Outro']

export function CancelarPardiniDialog({ itens, marcados, open, onClose, onDone, onFinish }: {
  itens: ItemCancelavel[]; marcados: string[]; open: boolean; onClose: () => void; onDone: () => void
  onFinish?: (r: { resultados: Resultado[]; destino: 'fila' | 'atendimento' }) => void
}) {
  const [sel, setSel] = useState<string[]>([])
  const [motivo, setMotivo] = useState(''); const [outro, setOutro] = useState('')
  const [destino, setDestino] = useState<'fila' | 'atendimento' | ''>('')
  const [confirmar, setConfirmar] = useState(false)
  const [rodando, setRodando] = useState(false)
  const [feitos, setFeitos] = useState<Resultado[]>([])

  useEffect(() => { if (open) { setSel(marcados); setMotivo(''); setOutro(''); setDestino(''); setFeitos([]); setRodando(false) } }, [open, marcados])

  const motivoFinal = motivo === 'Outro' ? outro.trim() : motivo
  const pronto = sel.length > 0 && motivoFinal.length >= 3 && !!destino
  const terminou = !rodando && feitos.length > 0

  const executar = async () => {
    setConfirmar(false); setRodando(true); setFeitos([])
    const todos: Resultado[] = []
    for (const id of sel) {
      const { data, error } = await supabase.functions.invoke('apoio-cancelar', { body: { modo: 'remessa', pedido_exame_id: id, motivo: motivoFinal, destino } })
      const r: Resultado = error
        ? { id, resultado: 'recusado', mensagem: (data as any)?.error || error.message || 'Falha ao cancelar' }
        : { id, resultado: (data as any)?.resultado || 'recusado', mensagem: (data as any)?.mensagem || (data as any)?.error || '' }
      todos.push(r)
      setFeitos(f => [...f, r])
    }
    setRodando(false); onDone()
    onFinish?.({ resultados: todos, destino: destino as 'fila' | 'atendimento' })
  }

  const nome = (id: string) => { const i = itens.find(x => x.id === id); return i ? `${i.paciente} · ${i.exame}` : id }
  const n = (k: Resultado['resultado']) => feitos.filter(f => f.resultado === k).length

  return (
    <>
      <Dialog open={open} onOpenChange={o => !o && !rodando && onClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Cancelar no Pardini</DialogTitle></DialogHeader>
          {!rodando && !terminou && <>
            <div className="max-h-56 overflow-y-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground"><tr>{['', 'Paciente', 'Pedido', 'Exame', 'Tubo'].map(h => <th key={h} className="px-2 py-1 text-left">{h}</th>)}</tr></thead>
                <tbody>{itens.map(i => (
                  <tr key={i.id} className="border-t border-border">
                    <td className="px-2 py-1"><Checkbox checked={sel.includes(i.id)} onCheckedChange={v => setSel(s => v ? [...s, i.id] : s.filter(x => x !== i.id))} /></td>
                    <td className="px-2 py-1">{i.paciente}</td><td className="px-2 py-1">{i.order_number}</td><td className="px-2 py-1">{i.exame}</td><td className="px-2 py-1 font-mono text-xs">{i.tubo || '—'}</td>
                  </tr>))}</tbody>
              </table>
            </div>
            <div className="grid gap-2">
              <Label>Motivo*</Label>
              <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={motivo} onChange={e => setMotivo(e.target.value)}>
                <option value="">Escolha…</option>{MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              {motivo === 'Outro' && <Input placeholder="Descreva o motivo" value={outro} onChange={e => setOutro(e.target.value)} />}
            </div>
            <div className="grid gap-2">
              <Label>O que fazer com o exame no sistema*</Label>
              <label className="flex items-start gap-2 text-sm"><input type="radio" name="destino" checked={destino === 'fila'} onChange={() => setDestino('fila')} className="mt-1" />
                <span><b>Voltar para a fila do apoio</b><br /><span className="text-xs text-muted-foreground">Volta a "aguardando remessa", para ir em outra remessa ou para outra bancada.</span></span></label>
              <label className="flex items-start gap-2 text-sm"><input type="radio" name="destino" checked={destino === 'atendimento'} onChange={() => setDestino('atendimento')} className="mt-1" />
                <span><b>Cancelar o exame no atendimento do paciente</b></span></label>
            </div>
            <DialogFooter><Button variant="outline" onClick={onClose}>Voltar</Button>
              <Button variant="destructive" disabled={!pronto} onClick={() => setConfirmar(true)}>Cancelar {sel.length} exame(s) no Pardini</Button></DialogFooter>
          </>}
          {(rodando || terminou) && <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-medium">{rodando && <Loader2 className="h-4 w-4 animate-spin" />}{rodando ? `Cancelando ${feitos.length + 1} de ${sel.length}…` : `Concluído: ${n('cancelado')} cancelado(s), ${n('recusado')} recusado(s) pelo Pardini${n('sem_confirmacao') ? `, ${n('sem_confirmacao')} sem confirmação` : ''}.`}</p>
            <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">{feitos.map(f => (
              <li key={f.id} className={`rounded-md border p-2 ${f.resultado === 'cancelado' ? 'border-[hsl(var(--success))]/40' : f.resultado === 'sem_confirmacao' ? 'border-warning/50' : 'border-destructive/40'}`}>
                <b>{f.resultado === 'cancelado' ? '✅ Cancelado' : f.resultado === 'sem_confirmacao' ? '⚠️ Sem confirmação' : '❌ Recusado'}</b> — {nome(f.id)}
                {f.resultado !== 'cancelado' && f.mensagem && <p className="text-xs text-muted-foreground">{f.mensagem}</p>}
              </li>))}</ul>
            {terminou && <DialogFooter><Button onClick={onClose}>Fechar</Button></DialogFooter>}
          </div>}
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar cancelamento</AlertDialogTitle>
            <AlertDialogDescription>Isso vai cancelar {sel.length} exame(s) no Pardini. Continuar?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={executar}>Sim, cancelar no Pardini</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

