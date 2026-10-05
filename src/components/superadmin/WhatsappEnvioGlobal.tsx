import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface St { ativo: boolean; agendadas: number; enviadas_hoje: number; falhas_hoje: number; ultima_execucao: string | null }

/** Interruptor geral do envio automático + números agregados (sem dados de pacientes). */
export function WhatsappEnvioGlobal() {
  const [st, setSt] = useState<St | null>(null)
  const [pedido, setPedido] = useState<boolean | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('whatsapp_envio_global_status' as any)
    if (data) setSt(data as any)
  }, [])
  useEffect(() => { void load(); const t = setInterval(load, 30_000); return () => clearInterval(t) }, [load])

  const confirmar = async () => {
    const v = pedido; setPedido(null)
    const { error } = await supabase.rpc('whatsapp_envio_global_definir' as any, { p_ativo: v })
    if (error) { toast.error(error.message); return }
    toast.success(v ? 'Envio automático ligado.' : 'Envio automático pausado.')
    void load()
  }

  if (!st) return null
  const cards = [
    { l: 'Mensagens agendadas na fila', v: st.agendadas },
    { l: 'Enviadas hoje', v: st.enviadas_hoje },
    { l: 'Falhas hoje', v: st.falhas_hoje },
    { l: 'Última execução do worker', v: st.ultima_execucao ? new Date(st.ultima_execucao).toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' }) : '—' },
  ]

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Envio automático de mensagens</p>
          <p className="text-xs text-muted-foreground">{st.ativo ? 'Ligado: as mensagens agendadas estão saindo.' : 'Desligado: nada é enviado; a fila fica guardada.'}</p>
        </div>
        <Switch checked={st.ativo} onCheckedChange={v => setPedido(v)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(c => (
          <div key={c.l} className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">{c.l}</p>
            <p className="text-lg font-bold text-foreground">{c.v}</p>
          </div>
        ))}
      </div>
      <AlertDialog open={pedido !== null} onOpenChange={o => !o && setPedido(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pedido ? 'Ligar envio automático?' : 'Pausar envio automático?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {pedido ? 'As mensagens agendadas passarão a ser enviadas aos pacientes.' : 'Os envios serão pausados; mensagens agendadas continuam na fila.'}
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
