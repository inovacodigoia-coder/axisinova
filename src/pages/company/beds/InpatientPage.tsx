import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BedDouble, Plus, Sparkles, CheckCircle2, XCircle, ArrowRightLeft, LogOut, Hospital } from 'lucide-react'
import { cn } from '@/lib/utils'
import { rpc } from '@/hooks/useCollectionPosts'
import { useHospitals } from '@/hooks/useHospitals'
import { useInpatient, INP_STATUS_LABEL, type InpBed, type AdmissionRequest } from '@/hooks/useInpatient'
import { useInpatientPermissions } from '@/hooks/useInpatientPermissions'
import { AdmissionRequestDialog } from '@/components/inpatient/AdmissionRequestDialog'
import { EmptyState } from '@/components/feedback/EmptyState'

const db = supabase as any
const fmt = (d?: string | null) => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'
const STATUS_CLS: Record<InpBed['status'], string> = {
  free: 'border-border bg-card',
  reserved: 'border-warning bg-warning/10',
  occupied: 'border-primary bg-primary/10',
  cleaning: 'border-muted-foreground/40 bg-muted',
}
const REQ_STATUS: Record<string, string> = { pending: 'Pendente', approved: 'Vaga reservada', refused: 'Recusada', cancelled: 'Cancelada', admitted: 'Internado', discharged: 'Alta', transferred: 'Transferido' }

export default function InpatientPage() {
  const ip = useInpatient()
  const { hospitals } = useHospitals()
  const pending = ip.requests.filter(r => r.status === 'pending')
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Hospital className="h-6 w-6" /> Internação</h1>
      </div>
      <Tabs defaultValue="mapa">
        <TabsList>
          <TabsTrigger value="mapa">Mapa de leitos</TabsTrigger>
          <TabsTrigger value="fila">Solicitações {pending.length > 0 && <Badge className="ml-2" variant="destructive">{pending.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="config">Configurar</TabsTrigger>
        </TabsList>
        <TabsContent value="mapa"><MapTab ip={ip} /></TabsContent>
        <TabsContent value="fila"><QueueTab ip={ip} /></TabsContent>
        <TabsContent value="config"><ConfigTab ip={ip} hospitals={hospitals} /></TabsContent>
      </Tabs>
    </div>
  )
}

type IP = ReturnType<typeof useInpatient>

function MapTab({ ip }: { ip: IP }) {
  const units = ip.units.filter(u => u.is_active)
  const [unitId, setUnitId] = useState('')
  const [openBed, setOpenBed] = useState<InpBed | null>(null)
  useEffect(() => { if (!unitId && units[0]) setUnitId(units[0].id) }, [units, unitId])
  const beds = ip.beds.filter(b => b.unit_id === unitId && b.is_active)
  const reqById = useMemo(() => Object.fromEntries(ip.requests.map(r => [r.id, r])), [ip.requests])
  if (!units.length) return <EmptyState title="Nenhum setor de internação" description="Cadastre setores na aba Configurar." />
  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap gap-2">
        {units.map(u => {
          const ub = ip.beds.filter(b => b.unit_id === u.id && b.is_active)
          return <Button key={u.id} variant={u.id === unitId ? 'default' : 'outline'} size="sm" onClick={() => setUnitId(u.id)}>
            {u.name} <span className="ml-2 text-xs opacity-80">{ub.filter(b => b.status === 'free').length}/{ub.length} livres</span>
          </Button>
        })}
      </div>
      <div className="flex gap-3 text-xs text-muted-foreground">
        {(Object.keys(INP_STATUS_LABEL) as InpBed['status'][]).map(s => <span key={s} className="flex items-center gap-1"><span className={cn('h-3 w-3 rounded border', STATUS_CLS[s])} />{INP_STATUS_LABEL[s]}</span>)}
      </div>
      {beds.length === 0 ? <p className="text-sm text-muted-foreground">Setor sem leitos. Adicione na aba Configurar.</p> : (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
          {beds.map(b => {
            const r = b.current_request_id ? reqById[b.current_request_id] : null
            return (
              <button key={b.id} onClick={() => setOpenBed(b)} className={cn('rounded-lg border-2 p-3 text-left min-h-28 hover:shadow transition', STATUS_CLS[b.status])}>
                <div className="flex items-center justify-between"><span className="font-semibold flex items-center gap-1"><BedDouble className="h-4 w-4" />{b.name}</span></div>
                <p className="text-xs mt-1">{INP_STATUS_LABEL[b.status]}</p>
                {r && <>
                  <p className="text-sm font-medium mt-1 truncate">{r.patient_name}</p>
                  <p className="text-xs text-muted-foreground truncate">De: {r.origin_label || '—'}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.reason}</p>
                </>}
              </button>
            )
          })}
        </div>
      )}
      <InpBedSheet ip={ip} bed={openBed} request={openBed?.current_request_id ? reqById[openBed.current_request_id] : null} onClose={() => setOpenBed(null)} />
    </div>
  )
}

