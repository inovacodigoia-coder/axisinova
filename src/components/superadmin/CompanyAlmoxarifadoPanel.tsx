import { useCallback, useEffect, useState } from 'react'
import { Package } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Switch } from '@/components/ui/switch'

/** Super Admin: liberação do Almoxarifado por empresa (nasce desligado). */
export function CompanyAlmoxarifadoPanel({ companyId }: { companyId: string }) {
  const [on, setOn] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const load = useCallback(async () => {
    const { data } = await supabase.from('companies').select('almoxarifado_habilitado').eq('id', companyId).maybeSingle()
    if (data) setOn(!!data.almoxarifado_habilitado)
  }, [companyId])
  useEffect(() => { void load() }, [load])
  if (on === null) return null
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-primary" />
        <div>
          <p className="text-sm font-medium text-foreground">Almoxarifado</p>
          <p className="text-xs text-muted-foreground">Estoque, solicitações dos setores e materiais usados por paciente</p>
        </div>
      </div>
      <Switch checked={on} disabled={saving} aria-label="Almoxarifado ligado nesta empresa" onCheckedChange={async v => {
        setSaving(true)
        const { error } = await supabase.rpc('almox_liberar', { _company: companyId, _habilitado: v })
        setSaving(false)
        if (error) { toast.error(error.message || 'Não foi possível salvar.'); return }
        toast.success(v ? 'Almoxarifado ligado.' : 'Almoxarifado desligado.'); void load()
      }} />
    </div>
  )
}
