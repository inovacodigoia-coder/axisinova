import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2, Truck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  examId?: string
  companyId?: string
  workbenches: { id: string; name: string; tipo?: string; isActive?: boolean }[]
  laudos: { id: string; code: string; name: string }[]
}

type Row = { id: string; bancada_id: string; laudo_id: string | null; ativo: boolean }

/** Laudo usado pelo exame em cada bancada (troca junto com a bancada) */
export default function ExamLaudoBancadaSection({ examId, companyId, workbenches, laudos }: Props) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [novaBancada, setNovaBancada] = useState('')
  const [novoLaudo, setNovoLaudo] = useState('__padrao__')

  const load = useCallback(async () => {
    if (!examId) return
    setLoading(true)
    const { data, error } = await supabase.from('exame_laudo_bancada' as any).select('id, bancada_id, laudo_id, ativo').eq('exame_id', examId)
    setLoading(false)
    if (error) { toast.error(error.message); return }
    setRows((data as any[]) || [])
  }, [examId])

  useEffect(() => { load() }, [load])

  if (!examId) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        <h3 className="font-semibold text-foreground mb-1">Laudo por bancada</h3>
        Salve o exame primeiro para ligar um laudo a cada bancada.
      </Card>
    )
  }

  const usadas = new Set(rows.map(r => r.bancada_id))
  const disponiveis = workbenches.filter(w => w.isActive !== false && !usadas.has(w.id))
  const nomeBancada = (id: string) => workbenches.find(w => w.id === id)
  const laudoSelectValue = (v: string | null) => v || '__padrao__'

  const adicionar = async () => {
    if (!novaBancada || !companyId) { toast.error('Escolha a bancada'); return }
    const { error } = await supabase.from('exame_laudo_bancada' as any).insert({
      company_id: companyId, exame_id: examId, bancada_id: novaBancada,
      laudo_id: novoLaudo === '__padrao__' ? null : novoLaudo, ativo: true,
    } as any)
    if (error) { toast.error(error.message); return }
    setNovaBancada(''); setNovoLaudo('__padrao__'); load()
  }

  const atualizar = async (r: Row, patch: Partial<Row>) => {
    const { error } = await supabase.from('exame_laudo_bancada' as any).update(patch as any).eq('id', r.id)
    if (error) { toast.error(error.message); return }
    load()
  }

  const remover = async (r: Row) => {
    const { error } = await supabase.from('exame_laudo_bancada' as any).delete().eq('id', r.id)
    if (error) { toast.error(error.message); return }
    load()
  }

  const selectCls = 'h-9 w-full px-2 rounded-md border bg-background text-sm'

  return (
    <Card className="p-4 space-y-3">
      <div>
        <h3 className="font-semibold">Laudo por bancada</h3>
        <p className="text-xs text-muted-foreground">Qual laudo usar quando o exame roda em cada bancada. Ao trocar a bancada, o laudo troca junto.</p>
      </div>

      {loading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : (
        <div className="space-y-2">
          {rows.map(r => {
            const b = nomeBancada(r.bancada_id)
            return (
              <div key={r.id} className="grid grid-cols-[1fr_1.4fr_auto_auto] gap-3 items-center rounded-lg border p-2">
                <span className="text-sm font-medium flex items-center gap-1.5">
                  {b?.tipo === 'apoio' && <Truck className="h-3.5 w-3.5 text-primary" />}{b?.name || 'Bancada removida'}
                </span>
                <select className={selectCls} value={laudoSelectValue(r.laudo_id)} onChange={e => atualizar(r, { laudo_id: e.target.value === '__padrao__' ? null : e.target.value })}>
                  <option value="__padrao__">Laudo padrão do exame</option>
                  {laudos.map(l => <option key={l.id} value={l.id}>{l.code} · {l.name}</option>)}
                </select>
                <Switch checked={r.ativo} onCheckedChange={v => atualizar(r, { ativo: v })} aria-label="Ativo" />
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => remover(r)} aria-label="Remover">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )
          })}
          {rows.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma bancada ligada ainda.</p>}

          {disponiveis.length > 0 && (
            <div className="grid grid-cols-[1fr_1.4fr_auto] gap-3 items-center pt-2 border-t">
              <select className={selectCls} value={novaBancada} onChange={e => setNovaBancada(e.target.value)}>
                <option value="">Bancada…</option>
                <optgroup label="Internas">
                  {disponiveis.filter(w => w.tipo !== 'apoio').map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </optgroup>
                <optgroup label="Apoio">
                  {disponiveis.filter(w => w.tipo === 'apoio').map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </optgroup>
              </select>
              <select className={selectCls} value={novoLaudo} onChange={e => setNovoLaudo(e.target.value)}>
                <option value="__padrao__">Laudo padrão do exame</option>
                {laudos.map(l => <option key={l.id} value={l.id}>{l.code} · {l.name}</option>)}
              </select>
              <Button size="sm" variant="outline" onClick={adicionar} className="gap-1"><Plus className="h-3.5 w-3.5" /> Adicionar</Button>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