function InpBedSheet({ ip, bed, request, onClose }: { ip: IP; bed: InpBed | null; request: AdmissionRequest | null; onClose: () => void }) {
  const { canRegulate } = useInpatientPermissions()
  const [logs, setLogs] = useState<any[]>([])
  const [transfer, setTransfer] = useState(false)
  const live = bed ? ip.beds.find(b => b.id === bed.id) || bed : null
  useEffect(() => {
    if (!live) return
    db.from('inpatient_bed_log').select('*').eq('bed_id', live.id).order('changed_at', { ascending: false }).limit(30).then(({ data }: any) => setLogs(data || []))
  }, [live?.id, live?.status])
  if (!live) return null
  const pendingTransfer = ip.requests.find(r => r.origin_inpatient_bed_id === live.id && (r.status === 'pending' || r.status === 'approved'))
  const unitName = (id?: string | null) => ip.units.find(u => u.id === id)?.name || '—'
  return (
    <Sheet open onOpenChange={o => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle>{unitName(live.unit_id)} · {live.name} <Badge variant="outline" className="ml-2">{INP_STATUS_LABEL[live.status]}</Badge></SheetTitle></SheetHeader>
        <div className="mt-4 space-y-4">
          {request && (
            <div className="rounded-lg border p-3 text-sm space-y-1">
              <p className="font-semibold">{request.patient_name}</p>
              <p>Motivo: {request.reason}</p>
              <p className="text-muted-foreground">Origem: {request.origin_label} · {request.urgency === 'urgente' ? 'Urgente' : 'Eletiva'}{request.doctor_name && ` · Dr(a). ${request.doctor_name}`}</p>
              {request.admitted_at && <p className="text-muted-foreground">Internado em {fmt(request.admitted_at)}</p>}
              <label className="flex items-center gap-2 pt-1">
                <input type="checkbox" checked={!!request.has_companion} onChange={e => rpc('admission_set_companion', { _request_id: request.id, _value: e.target.checked }, 'Acompanhante atualizado').then(ip.reload)} />
                Paciente terá acompanhante
              </label>
            </div>
          )}
          {live.status === 'reserved' && request && canRegulate && (
            <div className="flex gap-2">
              <Button onClick={() => rpc('admission_confirm_transfer', { _request_id: request.id }, 'Paciente internado no leito').then(ip.reload)}><CheckCircle2 className="h-4 w-4 mr-1" />Confirmar chegada do paciente</Button>
              <Button variant="outline" onClick={() => rpc('admission_cancel', { _request_id: request.id }, 'Reserva cancelada; leito livre').then(ip.reload)}>Cancelar reserva</Button>
            </div>
          )}
          {live.status === 'occupied' && request && (
            pendingTransfer ? (
              <div className="rounded-lg border p-3 text-sm flex items-center justify-between">
                <span>Transferência para <b>{unitName(pendingTransfer.requested_unit_id)}</b>: {REQ_STATUS[pendingTransfer.status]}</span>
                <Button size="sm" variant="ghost" onClick={() => rpc('admission_cancel', { _request_id: pendingTransfer.id }, 'Transferência cancelada').then(ip.reload)}>Cancelar</Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setTransfer(true)}><ArrowRightLeft className="h-4 w-4 mr-1" />Transferir de setor</Button>
                <Button variant="destructive" onClick={() => rpc('inpatient_discharge', { _bed_id: live.id }, 'Alta registrada; leito em higienização').then(ip.reload)}><LogOut className="h-4 w-4 mr-1" />Dar alta</Button>
              </div>
            )
          )}
          {live.status === 'cleaning' && <Button onClick={() => rpc('inpatient_mark_clean', { _bed_id: live.id }, 'Leito liberado').then(ip.reload)}><Sparkles className="h-4 w-4 mr-1" />Higienização concluída</Button>}
          <section className="space-y-1">
            <h3 className="font-semibold text-sm">Histórico do leito</h3>
            {logs.map(l => <p key={l.id} className="text-xs text-muted-foreground">{fmt(l.changed_at)} · {l.note || `${l.from_status} → ${l.to_status}`}</p>)}
          </section>
        </div>
        {request && <AdmissionRequestDialog open={transfer} onOpenChange={setTransfer} title="Transferir para outro setor de internação"
          patientName={request.patient_name} patientId={request.patient_id} originInpatientBedId={live.id} hasCompanion={!!request.has_companion} onDone={ip.reload} />}
      </SheetContent>
    </Sheet>
  )
}

