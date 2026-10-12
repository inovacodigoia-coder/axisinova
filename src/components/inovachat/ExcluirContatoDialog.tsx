import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

/** LGPD: exclusão dos dados do contato. Papel e telefone conferidos no servidor. */
export function ExcluirContatoDialog({ open, onClose, contatoId, onFeito }: { open: boolean; onClose: () => void; contatoId: string; onFeito: () => void }) {
  const [tel, setTel] = useState('')
  const [indo, setIndo] = useState(false)
  const excluir = async () => {
    setIndo(true)
    const { data, error } = await supabase.functions.invoke('inovachat-excluir-contato', { body: { contato_id: contatoId, telefone: tel } })
    setIndo(false)
    const r = (data ?? {}) as any
    if (!r.ok) {
      let msg = r.mensagem
      if (!msg && error) { try { msg = (await (error as any).context?.json?.())?.mensagem } catch { /* */ } }
      toast.error(msg ?? 'Não foi possível excluir.'); return
    }
    toast.success(`Dados excluídos: ${r.mensagens} mensagem(ns), ${r.midias} arquivo(s), ${r.conversas} conversa(s).`)
    setTel(''); onFeito()
  }
  return (
    <Dialog open={open} onOpenChange={v => { if (!v && !indo) { setTel(''); onClose() } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir dados deste contato</DialogTitle>
          <DialogDescription>
            Apaga todas as mensagens, arquivos, conversas, o contato e a fila de envios deste telefone. Não pode ser desfeito.
            O cadastro do paciente e os agendamentos não mudam. Para confirmar, digite o telefone do contato.
          </DialogDescription>
        </DialogHeader>
        <Input value={tel} onChange={e => setTel(e.target.value)} inputMode="tel" placeholder="Telefone com DDD" className="h-11" />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={indo}>Cancelar</Button>
          <Button variant="destructive" onClick={() => void excluir()} disabled={indo || tel.replace(/\D/g, '').length < 10}>
            {indo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Excluir definitivamente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
