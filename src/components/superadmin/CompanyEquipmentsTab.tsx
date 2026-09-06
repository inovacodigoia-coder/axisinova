import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Monitor } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  companyId: string
}

export function CompanyEquipmentsTab({ companyId }: Props) {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<any[]>([])
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('lab_equipments' as any)
      .select('*')
      .eq('company_id', companyId)
      .order('name')
    if (error) {
      console.error(error)
      toast.error('Erro ao carregar equipamentos')
    }
    setItems((data as any[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    if (companyId) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId])

  const toggle = async (item: any, value: boolean) => {
    setSavingId(item.id)
    const { data, error } = await supabase
      .from('lab_equipments' as any)
      .update({ is_active: value })
      .eq('id', item.id)
      .select('id, is_active')
    setSavingId(null)

    if (error || !data || data.length === 0) {
      console.error(error)
      toast.error('Não foi possível alterar a ativação deste equipamento')
      return
    }
    setItems(prev => prev.map(i => (i.id === item.id ? { ...i, is_active: value } : i)))
    toast.success(value ? 'Equipamento ativado' : 'Equipamento inativado')
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        <h3 className="text-sm font-semibold text-foreground">Ativação de Equipamentos</h3>
        <p className="text-xs text-muted-foreground mt-1">
          A empresa cadastra e edita os dados do equipamento, mas a liberação para uso é feita aqui.
          Equipamentos novos entram sempre como inativos.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Monitor className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-semibold">Nenhum equipamento cadastrado</p>
            <p className="text-sm text-muted-foreground">Esta empresa ainda não possui equipamentos.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Equipamento</th>
                <th className="px-6 py-3 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Identificador</th>
                <th className="px-6 py-3 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Marca/Modelo</th>
                <th className="px-6 py-3 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Status</th>
                <th className="px-6 py-3 font-bold uppercase tracking-wider text-[10px] text-muted-foreground text-right">Ativo</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <p className="font-bold">{item.name}</p>
                      {item.source_equipment_id && (
                        <Badge variant="secondary" className="text-[9px] uppercase">Compartilhado</Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{item.connection_type}</p>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="font-mono text-[10px]">{item.serial_number}</Badge>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{item.manufacturer || item.model || '—'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${item.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <span className="text-xs">{item.is_active ? 'Ativo' : 'Inativo'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Switch
                      checked={!!item.is_active}
                      disabled={savingId === item.id}
                      onCheckedChange={(val) => toggle(item, val)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
