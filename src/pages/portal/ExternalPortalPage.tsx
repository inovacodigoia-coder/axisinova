import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Lock, FileText, AlertCircle, Download, X, Printer } from 'lucide-react'
import { format, parseISO, isValid } from 'date-fns'
import LaudoDocument from '@/components/lab/LaudoDocument'

interface PortalExam {
  id: string
  name: string | null
  code: string | null
  status: string
  released_at: string | null
}

interface PortalOrder {
  id: string
  protocol: string
  order_number: string
  patient_name: string | null
  status: string
  created_at: string
  delivery_date: string | null
  origin_name: string | null
  doctor_name: string | null
  convenio_name: string | null
  exams: PortalExam[]
}

interface PortalPayload {
  ok: boolean
  error?: string
  access?: { name: string; type: string; access_code: string }
  company?: { name: string } | null
  orders?: PortalOrder[]
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  waiting: 'Aguardando',
  waiting_collection: 'Aguardando',
  collection_done: 'Coleta realizada',
  open: 'Aberto',
  in_analysis: 'Em Análise',
  validation: 'Em Análise',
  released: 'Liberado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  authorized: 'Aberto',
}

const EXAM_STATUS_LABELS: Record<string, string> = {
  pending: 'Aguardando',
  typed: 'Em Análise',
  in_analysis: 'Em Análise',
  released: 'Liberado',
  cancelled: 'Cancelado',
}

const ERROR_MESSAGES: Record<string, string> = {
  not_found: 'Código de acesso não encontrado. Confira o link ou o código impresso no comprovante.',
  inactive: 'Este acesso está inativo. Entre em contato com o laboratório.',
  locked: 'Muitas tentativas incorretas. Aguarde 5 minutos e tente novamente.',
  invalid_password: 'Senha incorreta. Confira a senha impressa no comprovante.',
  not_released: 'Este laudo ainda não foi liberado.',
  forbidden: 'Este exame não pertence a este acesso.',
}

interface PortalLaudo {
  protocol: string
  patientName: string
  patientBirthDate: string | null
  patientGender: string | null
  registeredAt: string
  collectionTime: string | null
  approvedAt: string | null
  approvedBy: string | null
  originName: string | null
  doctorName: string | null
  doctorCRM: string | null
  exam: {
    id: string
    name: string
    code: string | null
    material: string | null
    methodology: string | null
    reportObservations: string | null
    internalObservations: string | null
    singlePage: boolean
    template: { header_html: string | null; body_html: string | null; footer_html: string | null } | null
    results: {
      parameterKey: string
      parameterName: string
      value: string | null
      unit: string | null
      referenceRange: string | null
      flag: string | null
      section: string | null
      sortOrder: number
    }[]
  }
  settings: {
    labName: string | null
    headerTitle: string | null
    headerSubtitle: string | null
    logoPrimaryUrl: string | null
    logoSecondaryUrl: string | null
    institutionalWarning: string | null
    footerText: string | null
    signatureName: string | null
    signatureRegister: string | null
    signatureImageUrl: string | null
    signatureAutoOnRelease: boolean | null
    signatureIncludeRegister: boolean | null
  } | null
}

function PortalLaudoModal({ laudo, onClose }: { laudo: PortalLaudo; onClose: () => void }) {
  const docRef = useRef<HTMLDivElement>(null)
  const s = laudo.settings || ({} as NonNullable<PortalLaudo['settings']>)

  const order = {
    protocol: laudo.protocol,
    patientName: laudo.patientName,
    patientBirthDate: laudo.patientBirthDate,
    patientGender: laudo.patientGender,
    registeredAt: laudo.registeredAt,
    collectionTime: laudo.collectionTime,
    approvedAt: laudo.approvedAt,
    approvedBy: laudo.approvedBy,
    originName: laudo.originName,
    doctorName: laudo.doctorName,
    doctorCRM: laudo.doctorCRM,
    exams: [
      {
        examId: laudo.exam.id,
        name: laudo.exam.name,
        material: laudo.exam.material,
        methodology: laudo.exam.methodology,
        reportObservations: laudo.exam.reportObservations,
        internalObservations: laudo.exam.internalObservations,
        singlePage: laudo.exam.singlePage,
        reportTemplate: laudo.exam.template,
        results: laudo.exam.results,
      },
    ],
  }

  const printLaudo = () => {
    if (!docRef.current) return
    const body = window.document.body
    const root = window.document.createElement('div')
    root.id = 'laudo-print-root'
    root.innerHTML = docRef.current.innerHTML
    body.appendChild(root)
    body.classList.add('printing-laudo')
    let done = false
    const cleanup = () => {
      if (done) return
      done = true
      body.classList.remove('printing-laudo')
      root.remove()
    }
    window.addEventListener('afterprint', cleanup, { once: true })
    window.print()
    setTimeout(cleanup, 1500)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col">
      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-background border-b">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">Laudo — {laudo.exam.name}</p>
          <p className="text-xs text-muted-foreground truncate">{laudo.patientName} · Pedido {laudo.protocol}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={printLaudo}>
            <Printer className="h-4 w-4 mr-1.5" /> Imprimir
          </Button>
          <Button size="sm" onClick={printLaudo}>
            <Download className="h-4 w-4 mr-1.5" /> Baixar PDF
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-muted/40 py-6 px-2">
        <div ref={docRef}>
          <LaudoDocument
            order={order as never}
            companyLogo={s.logoPrimaryUrl || undefined}
            secondaryLogo={s.logoSecondaryUrl || undefined}
            laboratoryName={s.labName || s.headerTitle || 'Laboratório'}
            laboratorySubtitle={s.headerSubtitle || undefined}
            institutionalWarning={s.institutionalWarning || undefined}
            footerText={s.footerText || undefined}
            technicalResponsible={
              s.signatureName
                ? {
                    name: s.signatureName,
                    register: s.signatureIncludeRegister ? s.signatureRegister || '' : '',
                    signatureUrl: s.signatureImageUrl || undefined,
                    role: 'Responsável Técnico',
                  }
                : undefined
            }
          />
        </div>
      </div>
    </div>
  )
}

