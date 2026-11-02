import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Check, X, Plus, Package, RotateCcw, ArrowRightLeft, FlaskConical } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/integrations/supabase/client'
import { useAlmoxarifado } from '@/hooks/useAlmoxarifado'
import { useMedicamentos } from '@/hooks/useMedicamentos'
import { addDemoRequest, createInventoryDemo, decideDemo, InventoryCategory, InventoryState, quantityAt, RequestLine } from '@/lib/almoxarifado'

const labels = { pendente: 'Pendente', aprovada: 'Aprovada', recusada: 'Recusada' }
const categories = { material: 'Material', equipamento: 'Equipamento', acessorio: 'Acessório', medicamento: 'Medicamento' }
const freshItem = { nome: '', categoria: 'material' as InventoryCategory, unidade: 'unidade', quantidade: '0', medicamento: '', apresentacao: '', principio: '', forma: '' }
export default function AlmoxarifadoPage({ demoOnly = false, initialView = 'solicitacoes', pharmacy = false }: { demoOnly?: boolean; initialView?: string; pharmacy?: boolean }) {
  const [params, setParams] = useSearchParams()
  const demo = demoOnly || params.get('modo') === 'demo'
  const real = useAlmoxarifado(!demo)
  const medicines = useMedicamentos(true)
  const [demoState, setDemoState] = useState<InventoryState>(createInventoryDemo)
  const state = demo ? demoState : real.state
  const access = demo ? { aprovar: true, cadastrar: true, entrada: true } : real.access
  const [view, setView] = useState(initialView)
  const [sector, setSector] = useState('todos')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('todos')
  const [newRequest, setNewRequest] = useState(false)
  const [requestSector, setRequestSector] = useState('')
  const [destination, setDestination] = useState<'setor' | 'farmacia'>(pharmacy ? 'farmacia' : 'setor')
  const [lines, setLines] = useState<RequestLine[]>([{ item_id: '', quantidade: 1 }])
  const [notes, setNotes] = useState('')
  const [decision, setDecision] = useState<{ id: string; approve: boolean } | null>(null)
  const [reason, setReason] = useState('')
  const [itemForm, setItemForm] = useState(false)
  const [item, setItem] = useState(freshItem)
  const [entry, setEntry] = useState<string | null>(null)
  const [entryQ, setEntryQ] = useState('1')
  const [busy, setBusy] = useState(false)
  const sectorName = (id: string) => state.setores.find(s => s.id === id)?.nome || id
  const localName = (local: string) => local === 'almoxarifado' ? 'Almoxarifado' : local === 'farmacia' ? 'Farmácia' : local === 'entrada' ? 'Entrada' : sectorName(local.replace('setor:', ''))
  const itemName = (id: string) => state.itens.find(i => i.id === id)?.nome || id
  const local = pharmacy || (demo && sector === 'demo-sector-4') ? 'farmacia' : sector === 'todos' ? 'almoxarifado' : `setor:${sector}`
  const items = state.itens.filter(i => i.nome.toLowerCase().includes(search.toLowerCase()) && (!pharmacy || quantityAt(state, i.id, 'farmacia') > 0) && (local === 'almoxarifado' || quantityAt(state, i.id, local) > 0))
  const requests = state.solicitacoes.filter(r => (sector === 'todos' || r.setor_id === sector) && (status === 'todos' || r.status === status) && (!pharmacy || r.destino === 'farmacia'))
  const perform = async (action: () => Promise<void> | void, success: string) => {
    if (busy) return
    setBusy(true)
    try { await action(); toast.success(success) } catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível concluir') } finally { setBusy(false) }
  }
  const confirmDecision = () => perform(async () => {
    if (!decision) return
    if (demo) setDemoState(decideDemo(demoState, decision.id, decision.approve, reason))
    else await real.decide(decision.id, decision.approve, reason)
    setDecision(null); setReason('')
  }, decision?.approve ? 'Aprovada: materiais transferidos' : 'Solicitação recusada')
  const submit = () => perform(async () => {
    if (demo) setDemoState(addDemoRequest(demoState, requestSector, destination, lines, notes))
    else await real.submit(requestSector, destination, lines, notes)
    setNewRequest(false); setNotes(''); setLines([{ item_id: '', quantidade: 1 }])
  }, 'Solicitação enviada ao almoxarifado')
  const saveItem = () => perform(async () => {
    if (!item.nome.trim() || !item.unidade.trim() || !Number.isFinite(Number(item.quantidade)) || Number(item.quantidade) < 0) throw new Error('Informe nome, unidade e saldo válido')
    if (demo) {
      const id = crypto.randomUUID()
      setDemoState({ ...demoState, itens: [...demoState.itens, { id, nome: item.nome, categoria: item.categoria, unidade: item.unidade }], saldos: [...demoState.saldos, { item_id: id, local: 'almoxarifado', quantidade: Number(item.quantidade) }] })
    } else {
      const { error } = await supabase.rpc('almox_item_criar', { _nome: item.nome, _categoria: item.categoria, _unidade: item.unidade, _quantidade: Number(item.quantidade), _medicamento: item.medicamento || undefined, _dados: { apresentacao: item.apresentacao, principio_ativo: item.principio, forma: item.forma } })
      if (error) throw new Error(error.message)
      await real.reload()
    }
    setItemForm(false); setItem(freshItem)
  }, 'Item cadastrado')
  const addEntry = () => perform(async () => {
    if (!entry || !Number.isFinite(Number(entryQ)) || Number(entryQ) <= 0) throw new Error('Quantidade inválida')
    if (demo) setDemoState({ ...demoState, saldos: demoState.saldos.map(b => b.item_id === entry && b.local === 'almoxarifado' ? { ...b, quantidade: b.quantidade + Number(entryQ) } : b), movimentos: [{ id: crypto.randomUUID(), item_id: entry, origem: 'entrada', destino: 'almoxarifado', quantidade: Number(entryQ), created_at: new Date().toISOString() }, ...demoState.movimentos] })
    else { const { error } = await supabase.rpc('almox_entrada', { _item: entry, _quantidade: Number(entryQ) }); if (error) throw new Error(error.message); await real.reload() }
    setEntry(null)
  }, 'Entrada registrada')
  return <div className={demoOnly ? 'min-h-screen bg-background text-foreground p-4 sm:p-8 space-y-6' : 'space-y-6'}>
    <div className="flex flex-wrap justify-between items-start gap-3"><div><h1 className="text-2xl font-bold">{demo ? 'Almoxarifado — Demonstração' : pharmacy ? 'Abastecimento da Farmácia' : 'Almoxarifado e setores'}</h1>{demo && <p className="text-muted-foreground mt-1">Dados fictícios • nenhum estoque ou medicamento real é alterado</p>}</div><div className="flex flex-wrap gap-2">{demo ? <Button variant="outline" onClick={() => { setDemoState(createInventoryDemo()); toast.success('Demonstração reiniciada') }}><RotateCcw className="h-4 w-4 mr-2" />Reiniciar demonstração</Button> : <Button variant="outline" asChild><Link to="/demonstracao/almoxarifado"><FlaskConical className="h-4 w-4 mr-2" />Demonstração</Link></Button>}{!demoOnly && <Button variant="outline" onClick={() => setParams(demo ? {} : { modo: 'demo' })}>{demo ? 'Dados reais' : 'Modo demonstração'}</Button>}<Button onClick={() => { setRequestSector(sector === 'todos' ? state.setores[0]?.id || '' : sector); setNewRequest(true) }} disabled={!state.setores.length}><Plus className="mr-2 h-4 w-4" />Nova solicitação</Button></div></div>
    {real.error && !demo && <Alert variant="destructive"><AlertDescription>{real.error}</AlertDescription></Alert>}
    <div className="flex flex-wrap gap-6 border-y border-border py-4">{(['pendente','aprovada','recusada'] as const).map(s => <div key={s}><p className="text-sm text-muted-foreground">{labels[s]}s</p><p className="text-2xl font-semibold">{state.solicitacoes.filter(r => r.status === s && (!pharmacy || r.destino === 'farmacia')).length}</p></div>)}<div><p className="text-sm text-muted-foreground">Setores</p><p className="text-2xl font-semibold">{state.setores.length}</p></div></div>
    <Tabs value={view} onValueChange={setView}><TabsList className="flex h-auto flex-wrap justify-start"><TabsTrigger value="solicitacoes">Solicitações</TabsTrigger><TabsTrigger value="itens">{pharmacy ? 'Estoque Farmácia' : 'Materiais por setor'}</TabsTrigger>{demo && <TabsTrigger value="medicamentos">Medicamentos da Farmácia</TabsTrigger>}<TabsTrigger value="movimentos">Movimentações</TabsTrigger></TabsList></Tabs>
    <div className="flex flex-wrap gap-3 items-center"><Select value={sector} onValueChange={setSector}><SelectTrigger className="w-full sm:w-64" aria-label="Filtrar setor"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">{view === 'itens' && !pharmacy ? 'Almoxarifado central' : 'Todos os setores'}</SelectItem>{state.setores.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent></Select>{view === 'solicitacoes' && <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-full sm:w-44" aria-label="Filtrar situação"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todas as situações</SelectItem>{Object.entries(labels).map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>}{view === 'itens' && <><Input className="max-w-sm" placeholder="Buscar material" value={search} onChange={e => setSearch(e.target.value)} />{access.cadastrar && <Button variant="outline" onClick={() => setItemForm(true)}><Package className="mr-2 h-4 w-4" />Novo item</Button>}</>}</div>
    {!demo && real.loading && <p className="text-muted-foreground">Carregando…</p>}
    {view === 'solicitacoes' && <Table><TableHeader><TableRow><TableHead>Solicitação / setor</TableHead><TableHead>Materiais</TableHead><TableHead>Situação</TableHead><TableHead>Destino</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader><TableBody>{requests.map(r => <TableRow key={r.id}><TableCell><div className="font-medium">{sectorName(r.setor_id)}</div><div className="text-xs text-muted-foreground">{r.id.slice(0,16)} • {new Date(r.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</div><p className="text-xs mt-1">{r.observacao}</p></TableCell><TableCell>{r.itens.map(l => <div key={l.item_id} className="text-sm">{l.quantidade} {state.itens.find(i => i.id === l.item_id)?.unidade} • {itemName(l.item_id)}</div>)}</TableCell><TableCell><Badge variant={r.status === 'recusada' ? 'destructive' : r.status === 'aprovada' ? 'default' : 'secondary'}>{labels[r.status]}</Badge>{r.motivo && <p className="text-xs text-muted-foreground mt-1 max-w-48">{r.motivo}</p>}</TableCell><TableCell>{r.destino === 'farmacia' ? 'Farmácia' : sectorName(r.setor_id)}</TableCell><TableCell>{r.status === 'pendente' && access.aprovar && <div className="flex flex-wrap gap-1"><Button size="sm" disabled={busy} onClick={() => setDecision({ id: r.id, approve: true })}><Check className="h-4 w-4 mr-1" />Aprovar</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => setDecision({ id: r.id, approve: false })}><X className="h-4 w-4 mr-1" />Recusar</Button></div>}</TableCell></TableRow>)}{requests.length===0 && <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Nenhuma solicitação encontrada.</TableCell></TableRow>}</TableBody></Table>}
    {view === 'itens' && <Table><TableHeader><TableRow><TableHead>Material</TableHead><TableHead>Categoria</TableHead><TableHead>Local</TableHead><TableHead>Saldo</TableHead><TableHead>Unidade</TableHead><TableHead /></TableRow></TableHeader><TableBody>{items.map(i => <TableRow key={i.id}><TableCell className="font-medium">{i.nome}</TableCell><TableCell>{categories[i.categoria]}</TableCell><TableCell>{localName(local)}</TableCell><TableCell>{quantityAt(state,i.id,local)}</TableCell><TableCell>{i.unidade}</TableCell><TableCell>{local==='almoxarifado' && access.entrada && <Button size="sm" variant="outline" onClick={() => { setEntry(i.id); setEntryQ('1') }}><Plus className="h-4 w-4 mr-1" />Entrada</Button>}</TableCell></TableRow>)}{items.length===0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Nenhum material recebido neste local.</TableCell></TableRow>}</TableBody></Table>}
    {view === 'medicamentos' && demo && <Table><TableHeader><TableRow><TableHead>Medicamento</TableHead><TableHead>Saldo Farmácia</TableHead><TableHead>Unidade</TableHead><TableHead>Situação</TableHead></TableRow></TableHeader><TableBody>{state.itens.filter(i => i.categoria==='medicamento' && i.medicamento_id).map(i => <TableRow key={i.id}><TableCell className="font-medium">{i.nome}</TableCell><TableCell>{quantityAt(state,i.id,'farmacia')}</TableCell><TableCell>{i.unidade}</TableCell><TableCell><Badge variant="outline">Recebido • demonstração</Badge></TableCell></TableRow>)}</TableBody></Table>}
    {view === 'movimentos' && <Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Material</TableHead><TableHead>Origem → destino</TableHead><TableHead>Quantidade</TableHead></TableRow></TableHeader><TableBody>{state.movimentos.filter(m => (sector==='todos' || m.setor_id===sector) && (!pharmacy || m.destino==='farmacia')).map(m => <TableRow key={m.id}><TableCell>{new Date(m.created_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}</TableCell><TableCell>{itemName(m.item_id)}</TableCell><TableCell>{localName(m.origem)} → {localName(m.destino)}</TableCell><TableCell>{m.quantidade}</TableCell></TableRow>)}{state.movimentos.length===0 && <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">Nenhuma movimentação.</TableCell></TableRow>}</TableBody></Table>}
    <Dialog open={newRequest} onOpenChange={setNewRequest}><DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Solicitar materiais ao almoxarifado</DialogTitle></DialogHeader><Label>Setor solicitante</Label><Select value={requestSector} onValueChange={setRequestSector}><SelectTrigger aria-label="Setor solicitante"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{state.setores.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent></Select><Label>Destino do estoque</Label><Select value={destination} onValueChange={v => setDestination(v as 'setor'|'farmacia')}><SelectTrigger aria-label="Destino do estoque"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="setor">Estoque do setor solicitante</SelectItem><SelectItem value="farmacia">Estoque da Farmácia</SelectItem></SelectContent></Select>{lines.map((l,n) => <div className="flex gap-2 items-center" key={n}><Select value={l.item_id} onValueChange={v => setLines(lines.map((x,k)=>k===n?{...x,item_id:v}:x))}><SelectTrigger className="flex-1 min-w-0" aria-label={`Material ${n+1}`}><SelectValue placeholder="Selecione o material" /></SelectTrigger><SelectContent>{state.itens.map(i => <SelectItem key={i.id} value={i.id}>{i.nome} ({quantityAt(state,i.id,'almoxarifado')} {i.unidade})</SelectItem>)}</SelectContent></Select><Input className="w-24" type="number" min="0.001" step="any" aria-label={`Quantidade ${n+1}`} value={l.quantidade} onChange={e=>setLines(lines.map((x,k)=>k===n?{...x,quantidade:Number(e.target.value)}:x))} /><Button variant="ghost" size="icon" title="Remover item" onClick={()=>setLines(lines.filter((_,k)=>k!==n))}><X className="h-4 w-4" /></Button></div>)}<Button variant="outline" onClick={()=>setLines([...lines,{item_id:'',quantidade:1}])}><Plus className="h-4 w-4 mr-2" />Adicionar material</Button><Label htmlFor="request-notes">Observação</Label><Input id="request-notes" value={notes} onChange={e=>setNotes(e.target.value)} /><DialogFooter><Button variant="outline" onClick={()=>setNewRequest(false)}>Cancelar</Button><Button disabled={busy||!lines.length||lines.some(l=>!l.item_id||l.quantidade<=0)||!requestSector} onClick={submit}>Enviar solicitação</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={!!decision} onOpenChange={o=>!o&&setDecision(null)}><DialogContent><DialogHeader><DialogTitle>{decision?.approve?'Aprovar e transferir materiais':'Recusar solicitação'}</DialogTitle></DialogHeader>{decision?.approve && <p className="text-sm text-muted-foreground">O saldo sai do almoxarifado e entra no destino desta solicitação.</p>}<Label htmlFor="decision-reason">{decision?.approve?'Observação (opcional)':'Motivo da recusa'}</Label><Input id="decision-reason" value={reason} onChange={e=>setReason(e.target.value)} /><DialogFooter><Button variant="outline" onClick={()=>setDecision(null)}>Cancelar</Button><Button disabled={busy||(!decision?.approve&&!reason.trim())} onClick={confirmDecision}><ArrowRightLeft className="mr-2 h-4 w-4" />{decision?.approve?'Confirmar transferência':'Confirmar recusa'}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={itemForm} onOpenChange={setItemForm}><DialogContent><DialogHeader><DialogTitle>Novo item do almoxarifado</DialogTitle></DialogHeader><Label>Nome</Label><Input aria-label="Nome do item" value={item.nome} onChange={e=>setItem({...item,nome:e.target.value})} /><Label>Categoria</Label><Select value={item.categoria} onValueChange={v=>setItem({...item,categoria:v as InventoryCategory})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(categories).map(([v,l])=><SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select><Label>Unidade</Label><Input value={item.unidade} onChange={e=>setItem({...item,unidade:e.target.value})} /><Label>Quantidade inicial</Label><Input type="number" min="0" value={item.quantidade} onChange={e=>setItem({...item,quantidade:e.target.value})} />{item.categoria==='medicamento'&&<><Label>Medicamento</Label><Select value={item.medicamento || "novo"} onValueChange={v => { const m = medicines.itens.find(m => m.id === v); setItem({...item, medicamento: v === "novo" ? "" : v, nome: m?.nome || item.nome, unidade: m?.unidade || item.unidade}) }}><SelectTrigger aria-label="Vincular medicamento"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="novo">Novo — cadastrar ao receber na Farmácia</SelectItem>{!demo && medicines.itens.map(m => <SelectItem key={m.id} value={m.id}>{m.nome} {m.apresentacao}</SelectItem>)}</SelectContent></Select><Label>Apresentação</Label><Input value={item.apresentacao} onChange={e=>setItem({...item,apresentacao:e.target.value})} /></>}<DialogFooter><Button variant="outline" onClick={()=>setItemForm(false)}>Cancelar</Button><Button disabled={busy||!item.nome.trim()} onClick={saveItem}>Salvar item</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={!!entry} onOpenChange={o=>!o&&setEntry(null)}><DialogContent><DialogHeader><DialogTitle>Entrada — {entry&&itemName(entry)}</DialogTitle></DialogHeader><Label>Quantidade</Label><Input type="number" min="0.001" step="any" value={entryQ} onChange={e=>setEntryQ(e.target.value)} /><DialogFooter><Button variant="outline" onClick={()=>setEntry(null)}>Cancelar</Button><Button disabled={busy} onClick={addEntry}>Registrar entrada</Button></DialogFooter></DialogContent></Dialog>
  </div>
}