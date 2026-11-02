import { useCallback, useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { Package, Undo2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useCompanyContext } from '@/context/CompanyContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Material { id: string; nome: string; unidade: string; saldo: number; custo: number | null; fracao: boolean }
interface Use { id: string; nome: string; quantidade: number; custo: number | null; setor_id: string; created_at: string; estornado: boolean }
interface Panel { patient_name: string; setores: {id: string; nome: string}[]; itens: Material[]; usos: Use[]; registrar: boolean; estornar: boolean }
const money = (n: number | null) => n == null ? 'Sem valor cadastrado' : Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const formSchema = z.object({ quantidade: z.coerce.number().finite().positive(), observacao: z.string().trim().max(1000) })

export function PatientMaterials({ context, contextId, active = true }: { context: 'post' | 'admission' | 'medical'; contextId?: string | null; active?: boolean }) {
  const { activeSector } = useCompanyContext()
  const [panel, setPanel] = useState<Panel | null>(null)
  const [sector, setSector] = useState(activeSector?.id || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [reverse, setReverse] = useState<Use | null>(null)
  const [reason, setReason] = useState('')
  const operation = useRef<{ payload: string; key: string } | null>(null)
  const load = useCallback(async () => {
    if (!contextId || !active) { setPanel(null); return }
    setLoading(true)
    const {data, error: failure} = await supabase.rpc('materiais_painel', { _tipo: context, _id: contextId, _setor: sector || undefined })
    if (failure) { setPanel(null); setError(failure.message) }
    else { setPanel(data as unknown as Panel); setError('') }
    setLoading(false)
  }, [context, contextId, active, sector])
  useEffect(() => { setPanel(null); operation.current = null; void load() }, [load])
  useEffect(() => { setSector(activeSector?.id || '') }, [activeSector?.id])
  const item = panel?.itens.find(i => i.id === itemId)
  const keyFor = (payload: string) => {
    if (!operation.current || operation.current.payload !== payload) operation.current = {payload, key: crypto.randomUUID()}
    return operation.current.key
  }
  const save = async () => {
    if (busy || !contextId || !item) return
    const parsed = formSchema.safeParse({quantidade: quantity, observacao: notes})
    if (!parsed.success) { setError('Informe quantidade positiva e observação de até 1000 caracteres.'); return }
    if (!item.fracao && !Number.isInteger(parsed.data.quantidade)) { setError('Este material exige quantidade inteira.'); return }
    if (parsed.data.quantidade > Number(item.saldo)) { setError('Saldo insuficiente no setor.'); return }
    setBusy(true); setError('')
    const payload = JSON.stringify([context,contextId,sector,item.id,parsed.data])
    const {error: failure} = await supabase.rpc('materiais_registrar', {_tipo: context,_id:contextId,_setor:sector,_item:item.id,_quantidade:parsed.data.quantidade,_observacao:parsed.data.observacao,_chave:keyFor(payload)})
    if (failure) setError(failure.message)
    else { operation.current = null; setOpen(false); setItemId(''); setNotes(''); setQuantity('1'); await load() }
    setBusy(false)
  }
  const undo = async () => {
    if (busy || !reverse || !reason.trim()) return
    setBusy(true); setError('')
    const {error: failure} = await supabase.rpc('materiais_estornar', {_uso:reverse.id,_motivo:reason.trim(),_chave:keyFor(JSON.stringify([reverse.id,reason.trim()]))})
    if (failure) setError(failure.message)
    else { operation.current=null; setReverse(null); setReason(''); await load() }
    setBusy(false)
  }
  return <section className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold flex items-center gap-2"><Package className="h-4 w-4" />Materiais usados</h3><Button size="sm" variant="outline" disabled={!active || !contextId || !panel?.registrar || loading} onClick={() => {setOpen(true); setError('')}}><Package className="h-4 w-4 mr-2" />Registrar material usado</Button></div>
    {!active && <p className="text-sm text-muted-foreground">Atendimento inativo.</p>}
    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    {panel?.usos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum material registrado.</p>}
    {panel?.usos.map(u => <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2"><div className="min-w-0"><p className="text-sm font-medium break-words">{u.nome} · {u.quantidade}{u.estornado ? ' · Estornado' : ''}</p><p className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})} · {money(u.custo == null ? null : Number(u.custo)*Number(u.quantidade))}</p></div>{panel.estornar && !u.estornado && <Button size="icon" variant="ghost" title="Estornar material" aria-label={`Estornar ${u.nome}`} onClick={() => {setReverse(u);setReason('');setError('')}}><Undo2 className="h-4 w-4" /></Button>}</div>)}
    <Dialog open={open} onOpenChange={v=>!busy&&setOpen(v)}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Registrar material usado</DialogTitle><DialogDescription>{panel?.patient_name}</DialogDescription></DialogHeader>
      <Label>Setor do profissional</Label><Select value={sector} onValueChange={v=>{setSector(v);setItemId('')}}><SelectTrigger aria-label="Setor do profissional"><SelectValue placeholder="Selecione o setor" /></SelectTrigger><SelectContent>{panel?.setores.map(s=><SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent></Select>
      <Input aria-label="Buscar material com saldo" placeholder="Buscar material" value={search} onChange={e=>setSearch(e.target.value)} />
      <Select value={itemId} onValueChange={setItemId}><SelectTrigger aria-label="Material usado"><SelectValue placeholder="Selecione o material" /></SelectTrigger><SelectContent>{panel?.itens.filter(i=>i.nome.toLowerCase().includes(search.toLowerCase())).map(i=><SelectItem key={i.id} value={i.id}>{i.nome} · {i.saldo} {i.unidade}</SelectItem>)}</SelectContent></Select>
      {sector && !loading && !panel?.itens.length && <p className="text-sm text-muted-foreground">Nenhum material com saldo neste setor.</p>}
      {item && <p className="text-sm">Saldo: {item.saldo} {item.unidade} · {money(item.custo)}</p>}
      <Label htmlFor="material-quantity">Quantidade</Label><Input id="material-quantity" type="number" min={item?.fracao ? '0.0001':'1'} step={item?.fracao ? 'any':'1'} value={quantity} onChange={e=>setQuantity(e.target.value)} />
      <Label htmlFor="material-notes">Observação</Label><Textarea id="material-notes" maxLength={1000} value={notes} onChange={e=>setNotes(e.target.value)} />
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <DialogFooter><Button variant="outline" disabled={busy} onClick={()=>setOpen(false)}>Cancelar</Button><Button disabled={busy||loading||!item||!sector} onClick={save}>Registrar uso</Button></DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={!!reverse} onOpenChange={v=>!busy&&!v&&setReverse(null)}><DialogContent><DialogHeader><DialogTitle>Estornar material</DialogTitle><DialogDescription>{reverse?.nome} · {reverse?.quantidade}</DialogDescription></DialogHeader><Label htmlFor="material-reason">Justificativa obrigatória</Label><Textarea id="material-reason" maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)} />{error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}<DialogFooter><Button variant="outline" disabled={busy} onClick={()=>setReverse(null)}>Cancelar</Button><Button disabled={busy||!reason.trim()} onClick={undo}>Confirmar estorno</Button></DialogFooter></DialogContent></Dialog>
  </section>
}