function fmt(dateStr?: string | null, withTime = true) {
  if (!dateStr) return '—'
  try {
    const d = parseISO(dateStr)
    if (!isValid(d)) return dateStr
    return format(d, withTime ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy')
  } catch {
    return dateStr
  }
}

function statusTone(status: string) {
  if (status === 'released' || status === 'completed') return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (status === 'cancelled') return 'bg-red-100 text-red-700 border-red-200'
  if (status === 'in_analysis' || status === 'validation' || status === 'typed')
    return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

export default function ExternalPortalPage() {
  const { codigo = '' } = useParams()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PortalPayload | null>(null)
  const [laudo, setLaudo] = useState<PortalLaudo | null>(null)
  const [laudoLoading, setLaudoLoading] = useState<string | null>(null)
  const [laudoError, setLaudoError] = useState<string | null>(null)

  const openLaudo = async (examId: string) => {
    setLaudoLoading(examId)
    setLaudoError(null)
    const { data: res, error: err } = await supabase.rpc('portal_fetch_laudo', {
      p_code: codigo,
      p_password: password,
      p_exam_id: examId,
    } as never)
    if (err || !res) {
      setLaudoError('Falha de conexão ao carregar o laudo. Tente novamente.')
      setLaudoLoading(null)
      return
    }
    const payload = res as unknown as { ok: boolean; error?: string; laudo?: PortalLaudo }
    await supabase.rpc('portal_log_attempt', {
      p_code: codigo,
      p_success: !!payload?.ok,
      p_action: 'view_laudo',
    } as never)
    if (!payload?.ok || !payload.laudo) {
      setLaudoError(ERROR_MESSAGES[payload?.error || ''] || 'Não foi possível carregar o laudo.')
    } else {
      setLaudo(payload.laudo)
    }
    setLaudoLoading(null)
  }

  // Verifica se o código existe (sem senha) para mostrar mensagem clara
  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data: res } = await supabase.rpc('portal_fetch', { p_code: codigo, p_password: '' } as never)
      if (!alive) return
      const payload = res as unknown as PortalPayload | null
      if (payload && !payload.ok && payload.error && payload.error !== 'invalid_password') {
        setError(ERROR_MESSAGES[payload.error] || 'Não foi possível validar este acesso.')
      }
      setChecking(false)
    })()
    return () => {
      alive = false
    }
  }, [codigo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { data: res, error: err } = await supabase.rpc('portal_fetch', {
      p_code: codigo,
      p_password: password,
    } as never)
    if (err) {
      setError('Falha de conexão. Tente novamente.')
      setLoading(false)
      return
    }
    const payload = res as unknown as PortalPayload
    await supabase.rpc('portal_log_attempt', {
      p_code: codigo,
      p_success: !!payload?.ok,
      p_action: 'login',
    } as never)
    if (!payload?.ok) {
      setError(ERROR_MESSAGES[payload?.error || ''] || 'Não foi possível acessar.')
    } else {
      setData(payload)
    }
    setLoading(false)
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center space-y-1">
            <div className="mx-auto h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg">Portal de Acompanhamento</CardTitle>
            <p className="text-sm text-muted-foreground">
              Acesso <span className="font-mono font-semibold">{codigo}</span>
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="senha" className="text-sm font-medium">
                  Senha (4 dígitos)
                </label>
                <Input
                  id="senha"
                  inputMode="numeric"
                  maxLength={4}
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value.replace(/\D/g, ''))}
                  placeholder="0000"
                  className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                />
              </div>
              {error && (
                <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading || password.length < 4}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Acessar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  const orders = data.orders || []

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="text-lg font-semibold">{data.company?.name || 'Portal de Acompanhamento'}</h1>
          <p className="text-sm text-muted-foreground">{data.access?.name}</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {orders.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground text-sm">
              Nenhum pedido encontrado para este acesso.
            </CardContent>
          </Card>
        )}

        {orders.map((order) => (
          <Card key={order.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Pedido {order.protocol || order.order_number}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {order.patient_name} · {fmt(order.created_at)}
                  </p>
                </div>
                <Badge variant="outline" className={statusTone(order.status)}>
                  {ORDER_STATUS_LABELS[order.status] || order.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>Local: {order.origin_name || '—'}</div>
                <div>Solicitante: {order.doctor_name || '—'}</div>
                <div>Convênio: {order.convenio_name || 'Particular'}</div>
                <div>Previsão: {fmt(order.delivery_date)}</div>
              </div>

              {order.exams.length > 0 && (
                <div className="border rounded-md divide-y">
                  {order.exams.map((exam) => (
                    <div key={exam.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className="text-sm">{exam.name || exam.code}</span>
                      <Badge variant="outline" className={`text-[11px] ${statusTone(exam.status)}`}>
                        {EXAM_STATUS_LABELS[exam.status] || exam.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  )
}
