import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { rpc } from '@/hooks/useCollectionPosts'

const db = supabase as any

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  patientName?: string
  patientId?: string | null
  originOccupancyId?: string | null
  originInpatientBedId?: string | null
  doctorName?: string
  title?: string
  hasCompanion?: boolean
  onDone?: () => void
}

/** Formulário único de solicitação de internação (leito do posto, Painel Médico ou transferência entre setores) */
export function AdmissionRequestDialog({ open, onOpenChange, patientName = '', patientId, originOccupancyId, originInpatientBedId, doctorName = '', title, hasCompanion = false, onDone }: Props) {
  const [units, setUnits] = useState<{ id: string; name: string }[]>([])
  const [name, setName] = useState(patientName)
  const [unit, setUnit] = useState('')
  const [reason, setReason] = useState('')
  const [urgency, setUrgency] = useState('eletiva')
  const [notes, setNotes] = useState('')
  const [doctor, setDoctor] = useState(doctorName)
  const [busy, setBusy] = useState(false)
  const [companion, setCompanion] = useState<'' | 'sim' | 'nao'>('')

  useEffect(() => {
    if (!open) return
    setName(patientName); setDoctor(doctorName); setUnit(''); setReason(''); setNotes(''); setUrgency('eletiva'); setCompanion(originInpatientBedId ? (hasCompanion ? 'sim' : 'nao') : '')
    db.from('inpatient_units').select('id, name').eq('is_active', true).order('name').then(({ data }: any) => setUnits(data || []))
  }, [open, patientName, doctorName])

  const submit = async () => {
    setBusy(true)
    const res = await rpc('admission_request_create', {
      _patient_name: name, _requested_unit_id: unit, _reason: reason, _urgency: urgency, _notes: notes || null,
      _doctor_name: doctor || null, _patient_id: patientId || null,
      _origin_occupancy_id: originOccupancyId || null, _origin_inpatient_bed_id: originInpatientBedId || null,
    }, 'Solicitação enviada para aprovação de vaga')
    if (res && companion === 'sim') await rpc('admission_set_companion', { _request_id: res, _value: true })
    setBusy(false)
    if (res) { onOpenChange(false); onDone?.() }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title || 'Solicitar internação'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Paciente *</Label><Input value={name} onChange={e => setName(e.target.value)} disabled={!!patientName} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Setor pretendido *</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue placeholder={units.length ? 'Escolha' : 'Nenhum setor cadastrado'} /></SelectTrigger>
                <SelectContent>{units.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Urgência</Label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="eletiva">Eletiva</SelectItem><SelectItem value="urgente">Urgente</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Motivo / diagnóstico *</Label><Input value={reason} onChange={e => setReason(e.target.value)} /></div>
          <div><Label>Paciente terá acompanhante? *</Label>
            <Select value={companion} onValueChange={v => setCompanion(v as any)}>
              <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
              <SelectContent><SelectItem value="sim">Sim</SelectItem><SelectItem value="nao">Não</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Médico solicitante</Label><Input value={doctor} onChange={e => setDoctor(e.target.value)} /></div>
          <div><Label>Observações</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={busy || !name.trim() || !unit || !reason.trim() || !companion} onClick={submit}>Enviar solicitação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
