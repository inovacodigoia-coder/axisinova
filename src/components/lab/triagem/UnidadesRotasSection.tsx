import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { ArrowRight, Edit2, Loader2, Plus, Search, Thermometer, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useTriagemPermissions } from '@/hooks/useTriagem'

const db = supabase as any
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
type Origem = { id: string; name: string; internal_code: string | null; papel_coleta: boolean; papel_laboratorio: boolean; papel_coleta_externa: boolean; papel_hospital: boolean; laboratorio_destino_id: string | null }
type Cond = { id?: string; nome: string; temp_min: number | null; temp_max: number | null; cor: string; icone: string; ativo: boolean; ordem?: number }
type Rota = { id?: string; nome: string; origem_ids: string[]; destino_id: string; horarios: string[]; dias_semana: number[]; transito_max_min: number; transportador: string | null; condicao_ids: string[]; ativo: boolean }

const faixa = (c: Cond) => c.temp_min == null ? `≤ ${c.temp_max} °C` : c.temp_max == null ? `≥ ${c.temp_min} °C` : `${c.temp_min} a ${c.temp_max} °C`
const msgErro = (e: any, padrao: string) => e?.message?.includes('row-level') ? 'Você não tem a permissão "Configurar unidades, rotas e critérios"'
  : e?.code === '23505' ? 'Já existe um cadastro com esse nome' : (e?.message && !/^[a-z_]+:/.test(e.message) && e.code === 'P0001') ? e.message.replace(/^EM_USO: /, '') : padrao

export default function UnidadesRotasSection() {
  const { user } = useAuth()
  const { has } = useTriagemPermissions()
  const pode = has('triagem.config')
  const [origens, setOrigens] = useState<Origem[] | null>(null)
  const [conds, setConds] = useState<Cond[] | null>(null)
  const [rotas, setRotas] = useState<Rota[] | null>(null)

  const carregar = async () => {
    const [o, c, r] = await Promise.all([
      db.from('origins').select('id, name, internal_code, papel_coleta, papel_laboratorio, papel_coleta_externa, papel_hospital, laboratorio_destino_id').order('internal_code'),
      db.from('triagem_condicao_transporte').select('*').order('ordem').order('nome'),
      db.from('triagem_rota').select('*').order('nome'),
    ])
    if (!c.data?.length && pode) { await db.rpc('triagem_semear_padroes'); const c2 = await db.from('triagem_condicao_transporte').select('*').order('ordem'); c.data = c2.data }
    setOrigens(o.data ?? []); setConds(c.data ?? []); setRotas(r.data ?? [])
  }
  useEffect(() => { if (user?.companyId) carregar() }, [user?.companyId])

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold">Unidades e Rotas</h3>
        <p className="text-xs text-muted-foreground">Cadastros da Triagem Lab (amostras). Não altera Atendimento › Triagem (paciente).</p>
      </div>
      <Tabs defaultValue="unidades">
        <TabsList><TabsTrigger value="unidades">Unidades</TabsTrigger><TabsTrigger value="condicoes">Condições de transporte</TabsTrigger><TabsTrigger value="rotas">Rotas</TabsTrigger></TabsList>
        <TabsContent value="unidades"><Unidades origens={origens} /></TabsContent>
        <TabsContent value="condicoes"><Condicoes conds={conds} pode={pode} companyId={user?.companyId} recarregar={carregar} /></TabsContent>
        <TabsContent value="rotas"><Rotas rotas={rotas} origens={origens ?? []} conds={conds ?? []} pode={pode} companyId={user?.companyId} recarregar={carregar} /></TabsContent>
      </Tabs>
    </div>
  )
}

