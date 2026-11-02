import { useCallback, useEffect, useState } from 'react'
import { Hospital } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Switch } from '@/components/ui/switch'

/** Super Admin: liberação do BI de Gestão Hospitalar por empresa (nasce desligado). */
export function CompanyBiHospitalarPanel({ companyId }: { companyId: string }) {
  const [on, setOn] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const load = useCallback(async () => {
    const { data } = await supabase.from('companies').select('bi_hospitalar_habilitado').eq('id', companyId).maybeSingle()
    if (data) setOn(!!(data as any).bi_hospitalar_habilitado)
  }, [companyId])
  useEffect(() => { void load() }, [load])
  if (on === null) return null
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <Hospital className="h-4 w-4 text-primary" />
        <div>
          <p className="text-sm font-medium text-foreground">BI de Gestão Hospitalar</p>
          <p className="text-xs text-muted-foreground">Jornada do paciente, tempo por setor e consumo (relatórios nas próximas etapas)</p>
        </div>
      </div>
      <Switch checked={on} disabled={saving} onCheckedChange={async v => {
        setSaving(true)
        const { error } = await supabase.rpc('bi_hospitalar_liberar' as any, { _company: companyId, _habilitado: v })
        setSaving(false)
        if (error) { toast.error(error.message || 'Não foi possível salvar.'); return }
        toast.success(v ? 'BI de Gestão Hospitalar ligado.' : 'BI de Gestão Hospitalar desligado.'); void load()
      }} />
    </div>
  )
}
