import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Check, X } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type Status = 'pendente' | 'aprovada' | 'recusada' | 'todas'
interface Row {
  id: string; company_id: string; solicitado_por: string | null; status: string; valor: number
  observacao_empresa: string | null; motivo_recusa: string | null; criado_em: string
  empresa?: string; solicitante?: string
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const STATUS_LABEL: Record<string, string> = { pendente: 'Pendente', aprovada: 'Aprovada', recusada: 'Recusada' }

export default function WhatsappRequestsPage() {
  const [filtro, setFiltro] = useState<Status>('pendente')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [valor, setValor] = useState('')
  const [aprovar, setAprovar] = useState<Row | null>(null)
  const [recusar, setRecusar] = useState<Row | null>(null)
  const [motivo, setMotivo] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('whatsapp_solicitacoes_numero').select('*').order('criado_em', { ascending: false })
    if (filtro !== 'todas') q = q.eq('status', filtro)
    const { data } = await q
    const list = (data || []) as Row[]
    const cIds = [...new Set(list.map(r => r.company_id))]
    const uIds = [...new Set(list.map(r => r.solicitado_por).filter(Boolean))] as string[]
    const [{ data: cs }, { data: us }] = await Promise.all([
      cIds.length ? supabase.from('companies').select('id, nome_fantasia').in('id', cIds) : Promise.resolve({ data: [] as any[] }),
      uIds.length ? supabase.from('profiles').select('id, full_name').in('id', uIds) : Promise.resolve({ data: [] as any[] }),
    ])
    const cm = new Map((cs || []).map((c: any) => [c.id, c.nome_fantasia]))
    const um = new Map((us || []).map((u: any) => [u.id, u.full_name]))
    setRows(list.map(r => ({ ...r, empresa: cm.get(r.company_id) || '—', solicitante: (r.solicitado_por && um.get(r.solicitado_por)) || '—' })))
    setLoading(false)
  }, [filtro])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    void supabase.rpc('whatsapp_valor_numero').then(({ data }) => setValor(String(data ?? 100)))
  }, [])

  const salvarValor = async () => {
    const v = Number(valor.replace(',', '.'))
    if (!Number.isFinite(v) || v < 0) { toast.error('Valor inválido.'); return }
    const { error } = await supabase.rpc('whatsapp_definir_valor', { _valor: v })
    if (error) toast.error(error.message); else toast.success('Valor por número atualizado. Vale para as novas solicitações.')
  }

  const decidir = async (r: Row, ok: boolean, m?: string) => {
    const { error } = await supabase.rpc('whatsapp_decidir_solicitacao', { _id: r.id, _aprovar: ok, _motivo: m ?? null as any })
    if (error) { toast.error(error.message); return }
    toast.success(ok ? `Aprovada: ${r.empresa} ganhou +1 número.` : 'Solicitação recusada.')
    setAprovar(null); setRecusar(null); setMotivo('')
    void load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Solicitações de número WhatsApp</h1>
        <p className="text-sm text-muted-foreground">O pagamento não é processado no sistema: confirme o recebimento antes de aprovar.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <label className="text-xs text-muted-foreground">
          Valor por número novo (R$)
          <Input value={valor} onChange={e => setValor(e.target.value)} className="mt-1 h-9 w-32" inputMode="decimal" />
        </label>
        <Button size="sm" onClick={() => void salvarValor()}>Salvar valor</Button>
        <p className="text-xs text-muted-foreground">Solicitações já feitas mantêm o valor da época.</p>
      </div>

      <div className="flex gap-2">
        {(['pendente', 'aprovada', 'recusada', 'todas'] as Status[]).map(s => (
          <Button key={s} size="sm" variant={filtro === s ? 'default' : 'outline'} onClick={() => setFiltro(s)}>
            {s === 'todas' ? 'Todas' : STATUS_LABEL[s] + 's'}
          </Button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Empresa</th><th className="p-3">Solicitante</th><th className="p-3">Data</th><th className="p-3">Valor</th><th className="p-3">Status</th><th className="p-3" /></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-4 text-muted-foreground">Carregando…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="p-4 text-muted-foreground">Nenhuma solicitação.</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="p-3 font-medium text-foreground">{r.empresa}{r.observacao_empresa && <p className="text-xs font-normal text-muted-foreground">{r.observacao_empresa}</p>}</td>
                <td className="p-3">{r.solicitante}</td>
                <td className="p-3">{new Date(r.criado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td>
                <td className="p-3">{brl(Number(r.valor))}</td>
                <td className="p-3">{STATUS_LABEL[r.status]}{r.motivo_recusa && <p className="text-xs text-muted-foreground">{r.motivo_recusa}</p>}</td>
                <td className="p-3">
                  {r.status === 'pendente' && (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" className="h-8 gap-1" onClick={() => setAprovar(r)}><Check className="h-3.5 w-3.5" /> Aprovar</Button>
                      <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setRecusar(r)}><X className="h-3.5 w-3.5" /> Recusar</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog open={!!aprovar} onOpenChange={o => !o && setAprovar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar solicitação de {aprovar?.empresa}?</AlertDialogTitle>
            <AlertDialogDescription>Confirme que o pagamento de {aprovar ? brl(Number(aprovar.valor)) : ''} foi recebido.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => aprovar && void decidir(aprovar, true)}>Pagamento recebido, aprovar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!recusar} onOpenChange={o => { if (!o) { setRecusar(null); setMotivo('') } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recusar solicitação de {recusar?.empresa}</AlertDialogTitle>
            <AlertDialogDescription>A empresa verá este motivo no aviso.</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Motivo da recusa (obrigatório)" rows={3} />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button variant="destructive" disabled={!motivo.trim()} onClick={() => recusar && void decidir(recusar, false, motivo.trim())}>Recusar</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
