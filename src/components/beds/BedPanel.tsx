import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, Pill, Send, LogOut, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'
import { MANCHESTER_COLORS, type ManchesterColor } from '@/data/manchester'
import { AdmissionRequestDialog } from '@/components/inpatient/AdmissionRequestDialog'
import { rpc, type Bed, type Occupancy, type Sector } from '@/hooks/useCollectionPosts'

const db = supabase as any
const fmt = (d?: string | null) => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'

export function doseState(scheduled: string, administered: string | null): 'done' | 'late' | 'near' | 'ok' {
  if (administered) return 'done'
  const diff = new Date(scheduled).getTime() - Date.now()
  if (diff < 0) return 'late'
  if (diff <= 15 * 60000) return 'near'
  return 'ok'
}

interface Props { bed: Bed | null; occupancy: Occupancy | null; sectors: Sector[]; onClose: () => void }

const emptyItem = () => ({ medication: '', dose: '', route: 'VO', interval_hours: '0', doses_count: '1', first_dose_at: '' })

export function BedPanel({ bed, occupancy, sectors, onClose }: Props) {
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [doses, setDoses] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [disp, setDisp] = useState<any[]>([])
  const [referrals, setReferrals] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [showRx, setShowRx] = useState(false)
  const [rxItems, setRxItems] = useState([emptyItem()])
  const [doctor, setDoctor] = useState('')
  const [rxNotes, setRxNotes] = useState('')
  const [urgent, setUrgent] = useState(false)
  const [sector, setSector] = useState('')
  const [refNotes, setRefNotes] = useState('')
  const [, setTick] = useState(0)
  const [showAdm, setShowAdm] = useState(false)
  const [admReq, setAdmReq] = useState<any | null>(null)

  const load = useCallback(async () => {
    if (!occupancy || !bed) return
    const [p, d, r, l] = await Promise.all([
      db.from('prescriptions').select('*').eq('occupancy_id', occupancy.id).order('created_at', { ascending: false }),
      db.from('medication_doses').select('*').eq('occupancy_id', occupancy.id).order('scheduled_at'),
      db.from('bed_referrals').select('*').eq('occupancy_id', occupancy.id).order('referred_at', { ascending: false }),
      db.from('bed_status_log').select('*').eq('bed_id', bed.id).order('changed_at', { ascending: false }).limit(30),
    ])
    const { data: adm } = await db.from('admission_requests').select('*').eq('origin_occupancy_id', occupancy.id).in('status', ['pending', 'approved']).maybeSingle()
    setAdmReq(adm || null)
    const ids = (p.data || []).map((x: any) => x.id)
    const [it, ds] = ids.length ? await Promise.all([
      db.from('prescription_items').select('*').in('prescription_id', ids),
      db.from('pharmacy_dispensations').select('*').in('prescription_id', ids),
    ]) : [{ data: [] }, { data: [] }]
    setPrescriptions(p.data || []); setDoses(d.data || []); setReferrals(r.data || []); setLogs(l.data || [])
    setItems(it.data || []); setDisp(ds.data || [])
  }, [occupancy?.id, bed?.id])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!occupancy) return
    const ch = supabase.channel('bedpanel-' + occupancy.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medication_doses', filter: `occupancy_id=eq.${occupancy.id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pharmacy_dispensations' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bed_referrals', filter: `occupancy_id=eq.${occupancy.id}` }, load)
      .subscribe()
    const t = setInterval(() => setTick(x => x + 1), 30000)
    return () => { supabase.removeChannel(ch); clearInterval(t) }
  }, [occupancy?.id, load])

  if (!bed) return null
  const color = occupancy?.manchester_color ? MANCHESTER_COLORS[occupancy.manchester_color as ManchesterColor] : null
  const activeRef = referrals.find(r => r.status === 'waiting' || r.status === 'in_progress')

  const submitRx = async () => {
    const valid = rxItems.filter(i => i.medication.trim() && i.dose.trim())
    if (!valid.length) return
    const res = await rpc('prescription_create', {
      _occupancy_id: occupancy!.id, _doctor_name: doctor || null, _notes: rxNotes || null, _urgent: urgent,
      _items: valid.map(i => ({ ...i, first_dose_at: i.first_dose_at ? new Date(i.first_dose_at).toISOString() : null })),
    }, 'Prescrição enviada à farmácia')
    if (res) { setShowRx(false); setRxItems([emptyItem()]); setRxNotes(''); setUrgent(false); load() }
  }

  return (
    <Sheet open={!!bed} onOpenChange={o => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {bed.name}
            {occupancy?.away && <Badge variant="outline">Fora do leito</Badge>}
          </SheetTitle>
        </SheetHeader>

        {!occupancy ? <p className="mt-4 text-muted-foreground">Leito sem paciente.</p> : (
          <div className="mt-4 space-y-6">
            <section className="rounded-lg border p-4 flex items-center gap-3">
              {color && <span className="h-10 w-2 rounded" style={{ background: color.hex }} />}
              <div className="flex-1">
                <p className="font-semibold">{occupancy.patient_name}</p>
                <p className="text-xs text-muted-foreground">{color?.label || 'Sem classificação'} · no leito desde {fmt(occupancy.allocated_at)}</p>
              </div>
              <Select onValueChange={async v => { if (await rpc('bed_release', { _bed_id: bed.id, _reason: v }, 'Leito liberado para higienização')) onClose() }}>
                <SelectTrigger className="w-44"><LogOut className="h-4 w-4 mr-1" /><SelectValue placeholder="Liberar leito" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta do posto</SelectItem>
                </SelectContent>
              </Select>
            </section>

            <section className="rounded-lg border p-3 flex items-center justify-between text-sm">
              {admReq
                ? <span>Internação: <b>{admReq.status === 'pending' ? 'aguardando aprovação de vaga' : 'vaga reservada — aguardando transferência'}</b>. O paciente continua neste leito até a transferência.</span>
                : <span className="text-muted-foreground">Precisa internar este paciente?</span>}
              {!admReq && <Button size="sm" variant="outline" onClick={() => setShowAdm(true)}>Solicitar internação</Button>}
              <AdmissionRequestDialog open={showAdm} onOpenChange={setShowAdm} patientName={occupancy.patient_name} patientId={occupancy.patient_id} originOccupancyId={occupancy.id} onDone={load} />
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2"><Pill className="h-4 w-4" /> Prescrições e aprazamento</h3>
                <Button size="sm" variant="outline" onClick={() => setShowRx(s => !s)}><Plus className="h-4 w-4 mr-1" />Prescrever</Button>
              </div>
              {showRx && (
                <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Médico</Label><Input value={doctor} onChange={e => setDoctor(e.target.value)} /></div>
                    <label className="flex items-end gap-2 pb-2 text-sm"><Checkbox checked={urgent} onCheckedChange={v => setUrgent(!!v)} />Urgente</label>
                  </div>
                  {rxItems.map((it, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4"><Label className="text-xs">Medicamento</Label><Input value={it.medication} onChange={e => setRxItems(a => a.map((x, j) => j === i ? { ...x, medication: e.target.value } : x))} /></div>
                      <div className="col-span-2"><Label className="text-xs">Dose</Label><Input value={it.dose} onChange={e => setRxItems(a => a.map((x, j) => j === i ? { ...x, dose: e.target.value } : x))} /></div>
                      <div className="col-span-1"><Label className="text-xs">Via</Label><Input value={it.route} onChange={e => setRxItems(a => a.map((x, j) => j === i ? { ...x, route: e.target.value } : x))} /></div>
                      <div className="col-span-1"><Label className="text-xs">A cada (h)</Label><Input type="number" min={0} value={it.interval_hours} onChange={e => setRxItems(a => a.map((x, j) => j === i ? { ...x, interval_hours: e.target.value } : x))} /></div>
                      <div className="col-span-1"><Label className="text-xs">Doses</Label><Input type="number" min={1} value={it.doses_count} onChange={e => setRxItems(a => a.map((x, j) => j === i ? { ...x, doses_count: e.target.value } : x))} /></div>
                      <div className="col-span-2"><Label className="text-xs">1ª dose</Label><Input type="datetime-local" value={it.first_dose_at} onChange={e => setRxItems(a => a.map((x, j) => j === i ? { ...x, first_dose_at: e.target.value } : x))} /></div>
                      <Button size="icon" variant="ghost" className="col-span-1" onClick={() => setRxItems(a => a.length > 1 ? a.filter((_, j) => j !== i) : a)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                  <Button size="sm" variant="ghost" onClick={() => setRxItems(a => [...a, emptyItem()])}><Plus className="h-4 w-4 mr-1" />Medicamento</Button>
                  <Textarea placeholder="Observações" value={rxNotes} onChange={e => setRxNotes(e.target.value)} />
                  <Button onClick={submitRx}>Enviar para farmácia</Button>
                </div>
              )}
              {prescriptions.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma prescrição.</p>}
              {prescriptions.map(p => {
                const dp = disp.find(d => d.prescription_id === p.id)
                const dispensed = dp?.status === 'dispensed'
                return (
                  <div key={p.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{fmt(p.created_at)} {p.doctor_name && `· ${p.doctor_name}`}</span>
                      <Badge variant={dispensed ? 'default' : 'outline'}>{dispensed ? 'Dispensado' : dp?.status === 'cancelled' ? 'Cancelado' : 'Aguardando farmácia'}</Badge>
                    </div>
                    {items.filter(i => i.prescription_id === p.id).map(i => (
                      <div key={i.id} className="text-sm">
                        <p className="font-medium">{i.medication} · {i.dose} · {i.route}{Number(i.interval_hours) > 0 && ` · a cada ${i.interval_hours}h`}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {doses.filter(d => d.prescription_item_id === i.id).map(d => {
                            const st = doseState(d.scheduled_at, d.administered_at)
                            const cls = st === 'done' ? 'border-primary/40 text-primary' : st === 'late' ? 'border-destructive text-destructive' : st === 'near' ? 'border-warning text-warning' : ''
                            return (
                              <button key={d.id} disabled={st === 'done' || !dispensed || p.status !== 'active'}
                                title={st === 'done' ? `Administrada ${fmt(d.administered_at)}` : dispensed ? 'Registrar administração' : 'Aguardando dispensação'}
                                onClick={() => rpc('dose_administer', { _dose_id: d.id }, 'Dose registrada').then(load)}
                                className={`rounded border px-2 py-1 text-xs flex items-center gap-1 disabled:cursor-not-allowed ${cls}`}>
                                {st === 'done' ? <CheckCircle2 className="h-3 w-3" /> : st === 'late' ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                {d.dose_number}ª prev. {fmt(d.scheduled_at)}{d.administered_at && ` · real ${fmt(d.administered_at)}`}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2"><Send className="h-4 w-4" /> Encaminhamentos</h3>
              {activeRef ? (
                <div className="rounded-lg border p-3 flex items-center justify-between text-sm">
                  <span>Em <b>{activeRef.sector_name}</b> desde {fmt(activeRef.referred_at)}</span>
                  <Button size="sm" onClick={() => rpc('bed_referral_update', { _referral_id: activeRef.id, _status: 'returned' }, 'Paciente retornou ao leito').then(load)}>Registrar retorno</Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select value={sector} onValueChange={setSector}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="Setor" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Laboratório">Laboratório</SelectItem>
                      <SelectItem value="Raio-X">Raio-X</SelectItem>
                      {sectors.filter(s => s.is_active).map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Observação" value={refNotes} onChange={e => setRefNotes(e.target.value)} />
                  <Button disabled={!sector} onClick={async () => {
                    const sid = sectors.find(s => s.name === sector)?.id ?? null
                    if (await rpc('bed_refer', { _occupancy_id: occupancy.id, _sector_name: sector, _sector_id: sid, _notes: refNotes || null }, 'Paciente encaminhado; leito mantido')) { setSector(''); setRefNotes(''); load() }
                  }}>Encaminhar</Button>
                </div>
              )}
              {referrals.filter(r => r !== activeRef).map(r => (
                <p key={r.id} className="text-xs text-muted-foreground">{r.sector_name} · {fmt(r.referred_at)} → {r.status === 'returned' ? `retornou ${fmt(r.returned_at)}` : 'cancelado'}</p>
              ))}
            </section>

            <section className="space-y-1">
              <h3 className="font-semibold text-sm">Histórico do leito</h3>
              {logs.map(l => <p key={l.id} className="text-xs text-muted-foreground">{fmt(l.changed_at)} · {l.note || `${l.from_status} → ${l.to_status}`}</p>)}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