function Unidades({ origens }: { origens: Origem[] | null }) {
  if (!origens) return <Skeleton className="h-32 w-full" />
  const nome = (id: string | null) => origens.find(o => o.id === id)?.name
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground">Unidade = origem do seletor "MATRIZ". Papéis e laboratório de destino são editados em Configurações › Origens.</p>
        <Button asChild size="sm" variant="outline" className="gap-1"><Link to="/app/configuracoes/origens">Editar origens <ArrowRight className="h-3.5 w-3.5" /></Link></Button>
      </div>
      {origens.length === 1 && <p className="text-xs text-muted-foreground">Empresa sem filial: a matriz é Coleta + Laboratório, sem transporte.</p>}
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="p-2">Cód.</th><th className="p-2">Unidade</th><th className="p-2">Papéis</th><th className="p-2">Lab. de destino</th></tr></thead>
        <tbody>{origens.map(o => (
          <tr key={o.id} className="border-b last:border-0">
            <td className="p-2 font-mono">{o.internal_code || '—'}</td><td className="p-2 font-semibold uppercase">{o.name}</td>
            <td className="p-2 text-xs">{[o.papel_coleta && 'Coleta', o.papel_laboratorio && 'Laboratório', o.papel_coleta_externa && 'Coleta externa', o.papel_hospital && 'Hospital/PS'].filter(Boolean).join(' · ') || '—'}</td>
            <td className="p-2 text-xs">{origens.length === 1 ? 'Sem transporte' : o.papel_laboratorio ? '—' : (nome(o.laboratorio_destino_id) || <span className="text-warning">Definir</span>)}</td>
          </tr>))}</tbody>
      </table>
    </div>
  )
}

