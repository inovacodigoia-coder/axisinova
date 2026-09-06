import { useCallback, useEffect, useState } from 'react'
import { Handshake, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'

interface PartnerRow {
  id: string
  name: string
  document: string
  type: string
  status: string
  api_authorized: boolean
}

const TYPE_LABEL: Record<string, string> = {
  laboratorio: 'Laboratório',
  clinica: 'Clínica',
  convenio: 'Convênio',
  medico: 'Médico Solicitante',
}

export function CompanyPartnersPanel({ companyId }: { companyId: string }) {
  const [rows, setRows] = useState<PartnerRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('api_partners')
      .select('id, name, document, type, status, api_authorized')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    if (!error) setRows((data || []) as PartnerRow[])
    setLoading(false)
  }, [companyId])

  useEffect(() => { void load() }, [load])

  const toggle = async (row: PartnerRow, authorized: boolean) => {
    setRows(prev => prev.map(r => (r.id === row.id ? { ...r, api_authorized: authorized } : r)))
    const { error } = await supabase
      .from('api_partners')
      .update({ api_authorized: authorized })
      .eq('id', row.id)
    if (error) {
      setRows(prev => prev.map(r => (r.id === row.id ? { ...r, api_authorized: !authorized } : r)))
      toast.error('Não foi possível atualizar a autorização do parceiro.')
      return
    }
    toast.success(authorized ? `${row.name} autorizado a usar a API.` : `${row.name} voltou para pendente.`)
  }

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Parceiros cadastrados pela empresa
        </p>
        <Button variant="ghost" size="sm" onClick={() => void load()} className="h-8 gap-1 text-xs">
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando parceiros…</p>
      ) : rows.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Handshake className="h-4 w-4" /> Nenhum parceiro cadastrado por esta empresa.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(r => (
            <div key={r.id} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {TYPE_LABEL[r.type] || r.type} · {r.document}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  r.api_authorized
                    ? 'bg-[hsl(142,71%,45%)]/15 text-[hsl(142,71%,30%)]'
                    : 'bg-[hsl(38,92%,50%)]/15 text-[hsl(38,92%,32%)]'
                }`}>
                  {r.api_authorized ? 'Autorizado' : 'Pendente'}
                </span>
                <Switch checked={r.api_authorized} onCheckedChange={v => void toggle(r, v)} />
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Todo novo parceiro nasce pendente. A empresa só consegue usar a API depois que o Super Admin autorizar aqui.
      </p>
    </div>
  )
}
