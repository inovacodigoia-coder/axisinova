import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { resolveCompanyId } from '@/utils/companyId'
import { Card } from '@/components/ui/card'

/** Parâmetros de contagem de prazo da empresa (lab_settings) */
export default function PrazoSettingsCard() {
  const { user } = useAuth()
  const companyId = resolveCompanyId(user?.companyId)
  const [contagem, setContagem] = useState<'corridos' | 'uteis'>('corridos')
  const [sabado, setSabado] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!companyId) return
    supabase.from('lab_settings').select('prazo_contagem_padrao, sabado_dia_util').eq('company_id', companyId).maybeSingle()
      .then(({ data }) => {
        const d = data as any
        if (d) { setContagem(d.prazo_contagem_padrao === 'uteis' ? 'uteis' : 'corridos'); setSabado(!!d.sabado_dia_util) }
        setLoading(false)
      })
  }, [companyId])

  const salvar = async () => {
    if (!companyId) return
    setSaving(true)
    const { error } = await supabase.from('lab_settings')
      .upsert({ company_id: companyId, prazo_contagem_padrao: contagem, sabado_dia_util: sabado } as never, { onConflict: 'company_id' })
    setSaving(false)
    if (error) toast.error('Erro ao salvar parâmetros de prazo')
    else toast.success('Parâmetros de prazo salvos')
  }

  const sel = 'mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm'
  return (
    <Card className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Parâmetros de prazo</h2>
        <p className="text-sm text-muted-foreground">Cada exame tem sua própria contagem no cadastro. Aqui fica o padrão para exames novos.</p>
      </div>
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Contagem padrão de prazo para exames novos</label>
            <select className={sel} value={contagem} onChange={e => setContagem(e.target.value as any)}>
              <option value="corridos">Dias corridos</option>
              <option value="uteis">Dias úteis</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Sábado é dia útil?</label>
            <select className={sel} value={sabado ? 'sim' : 'nao'} onChange={e => setSabado(e.target.value === 'sim')}>
              <option value="nao">Não</option>
              <option value="sim">Sim</option>
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">Só vale para exames contados em dias úteis.</p>
          </div>
        </div>
      )}
      <div className="flex justify-end">
        <button onClick={salvar} disabled={saving || loading} className="gradient-bg flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-lg hover:opacity-90 disabled:opacity-60">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
        </button>
      </div>
    </Card>
  )
}
