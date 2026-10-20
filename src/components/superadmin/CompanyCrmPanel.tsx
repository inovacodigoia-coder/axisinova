import { useCallback, useEffect, useState } from 'react'
import { KanbanSquare } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Switch } from '@/components/ui/switch'

/** Super Admin: liberação do CRM por empresa (exige InovaChat ligado). */
export function CompanyCrmPanel({ companyId }: { companyId: string }) {
  const [st, setSt] = useState<{ on: boolean; chat: boolean } | null>(null)
  const [saving, setSaving] = useState(false)
  const load = useCallback(async () => {
    const { data } = await supabase.from('companies').select('crm_habilitado, inovachat_habilitado, whatsapp_habilitado').eq('id', companyId).maybeSingle()
    if (data) setSt({ on: !!(data as any).crm_habilitado, chat: !!(data as any).inovachat_habilitado && !!(data as any).whatsapp_habilitado })
  }, [companyId])
  useEffect(() => { void load() }, [load])
  if (!st) return null
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <KanbanSquare className="h-4 w-4 text-primary" />
        <div>
          <p className="text-sm font-medium text-foreground">CRM</p>
          <p className="text-xs text-muted-foreground">{st.chat || st.on ? 'Funil de leads ligado às conversas do InovaChat' : 'Ligue o InovaChat antes'}</p>
        </div>
      </div>
      <Switch checked={st.on} disabled={saving || (!st.chat && !st.on)} onCheckedChange={async v => {
        setSaving(true)
        const { error } = await supabase.rpc('crm_liberar' as any, { _company: companyId, _habilitado: v })
        setSaving(false)
        if (error) { toast.error(error.message || 'Não foi possível salvar.'); return }
        toast.success(v ? 'CRM ligado. Funil padrão criado.' : 'CRM desligado.'); void load()
      }} />
    </div>
  )
}
