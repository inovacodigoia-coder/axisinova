import React, { useMemo, useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { Activity, HeartPulse, Thermometer } from 'lucide-react'
import {
  FLOWCHARTS, GENERAL_DISCRIMINATORS, MANCHESTER_COLORS, Discriminator, resolveColor,
} from '@/data/manchester'
import { TriageEntry } from '@/hooks/useTriage'

interface Props {
  open: boolean
  entry: TriageEntry | null
  onClose: () => void
  onConfirm: (payload: {
    color: any
    complaint: string
    flowchart: string
    discriminators: Discriminator[]
    vitals: Record<string, any>
  }) => Promise<void>
}

const emptyVitals = { pa: '', fc: '', fr: '', temp: '', spo2: '', glasgow: '' }

export default function TriageClassificationModal({ open, entry, onClose, onConfirm }: Props) {
  const [flowchart, setFlowchart] = useState('')
  const [complaint, setComplaint] = useState('')
  const [selected, setSelected] = useState<Discriminator[]>([])
  const [vitals, setVitals] = useState({ ...emptyVitals })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setFlowchart(entry?.flowchart || '')
      setComplaint(entry?.complaint || '')
      setSelected([])
      setVitals({ ...emptyVitals, ...(entry?.vitals as any) })
    }
  }, [open, entry])

  const specific = useMemo(
    () => FLOWCHARTS.find((f) => f.name === flowchart)?.discriminators || [],
    [flowchart],
  )
  const color = useMemo(() => resolveColor(selected), [selected])
  const colorInfo = MANCHESTER_COLORS[color]

  const toggle = (d: Discriminator) => {
    setSelected((prev) =>
      prev.some((x) => x.label === d.label) ? prev.filter((x) => x.label !== d.label) : [...prev, d],
    )
  }

  const handleConfirm = async () => {
    if (!flowchart) return toast.error('Selecione o fluxograma da queixa')
    if (!complaint.trim()) return toast.error('Descreva a queixa principal')
    if (!vitals.pa.trim() || !vitals.fc.trim() || !vitals.temp.trim()) {
      return toast.error('Pressão arterial, frequência cardíaca e temperatura são obrigatórias')
    }
    if (!selected.length) return toast.error('Selecione ao menos um discriminador')
    setSaving(true)
    await onConfirm({ color, complaint: complaint.trim(), flowchart, discriminators: selected, vitals })
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Classificação de Risco — {entry?.patient_name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-bold uppercase text-muted-foreground">Sinais vitais</Label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div>
                  <Label className="text-[11px]">PA (mmHg) *</Label>
                  <Input value={vitals.pa} onChange={(e) => setVitals({ ...vitals, pa: e.target.value })} placeholder="120/80" />
                </div>
                <div>
                  <Label className="text-[11px]">FC (bpm) *</Label>
                  <Input value={vitals.fc} onChange={(e) => setVitals({ ...vitals, fc: e.target.value })} placeholder="80" />
                </div>
                <div>
                  <Label className="text-[11px]">Temp. (°C) *</Label>
                  <Input value={vitals.temp} onChange={(e) => setVitals({ ...vitals, temp: e.target.value })} placeholder="36,5" />
                </div>
                <div>
                  <Label className="text-[11px]">FR (irpm)</Label>
                  <Input value={vitals.fr} onChange={(e) => setVitals({ ...vitals, fr: e.target.value })} placeholder="16" />
                </div>
                <div>
                  <Label className="text-[11px]">SpO2 (%)</Label>
                  <Input value={vitals.spo2} onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })} placeholder="98" />
                </div>
                <div>
                  <Label className="text-[11px]">Glasgow</Label>
                  <Input value={vitals.glasgow} onChange={(e) => setVitals({ ...vitals, glasgow: e.target.value })} placeholder="15" />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold uppercase text-muted-foreground">Fluxograma da queixa *</Label>
              <Select value={flowchart} onValueChange={(v) => { setFlowchart(v); setSelected([]) }}>
                <SelectTrigger className="mt-2"><SelectValue placeholder="Selecione o fluxograma" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {FLOWCHARTS.map((f) => (
                    <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold uppercase text-muted-foreground">Queixa principal *</Label>
              <Textarea
                className="mt-2"
                rows={3}
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                placeholder="Relato do paciente"
              />
            </div>

            <div
              className="rounded-xl p-4 text-white"
              style={{ background: colorInfo.hex }}
            >
              <p className="text-xs font-bold uppercase opacity-90">Classificação resultante</p>
              <p className="text-lg font-black">{colorInfo.label}</p>
              <p className="text-xs font-semibold">{colorInfo.text}</p>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Discriminadores</Label>
            <ScrollArea className="h-[420px] rounded-xl border p-3">
              {specific.length > 0 && (
                <>
                  <p className="text-[11px] font-bold uppercase text-muted-foreground mb-2">Do fluxograma</p>
                  <div className="space-y-2 mb-4">
                    {specific.map((d) => (
                      <DiscRow key={d.label} d={d} checked={selected.some((x) => x.label === d.label)} onToggle={() => toggle(d)} />
                    ))}
                  </div>
                </>
              )}
              <p className="text-[11px] font-bold uppercase text-muted-foreground mb-2">Gerais</p>
              <div className="space-y-2">
                {GENERAL_DISCRIMINATORS.map((d) => (
                  <DiscRow key={d.label} d={d} checked={selected.some((x) => x.label === d.label)} onToggle={() => toggle(d)} />
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="gradient-bg text-white" onClick={handleConfirm} disabled={saving}>
            Confirmar classificação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DiscRow({ d, checked, onToggle }: { d: Discriminator; checked: boolean; onToggle: () => void }) {
  return (
    <label className="flex items-center gap-3 rounded-lg border p-2 cursor-pointer hover:bg-muted/40">
      <Checkbox checked={checked} onCheckedChange={onToggle} />
      <span className="h-3 w-3 rounded-full" style={{ background: MANCHESTER_COLORS[d.color].hex }} />
      <span className="text-sm flex-1">{d.label}</span>
    </label>
  )
}
