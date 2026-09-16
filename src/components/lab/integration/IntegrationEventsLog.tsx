import { Fragment, useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RefreshCw, Search, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'

type EventRow = {
  id: string
  created_at: string
  event_type: string
  status: string
  error_message: string | null
  idempotency_key: string
  equipment_id: string | null
  sample_barcode: string | null
  test_code: string | null
  received_value: string | null
  protocol: string | null
  exam_name: string | null
  payload: any
}

const STATUS_META: Record<string, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  processed: { label: 'Gravado', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', Icon: CheckCircle2 },
  error: { label: 'Rejeitado', className: 'bg-red-500/10 text-red-600 border-red-500/30', Icon: XCircle },
  ignored: { label: 'Ignorado', className: 'bg-amber-500/10 text-amber-600 border-amber-500/30', Icon: AlertTriangle },
}

const toIsoStart = (d: string) => (d ? new Date(`${d}T00:00:00`).toISOString() : null)
const toIsoEnd = (d: string) => (d ? new Date(`${d}T23:59:59.999`).toISOString() : null)

export default function IntegrationEventsLog() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<EventRow[]>([])
  const [equipments, setEquipments] = useState<{ id: string; name: string; serial_number: string | null }[]>([])
  const [equipment, setEquipment] = useState('all')
  const [status, setStatus] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [term, setTerm] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const fetchEquipments = async () => {
    if (!user?.companyId) return
    const { data } = await supabase
      .from('lab_equipments' as any)
      .select('id, name, serial_number')
      .eq('company_id', user.companyId)
      .order('name')
    setEquipments((data as any[]) || [])
  }

  const fetchEvents = async () => {
    if (!user?.companyId) return
    setLoading(true)
    let query = supabase
      .from('instrument_events')
      .select(
        'id, created_at, event_type, status, error_message, idempotency_key, equipment_id, sample_barcode, test_code, received_value, protocol, exam_name, payload',
      )
      .eq('company_id', user.companyId)
      .order('created_at', { ascending: false })
      .limit(500)

    if (equipment !== 'all') query = query.eq('equipment_id', equipment)
    if (status !== 'all') query = query.eq('status', status)
    const isoFrom = toIsoStart(from)
    const isoTo = toIsoEnd(to)
    if (isoFrom) query = query.gte('created_at', isoFrom)
    if (isoTo) query = query.lte('created_at', isoTo)

    const search = term.trim()
    if (search) {
      const like = `%${search}%`
      query = query.or(
        `sample_barcode.ilike.${like},protocol.ilike.${like},test_code.ilike.${like},idempotency_key.ilike.${like}`,
      )
    }

    const { data, error } = await query
    if (error) toast.error('Erro ao carregar o log de integração')
    setRows((data as EventRow[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchEquipments()
  }, [user?.companyId])

  useEffect(() => {
    fetchEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.companyId, equipment, status, from, to])

  const equipmentName = (serial: string | null) => {
    if (!serial) return '—'
    const eq = equipments.find((e) => (e.serial_number || '').toUpperCase() === serial.toUpperCase())
    return eq ? `${eq.name} (${serial})` : serial
  }

  const summary = useMemo(() => {
    const ok = rows.filter((r) => r.status === 'processed').length
    return { ok, total: rows.length, fail: rows.length - ok }
  }, [rows])

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="space-y-1.5">
            <Label className="text-xs">Equipamento</Label>
            <Select value={equipment} onValueChange={setEquipment}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {equipments
                  .filter((e) => !!e.serial_number)
                  .map((e) => (
                    <SelectItem key={e.id} value={e.serial_number as string}>
                      {e.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Resultado</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="processed">Gravado</SelectItem>
                <SelectItem value="error">Rejeitado</SelectItem>
                <SelectItem value="ignored">Ignorado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">De</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Até</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Amostra, pedido ou exame</Label>
            <div className="flex gap-2">
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchEvents()}
                placeholder="Ex: HDUSZK1W1 ou 270-00"
              />
              <Button variant="outline" size="icon" onClick={fetchEvents}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground">
            <strong className="text-foreground">{summary.ok}</strong> de{' '}
            <strong className="text-foreground">{summary.total}</strong> envios gravados
            {summary.fail > 0 && <> · <span className="text-red-600">{summary.fail} com erro</span></>}
          </p>
          <Button variant="outline" size="sm" className="gap-2" onClick={fetchEvents}>
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhum envio de equipamento registrado com esses filtros.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b">
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-[10px] [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-wider [&>th]:text-muted-foreground">
                  <th>Data/hora</th>
                  <th>Equipamento</th>
                  <th>Amostra</th>
                  <th>Pedido</th>
                  <th>Exame</th>
                  <th>Valor</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => {
                  const meta = STATUS_META[r.status] || {
                    label: r.status,
                    className: 'bg-muted text-muted-foreground',
                    Icon: AlertTriangle,
                  }
                  const open = expanded === r.id
                  return (
                    <Fragment key={r.id}>
                      <tr
                        className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => setExpanded(open ? null : r.id)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {new Date(r.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-4 py-3">{equipmentName(r.equipment_id)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{r.sample_barcode || '—'}</td>
                        <td className="px-4 py-3">{r.protocol || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs">{r.test_code || '—'}</span>
                          {r.exam_name && <span className="block text-xs text-muted-foreground">{r.exam_name}</span>}
                        </td>
                        <td className="px-4 py-3 font-medium">{r.received_value || '—'}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`gap-1 ${meta.className}`}>
                            <meta.Icon className="h-3 w-3" /> {meta.label}
                          </Badge>
                        </td>
                      </tr>
                      {open && (
                        <tr className="bg-muted/20">
                          <td colSpan={7} className="px-4 py-4 space-y-2 text-xs">
                            {r.error_message && (
                              <p className="text-red-600">
                                <strong>Motivo:</strong> {r.error_message}
                              </p>
                            )}
                            <p className="text-muted-foreground">
                              <strong>idempotency_key:</strong> <span className="font-mono">{r.idempotency_key}</span>
                              {' · '}
                              <strong>Tipo:</strong> {r.event_type === 'GRAPHIC' ? 'Gráfico' : 'Resultado'}
                            </p>
                            <pre className="max-h-48 overflow-auto rounded-lg bg-background p-3 text-[11px]">
                              {JSON.stringify(r.payload, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
