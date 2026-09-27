import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useCompanyContext } from '@/context/CompanyContext'
import { useTriage, elapsedMinutes, targetState } from '@/hooks/useTriage'
import { MANCHESTER_COLORS } from '@/data/manchester'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertTriangle, Play, CheckCircle } from 'lucide-react'

/**
 * Fila real vinda da Triagem: pacientes enviados ao médico, ordenados por cor
 * de Manchester e, dentro da cor, por tempo de espera. Cada médico vê os
 * pacientes do setor escolhido (padrão: setor da sessão) e os sem setor.
 */
export function TriageDoctorQueue() {
  const { doctorQueue, inAttendance, startDoctor, finishDoctor } = useTriage()
  const { activeSector } = useCompanyContext()
  const [sectors, setSectors] = useState<{ id: string; name: string }[]>([])
  const [sector, setSector] = useState<string>('')

  useEffect(() => {
    (supabase as any).from('company_sectors').select('id, name').eq('is_active', true).order('name')
      .then(({ data }: any) => setSectors(data || []))
  }, [])
  useEffect(() => { if (activeSector?.id && !sector) setSector(activeSector.id) }, [activeSector?.id])

  const visible = (e: any) => sector === 'todos' || !sector || !e.destination_sector_id || e.destination_sector_id === sector
  const fila = useMemo(() => doctorQueue.filter(visible), [doctorQueue, sector])
  const emAtend = useMemo(() => inAttendance.filter(visible), [inAttendance, sector])
  const sectorName = (id?: string | null) => sectors.find(s => s.id === id)?.name

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">Fila da Triagem ({fila.length})</h2>
        <Select value={sector || 'todos'} onValueChange={setSector}>
          <SelectTrigger className="w-[220px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os setores</SelectItem>
            {sectors.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {fila.length === 0 && emAtend.length === 0 && (
        <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-4">Nenhum paciente da triagem aguardando neste setor.</p>
      )}
      {[...emAtend, ...fila].map(e => {
        const info = e.color ? MANCHESTER_COLORS[e.color] : null
        const st = targetState(e)
        const atendendo = e.status === 'in_attendance'
        return (
          <div key={e.id} className="rounded-xl border border-border bg-card p-3 flex items-center gap-3 border-l-4" style={{ borderLeftColor: info?.hex }}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{e.patient_name}</span>
                {atendendo && <Badge variant="outline">Em atendimento</Badge>}
                {!atendendo && st === 'late' && <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Tempo estourado</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                <b style={{ color: info?.hex }}>{info?.label || 'Sem cor'}</b> · {elapsedMinutes(e)} min de espera
                {e.complaint && ` · ${e.complaint}`}{sectorName(e.destination_sector_id) && ` · ${sectorName(e.destination_sector_id)}`}
              </p>
            </div>
            {atendendo
              ? <Button size="sm" variant="outline" onClick={() => finishDoctor(e.id)}><CheckCircle className="h-3 w-3 mr-1" />Concluir</Button>
              : <Button size="sm" onClick={() => startDoctor(e.id)}><Play className="h-3 w-3 mr-1" />Atender</Button>}
          </div>
        )
      })}
    </div>
  )
}