function Condicoes({ conds, pode, companyId, recarregar }: { conds: Cond[] | null; pode: boolean; companyId?: string; recarregar: () => void }) {
  const [edit, setEdit] = useState<Cond | null>(null)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState(false)
  const [excluir, setExcluir] = useState<Cond | null>(null)
  const salvar = async () => {
    if (!edit) return
    const e: Record<string, string> = {}
    if (edit.nome.trim().length < 2) e.nome = 'Informe o nome'
    if (edit.temp_min == null && edit.temp_max == null) e.faixa = 'Informe a mínima, a máxima ou as duas'
    if (edit.temp_min != null && edit.temp_max != null && edit.temp_min > edit.temp_max) e.faixa = 'A mínima não pode ser maior que a máxima'
    setErros(e); if (Object.keys(e).length) return
    setSalvando(true)
    const row = { company_id: companyId, nome: edit.nome.trim(), temp_min: edit.temp_min, temp_max: edit.temp_max, cor: edit.cor, icone: edit.icone, ativo: edit.ativo, updated_at: new Date().toISOString() }
    const { error } = edit.id ? await db.from('triagem_condicao_transporte').update(row).eq('id', edit.id) : await db.from('triagem_condicao_transporte').insert(row)
    setSalvando(false)
    if (error) return toast.error(msgErro(error, 'Não foi possível salvar a condição'))
    toast.success('Condição salva'); setEdit(null); recarregar()
  }
  const confirmarExcluir = async () => {
    if (!excluir?.id) return
    const { error } = await db.from('triagem_condicao_transporte').delete().eq('id', excluir.id)
    if (error && (error.message?.includes('EM_USO') || error.code === '23503')) {
      const r = await db.from('triagem_condicao_transporte').update({ ativo: false }).eq('id', excluir.id)
      r.error ? toast.error('Não foi possível inativar') : toast.info('Condição em uso (rota ou material): foi inativada em vez de excluída')
    } else if (error) toast.error(msgErro(error, 'Não foi possível excluir'))
    else toast.success('Condição excluída')
    setExcluir(null); recarregar()
  }
  const num = (v: string) => v.trim() === '' ? null : Number(v)
  if (!conds) return <Skeleton className="h-32 w-full" />
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Ajuste conforme a estabilidade dos exames e o POP do laboratório.</p>
        {pode && <Button size="sm" className="gap-1" onClick={() => { setErros({}); setEdit({ nome: '', temp_min: null, temp_max: null, cor: '#0EA5E9', icone: 'thermometer', ativo: true }) }}><Plus className="h-4 w-4" />Nova condição</Button>}
      </div>
      {conds.length === 0 ? <p className="py-6 text-center text-sm italic text-muted-foreground">Nenhuma condição cadastrada.</p> : conds.map(c => (
        <div key={c.id} className={cn('flex items-center justify-between rounded-xl border bg-card p-3', !c.ativo && 'opacity-60')}>
          <div className="flex items-center gap-3"><Thermometer className="h-5 w-5" style={{ color: c.cor }} /><div><p className="text-sm font-bold">{c.nome}{!c.ativo && <span className="ml-2 text-[10px] font-normal text-muted-foreground">(inativa)</span>}</p><p className="text-xs text-muted-foreground">{faixa(c)}</p></div></div>
          {pode && <div className="flex gap-1"><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setErros({}); setEdit({ ...c }) }}><Edit2 className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setExcluir(c)}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button></div>}
        </div>))}
      <Dialog open={!!edit} onOpenChange={o => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? 'Editar condição' : 'Nova condição'}</DialogTitle></DialogHeader>
          {edit && <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={edit.nome} onChange={e => setEdit({ ...edit, nome: e.target.value })} />{erros.nome && <p className="text-xs text-destructive">{erros.nome}</p>}</div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Mínima (°C)</Label><Input type="number" value={edit.temp_min ?? ''} onChange={e => setEdit({ ...edit, temp_min: num(e.target.value) })} placeholder="vazio = sem mínimo" /></div>
              <div><Label>Máxima (°C)</Label><Input type="number" value={edit.temp_max ?? ''} onChange={e => setEdit({ ...edit, temp_max: num(e.target.value) })} placeholder="vazio = sem máximo" /></div>
            </div>
            {erros.faixa && <p className="text-xs text-destructive">{erros.faixa}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Cor</Label><Input type="color" value={edit.cor} onChange={e => setEdit({ ...edit, cor: e.target.value })} /></div>
              <div><Label>Ícone</Label><select className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm" value={edit.icone} onChange={e => setEdit({ ...edit, icone: e.target.value })}><option value="thermometer">Termômetro</option><option value="sun">Sol</option><option value="snowflake">Floco de neve</option></select></div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.ativo} onChange={e => setEdit({ ...edit, ativo: e.target.checked })} />Ativa</label>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button><Button onClick={salvar} disabled={salvando}>{salvando && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!excluir} onOpenChange={o => !o && setExcluir(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir condição?</AlertDialogTitle><AlertDialogDescription>"{excluir?.nome}". Se estiver em uso em rota ou material, será inativada.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmarExcluir} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Rotas({ rotas, origens, conds, pode, companyId, recarregar }: { rotas: Rota[] | null; origens: Origem[]; conds: Cond[]; pode: boolean; companyId?: string; recarregar: () => void }) {
  const [edit, setEdit] = useState<Rota | null>(null)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState(false)
  const [novoHorario, setNovoHorario] = useState('')
  const [busca, setBusca] = useState('')
  const [excluir, setExcluir] = useState<Rota | null>(null)
  const labs = origens.filter(o => o.papel_laboratorio)
  const nome = (id: string) => origens.find(o => o.id === id)?.name ?? '?'
  const visiveis = useMemo(() => (rotas ?? []).filter(r => !busca || r.nome.toLowerCase().includes(busca.toLowerCase())), [rotas, busca])
  const toggle = <T,>(arr: T[], v: T) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]

  const salvar = async () => {
    if (!edit) return
    const e: Record<string, string> = {}
    if (edit.nome.trim().length < 2) e.nome = 'Informe o nome da rota'
    if (!edit.origem_ids.length) e.origens = 'Escolha ao menos uma unidade de origem'
    if (!edit.destino_id) e.destino = 'Escolha o laboratório de destino'
    else if (edit.origem_ids.includes(edit.destino_id)) e.destino = 'O destino não pode estar entre as origens'
    if (!edit.horarios.length) e.horarios = 'Informe ao menos um horário de saída'
    if (!edit.dias_semana.length) e.dias = 'Escolha ao menos um dia'
    if (!(edit.transito_max_min > 0)) e.transito = 'Tempo máximo de trânsito deve ser maior que zero'
    setErros(e); if (Object.keys(e).length) return
    setSalvando(true)
    const row = { company_id: companyId, nome: edit.nome.trim(), origem_ids: edit.origem_ids, destino_id: edit.destino_id, horarios: [...edit.horarios].sort(), dias_semana: [...edit.dias_semana].sort(),
      transito_max_min: edit.transito_max_min, transportador: edit.transportador?.trim() || null, condicao_ids: edit.condicao_ids, ativo: edit.ativo }
    const { error } = edit.id ? await db.from('triagem_rota').update(row).eq('id', edit.id) : await db.from('triagem_rota').insert(row)
    setSalvando(false)
    if (error) return toast.error(msgErro(error, 'Não foi possível salvar a rota'))
    toast.success('Rota salva'); setEdit(null); recarregar()
  }
  const confirmarExcluir = async () => {
    if (!excluir?.id) return
    const { error } = await db.from('triagem_rota').delete().eq('id', excluir.id)
    if (error?.code === '23503') {
      const r = await db.from('triagem_rota').update({ ativo: false }).eq('id', excluir.id)
      r.error ? toast.error('Não foi possível inativar') : toast.info('Rota em uso: foi inativada em vez de excluída')
    } else if (error) toast.error(msgErro(error, 'Não foi possível excluir'))
    else toast.success('Rota excluída')
    setExcluir(null); recarregar()
  }
  const addHorario = () => {
    if (!edit) return
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(novoHorario)) return toast.error('Horário inválido (use HH:MM)')
    if (edit.horarios.includes(novoHorario)) return
    setEdit({ ...edit, horarios: [...edit.horarios, novoHorario].sort() }); setNovoHorario('')
  }

  if (!rotas) return <Skeleton className="h-32 w-full" />
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" placeholder="Buscar rota..." value={busca} onChange={e => setBusca(e.target.value)} /></div>
        {pode && <Button size="sm" className="gap-1" disabled={!labs.length} onClick={() => { setErros({}); setNovoHorario(''); setEdit({ nome: '', origem_ids: [], destino_id: labs[0]?.id ?? '', horarios: [], dias_semana: [1, 2, 3, 4, 5], transito_max_min: 60, transportador: '', condicao_ids: conds.filter(c => c.ativo).map(c => c.id!), ativo: true }) }}><Plus className="h-4 w-4" />Nova rota</Button>}
      </div>
      <p className="text-[11px] text-muted-foreground">Sem rota cadastrada, o malote pode ser criado avulso.</p>
      {visiveis.length === 0 ? <p className="py-6 text-center text-sm italic text-muted-foreground">Nenhuma rota cadastrada.</p> : visiveis.map(r => (
        <div key={r.id} className={cn('flex items-center justify-between rounded-xl border bg-card p-3', !r.ativo && 'opacity-60')}>
          <div className="min-w-0">
            <p className="text-sm font-bold">{r.nome}{!r.ativo && <span className="ml-2 text-[10px] font-normal text-muted-foreground">(inativa)</span>}</p>
            <p className="truncate text-xs text-muted-foreground">{r.origem_ids.map(nome).join(', ')} → {nome(r.destino_id)} · {r.horarios.join(', ')} · {r.dias_semana.map(d => DIAS[d]).join('/')} · máx. {r.transito_max_min} min{r.transportador ? ` · ${r.transportador}` : ''}</p>
          </div>
          {pode && <div className="flex gap-1"><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setErros({}); setEdit({ ...r }) }}><Edit2 className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setExcluir(r)}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button></div>}
        </div>))}

      <Dialog open={!!edit} onOpenChange={o => !o && setEdit(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{edit?.id ? 'Editar rota' : 'Nova rota'}</DialogTitle></DialogHeader>
          {edit && <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
            <div><Label>Nome *</Label><Input value={edit.nome} onChange={e => setEdit({ ...edit, nome: e.target.value })} placeholder="Rota Centro" />{erros.nome && <p className="text-xs text-destructive">{erros.nome}</p>}</div>
            <div><Label>Unidades de origem *</Label>
              <div className="grid grid-cols-2 gap-1 rounded-md border p-2">{origens.filter(o => o.id !== edit.destino_id).map(o => (
                <label key={o.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.origem_ids.includes(o.id)} onChange={() => setEdit({ ...edit, origem_ids: toggle(edit.origem_ids, o.id) })} />{o.internal_code ? `${o.internal_code} · ` : ''}{o.name}</label>))}</div>
              {erros.origens && <p className="text-xs text-destructive">{erros.origens}</p>}</div>
            <div><Label>Destino (laboratório) *</Label>
              <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={edit.destino_id} onChange={e => setEdit({ ...edit, destino_id: e.target.value, origem_ids: edit.origem_ids.filter(x => x !== e.target.value) })}>
                {labs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
              {erros.destino && <p className="text-xs text-destructive">{erros.destino}</p>}</div>
            <div><Label>Horários de saída *</Label>
              <div className="flex gap-2"><Input type="time" value={novoHorario} onChange={e => setNovoHorario(e.target.value)} className="w-32" /><Button type="button" variant="outline" size="sm" onClick={addHorario}>Adicionar</Button></div>
              <div className="mt-2 flex flex-wrap gap-1">{edit.horarios.map(h => <span key={h} className="flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs font-mono">{h}<button onClick={() => setEdit({ ...edit, horarios: edit.horarios.filter(x => x !== h) })}><X className="h-3 w-3" /></button></span>)}</div>
              {erros.horarios && <p className="text-xs text-destructive">{erros.horarios}</p>}</div>
            <div><Label>Dias da semana *</Label>
              <div className="flex flex-wrap gap-1">{DIAS.map((d, i) => <button key={d} type="button" onClick={() => setEdit({ ...edit, dias_semana: toggle(edit.dias_semana, i) })} className={cn('rounded border px-2 py-1 text-xs', edit.dias_semana.includes(i) ? 'border-primary bg-primary/10 text-primary' : 'border-border')}>{d}</button>)}</div>
              {erros.dias && <p className="text-xs text-destructive">{erros.dias}</p>}</div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tempo máx. de trânsito (min) *</Label><Input type="number" min={1} value={edit.transito_max_min} onChange={e => setEdit({ ...edit, transito_max_min: Number(e.target.value) })} />{erros.transito && <p className="text-xs text-destructive">{erros.transito}</p>}</div>
              <div><Label>Transportador padrão</Label><Input value={edit.transportador ?? ''} onChange={e => setEdit({ ...edit, transportador: e.target.value })} placeholder="Motoboy / empresa" /></div>
            </div>
            <div><Label>Condições aceitas</Label>
              <div className="flex flex-wrap gap-3">{conds.filter(c => c.ativo || edit.condicao_ids.includes(c.id!)).map(c => <label key={c.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.condicao_ids.includes(c.id!)} onChange={() => setEdit({ ...edit, condicao_ids: toggle(edit.condicao_ids, c.id!) })} />{c.nome}</label>)}</div></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.ativo} onChange={e => setEdit({ ...edit, ativo: e.target.checked })} />Ativa</label>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button><Button onClick={salvar} disabled={salvando}>{salvando && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!excluir} onOpenChange={o => !o && setExcluir(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir rota?</AlertDialogTitle><AlertDialogDescription>"{excluir?.nome}". Se já tiver malotes, será inativada em vez de excluída.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmarExcluir} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
