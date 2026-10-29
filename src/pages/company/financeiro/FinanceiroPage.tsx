import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import type { Database, Json } from '@/integrations/supabase/types'
import { useFinanceiroAcesso } from '@/hooks/useFinanceiro'
import { dinheiro, hojeFinanceiro, csvFinanceiro, FORMAS } from '@/lib/financeiro'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Download, Plus, Pencil, Eye, RefreshCw, Lock, Paperclip, Undo2, Ban } from 'lucide-react'
import { toast } from 'sonner'
import { VinculoPessoa } from '@/components/financeiro/VinculoPessoa'
import { TransferenciasContas } from '@/components/financeiro/TransferenciasContas'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts'
type Conta = Database['public']['Tables']['financeiro_contas']['Row']
type Categoria = Database['public']['Tables']['financeiro_categorias']['Row']
type Lancamento = Database['public']['Tables']['financeiro_lancamentos']['Row']
type Baixa = Database['public']['Tables']['financeiro_baixas']['Row']
const tabs = [['resumo','Resumo'],['receber','Contas a receber'],['pagar','Contas a pagar'],['contas','Contas'],['categorias','Categorias'],['fluxo','Fluxo de caixa']]
const selectClass = 'h-10 border border-input rounded-md bg-background px-3 text-sm w-full'
const th = 'p-3 text-left text-muted-foreground font-medium whitespace-nowrap'
const td = 'p-3 text-sm'
const vazio = <p className="py-12 text-center text-muted-foreground">Nenhum registro encontrado.</p>
export default function FinanceiroPage() {
  const acesso = useFinanceiroAcesso()
  const location = useLocation()
  const [tab,setTab] = useState(location.pathname.endsWith('/receber') ? 'receber' : location.pathname.endsWith('/pagar') ? 'pagar' : 'resumo')
  const [contas,setContas] = useState<Conta[]>([])
  const [cats,setCats] = useState<Categoria[]>([])
  const [lanc,setLanc] = useState<Lancamento[]>([])
  const [baixas,setBaixas] = useState<Baixa[]>([])
  const [saldos,setSaldos] = useState<{id:string;nome:string;saldo:number}[]>([])
  const [busy,setBusy] = useState(false)
  const [loading,setLoading] = useState(false)
  const [error,setError] = useState('')
  const [q,setQ] = useState('')
  const [from,setFrom] = useState('')
  const [to,setTo] = useState('')
  const [status,setStatus] = useState('todos')
  const [cat,setCat] = useState('')
  const [conta,setConta] = useState('')
  const [modal,setModal] = useState<string | null>(null)
  const [editing,setEditing] = useState<string | null>(null)
  const [detail,setDetail] = useState<Lancamento | null>(null)
  const [form,setForm] = useState<Record<string,string>>({})
  const [file,setFile] = useState<File | null>(null)
  const [reason,setReason] = useState('')
  const [target,setTarget] = useState('')
  const hoje = hojeFinanceiro()
  const load = useCallback(async () => {
    if (!acesso?.ver) return
    setLoading(true); setError('')
    // Fetch every authorized row rather than silently truncating exports at the API row limit.
    async function all<T>(table: 'financeiro_contas'|'financeiro_categorias'|'financeiro_lancamentos'|'financeiro_baixas') {
      const rows: T[] = []
      for (let start=0;;start+=500) {
        const {data,error} = await supabase.from(table).select('*').order('id').range(start,start+499)
        if (error) throw error
        rows.push(...data as unknown as T[])
        if (data.length<500) return rows
      }
    }
    try {
      const [c,k,l,b,s] = await Promise.all([all<Conta>('financeiro_contas'),all<Categoria>('financeiro_categorias'),all<Lancamento>('financeiro_lancamentos'),all<Baixa>('financeiro_baixas'),supabase.rpc('financeiro_saldos',{_ate:hojeFinanceiro()})])
      if (s.error) throw s.error
      setContas(c); setCats(k); setLanc(l); setBaixas(b); setSaldos(s.data || [])
    } catch(e) { setContas([]); setCats([]); setLanc([]); setBaixas([]); setSaldos([]); setError(e instanceof Error ? e.message : (e as {message?:string}).message || 'Não foi possível carregar o financeiro') }
    finally { setLoading(false) }
  }, [acesso?.ver])
  useEffect(() => { void load() },[load])
  const paid = (id:string) => baixas.filter(b=>b.lancamento_id===id && !b.estornado_em).reduce((a,b)=>a+Number(b.valor),0)
  const restante = (l:Lancamento) => Number(l.valor)-paid(l.id)
  const vencido = (l:Lancamento) => ['aberto','parcial'].includes(l.status) && l.vencimento<hoje
  const catName = (id:string) => { const c=cats.find(x=>x.id===id); return c ? (c.pai_id ? `${cats.find(x=>x.id===c.pai_id)?.nome} / ` : '')+c.nome : '—' }
  const contaName = (id:string) => contas.find(c=>c.id===id)?.nome || '—'
  const matches = (l:Lancamento,date:string,account:string) => (!q || `${l.descricao} ${l.pagador || ''} ${l.observacoes || ''}`.toLowerCase().includes(q.toLowerCase())) && (!from || date>=from) && (!to || date<=to) && (!cat || l.categoria_id===cat) && (!conta || account===conta) && (status==='todos' || (status==='vencido' ? vencido(l) : l.status===status))
  const filtered = lanc.filter(l => matches(l,l.vencimento,l.conta_id) && (tab!=='receber' || l.tipo==='receita') && (tab!=='pagar' || l.tipo==='despesa')).sort((a,b)=>a.vencimento.localeCompare(b.vencimento))
  const flux = useMemo(() => {
    const rows: {data:string;tipo:string;descricao:string;conta:string;categoria:string;valor:number;natureza:string}[]=[]
    for (const l of lanc) {
      if (['aberto','parcial'].includes(l.status) && matches(l,l.vencimento,l.conta_id)) rows.push({data:l.vencimento,tipo:'Previsto',descricao:l.descricao,conta:contaName(l.conta_id),categoria:catName(l.categoria_id),valor:restante(l)*(l.tipo==='receita'?1:-1),natureza:l.tipo})
      for (const b of baixas.filter(b=>b.lancamento_id===l.id && !b.estornado_em)) if(matches(l,b.data,b.conta_id)) rows.push({data:b.data,tipo:'Realizado',descricao:l.descricao,conta:contaName(b.conta_id),categoria:catName(l.categoria_id),valor:(Number(b.valor)+Number(b.juros)+Number(b.multa)-Number(b.desconto))*(l.tipo==='receita'?1:-1),natureza:l.tipo})
    }
    return rows.sort((a,b)=>a.data.localeCompare(b.data))
  },[lanc,baixas,contas,cats,q,from,to,cat,conta,status])
  const chart = Array.from({length:30},(_,i)=> {
    const d=new Date(hoje+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+i); const date=d.toISOString().slice(0,10)
    return {dia:date.slice(8)+'/'+date.slice(5,7),receber:filtered.filter(l=>l.vencimento===date && l.tipo==='receita' && ['aberto','parcial'].includes(l.status)).reduce((a,l)=>a+restante(l),0),pagar:filtered.filter(l=>l.vencimento===date && l.tipo==='despesa' && ['aberto','parcial'].includes(l.status)).reduce((a,l)=>a+restante(l),0)}
  })
  const open = (kind:string,id?:string) => {
    setEditing(id || null); setFile(null); setReason('')
    const c=contas.find(x=>x.id===id), k=cats.find(x=>x.id===id), l=lanc.find(x=>x.id===id)
    if(kind==='conta') setForm(c ? Object.fromEntries(Object.entries(c).map(([k,v])=>[k,String(v ?? '')])) : {nome:'',tipo:'banco',saldo_inicial:'0',data_inicial:hoje,ativa:'true'})
    if(kind==='categoria') setForm(k ? Object.fromEntries(Object.entries(k).map(([k,v])=>[k,String(v ?? '')])) : {nome:'',tipo:'receita',pai_id:'',ativa:'true'})
    if(kind==='lancamento') setForm(l ? {...Object.fromEntries(Object.entries(l).map(([k,v])=>[k,String(v ?? '')])),modo:'unico',quantidade:'1'} : {descricao:'',tipo:tab==='pagar'?'despesa':'receita',valor:'',categoria_id:'',conta_id:'',competencia:hoje,vencimento:hoje,forma_prevista:'pix',modo:'unico',quantidade:'1'})
    if(kind==='baixa' && l) { setDetail(l); setForm({valor:String(restante(l)),conta_id:l.conta_id,data:hoje,forma:'pix',juros:'0',multa:'0',desconto:'0'}) }
    setModal(kind)
  }
  const save = async () => {
    if(!modal || !acesso) return
    setBusy(true)
    try {
      let result
      if(modal==='conta' || modal==='categoria') result=await supabase.rpc('financeiro_configurar',{_entidade:modal,_dados:form as Json,...(editing?{_id:editing}:{})})
      else if(modal==='lancamento') {
        let path=form.comprovante_path || ''
        if(file) { path=`${acesso.company_id}/${crypto.randomUUID()}/${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`; const {error}=await supabase.storage.from('financeiro-comprovantes').upload(path,file); if(error) throw error }
        result=await supabase.rpc('financeiro_lancar',{_dados:{...form,comprovante_path:path} as Json,_quantidade:Number(form.quantidade),_modo:form.modo,...(editing?{_id:editing}:{})})
      } else if(modal==='baixa' && detail) result=await supabase.rpc('financeiro_baixar',{_lancamento:detail.id,_dados:form as Json})
      else if(modal==='cancelar') result=await supabase.rpc('financeiro_cancelar',{_lancamento:target,_motivo:reason})
      else if(modal==='estornar') result=await supabase.rpc('financeiro_estornar',{_baixa:target,_motivo:reason})
      else if(modal==='lgpd') result=await supabase.rpc('financeiro_lgpd_desvincular',{_paciente:form.paciente_id})
      if(result?.error) throw result.error
      toast.success('Registro salvo'); setModal(null); setDetail(null); await load()
    } catch(e) { toast.error(e instanceof Error ? e.message : (e as {message?:string}).message || 'Não foi possível salvar') }
    finally {setBusy(false)}
  }
  const field = (name:string,label:string,type='text',required=false) => <label className="space-y-1 text-sm" key={name}><span>{label}</span><Input aria-label={label} type={type} required={required} step={type==='number'?'0.01':undefined} value={form[name] || ''} onChange={e=>setForm(f=>({...f,[name]:e.target.value}))} /></label>
  const select = (name:string,label:string,options:{id:string;nome:string}[]) => <label className="space-y-1 text-sm"><span>{label}</span><select aria-label={label} className={selectClass} value={form[name] || ''} onChange={e=>setForm(f=>({...f,[name]:e.target.value}))}><option value="">Selecionar</option>{options.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}</select></label>
  const exportCsv = () => {
    const rows=tab==='fluxo'?flux:filtered.map(l=>({descricao:l.descricao,tipo:l.tipo,valor:l.valor,pago:paid(l.id),saldo:restante(l),vencimento:l.vencimento,competencia:l.competencia,status:vencido(l)?'vencido':l.status,conta:contaName(l.conta_id),categoria:catName(l.categoria_id),pagador:l.pagador}))
    if(!rows.length) {toast.info('Nenhum registro para exportar');return}
    const url=URL.createObjectURL(new Blob([csvFinanceiro(rows)],{type:'text/csv;charset=utf-8;'})); const a=document.createElement('a');a.href=url;a.download='financeiro.csv';a.click();URL.revokeObjectURL(url)
  }
  if(!acesso) return <p className="text-muted-foreground">Carregando…</p>
  if(!acesso.ver) return <div className="py-16 text-center space-y-3"><Lock className="h-8 w-8 mx-auto text-muted-foreground"/><h1 className="text-xl font-semibold">Financeiro indisponível</h1><p className="text-muted-foreground">Módulo desligado ou acesso não autorizado.</p></div>
  return <section className="space-y-5 min-w-0">
    <header className="flex flex-wrap justify-between gap-3"><h1 className="text-2xl font-bold">Financeiro</h1><div className="flex gap-2"><Button variant="outline" size="icon" aria-label="Atualizar" onClick={()=>void load()}><RefreshCw className="h-4 w-4"/></Button>{acesso.lancar && <Button onClick={()=>open('lancamento')}><Plus className="h-4 w-4 mr-2"/>Novo lançamento</Button>}</div></header>
    <Tabs value={tab} onValueChange={setTab}><TabsList className="h-auto flex flex-wrap justify-start">{tabs.map(([id,name])=><TabsTrigger key={id} value={id}>{name}</TabsTrigger>)}</TabsList></Tabs>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {loading && <p className="text-muted-foreground">Carregando registros…</p>}
    {!['contas','categorias'].includes(tab) && <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7 items-end">
      <Input aria-label="Buscar" placeholder="Buscar descrição ou pagador" value={q} onChange={e=>setQ(e.target.value)}/>
      <label className="text-xs space-y-1">De<Input aria-label="Data inicial do filtro" type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label className="text-xs space-y-1">Até<Input aria-label="Data final do filtro" type="date" value={to} onChange={e=>setTo(e.target.value)}/></label>
      <select aria-label="Filtrar status" className={selectClass} value={status} onChange={e=>setStatus(e.target.value)}>{['todos','aberto','parcial','pago','cancelado','vencido'].map(s=><option key={s}>{s}</option>)}</select>
      <select aria-label="Filtrar categoria" className={selectClass} value={cat} onChange={e=>setCat(e.target.value)}><option value="">Todas as categorias</option>{cats.map(c=><option key={c.id} value={c.id}>{catName(c.id)}</option>)}</select>
      <select aria-label="Filtrar conta" className={selectClass} value={conta} onChange={e=>setConta(e.target.value)}><option value="">Todas as contas</option>{contas.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select>
      <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2"/>CSV</Button>
    </div>}
    {tab==='resumo' && <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[['A receber',filtered.filter(l=>l.tipo==='receita' && ['aberto','parcial'].includes(l.status)).reduce((s,l)=>s+restante(l),0)],['A pagar',filtered.filter(l=>l.tipo==='despesa' && ['aberto','parcial'].includes(l.status)).reduce((s,l)=>s+restante(l),0)],['Vencidos',filtered.filter(vencido).reduce((s,l)=>s+restante(l),0)],['Saldo das contas',saldos.filter(s=>!conta || s.id===conta).reduce((s,c)=>s+Number(c.saldo),0)]].map(([name,value])=><div key={name} className="border border-border rounded-lg p-4"><p className="text-sm text-muted-foreground">{name}</p><strong className="text-xl">{dinheiro(Number(value))}</strong></div>)}</div><h2 className="font-semibold">Próximos 30 dias</h2><div className="h-72 w-full"><ResponsiveContainer><BarChart data={chart}><XAxis dataKey="dia"/><YAxis/><Tooltip formatter={v=>dinheiro(Number(v))}/><Legend/><Bar dataKey="receber" name="A receber" fill="hsl(var(--primary))"/><Bar dataKey="pagar" name="A pagar" fill="hsl(var(--destructive))"/></BarChart></ResponsiveContainer></div></>}
    {['receber','pagar'].includes(tab) && <div className="overflow-x-auto"><table className="w-full"><thead><tr>{['Descrição','Categoria','Conta','Vencimento','Valor','Saldo','Status','Ações'].map(h=><th className={th} key={h}>{h}</th>)}</tr></thead><tbody>{filtered.map(l=><tr className="border-t border-border" key={l.id}><td className={td}>{l.descricao}{(l.parcelas || 0)>1 && <span className="text-muted-foreground ml-2">{l.parcela}/{l.parcelas}</span>}<p className="text-xs text-muted-foreground">{l.pagador}</p></td><td className={td}>{catName(l.categoria_id)}</td><td className={td}>{contaName(l.conta_id)}</td><td className={td}>{l.vencimento.split('-').reverse().join('/')}</td><td className={td}>{dinheiro(Number(l.valor))}</td><td className={td}>{dinheiro(restante(l))}</td><td className={td}><Badge variant={vencido(l)?'destructive':'secondary'}>{vencido(l)?'vencido':l.status}</Badge></td><td className={td}><div className="flex gap-1"><Button aria-label="Ver lançamento" title="Ver lançamento" variant="ghost" size="icon" onClick={()=>{setDetail(l);setModal('detalhe')}}><Eye className="h-4 w-4"/></Button>{acesso.lancar && l.status==='aberto' && !baixas.some(b=>b.lancamento_id===l.id) && <Button title="Editar" aria-label="Editar lançamento" variant="ghost" size="icon" onClick={()=>open('lancamento',l.id)}><Pencil className="h-4 w-4"/></Button>}{acesso.baixar && ['aberto','parcial'].includes(l.status) && <Button variant="outline" size="sm" onClick={()=>open('baixa',l.id)}>Baixar</Button>}{acesso.cancelar && l.status!=='cancelado' && !baixas.some(b=>b.lancamento_id===l.id && !b.estornado_em) && <Button title="Cancelar" aria-label="Cancelar lançamento" variant="ghost" size="icon" onClick={()=>{setTarget(l.id);setReason('');setModal('cancelar')}}><Ban className="h-4 w-4"/></Button>}</div></td></tr>)}</tbody></table>{!filtered.length && vazio}</div>}
    {['contas','categorias'].includes(tab) && <><div className="flex justify-between items-center"><h2 className="font-semibold">{tab==='contas'?'Contas financeiras':'Categorias'}</h2>{acesso.configurar && <Button onClick={()=>open(tab==='contas'?'conta':'categoria')}><Plus className="h-4 w-4 mr-2"/>Adicionar</Button>}</div><div className="divide-y divide-border">{(tab==='contas'?contas:cats).map(x=><div key={x.id} className="flex justify-between items-center py-3 gap-3"><div><p className="font-medium">{'pai_id' in x?catName(x.id):x.nome}</p><p className="text-xs text-muted-foreground">{x.tipo} · {('ativa' in x && x.ativa)?'Ativa':'Inativa'}{'saldo_inicial' in x?` · Saldo: ${dinheiro(Number(saldos.find(s=>s.id===x.id)?.saldo || x.saldo_inicial))}`:''}</p></div>{acesso.configurar && <Button variant="ghost" size="icon" aria-label="Editar cadastro" onClick={()=>open(tab==='contas'?'conta':'categoria',x.id)}><Pencil className="h-4 w-4"/></Button>}</div>)}</div>{!(tab==='contas'?contas:cats).length && vazio}{tab==='contas' && acesso.configurar && <Button variant="outline" onClick={()=>{setForm({paciente_id:''});setModal('lgpd')}}>Desvincular paciente — LGPD</Button>}</>}
    {tab==='fluxo' && <><div className="flex flex-wrap gap-6">{['Realizado','Previsto'].map(t=><div key={t}><p className="text-sm text-muted-foreground">{t} no período</p><strong>{dinheiro(flux.filter(x=>x.tipo===t).reduce((s,x)=>s+x.valor,0))}</strong></div>)}</div><div className="overflow-x-auto"><table className="w-full"><thead><tr>{['Data','Tipo','Descrição','Conta','Categoria','Valor'].map(h=><th className={th} key={h}>{h}</th>)}</tr></thead><tbody>{flux.map((r,i)=><tr key={i} className="border-t border-border">{[r.data,r.tipo,r.descricao,r.conta,r.categoria,dinheiro(r.valor)].map((v,j)=><td key={j} className={td}>{v}</td>)}</tr>)}</tbody></table>{!flux.length && vazio}</div></>}
    {tab==='contas' && <TransferenciasContas contas={contas} lancar={acesso.lancar} cancelar={acesso.cancelar} onChange={load}/>}
    <Dialog open={!!modal} onOpenChange={v=>{if(!v && !busy)setModal(null)}}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{({conta:'Conta financeira',categoria:'Categoria',lancamento:'Lançamento',baixa:'Registrar baixa',cancelar:'Cancelar lançamento',estornar:'Estornar baixa',detalhe:'Detalhes do lançamento',lgpd:'Desvincular dados pessoais'} as Record<string,string>)[modal || '']}</DialogTitle></DialogHeader>
      <form onSubmit={e=>{e.preventDefault();void save()}} className="space-y-4">
      {modal==='conta' && <div className="grid sm:grid-cols-2 gap-4">{field('nome','Nome','text',true)}{select('tipo','Tipo',[{id:'caixa',nome:'Caixa'},{id:'banco',nome:'Banco'},{id:'cartao',nome:'Carteira / cartão'}])}{field('saldo_inicial','Saldo inicial','number',true)}{field('data_inicial','Data do saldo inicial','date',true)}{select('ativa','Situação',[{id:'true',nome:'Ativa'},{id:'false',nome:'Inativa'}])}</div>}
      {modal==='categoria' && <div className="grid sm:grid-cols-2 gap-4">{field('nome','Nome','text',true)}{select('tipo','Tipo',[{id:'receita',nome:'Receita'},{id:'despesa',nome:'Despesa'}])}{select('pai_id','Categoria principal (opcional)',cats.filter(c=>!c.pai_id && c.tipo===form.tipo && c.id!==editing))}{select('ativa','Situação',[{id:'true',nome:'Ativa'},{id:'false',nome:'Inativa'}])}</div>}
      {modal==='lancamento' && <><div className="grid sm:grid-cols-2 gap-4">{field('descricao','Descrição','text',true)}{select('tipo','Tipo',[{id:'receita',nome:'Receita'},{id:'despesa',nome:'Despesa'}])}{field('valor','Valor (R$)','number',true)}{select('categoria_id','Categoria',cats.filter(c=>c.ativa && c.tipo===form.tipo).map(c=>({id:c.id,nome:catName(c.id)})))}{select('conta_id','Conta',contas.filter(c=>c.ativa))}{field('pagador','Favorecido / pagador')}{(['paciente','profissional'] as const).map(tipo=><VinculoPessoa key={tipo} tipo={tipo} value={form[tipo+'_id'] || ''} companyId={acesso.company_id} onChange={id=>setForm(f=>({...f,[tipo+'_id']:id}))}/>)}{field('competencia','Competência','date',true)}{field('vencimento','Vencimento','date',true)}{select('forma_prevista','Forma prevista',FORMAS.map(id=>({id,nome:id})))}{!editing && select('modo','Geração',[{id:'unico',nome:'Único'},{id:'parcelado',nome:'Parcelado (valor total)'},{id:'recorrente',nome:'Recorrente (valor mensal)'}])}{!editing && form.modo!=='unico' && field('quantidade','Quantidade','number',true)}{field('origem_tipo','Tipo de origem (opcional)')}{field('origem_id','ID de origem (opcional)')}{field('observacoes','Observações')}</div><label className="text-sm space-y-2 block">Comprovante (até 10 MB)<Input aria-label="Comprovante" type="file" onChange={e=>{const f=e.target.files?.[0];if(f && f.size>10*1024*1024){toast.error('Limite de 10 MB');e.target.value='';setFile(null)}else setFile(f || null)}}/></label></>}
      {modal==='baixa' && <div className="grid sm:grid-cols-2 gap-4">{field('valor','Valor principal (R$)','number',true)}{field('data','Data da baixa','date',true)}{select('conta_id','Conta',contas.filter(c=>c.ativa))}{select('forma','Forma',FORMAS.map(id=>({id,nome:id})))}{field('juros','Juros','number')}{field('multa','Multa','number')}{field('desconto','Desconto','number')}</div>}
      {['cancelar','estornar'].includes(modal || '') && <label className="text-sm block space-y-2">Motivo obrigatório<Input aria-label="Motivo" required value={reason} onChange={e=>setReason(e.target.value)}/></label>}
      {modal==='lgpd' && <><p className="text-sm text-muted-foreground">Remove o vínculo e o nome do pagador. Valores e histórico permanecem.</p><VinculoPessoa tipo="paciente" value={form.paciente_id || ''} companyId={acesso.company_id} onChange={id=>setForm(f=>({...f,paciente_id:id}))}/></>}
      {modal==='detalhe' && detail && <div className="space-y-4"><p className="font-medium">{detail.descricao} · {dinheiro(Number(detail.valor))}</p><p className="text-sm">{detail.observacoes}</p>{detail.cancelado_motivo && <p>Cancelamento: {detail.cancelado_motivo}</p>}{detail.comprovante_path && <Button type="button" variant="outline" onClick={async()=>{const {data,error}=await supabase.storage.from('financeiro-comprovantes').createSignedUrl(detail.comprovante_path || '',60);if(error)toast.error(error.message);else if(data)window.open(data.signedUrl,'_blank','noopener,noreferrer')}}><Paperclip className="h-4 w-4 mr-2"/>Comprovante</Button>}{baixas.filter(b=>b.lancamento_id===detail.id).map(b=><div className="border-t border-border pt-3 flex justify-between gap-3" key={b.id}><div><p>{b.data} · {dinheiro(Number(b.valor))} · {b.forma}</p><p className="text-xs text-muted-foreground">Juros {dinheiro(Number(b.juros))} · Multa {dinheiro(Number(b.multa))} · Desconto {dinheiro(Number(b.desconto))}</p>{b.estornado_em && <p className="text-sm">Estornada: {b.estorno_motivo}</p>}</div>{acesso.cancelar && !b.estornado_em && <Button type="button" variant="outline" onClick={()=>{setTarget(b.id);setReason('');setModal('estornar')}}><Undo2 className="h-4 w-4 mr-2"/>Estornar</Button>}</div>)}</div>}
      {modal!=='detalhe' && <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={()=>setModal(null)}>Voltar</Button><Button type="submit" disabled={busy}>{busy?'Salvando…':'Confirmar'}</Button></div>}
      </form>
    </DialogContent></Dialog>
  </section>
}
