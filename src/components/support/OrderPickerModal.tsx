import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, FileText, ArrowLeft, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'

export interface PickedOrder {
  id: string
  protocol: string | null
  order_number: string | null
  patient_name: string | null
  created_at: string
  status: string | null
}

interface OrderExam {
  id: string
  exam_name: string | null
  exam_code: string | null
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  companyId: string
  usedOrderIds: string[]
  onConfirm: (order: PickedOrder, examLabels: string[]) => void
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')

export function OrderPickerModal({ open, onOpenChange, companyId, usedOrderIds, onConfirm }: Props) {
  const [term, setTerm] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<PickedOrder[] | null>(null)
  const [order, setOrder] = useState<PickedOrder | null>(null)
  const [exams, setExams] = useState<OrderExam[]>([])
  const [selected, setSelected] = useState<string[]>([])

  const reset = () => { setTerm(''); setResults(null); setOrder(null); setExams([]); setSelected([]) }

  const search = async () => {
    const raw = term.trim()
    if (raw.length < 2) { toast.error('Digite ao menos 2 caracteres'); return }
    setSearching(true)
    try {
      const digits = raw.replace(/\D/g, '')
      const like = `%${raw}%`
      let patientIds: string[] = []
      if (digits.length >= 11) {
        const { data } = await supabase.from('patients').select('id').eq('company_id', companyId).or(`cpf.eq.${digits},cpf.eq.${raw}`)
        patientIds = (data || []).map((p: any) => p.id)
      }

      const filters = [`protocol.ilike.${like}`, `order_number.ilike.${like}`, `patient_name.ilike.${like}`]
      if (patientIds.length) filters.push(`patient_id.in.(${patientIds.join(',')})`)

      const { data, error } = await supabase
        .from('attendance_orders')
        .select('id, protocol, order_number, patient_name, created_at, status')
        .eq('company_id', companyId)
        .neq('status', 'deleted')
        .or(filters.join(','))
        .order('created_at', { ascending: false })
        .limit(25)
      if (error) throw error

      const rows = (data || []) as PickedOrder[]
      setResults(rows)
      if (rows.length === 0) toast.info('Nenhum atendimento encontrado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha na busca')
    } finally {
      setSearching(false)
    }
  }

  const pickOrder = async (row: PickedOrder) => {
    setOrder(row)
    const { data } = await supabase
      .from('lab_exam_results')
      .select('id, exam_name, exam_code')
      .eq('order_id', row.id)
      .neq('status', 'cancelled')
      .order('exam_name')
    const list = (data || []) as OrderExam[]
    setExams(list)
    setSelected(list.map(e => e.id))
  }

  const label = (e: OrderExam) => (e.exam_code ? `${e.exam_code} - ${e.exam_name || ''}`.trim() : e.exam_name || '')

  return (
    <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) reset() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Puxar de um pedido</DialogTitle>
        </DialogHeader>

        {!order ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                autoFocus
                placeholder="Protocolo, número do atendimento, nome ou CPF do paciente"
                value={term}
                onChange={e => setTerm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
              />
              <Button onClick={search} disabled={searching} className="gradient-bg text-white">
                <Search className="mr-1 h-4 w-4" />{searching ? 'Buscando...' : 'Buscar'}
              </Button>
            </div>

            <div className="space-y-2">
              {(results || []).map(row => (
                <button
                  key={row.id}
                  onClick={() => pickOrder(row)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border bg-card p-3 text-left hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.patient_name || 'Paciente não informado'}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.protocol || row.order_number || '—'} · {fmtDate(row.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {usedOrderIds.includes(row.id) && <Badge variant="outline" className="text-amber-600">Já usado</Badge>}
                    <Badge variant="secondary">{row.status || '—'}</Badge>
                  </div>
                </button>
              ))}
              {results?.length === 0 && (
                <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  Nenhum atendimento encontrado para esta busca.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4 text-primary" />
                {order.protocol || order.order_number || 'Atendimento'}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {order.patient_name} · {fmtDate(order.created_at)}
              </p>
            </div>

            {usedOrderIds.includes(order.id) && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                Já existe um card neste quadro para este atendimento.
              </div>
            )}

            {exams.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Este atendimento não possui exames vinculados. Você pode seguir apenas com os dados do paciente.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium">Exames do atendimento</p>
                {exams.map(e => (
                  <label key={e.id} className="flex cursor-pointer items-center gap-3 rounded-lg border p-2 text-sm">
                    <Checkbox
                      checked={selected.includes(e.id)}
                      onCheckedChange={v => setSelected(prev => (v ? [...prev, e.id] : prev.filter(id => id !== e.id)))}
                    />
                    <span>{label(e)}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => { setOrder(null); setExams([]); setSelected([]) }}>
                <ArrowLeft className="mr-1 h-4 w-4" />Voltar
              </Button>
              <Button
                className="gradient-bg text-white"
                onClick={() => {
                  const labels = exams.filter(e => selected.includes(e.id)).map(label)
                  onConfirm(order, labels)
                  onOpenChange(false)
                  reset()
                }}
              >
                Continuar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
