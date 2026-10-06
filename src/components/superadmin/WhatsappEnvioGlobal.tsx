import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface St { agendadas: number; enviadas_hoje: number; falhas_hoje: number; ultima_execucao: string | null }

/** Números agregados do envio automático (sem dados de pacientes). Cada empresa liga o seu envio. */
export function WhatsappEnvioGlobal() {
  const [st, setSt] = useState<St | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('whatsapp_envio_global_status' as any)
    if (data) setSt(data as any)
  }, [])
  useEffect(() => { void load(); const t = setInterval(load, 30_000); return () => clearInterval(t) }, [load])

  if (!st) return null
  const cards = [
    { l: 'Mensagens agendadas na fila', v: st.agendadas },
    { l: 'Enviadas hoje', v: st.enviadas_hoje },
    { l: 'Falhas hoje', v: st.falhas_hoje },
    { l: 'Última execução do worker', v: st.ultima_execucao ? new Date(st.ultima_execucao).toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' }) : '—' },
  ]

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Envio automático de mensagens</p>
        <p className="text-xs text-muted-foreground">Cada empresa liga ou desliga o seu envio na tela Números de WhatsApp.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(c => (
          <div key={c.l} className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">{c.l}</p>
            <p className="text-lg font-bold text-foreground">{c.v}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
