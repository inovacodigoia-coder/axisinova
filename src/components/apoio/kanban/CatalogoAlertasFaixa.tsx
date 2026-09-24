import { useEffect, useState } from 'react'
import { PackageX } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

const db = supabase as any
interface Alerta { id: string; tipo: string; mensagem: string; created_at: string }

/** Exceções do catálogo do Pardini (exame desativado / material mudou) antes de chegar pedido novo */
export function CatalogoAlertasFaixa() {
  const [itens, setItens] = useState<Alerta[]>([])
  const load = () => db.from('apoio_catalogo_alerta').select('id, tipo, mensagem, created_at').eq('lido', false).in('tipo', ['desativado', 'material']).order('created_at', { ascending: false }).limit(50)
    .then(({ data }: any) => setItens(data || []))
  useEffect(() => { load() }, [])
  if (!itens.length) return null
  const ciente = async (id: string) => { await db.from('apoio_catalogo_alerta').update({ lido: true }).eq('id', id); load() }
  return (
    <div className="rounded-2xl border border-warning/40 bg-warning/5 p-3">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-warning"><PackageX className="h-4 w-4" />Catálogo do Pardini ({itens.length})</p>
      <div className="flex gap-3 overflow-x-auto">
        {itens.map(a => (
          <div key={a.id} className="min-w-[260px] rounded-xl border border-border bg-card p-3 text-xs">
            <p className="font-semibold">{a.tipo === 'desativado' ? 'Exame desativado no Pardini' : 'Material mudou no Pardini'}</p>
            <p className="mt-1 text-muted-foreground">{a.mensagem}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-muted-foreground">{new Date(a.created_at).toLocaleDateString('pt-BR')}</span>
              <button onClick={() => ciente(a.id)} className="text-primary hover:underline">Ciente</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
