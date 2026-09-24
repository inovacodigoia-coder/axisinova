import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BedDouble, Sparkles, UserRound, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MANCHESTER_COLORS, type ManchesterColor } from '@/data/manchester'
import { useCollectionPosts, rpc, type Bed } from '@/hooks/useCollectionPosts'
import { useHospitals } from '@/hooks/useHospitals'
import { BedPanel } from '@/components/beds/BedPanel'
import { EmptyState } from '@/components/feedback/EmptyState'

const db = supabase as any
const STATUS_LABEL = { free: 'Livre', occupied: 'Ocupado', cleaning: 'Em higienização' }

export default function CollectionPostsPage() {
  const cp = useCollectionPosts()
  const { hospitals } = useHospitals()
  const [postId, setPostId] = useState('')
  const [queue, setQueue] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [openBed, setOpenBed] = useState<Bed | null>(null)

  const activePosts = cp.posts.filter(p => p.is_active)
  useEffect(() => { if (!postId && activePosts[0]) setPostId(activePosts[0].id) }, [activePosts, postId])

  const loadQueue = useCallback(async () => {
    if (!cp.companyId) return
    const { data } = await db.from('triage_entries').select('id, patient_name, patient_id, color, status, classified_at')
      .eq('company_id', cp.companyId).in('status', ['classified', 'in_doctor']).order('classified_at')
    setQueue(data || [])
  }, [cp.companyId])
  useEffect(() => { loadQueue() }, [loadQueue, cp.occupancies])

  const inBed = new Set(cp.occupancies.map(o => o.triage_entry_id))
  const waiting = queue.filter(q => !inBed.has(q.id))
  const postBeds = cp.beds.filter(b => b.post_id === postId && b.is_active)
  const occOf = (b: Bed) => cp.occupancies.find(o => o.bed_id === b.id) || null
  const counts = useMemo(() => ({
    free: postBeds.filter(b => b.status === 'free').length,
    occupied: postBeds.filter(b => b.status === 'occupied').length,
    cleaning: postBeds.filter(b => b.status === 'cleaning').length,
  }), [postBeds])

  const clickBed = async (b: Bed) => {
    if (b.status === 'occupied') return setOpenBed(b)
    if (b.status === 'cleaning') return rpc('bed_mark_clean', { _bed_id: b.id }, `${b.name} livre`)
    if (!selected) return
    const ok = await rpc('bed_allocate', { _bed_id: b.id, _triage_entry_id: selected.id, _patient_name: selected.patient_name, _patient_id: selected.patient_id, _color: selected.color }, `${selected.patient_name} alocado em ${b.name}`)
    if (ok) setSelected(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Postos de Coleta</h1>
        <p className="text-muted-foreground">Mapa de leitos, medicação e encaminhamentos</p>
      </div>
      <Tabs defaultValue="mapa">
        <TabsList>
          <TabsTrigger value="mapa">Mapa de leitos</TabsTrigger>
          <TabsTrigger value="encaminhamentos">Encaminhamentos</TabsTrigger>
          <TabsTrigger value="config">Configurar</TabsTrigger>
        </TabsList>

        <TabsContent value="mapa" className="mt-4">
          {activePosts.length === 0 ? (
            <EmptyState title="Nenhum posto cadastrado" description="Cadastre um posto e seus leitos na aba Configurar." />
          ) : (
            <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Aguardando leito ({waiting.length})</CardTitle></CardHeader>
                <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {waiting.length === 0 && <p className="text-sm text-muted-foreground">Nenhum paciente classificado aguardando.</p>}
                  {waiting.map(q => {
                    const c = q.color ? MANCHESTER_COLORS[q.color as ManchesterColor] : null
                    return (
                      <button key={q.id} onClick={() => setSelected(selected?.id === q.id ? null : q)}
                        className={cn('w-full text-left rounded-md border p-2 flex items-center gap-2 text-sm', selected?.id === q.id && 'ring-2 ring-primary')}>
                        <span className="h-6 w-1.5 rounded" style={{ background: c?.hex }} />
                        <span className="flex-1 truncate">{q.patient_name}</span>
                      </button>
                    )
                  })}
                  {selected && <p className="text-xs text-primary">Clique em um leito livre para alocar.</p>}
                </CardContent>
              </Card>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Select value={postId} onValueChange={setPostId}>
                    <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
                    <SelectContent>{activePosts.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Badge variant="outline">Livres {counts.free}</Badge>
                  <Badge variant="outline">Ocupados {counts.occupied}</Badge>
                  <Badge variant="outline">Higienização {counts.cleaning}</Badge>
                </div>
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
                  {postBeds.map(b => {
                    const o = occOf(b)
                    const c = o?.manchester_color ? MANCHESTER_COLORS[o.manchester_color as ManchesterColor] : null
                    return (
                      <button key={b.id} onClick={() => clickBed(b)}
                        className={cn('rounded-lg border-2 p-3 text-left min-h-[110px] transition',
                          b.status === 'free' && 'border-primary/30 bg-primary/5 hover:bg-primary/10',
                          b.status === 'free' && selected && 'ring-2 ring-primary',
                          b.status === 'occupied' && 'bg-card',
                          b.status === 'cleaning' && 'border-warning/50 bg-warning/10')}
                        style={b.status === 'occupied' && c ? { borderColor: c.hex } : undefined}>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold flex items-center gap-1"><BedDouble className="h-4 w-4" />{b.name}</span>
                          {b.status === 'cleaning' && <Sparkles className="h-4 w-4 text-warning" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{STATUS_LABEL[b.status]}</p>
                        {o && <p className="mt-2 text-sm font-medium flex items-center gap-1 truncate"><UserRound className="h-3 w-3" />{o.patient_name}</p>}
                        {o?.away && <Badge variant="outline" className="mt-1 text-[10px]">Fora do leito</Badge>}
                        {b.status === 'cleaning' && <p className="text-[11px] mt-2">Clique para marcar como livre</p>}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="encaminhamentos" className="mt-4"><ReferralsQueue companyId={cp.companyId} beds={cp.beds} /></TabsContent>

        <TabsContent value="config" className="mt-4"><ConfigTab cp={cp} hospitals={hospitals} /></TabsContent>
      </Tabs>

      <BedPanel bed={openBed} occupancy={openBed ? occOf(openBed) : null} sectors={cp.sectors} onClose={() => setOpenBed(null)} />
    </div>
  )
}

function ReferralsQueue({ companyId, beds }: { companyId?: string; beds: Bed[] }) {
  const [rows, setRows] = useState<any[]>([])
  const [filter, setFilter] = useState('todos')
  const load = useCallback(async () => {
    if (!companyId) return
    const { data } = await db.from('bed_referrals').select('*').eq('company_id', companyId).in('status', ['waiting', 'in_progress']).order('referred_at')
    setRows(data || [])
  }, [companyId])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!companyId) return
    const ch = supabase.channel('refq-' + companyId).on('postgres_changes', { event: '*', schema: 'public', table: 'bed_referrals', filter: `company_id=eq.${companyId}` }, load).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [companyId, load])
  const sectors = Array.from(new Set(rows.map(r => r.sector_name)))
  const list = filter === 'todos' ? rows : rows.filter(r => r.sector_name === filter)
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Fila de encaminhamentos</CardTitle>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todos os setores</SelectItem>{sectors.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-2">
        {list.length === 0 && <p className="text-sm text-muted-foreground">Nenhum paciente encaminhado.</p>}
        {list.map(r => {
          const c = r.manchester_color ? MANCHESTER_COLORS[r.manchester_color as ManchesterColor] : null
          return (
            <div key={r.id} className="flex items-center gap-3 rounded-md border p-3 text-sm">
              <span className="h-8 w-1.5 rounded" style={{ background: c?.hex }} />
              <div className="flex-1">
                <p className="font-medium">{r.patient_name}</p>
                <p className="text-xs text-muted-foreground">{r.sector_name} · {beds.find(b => b.id === r.bed_id)?.name} · {new Date(r.referred_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}{r.notes && ` · ${r.notes}`}</p>
              </div>
              <Badge variant="outline">{r.status === 'waiting' ? 'Aguardando' : 'Em atendimento'}</Badge>
              {r.status === 'waiting' && <Button size="sm" variant="outline" onClick={() => rpc('bed_referral_update', { _referral_id: r.id, _status: 'in_progress' }).then(load)}>Iniciar</Button>}
              <Button size="sm" onClick={() => rpc('bed_referral_update', { _referral_id: r.id, _status: 'returned' }, 'Paciente devolvido ao leito').then(load)}>Devolver ao leito</Button>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function ConfigTab({ cp, hospitals }: { cp: ReturnType<typeof useCollectionPosts>; hospitals: { id: string; name: string }[] }) {
  const [name, setName] = useState('')
  const [hospital, setHospital] = useState('none')
  const [count, setCount] = useState('6')
  const [bedName, setBedName] = useState<Record<string, string>>({})
  const [sector, setSector] = useState('')
  const hid = hospital === 'none' ? null : hospital
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Novo posto</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Posto de Coleta 1" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Hospital</Label>
              <Select value={hospital} onValueChange={setHospital}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Nenhum</SelectItem>{hospitals.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Leitos iniciais</Label><Input type="number" min={0} value={count} onChange={e => setCount(e.target.value)} /></div>
          </div>
          <Button onClick={() => { cp.createPost(name, hid, Number(count) || 0); setName('') }}><Plus className="h-4 w-4 mr-1" />Criar posto</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Outros setores de encaminhamento</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Laboratório e Raio-X sempre aparecem. Adicione outros (ex.: ECG, Ultrassom).</p>
          <div className="flex gap-2"><Input value={sector} onChange={e => setSector(e.target.value)} placeholder="ECG" /><Button onClick={() => { cp.addSector(sector, hid); setSector('') }}>Adicionar</Button></div>
          <div className="flex flex-wrap gap-2">
            {cp.sectors.map(s => <Badge key={s.id} variant={s.is_active ? 'default' : 'outline'} className="cursor-pointer" onClick={() => cp.toggleSector(s)}>{s.name}{!s.is_active && ' (inativo)'}</Badge>)}
          </div>
        </CardContent>
      </Card>
      {cp.posts.map(p => (
        <Card key={p.id} className={cn(!p.is_active && 'opacity-60')}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{p.name}</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => cp.togglePost(p)}>{p.is_active ? 'Inativar' : 'Reativar'}</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {cp.beds.filter(b => b.post_id === p.id).map(b => (
                <Badge key={b.id} variant={b.is_active ? 'secondary' : 'outline'} className="cursor-pointer" title={b.is_active ? 'Clique para inativar' : 'Clique para reativar'} onClick={() => cp.toggleBed(b)}>
                  {b.name}{!b.is_active && ' (inativo)'}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder={`Leito ${String(cp.beds.filter(b => b.post_id === p.id).length + 1).padStart(2, '0')}`} value={bedName[p.id] || ''} onChange={e => setBedName(s => ({ ...s, [p.id]: e.target.value }))} />
              <Button variant="outline" onClick={() => { cp.addBed(p.id, bedName[p.id] || `Leito ${String(cp.beds.filter(b => b.post_id === p.id).length + 1).padStart(2, '0')}`); setBedName(s => ({ ...s, [p.id]: '' })) }}>Adicionar leito</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