function QueueTab({ ip }: { ip: IP }) {
  const { canRegulate } = useInpatientPermissions()
  const [approve, setApprove] = useState<AdmissionRequest | null>(null)
  const [refuse, setRefuse] = useState<AdmissionRequest | null>(null)
  const [newReq, setNewReq] = useState(false)
  const unitName = (id?: string | null) => ip.units.find(u => u.id === id)?.name || '—'
  const pending = ip.requests.filter(r => r.status === 'pending').sort((a, b) => (a.urgency === b.urgency ? a.requested_at.localeCompare(b.requested_at) : a.urgency === 'urgente' ? -1 : 1))
  const others = ip.requests.filter(r => r.status !== 'pending').slice(0, 50)
  return (
    <div className="mt-4 space-y-4">
      <div className="flex justify-end"><Button size="sm" onClick={() => setNewReq(true)}><Plus className="h-4 w-4 mr-1" />Nova solicitação</Button></div>
      <Card>
        <CardHeader><CardTitle className="text-base">Pendentes de aprovação</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {pending.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente.</p>}
          {pending.map(r => (
            <div key={r.id} className="rounded-lg border p-3 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-60 text-sm">
                <p className="font-semibold flex items-center gap-2">{r.patient_name} {r.urgency === 'urgente' ? <Badge variant="destructive">Urgente</Badge> : <Badge variant="outline">Eletiva</Badge>}</p>
                <p>Setor pretendido: <b>{unitName(r.requested_unit_id)}</b> · Motivo: {r.reason}</p>
                <p className="text-muted-foreground text-xs">Origem: {r.origin_label} · {fmt(r.requested_at)}{r.doctor_name && ` · Dr(a). ${r.doctor_name}`}{r.notes && ` · ${r.notes}`}</p>
              </div>
              {canRegulate && <>
                <Button size="sm" onClick={() => setApprove(r)}><CheckCircle2 className="h-4 w-4 mr-1" />Aprovar</Button>
                <Button size="sm" variant="outline" onClick={() => setRefuse(r)}><XCircle className="h-4 w-4 mr-1" />Recusar / redirecionar</Button>
              </>}
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Últimas solicitações</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {others.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
          {others.map(r => (
            <div key={r.id} className="flex items-center justify-between text-sm border-b last:border-0 py-1.5">
              <span>{r.patient_name} · {unitName(r.approved_unit_id || r.requested_unit_id)}{r.bed_id && ` · ${ip.beds.find(b => b.id === r.bed_id)?.name || ''}`}{r.refusal_reason && <span className="text-muted-foreground"> · Motivo da recusa: {r.refusal_reason}</span>}</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{REQ_STATUS[r.status] || r.status}</Badge>
                {r.status === 'approved' && canRegulate && <>
                  <Button size="sm" onClick={() => rpc('admission_confirm_transfer', { _request_id: r.id }, 'Paciente internado no leito').then(ip.reload)}>Confirmar chegada</Button>
                  <Button size="sm" variant="ghost" onClick={() => rpc('admission_cancel', { _request_id: r.id }, 'Reserva cancelada').then(ip.reload)}>Cancelar</Button>
                </>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <ApproveDialog ip={ip} req={approve} onClose={() => setApprove(null)} />
      <RefuseDialog ip={ip} req={refuse} onClose={() => setRefuse(null)} />
      <AdmissionRequestDialog open={newReq} onOpenChange={setNewReq} onDone={ip.reload} />
    </div>
  )
}

function ApproveDialog({ ip, req, onClose }: { ip: IP; req: AdmissionRequest | null; onClose: () => void }) {
  const [unit, setUnit] = useState('')
  const [bed, setBed] = useState('')
  useEffect(() => { if (req) setUnit(req.requested_unit_id) }, [req])
  const free = ip.beds.filter(b => b.unit_id === unit && b.is_active && b.status === 'free')
  useEffect(() => { setBed(free[0]?.id || '') }, [unit, req, ip.beds.length]) // sugere o primeiro leito livre
  if (!req) return null
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Aprovar vaga — {req.patient_name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Setor</Label>
            <Select value={unit} onValueChange={setUnit}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ip.units.filter(u => u.is_active).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select>
          </div>
          <div><Label>Leito</Label>
            <Select value={bed} onValueChange={setBed}><SelectTrigger><SelectValue placeholder={free.length ? 'Escolha' : 'Nenhum leito livre neste setor'} /></SelectTrigger>
              <SelectContent>{free.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select>
            <p className="text-xs text-muted-foreground mt-1">Sugerido o primeiro leito livre. O leito fica Reservado até a chegada do paciente.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Voltar</Button>
          <Button disabled={!bed} onClick={async () => { if (await rpc('admission_approve', { _request_id: req.id, _bed_id: bed }, 'Vaga aprovada; leito reservado')) { onClose(); ip.reload() } }}>Aprovar e reservar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RefuseDialog({ ip, req, onClose }: { ip: IP; req: AdmissionRequest | null; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [suggest, setSuggest] = useState('none')
  useEffect(() => { setReason(''); setSuggest('none') }, [req])
  if (!req) return null
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Recusar / redirecionar — {req.patient_name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Justificativa *</Label><Textarea value={reason} onChange={e => setReason(e.target.value)} /></div>
          <div><Label>Sugerir outro setor (opcional)</Label>
            <Select value={suggest} onValueChange={setSuggest}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Apenas recusar</SelectItem>
                {ip.units.filter(u => u.is_active && u.id !== req.requested_unit_id).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent></Select>
            {suggest !== 'none' && <p className="text-xs text-muted-foreground mt-1">Uma nova solicitação para o setor sugerido volta para a fila de aprovação.</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Voltar</Button>
          <Button variant="destructive" disabled={!reason.trim()} onClick={async () => {
            if (await rpc('admission_refuse', { _request_id: req.id, _reason: reason, _suggested_unit_id: suggest === 'none' ? null : suggest }, suggest === 'none' ? 'Solicitação recusada' : 'Solicitação redirecionada')) { onClose(); ip.reload() }
          }}>{suggest === 'none' ? 'Recusar' : 'Redirecionar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ConfigTab({ ip, hospitals }: { ip: IP; hospitals: { id: string; name: string }[] }) {
  const [name, setName] = useState('')
  const [hospital, setHospital] = useState('none')
  const [count, setCount] = useState('4')
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Novo setor de internação</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2 items-end">
          <div><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Maternidade" /></div>
          {hospitals.length > 0 && <div><Label>Hospital</Label>
            <Select value={hospital} onValueChange={setHospital}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">—</SelectItem>{hospitals.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent></Select></div>}
          <div><Label>Leitos iniciais</Label><Input type="number" min={0} className="w-24" value={count} onChange={e => setCount(e.target.value)} /></div>
          <Button onClick={() => { ip.addUnit(name, hospital === 'none' ? null : hospital, Math.max(0, Number(count) || 0)); setName('') }} disabled={!name.trim()}><Plus className="h-4 w-4 mr-1" />Criar</Button>
        </CardContent>
      </Card>
      {ip.units.map(u => {
        const ub = ip.beds.filter(b => b.unit_id === u.id)
        return (
          <Card key={u.id} className={cn(!u.is_active && 'opacity-60')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              {editing === u.id
                ? <div className="flex gap-2"><Input value={editName} onChange={e => setEditName(e.target.value)} /><Button size="sm" onClick={() => { ip.renameUnit(u, editName); setEditing(null) }}>Salvar</Button></div>
                : <CardTitle className="text-base cursor-pointer" onClick={() => { setEditing(u.id); setEditName(u.name) }} title="Clique para renomear">{u.name}</CardTitle>}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => ip.addBed(u.id)}><Plus className="h-4 w-4 mr-1" />Leito</Button>
                <Button size="sm" variant="ghost" onClick={() => ip.toggleUnit(u)}>{u.is_active ? 'Inativar' : 'Reativar'}</Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {ub.length === 0 && <p className="text-sm text-muted-foreground">Sem leitos.</p>}
              {ub.map(b => (
                <Badge key={b.id} variant={b.is_active ? 'outline' : 'secondary'} className={cn('cursor-pointer', !b.is_active && 'line-through')} onClick={() => ip.toggleBed(b)} title={b.is_active ? 'Clique para inativar' : 'Clique para reativar'}>
                  {b.name} · {INP_STATUS_LABEL[b.status]}
                </Badge>
              ))}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
