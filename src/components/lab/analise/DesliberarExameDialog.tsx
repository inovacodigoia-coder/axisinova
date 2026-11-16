import { useEffect, useState } from 'react'
import { ShieldOff, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AVISO_RETESTE_LIBERADO, MOTIVOS_DESLIBERAR, MOTIVO_DESLIBERAR_RETESTE, motivoDesliberar } from '@/lib/retesteLiberacao'

const mensagem = (err: any, padrao: string) => {
  const t = String(err?.message || '')
  return t && !/[a-z_]+\(|violates|syntax|relation /i.test(t) ? t.charAt(0).toUpperCase() + t.slice(1) : padrao
}

/** Desliberar: tira o selo "Liberado" e reabre o exame (grava quem, quando e o motivo). */
export async function desliberarExame(resultId: string, motivo: string) {
  const { error } = await supabase.rpc('lab_desliberar_exame', { _result_id: resultId, _motivo: motivo })
  if (error) throw error
}

export function DesliberarExameDialog({
  open, onOpenChange, resultId, examName, motivoInicial = MOTIVO_DESLIBERAR_RETESTE, onDesliberado,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  resultId: string | null | undefined
  examName?: string | null
  motivoInicial?: string
  onDesliberado: () => void | Promise<void>
}) {
  const [motivo, setMotivo] = useState<string>(motivoInicial)
  const [detalhe, setDetalhe] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => { if (open) { setMotivo(motivoInicial); setDetalhe('') } }, [open, motivoInicial])

  const texto = motivoDesliberar(motivo, detalhe)

  const confirmar = async () => {
    if (!resultId) { toast.error('Resultado do exame não encontrado.'); return }
    if (!texto) { toast.error('Descreva o motivo para desliberar.'); return }
    setSalvando(true)
    try {
      await desliberarExame(resultId, texto)
      toast.success('Exame desliberado — os campos voltaram a ficar liberados para edição.')
      onOpenChange(false)
      await onDesliberado()
    } catch (err) {
      console.error('Erro ao desliberar exame', err)
      toast.error(mensagem(err, 'Não foi possível desliberar o exame.'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!salvando) onOpenChange(o) }}>
      <DialogContent className="sm:max-w-[440px] z-[150]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldOff className="h-5 w-5 text-amber-600" /> Desliberar exame</DialogTitle>
          <DialogDescription>
            {examName ? <strong className="uppercase">{examName}</strong> : 'O exame'} volta a ficar não liberado: o selo
            "Liberado" sai, os campos podem ser editados e o laudo some dos portais até liberar de novo.
            Os valores atuais ficam guardados no histórico.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Motivo</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="z-[160]">
                {MOTIVOS_DESLIBERAR.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{motivo === 'Outro' ? 'Descreva o motivo' : 'Detalhe (opcional)'}</Label>
            <Textarea rows={2} value={detalhe} onChange={(e) => setDetalhe(e.target.value)} className="resize-none" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>Voltar</Button>
          <Button onClick={() => void confirmar()} disabled={salvando || !texto} className="gap-2">
            <ShieldOff className="h-4 w-4" /> {salvando ? 'Desliberando...' : 'Desliberar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Aviso ao pedir reteste em exame liberado: não cria o pedido. */
export function AvisoRetesteLiberadoDialog({
  open, onOpenChange, podeDesliberar, onDesliberarAgora, ocupado,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  podeDesliberar: boolean
  onDesliberarAgora: () => void
  ocupado?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] z-[150]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /> Exame liberado</DialogTitle>
          <DialogDescription>{AVISO_RETESTE_LIBERADO}</DialogDescription>
        </DialogHeader>
        {!podeDesliberar && (
          <p className="text-sm text-muted-foreground">Seu perfil não pode desliberar. Peça a quem libera exames.</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          {podeDesliberar && (
            <Button onClick={onDesliberarAgora} disabled={ocupado} className="gap-2">
              <ShieldOff className="h-4 w-4" /> Desliberar e pedir reteste
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
