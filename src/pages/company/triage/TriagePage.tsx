import React, { useMemo, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Activity, AlertTriangle, ArrowRight, Clock, Printer, Settings, Stethoscope, UserPlus,
} from 'lucide-react'
import { useTriage, TriageEntry, elapsedMinutes, targetState } from '@/hooks/useTriage'
import { MANCHESTER_COLORS, ManchesterColor, COLOR_ORDER, REPRINT_REASONS } from '@/data/manchester'
import TriageClassificationModal from '@/components/triage/TriageClassificationModal'
import { WristbandLabel } from '@/components/triage/WristbandLabel'
import { gerarPdfEtiquetas } from '@/lib/labelPdf'
import { useImpressaoLocal } from '@/hooks/useImpressaoLocal'

export default function TriagePage() {
  const {
    waiting, classified, tickets, settings, loading, tick,
    createEntry, classify, reclassify, sendToDoctor, registerPrint, updateSettings, reload,
  } = useTriage()
  const { imprimir, imprimindo } = useImpressaoLocal()

  const [classifying, setClassifying] = useState<TriageEntry | null>(null)
  const [directOpen, setDirectOpen] = useState(false)
  const [direct, setDirect] = useState({ name: '', cpf: '', protocol: '' })
  const [configOpen, setConfigOpen] = useState(false)
  const [printTarget, setPrintTarget] = useState<TriageEntry | null>(null)
  const [reprint, setReprint] = useState<{ entry: TriageEntry; reason: string; notes: string } | null>(null)
  const wristbandRef = useRef<HTMLDivElement>(null)

  const doctorQueue = useMemo(
    () => classified.slice().sort((a, b) => {
      const pa = a.color ? MANCHESTER_COLORS[a.color].priority : 99
      const pb = b.color ? MANCHESTER_COLORS[b.color].priority : 99
      if (pa !== pb) return pa - pb
      return new Date(a.classified_at || a.arrived_at).getTime() - new Date(b.classified_at || b.arrived_at).getTime()
    }),
    [classified, tick],
  )

  const handleTransfer = async (ticket: any) => {
    const entry = await createEntry({
      source: 'totem',
      ticket_id: ticket.id,
      ticket_code: ticket.display_code,
      patient_name: ticket.patient_name || ticket.display_code,
      protocol: ticket.display_code,
    } as any)
    if (entry) toast.success('Paciente transferido para a triagem')
  }

  const handleDirect = async () => {
    if (!direct.name.trim()) return toast.error('Informe o nome do paciente')
    const entry = await createEntry({
      source: 'direct',
      patient_name: direct.name.trim(),
      patient_cpf: direct.cpf.trim() || null,
      protocol: direct.protocol.trim() || null,
    } as any)
    if (entry) {
      toast.success('Paciente chamado para a triagem')
      setDirect({ name: '', cpf: '', protocol: '' })
      setDirectOpen(false)
    }
  }

  const doPrint = async (entry: TriageEntry, isReprint: boolean, reason?: string) => {
    setPrintTarget(entry)
    // aguarda a pulseira ser renderizada fora da tela antes de gerar o PDF
    await new Promise((r) => setTimeout(r, 250))
    const el = wristbandRef.current
    if (!el) {
      toast.error('Não foi possível montar a pulseira')
      return
    }
    try {
      const blob = await gerarPdfEtiquetas(
        [el],
        settings?.wristband_height_mm || 250,
        settings?.wristband_width_mm || 25,
      )
      const ok = await imprimir('pulseira_triagem', blob)
      if (ok) await registerPrint(entry.id, isReprint, reason)
    } catch (e) {
      toast.error('Falha ao gerar a pulseira')
    } finally {
      setPrintTarget(null)
    }
  }

  const handlePrintClick = (entry: TriageEntry) => {
    if (entry.wristband_printed_at) {
      setReprint({ entry, reason: REPRINT_REASONS[0], notes: '' })
      return
    }
    doPrint(entry, false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black">Triagem — Classificação de Risco</h1>
          <p className="text-sm text-muted-foreground">Protocolo de Manchester e pulseira de identificação</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setConfigOpen(true)}>
            <Settings className="h-4 w-4" /> Configuração
          </Button>
          <Button className="gradient-bg text-white gap-2" onClick={() => setDirectOpen(true)}>
            <UserPlus className="h-4 w-4" /> Chamar paciente
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Senhas do totem */}
        <Card className="p-5 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-primary" /> Aguardando na recepção
          </h2>
          {tickets.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma senha aguardando.</p>}
          {tickets.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-lg border p-3">
              <Badge variant="outline" className="font-black">{t.display_code}</Badge>
              <span className="flex-1 text-sm truncate">{t.patient_name || t.queue_line_name}</span>
              <Button size="sm" variant="outline" onClick={() => handleTransfer(t)}>Transferir</Button>
            </div>
          ))}
        </Card>

        {/* Aguardando classificação */}
        <Card className="p-5 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" /> Aguardando classificação
          </h2>
          {waiting.length === 0 && <p className="text-xs text-muted-foreground">Ninguém aguardando triagem.</p>}
          {waiting.map((e) => (
            <div key={e.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex-1 text-sm font-semibold truncate">{e.patient_name}</span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {elapsedMinutes(e)} min
                </span>
              </div>
              <Button size="sm" className="w-full gradient-bg text-white" onClick={() => setClassifying(e)}>
                Classificar
              </Button>
            </div>
          ))}
        </Card>

        {/* Classificados / fila do médico */}
        <Card className="p-5 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Fila do médico (por cor)
          </h2>
          {doctorQueue.length === 0 && <p className="text-xs text-muted-foreground">Nenhum paciente classificado.</p>}
          {doctorQueue.map((e) => {
            const info = e.color ? MANCHESTER_COLORS[e.color] : null
            const state = targetState(e)
            return (
              <div key={e.id} className="rounded-lg border p-3 space-y-2" style={{ borderLeft: `6px solid ${info?.hex || '#999'}` }}>
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-sm font-semibold truncate">{e.patient_name}</span>
                  {state !== 'ok' && (
                    <Badge variant="outline" className={state === 'late' ? 'text-rose-600 border-rose-300' : 'text-amber-600 border-amber-300'}>
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {state === 'late' ? 'Tempo estourado' : 'Perto do limite'}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="font-bold" style={{ color: info?.hex }}>{info?.label}</span>
                  <span>· {elapsedMinutes(e)} min de {e.target_minutes} min</span>
                  {e.status === 'in_doctor' && <Badge variant="outline">Na fila do médico</Badge>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => handlePrintClick(e)} disabled={imprimindo}>
                    <Printer className="h-3.5 w-3.5" /> {e.wristband_printed_at ? 'Reimprimir' : 'Pulseira'}
                  </Button>
                  {e.status !== 'in_doctor' && (
                    <Button size="sm" className="gradient-bg text-white" onClick={() => sendToDoctor(e.id)}>
                      Enviar ao médico
                    </Button>
                  )}
                  <Select
                    value={e.color || ''}
                    onValueChange={(v) => reclassify(e, v as ManchesterColor, 'manual', 'Reclassificação manual')}
                  >
                    <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="Reclassificar" /></SelectTrigger>
                    <SelectContent>
                      {COLOR_ORDER.map((c) => (
                        <SelectItem key={c} value={c}>{MANCHESTER_COLORS[c].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )
          })}
        </Card>
      </div>

      <TriageClassificationModal
        open={!!classifying}
        entry={classifying}
        onClose={() => setClassifying(null)}
        onConfirm={async (payload) => {
          if (!classifying) return
          const ok = await classify(classifying.id, payload)
          if (ok) {
            toast.success('Classificação registrada')
            setClassifying(null)
          }
        }}
      />

      {/* Chamada direta */}
      <Dialog open={directOpen} onOpenChange={setDirectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Chamar paciente para a triagem</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome do paciente *</Label>
              <Input value={direct.name} onChange={(e) => setDirect({ ...direct, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">CPF</Label>
                <Input value={direct.cpf} onChange={(e) => setDirect({ ...direct, cpf: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Protocolo / Atendimento</Label>
                <Input value={direct.protocol} onChange={(e) => setDirect({ ...direct, protocol: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDirectOpen(false)}>Cancelar</Button>
            <Button className="gradient-bg text-white" onClick={handleDirect}>Colocar na triagem</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Configuração do hospital */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Configuração da triagem</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Reclassificação por tempo excedido</Label>
              <Select
                value={settings?.reclassification_mode || 'manual'}
                onValueChange={(v) => updateSettings({ reclassification_mode: v as any })}
              >
                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual — apenas alerta visual</SelectItem>
                  <SelectItem value="auto">Automática — sobe a prioridade sozinho</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Largura da pulseira (mm)</Label>
                <Input
                  type="number"
                  value={settings?.wristband_width_mm ?? 25}
                  onChange={(e) => updateSettings({ wristband_width_mm: parseInt(e.target.value, 10) || 25 })}
                />
              </div>
              <div>
                <Label className="text-xs">Comprimento da pulseira (mm)</Label>
                <Input
                  type="number"
                  value={settings?.wristband_height_mm ?? 250}
                  onChange={(e) => updateSettings({ wristband_height_mm: parseInt(e.target.value, 10) || 250 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Motivo da reimpressão */}
      <Dialog open={!!reprint} onOpenChange={(v) => !v && setReprint(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reimpressão de pulseira</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Esta pulseira já foi impressa. Registre o motivo da reimpressão.
            </p>
            <Select value={reprint?.reason} onValueChange={(v) => setReprint((p) => p && { ...p, reason: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REPRINT_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              placeholder="Observação (obrigatória para outro motivo)"
              value={reprint?.notes || ''}
              onChange={(e) => setReprint((p) => p && { ...p, notes: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReprint(null)}>Cancelar</Button>
            <Button
              className="gradient-bg text-white"
              onClick={async () => {
                if (!reprint) return
                if (reprint.reason.startsWith('Outro') && !reprint.notes.trim()) {
                  toast.error('Descreva o motivo da reimpressão')
                  return
                }
                const entry = reprint.entry
                const reason = [reprint.reason, reprint.notes].filter(Boolean).join(' — ')
                setReprint(null)
                await doPrint(entry, true, reason)
              }}
            >
              Reimprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pulseira renderizada fora da tela para gerar o PDF */}
      {printTarget && (
        <div style={{ position: 'fixed', left: '-10000px', top: 0 }}>
          <WristbandLabel
            ref={wristbandRef}
            patientName={printTarget.patient_name}
            cpf={printTarget.patient_cpf}
            protocol={printTarget.protocol || printTarget.ticket_code || printTarget.id.slice(0, 8).toUpperCase()}
            color={(printTarget.color || 'blue') as ManchesterColor}
            classifiedAt={printTarget.classified_at || printTarget.arrived_at}
            widthMm={settings?.wristband_width_mm || 25}
            heightMm={settings?.wristband_height_mm || 250}
          />
        </div>
      )}
    </div>
  )
}
