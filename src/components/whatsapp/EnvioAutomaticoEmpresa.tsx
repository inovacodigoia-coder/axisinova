import { useEffect, useState } from 'react'
import { Send } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

/** Interruptor do envio automático das confirmações desta empresa. */
export function EnvioAutomaticoEmpresa() {
  const [ativo, setAtivo] = useState<boolean | null>(null)
  const [pedido, setPedido] = useState<boolean | null>(null)

  useEffect(() => {
    void supabase.rpc('whatsapp_envio_auto_obter' as any).then(({ data }) => setAtivo(!!data))
  }, [])

  const confirmar = async () => {
    const v = pedido; setPedido(null)
    const { data, error } = await supabase.rpc('whatsapp_envio_auto_salvar' as any, { p_ativo: v })
    const d = data as any
    if (error || !d?.ok) { toast.error(d?.mensagem || 'Não foi possível salvar.'); return }
    setAtivo(!!v)
    toast.success(v ? 'Envio automático ligado.' : 'Envio automático pausado.')
  }

  if (ativo === null) return null
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-2">
        <Send className="mt-0.5 h-4 w-4 text-primary" />
        <div>
          <h3 className="text-sm font-bold text-foreground">Envio automático de mensagens</h3>
          <p className="text-xs text-muted-foreground">{ativo ? 'Ligado: as confirmações agendadas saem no horário de envio.' : 'Desligado: nada é enviado; as mensagens ficam guardadas na fila.'}</p>
        </div>
      </div>
      <Switch checked={ativo} onCheckedChange={v => setPedido(v)} />
      <AlertDialog open={pedido !== null} onOpenChange={o => !o && setPedido(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pedido ? 'Ligar envio automático?' : 'Pausar envio automático?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {pedido ? 'As mensagens agendadas passarão a ser enviadas aos pacientes. Mensagens com horário já vencido saem logo.' : 'Os envios serão pausados; mensagens agendadas continuam na fila.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmar()}>{pedido ? 'Ligar' : 'Pausar'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
