import { useEffect, useRef, useState } from 'react'
import { Activity, Tag, Users, Printer, Loader2, RefreshCw, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PrintTypeSelection } from '@/components/print/PrintTypeSelection'
import { REPRINT_REASONS } from '@/data/manchester'
import { AISAXIUS_URL, servidorImpressaoAtivo } from '@/lib/impressaoLocal'
import { defaultHospitalLabel, dispatchHospitalPdf, hospitalLabelPdf, type HospitalContext, type HospitalPrintData, type HospitalPrintType } from '@/lib/hospitalLabels'
const db = supabase as any
async function rpc(name: string, args: Record<string, unknown>) { const { data, error } = await db.rpc(name, args); if (error) throw new Error(error.message); return data }

export function HospitalIdentificationDialog({ context, contextId, onClose, onWristband, onDone, companionOnly = false, wristbandReprint = false }: { context: HospitalContext; contextId: string; onClose: () => void; onWristband?: () => Promise<boolean>; onDone?: () => void; companionOnly?: boolean; wristbandReprint?: boolean }) {
  const [data, setData] = useState<HospitalPrintData | null>(null)
  const [type, setType] = useState<HospitalPrintType | null>(null)
  const [companion, setCompanion] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [connectionUnavailable, setConnectionUnavailable] = useState(false)
  const [sectors, setSectors] = useState<{ id: string; name: string }[]>([])
  const [sector, setSector] = useState('')
  const [reason, setReason] = useState('')
  const [reprintReason, setReprintReason] = useState(REPRINT_REASONS[0])
  const locked = useRef(false)
  const reload = async () => { const next = await rpc('hospital_identificacao_contexto', { _context: context, _id: contextId }); setData(next); return next as HospitalPrintData }
  useEffect(() => { let cancelled = false; rpc('hospital_identificacao_contexto', { _context: context, _id: contextId }).then(next => { if (!cancelled) setData(next) }).catch(e => { if (!cancelled) setError(e.message) }); db.from('company_sectors').select('id,name').eq('is_active', true).order('name').then(({ data: list }: any) => { if (!cancelled) setSectors(list || []) }); return () => { cancelled = true } }, [context, contextId])
  const add = async () => { if (!name.trim() || locked.current) return; locked.current = true; setBusy(true); setError(''); try { const id = await rpc('hospital_acompanhante_adicionar', { _context: context, _id: contextId, _nome: name.trim() }); await reload(); setCompanion(id); setName('') } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao salvar acompanhante') } finally { locked.current = false; setBusy(false) } }
  const checkConnection = async () => {
    if (locked.current) return
    locked.current = true; setBusy(true)
    try {
      const active = await servidorImpressaoAtivo()
      setConnectionUnavailable(!active)
      if (active) { setError(''); toast.success('AisAxius conectado. Você pode imprimir.') }
    } finally { locked.current = false; setBusy(false) }
  }
  const print = async () => {
    if (!type || !data || locked.current) return
    locked.current = true; setBusy(true); setError(''); let job: string | undefined; let delivered = false
    try {
      if (!await servidorImpressaoAtivo()) {
        setConnectionUnavailable(true)
        return
      }
      setConnectionUnavailable(false)
      if (type === 'pulseira_triagem' && wristbandReprint && reprintReason.startsWith('Outro') && !reason.trim()) throw new Error('Descreva o motivo da reimpressão')
      if (type !== 'pulseira_triagem' && data.locationRequired) { if (!sector || context !== 'triage') throw new Error('Local atual do paciente indisponível'); await rpc('hospital_identificacao_local_definir', { _id: contextId, _sector: sector }) }
      const prepared: HospitalPrintData = await rpc('hospital_identificacao_preparar', { _context: context, _id: contextId, _tipo: type, _companion: type === 'etiqueta_acompanhante' ? companion : null, _details: type === 'pulseira_triagem' && wristbandReprint ? [reprintReason, reason].filter(Boolean).join(' — ') : null }); job = prepared.printId
      if (!job) throw new Error('Não foi possível registrar a impressão')
      let state: 'confirmado' | 'navegador'
      if (type === 'pulseira_triagem') { if (!onWristband || !await onWristband()) throw new Error('Pulseira não enviada à impressora'); state = 'confirmado' }
      else { const config = prepared.labelConfig?.[type]; const blob = hospitalLabelPdf(type, prepared, config || defaultHospitalLabel, prepared.companions.find(c => c.id === companion)?.nome); state = await dispatchHospitalPdf(type, blob) }
      delivered = true
      await rpc('hospital_identificacao_finalizar', { _print: job, _status: state }); job = undefined
      toast.success(state === 'navegador' ? 'Janela de impressão aberta; confirme no navegador.' : 'Impressão enviada à impressora.')
      onDone?.(); onClose()
    } catch (e) { const message = e instanceof Error ? e.message : 'Falha na impressão'; if (delivered) { setError('A impressão já foi enviada, mas não foi possível finalizar o registro. Não repita o envio automaticamente.'); return } if (job) { try { await rpc('hospital_identificacao_finalizar', { _print: job, _status: 'falha', _details: message }) } catch { setError(message + ' — não foi possível atualizar o registro de impressão'); return } } setError(message) } finally { locked.current = false; setBusy(false) }
  }
  const options = [{ id: 'pulseira_triagem', label: 'Pulseira do paciente', description: 'Identificação da classificação de risco', icon: Activity }, { id: 'etiqueta_paciente', label: 'Etiqueta do paciente', description: 'Dados do paciente e do atendimento', icon: Tag }, { id: 'etiqueta_acompanhante', label: 'Etiqueta de acompanhante', description: 'Identificação vinculada ao paciente', icon: Users }].filter(o => companionOnly ? o.id === 'etiqueta_acompanhante' : context === 'triage' || o.id !== 'pulseira_triagem')
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose() }}><DialogContent aria-describedby={undefined} className="sm:max-w-xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Escolha o Tipo de Impressão</DialogTitle></DialogHeader>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {connectionUnavailable && <div role="alert" className="space-y-3 text-sm"><p className="text-destructive">Não foi possível conectar ao AisAxius neste computador. Nenhum documento foi enviado.</p><p className="text-muted-foreground">Abra o AisAxius no computador da impressora e permita o acesso à rede local, caso o navegador solicite.</p><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={checkConnection} disabled={busy}><RefreshCw className="h-4 w-4 mr-2" />Verificar conexão</Button><Button variant="outline" size="sm" asChild><a href={`${AISAXIUS_URL}/Configuracao`} target="_blank" rel="noopener noreferrer"><Settings className="h-4 w-4 mr-2" />Abrir AisAxius</a></Button></div></div>}
    {!data ? !error && <Loader2 className="h-5 w-5 animate-spin" /> : <div className="space-y-4"><p className="font-semibold break-words">{data.patientName}</p><PrintTypeSelection options={options} selected={type} onSelect={id => setType(id as HospitalPrintType)} disabled={busy} />
      {type && type !== 'pulseira_triagem' && data.locationRequired && context === 'triage' && <div><Label>Local de atendimento</Label><Select value={sector} onValueChange={setSector} disabled={busy || !data.canRegister}><SelectTrigger><SelectValue placeholder="Selecione o local cadastrado" /></SelectTrigger><SelectContent>{sectors.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>}
      {type === 'pulseira_triagem' && wristbandReprint && <div className="space-y-2"><Label>Motivo da reimpressão</Label><Select value={reprintReason} onValueChange={setReprintReason} disabled={busy}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{REPRINT_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select><Input aria-label="Observação da reimpressão" placeholder="Observação (obrigatória para outro motivo)" value={reason} onChange={e => setReason(e.target.value)} disabled={busy} /></div>}
      {type === 'etiqueta_paciente' && (!data.birthDate || !data.gender) && <p role="status" className="text-sm text-muted-foreground">Nascimento ou sexo ausente no cadastro: será indicado como não informado.</p>}
      {type === 'etiqueta_acompanhante' && <div className="space-y-3"><Label>Acompanhante ({data.companions.length}/{data.maxCompanions})</Label>{data.companions.length > 0 && <Select value={companion} onValueChange={setCompanion} disabled={busy}><SelectTrigger><SelectValue placeholder="Selecione para imprimir ou reimprimir" /></SelectTrigger><SelectContent>{data.companions.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select>}
        {data.companions.length >= data.maxCompanions ? <p role="status" className="text-sm text-muted-foreground">Limite de acompanhantes atingido. Apenas reimpressão está disponível.</p> : data.canRegister && <div className="space-y-2"><Label htmlFor="companion-name">Nome do novo acompanhante</Label><Input id="companion-name" value={name} onChange={e => setName(e.target.value)} disabled={busy} /><Button variant="outline" onClick={add} disabled={busy || !name.trim()}>Salvar acompanhante</Button></div>}
      </div>}
    </div>}
    <DialogFooter><Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button><Button onClick={print} disabled={busy || connectionUnavailable || !data || !type || (type === 'etiqueta_acompanhante' && !companion) || (type !== null && type !== 'pulseira_triagem' && !!data?.locationRequired && !sector)}>{busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Printer className="h-4 w-4 mr-2" />}Imprimir</Button></DialogFooter>
  </DialogContent></Dialog>
}