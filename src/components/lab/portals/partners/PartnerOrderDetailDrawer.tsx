import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ChevronDown, RefreshCw, UserCheck, UserPlus, XCircle, ExternalLink } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { markOrderForReprocess } from '@/stores/apiPartnerOrdersStore'
import { PARTNER_ORDER_STATUS_LABEL, type PartnerOrder } from '@/types/api-partner-orders.types'
import { PARTNER_TYPE_LABEL, type ApiPartner } from '@/types/api-partners.types'

export const STATUS_CLASS: Record<PartnerOrder['status'], string> = {
  received: 'bg-[#00D4FF]/20 text-[hsl(193,100%,30%)]',
  processed: 'bg-[hsl(145,63%,42%)]/15 text-[hsl(145,63%,32%)]',
  error: 'bg-destructive/15 text-destructive',
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || '—'}</p>
    </div>
  )
}

interface Props {
  order: PartnerOrder | null
  partner?: ApiPartner
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function PartnerOrderDetailDrawer({ order, partner, open, onOpenChange }: Props) {
  const navigate = useNavigate()
  const [payloadOpen, setPayloadOpen] = useState(false)

  if (!order) return null

  const unrecognized = order.exams.filter(e => !e.recognized).length

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="space-y-2 text-left">
          <SheetTitle className="pr-8 text-lg">
            Pedido {order.partnerProtocol || order.id}
          </SheetTitle>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className={cn('border-transparent', STATUS_CLASS[order.status])}>
              {PARTNER_ORDER_STATUS_LABEL[order.status]}
            </Badge>
            {partner && <Badge variant="outline">{partner.name} · {PARTNER_TYPE_LABEL[partner.type]}</Badge>}
            <span className="text-xs text-muted-foreground">
              {new Date(order.receivedAt).toLocaleString('pt-BR')}
            </span>
          </div>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          {order.status === 'error' && (
            <div className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div>
                  <p className="text-sm font-semibold text-destructive">Erro no processamento</p>
                  <p className="text-sm text-destructive/90">{order.errorMessage}</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="min-h-[44px] w-full border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => { markOrderForReprocess(order.id); toast.success('Pedido enviado para reprocessamento') }}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Reprocessar Pedido
              </Button>
            </div>
          )}

          <section className="space-y-3 rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">Dados do Paciente (recebidos)</h3>
              <Badge className={cn('gap-1 border-transparent', order.patientExisted
                ? 'bg-muted text-muted-foreground' : 'bg-[#7B2FF7]/15 text-[hsl(268,92%,42%)]')}>
                {order.patientExisted ? <UserCheck className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
                {order.patientExisted ? 'Paciente já existente' : 'Paciente criado automaticamente'}
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome" value={order.patient.name} />
              <Field label="CPF" value={order.patient.cpf} />
              <Field label="Data de nascimento" value={order.patient.birthDate} />
              <Field label="Sexo" value={order.patient.sex} />
              <Field label="Telefone" value={order.patient.phone} />
            </div>
          </section>

          <section className="space-y-3 rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground">
              Exames solicitados ({order.exams.length})
              {unrecognized > 0 && <span className="ml-2 text-xs font-normal text-destructive">{unrecognized} não reconhecido(s)</span>}
            </h3>
            <ul className="divide-y">
              {order.exams.map((e, i) => (
                <li key={`${e.code}-${i}`} className="flex items-start gap-2 py-2">
                  {e.recognized
                    ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(145,63%,38%)]" />
                    : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{e.code}</p>
                    <p className="truncate text-xs text-muted-foreground">{e.name}</p>
                  </div>
                  <span className={cn('shrink-0 text-[11px] font-medium',
                    e.recognized ? 'text-[hsl(145,63%,32%)]' : 'text-destructive')}>
                    {e.recognized ? 'Código reconhecido' : 'Código não encontrado'}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2">
            <Field label="Médico Solicitante" value={order.requestingDoctor} />
            <Field label="Convênio / Guia" value={order.insurance ? `${order.insurance}${order.insuranceGuide ? ` · ${order.insuranceGuide}` : ''}` : undefined} />
            <Field label="Protocolo do Parceiro" value={order.partnerProtocol} />
            <Field label="Protocolo do Atendimento" value={order.attendanceProtocol} />
          </section>

          {order.status === 'processed' && (
            <Button
              className="min-h-[44px] w-full bg-gradient-to-r from-[#00D4FF] to-[#7B2FF7] text-white hover:opacity-90"
              onClick={() => navigate('/app/lab/analise')}
            >
              <ExternalLink className="mr-2 h-4 w-4" /> Ver Atendimento Gerado ({order.attendanceProtocol})
            </Button>
          )}

          <Collapsible open={payloadOpen} onOpenChange={setPayloadOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="min-h-[44px] w-full justify-between">
                Payload Bruto (JSON)
                <ChevronDown className={cn('h-4 w-4 transition-transform', payloadOpen && 'rotate-180')} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <pre className="mt-2 max-h-80 overflow-auto rounded-xl bg-muted p-3 text-[11px] leading-relaxed text-muted-foreground">
                {JSON.stringify(order.rawPayload, null, 2)}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </SheetContent>
    </Sheet>
  )
}
