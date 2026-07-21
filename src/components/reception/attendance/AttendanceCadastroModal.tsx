import { useState, useCallback, useEffect, useMemo } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, ArrowLeft, ArrowRight, Check, UserPlus, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Step1PatientLookup } from './steps/Step1PatientLookup'
import { Step2AttendanceData } from './steps/Step2AttendanceData'
import { Step3Authorization } from './steps/Step3Authorization'
import { Step4Attachments } from './steps/Step4Attachments'
import { PaymentModal } from './payment/PaymentModal'
import { AttendancePrintModal } from './print/AttendancePrintModal'
import { LabStep1PatientReview } from '@/components/lab/attendance/steps/LabStep1PatientReview'
import { LabStep2ExamData } from '@/components/lab/attendance/steps/LabStep2ExamData'
import { LabStep3GuidesProcedures } from '@/components/lab/attendance/steps/LabStep3GuidesProcedures'
import { QueueAllocationModal } from './queue-allocation/QueueAllocationModal'
import { useAttendanceCadastro, useDraftAutosave, loadDraft, clearDraft } from '@/hooks/useAttendanceCadastro'
import { usePrinterConfig } from '@/hooks/usePrinterConfig'
import { useAuth } from '@/context/AuthContext'
import type { AttendanceOrder, AttendanceServiceType, AttendancePaymentType, AttendanceAttachment } from '@/types/attendance-cadastro.types'
import type { Patient } from '@/types/patient.types'
import type { AttendanceControlDocument, PaymentRecord } from '@/types/payment-print.types'
import { PAYMENT_METHOD_LABELS } from '@/types/payment-print.types'

interface AttendanceCadastroModalProps {
  open: boolean
  onClose: () => void
  ticketId?: string
  ticketCode?: string
  unitId: string
  unitName?: string
  guicheName?: string
  initialPatient?: Patient
  onOrderCreated?: (order: AttendanceOrder) => void
}

export interface CadastroState {
  patient?: Patient
  tempPatient?: Partial<Patient>
  scheduledAppointmentId?: string
  serviceType?: AttendanceServiceType
  paymentType?: AttendancePaymentType
  doctorId?: string
  doctorName?: string
  doctorCRM?: string
  specialty?: string
  requestingDoctor?: string
  procedureId?: string
  procedureName?: string
  procedureCode?: string
  procedureDescription?: string
  procedureRequiresAuth?: boolean
  convenioId?: string
  convenioName?: string
  cardNumber?: string
  cardExpiry?: string
  authorizationCode?: string
  authorizationDate?: string
  authorizationExpiry?: string
  authorizationPassword?: string
  billingCode?: string
  billingTable?: 'TUSS' | 'AMB' | 'CBHPM' | 'OTHER'
  quantity?: number
  participationDegree?: string
  cnes?: string
  cbo?: string
  privateValue?: number
  freeReason?: string
  attachments: AttendanceAttachment[]
  attachmentOverrideReason?: string
  originId?: string
  originCode?: number
  protocol?: string
  weight?: string
  height?: string
  isUrgent?: boolean
  hasFever?: boolean
  fastingSince?: string
  deliveryLocation?: string
  observation?: string
}

const STEPS_CLINIC = ['Paciente', 'Atendimento', 'Autorização', 'Anexos'] as const
const STEPS_LAB = ['Cliente', 'Atendimento', 'Guias e Procedimentos', 'Pagamento', 'Autorização', 'Resumo'] as const

export function AttendanceCadastroModal({
  open, onClose, ticketId, ticketCode, unitId, unitName, guicheName, initialPatient, onOrderCreated,
}: AttendanceCadastroModalProps) {
  const { user } = useAuth()
  const { createOrder } = useAttendanceCadastro()
  const { getDefault } = usePrinterConfig()
  const [step, setStep] = useState(initialPatient ? 1 : 0)
  const [showReview, setShowReview] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
  const [pendingDraft, setPendingDraft] = useState<any>(null)
  const [state, setState] = useState<CadastroState>(() => {
    const activeOrigin = sessionStorage.getItem('activeOrigin');
    const origin = activeOrigin ? JSON.parse(activeOrigin) : null;
    return { 
      attachments: [], 
      patient: initialPatient,
      originId: origin?.originId,
      originCode: origin?.originCode
    }
  })

  const isLab = state.serviceType === 'exam'
  const STEPS = isLab ? STEPS_LAB : STEPS_CLINIC
  const [restorePromptShown, setRestorePromptShown] = useState(false)

  // Post-finalize flow
  const [createdOrder, setCreatedOrder] = useState<AttendanceOrder | null>(null)
  const [paymentRecord, setPaymentRecord] = useState<PaymentRecord | null>(null)
  const [showPayment, setShowPayment] = useState(false)
  const [showPrint, setShowPrint] = useState(false)
  const [showAllocation, setShowAllocation] = useState(false)

  // Carrega rascunho ao abrir
  useEffect(() => {
    if (!open || !ticketId || restorePromptShown) return
    const draft = loadDraft(ticketId)
    if (draft && draft.savedAt) {
      setPendingDraft(draft)
      setShowRestoreConfirm(true)
    }
    setRestorePromptShown(true)
  }, [open, ticketId, restorePromptShown])

  useEffect(() => {
    if (!open) {
      setStep(initialPatient ? 1 : 0); setShowReview(false); setState({ attachments: [], patient: initialPatient }); setRestorePromptShown(false)
    }
  }, [open, initialPatient])

  useDraftAutosave(ticketId, state, open)

  const update = useCallback((patch: Partial<CadastroState>) => {
    setState(s => ({ ...s, ...patch }))
  }, [])

  const hasUnsavedData = !!(state.patient || state.serviceType || state.attachments.length)

  const handleClose = () => {
    if (hasUnsavedData) {
      setShowExitConfirm(true)
      return
    }
    forceClose()
  }

  const forceClose = () => {
    if (ticketId) clearDraft(ticketId)
    onClose()
  }

  // Validação por passo
  const stepValid = (s: number): boolean => {
    if (isLab) {
      if (s === 0) return !!state.patient
      // For Lab, let's allow progression to more steps as they are developed
      // For now, allow Step 1 (Review) and Step 2 (Exam Data)
      if (s === 1) return true
      if (s === 2) return true
      return true
    }

    if (s === 0) return !!state.patient
    if (s === 1) {
      if (!state.serviceType || !state.paymentType || !state.procedureId || !state.procedureCode) return false
      if (state.serviceType === 'exam' && state.examMode === 'ask') return false
      if (state.paymentType === 'convenio' && (!state.convenioId || !state.cardNumber)) return false
      if (state.paymentType === 'free' && !state.freeReason) return false
      return true
    }
    if (s === 2) {
      if (state.procedureRequiresAuth) {
        return !!(state.authorizationCode && state.authorizationDate && state.authorizationExpiry)
      }
      return true
    }
    if (s === 3) return true
    return false
  }

  const canAdvance = stepValid(step)

  const next = () => {
    if (!canAdvance) return
    const maxStep = isLab ? STEPS_LAB.length - 1 : 3
    if (step === maxStep) setShowReview(true)
    else setStep(step + 1)
  }
  const prev = () => {
    if (showReview) { setShowReview(false); return }
    if (step > 0) setStep(step - 1)
  }

  const buildControlDocument = useCallback((order: AttendanceOrder, payment?: PaymentRecord | null): AttendanceControlDocument => {
    const now = new Date()
    return {
      orderNumber: order.orderNumber,
      orderDate: now.toLocaleDateString('pt-BR'),
      orderTime: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      patientId: order.patientId,
      patientName: order.patientName,
      patientBirthDate: state.patient?.birthDate,
      patientAge: state.patient?.age,
      patientCPF: state.patient?.cpf,
      patientPhone: state.patient?.phone1,
      motherName: state.patient?.motherName,
      serviceType: order.serviceType === 'consultation' ? 'Consulta' : order.serviceType === 'exam' ? 'Exame' : 'Procedimento',
      procedureName: order.procedureName || '',
      procedureCode: order.procedureCode || '',
      doctorName: order.doctorName,
      doctorCRM: order.doctorCRM,
      specialty: order.specialty,
      unitName: unitName || '',
      guicheName,
      ticketCode: order.ticketCode,
      paymentType: order.paymentType === 'convenio' ? 'Convênio' : order.paymentType === 'private' ? 'Particular' : 'Cortesia',
      convenioName: order.convenioName,
      cardNumber: order.cardNumber,
      authorizationCode: order.authorizationCode,
      authorizationExpiry: order.authorizationExpiry,
      paymentMethod: payment ? PAYMENT_METHOD_LABELS[payment.method] : undefined,
      paidValue: payment?.paidValue ?? payment?.netValue,
      receiptNumber: payment?.receiptNumber,
      attachments: order.attachments.map(a => ({ name: a.documentType, type: 'document' })),
      registeredByName: order.registeredByName,
      companyName: 'CLÍNICA AXIS INOVA',
      companyAddress: 'Rua das Flores, 123 · Natal/RN',
      companyCNPJ: '00.000.000/0001-00',
      companyPhone: '(84) 3333-0000',
    }
  }, [state.patient, unitName, guicheName])

  const handleFinalize = () => {
    if (!state.patient || !state.serviceType || !state.paymentType || !state.procedureId) {
      toast.error('Dados incompletos')
      return
    }
    const order = createOrder({
      patientId: state.patient.id,
      patientName: state.patient.fullName,
      unitId,
      ticketId, ticketCode,
      serviceType: state.serviceType,
      paymentType: state.paymentType,
      doctorId: state.doctorId, doctorName: state.doctorName, doctorCRM: state.doctorCRM,
      specialty: state.specialty, requestingDoctor: state.requestingDoctor,
      procedureId: state.procedureId, procedureName: state.procedureName,
      procedureCode: state.procedureCode, procedureDescription: state.procedureDescription,
      convenioId: state.convenioId, convenioName: state.convenioName,
      cardNumber: state.cardNumber, cardExpiry: state.cardExpiry,
      authorizationCode: state.authorizationCode, authorizationDate: state.authorizationDate,
      authorizationExpiry: state.authorizationExpiry, authorizationPassword: state.authorizationPassword,
      billingCode: state.billingCode, billingTable: state.billingTable, quantity: state.quantity,
      participationDegree: state.participationDegree, cnes: state.cnes, cbo: state.cbo,
      privateValue: state.privateValue, freeReason: state.freeReason,
      attachments: state.attachments,
      attachmentRulesSatisfied: !state.attachmentOverrideReason,
      attachmentOverrideReason: state.attachmentOverrideReason,
      scheduledAppointmentId: state.scheduledAppointmentId,
      status: state.procedureRequiresAuth && state.authorizationCode ? 'authorized' : 'open',
    })
    toast.success(`Atendimento registrado · Pedido: ${order.orderNumber}`)
    if (ticketId) clearDraft(ticketId)
    setCreatedOrder(order)
    onOrderCreated?.(order)

    // Flow: if private → payment first; else → print (auto) → allocation
    if (state.paymentType === 'private') {
      setShowPayment(true)
    } else {
      proceedAfterPayment(order, null)
    }
  }

  const proceedAfterPayment = useCallback((order: AttendanceOrder, payment: PaymentRecord | null) => {
    const cfg = getDefault()
    if (cfg.autoPrintOnFinalize) {
      setShowPrint(true)
    } else {
      setShowAllocation(true)
    }
  }, [getDefault])

  const handlePaymentDone = (record: PaymentRecord) => {
    setPaymentRecord(record)
    setShowPayment(false)
    if (createdOrder) proceedAfterPayment(createdOrder, record)
  }

  const closeAllAndExit = () => {
    setShowPayment(false); setShowPrint(false); setShowAllocation(false)
    setCreatedOrder(null); setPaymentRecord(null)
    onClose()
  }

  const controlDoc = useMemo(
    () => createdOrder ? buildControlDocument(createdOrder, paymentRecord) : null,
    [createdOrder, paymentRecord, buildControlDocument],
  )

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-[1200px] w-[95vw] h-[90vh] p-0 flex flex-col gap-0 [&>button[type=button]]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3">
            <div className="rounded-full gradient-bg p-2 text-white">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Cadastro de Atendimento</h2>
              <p className="text-xs text-muted-foreground">
                {guicheName ? `${guicheName} · ` : ''}{unitName ? `Unidade: ${unitName} · ` : ''}
                {new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {ticketCode && (
              <span className="rounded-full gradient-bg px-3 py-1 text-xs font-semibold text-white">
                Ficha: {ticketCode}
              </span>
            )}
            {state.scheduledAppointmentId && (
              <span className="rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-semibold">
                Agendamento vinculado
              </span>
            )}
            <button onClick={handleClose} className="rounded-md p-1.5 hover:bg-muted text-muted-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="border-b border-border bg-muted/30 px-6 py-4">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            {STEPS.map((label, idx) => {
              const done = idx < step || showReview
              const active = idx === step && !showReview
              return (
                <div key={label} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                      done && 'bg-emerald-500 text-white',
                      active && 'gradient-bg text-white shadow-md scale-110',
                      !done && !active && 'bg-muted text-muted-foreground border border-border'
                    )}>
                      {done ? <Check className="h-4 w-4" /> : idx + 1}
                    </div>
                    <span className={cn(
                      'mt-1 text-[10px] leading-tight text-center px-1 whitespace-nowrap',
                      (done || active) ? 'text-foreground font-semibold' : 'text-muted-foreground'
                    )}>{label}</span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={cn('flex-1 h-0.5 mx-2 transition-all', done ? 'bg-emerald-500' : 'bg-border')} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-background">
          {!isLab && !showReview && step === 0 && <Step1PatientLookup state={state} update={update} unitId={unitId} />}
          {!isLab && !showReview && step === 1 && <Step2AttendanceData state={state} update={update} />}
          {!isLab && !showReview && step === 2 && <Step3Authorization state={state} update={update} />}
          {!isLab && !showReview && step === 3 && <Step4Attachments state={state} update={update} />}
          
          {isLab && !showReview && step === 0 && <Step1PatientLookup state={state} update={update} unitId={unitId} />}
          {isLab && !showReview && step === 1 && <LabStep1PatientReview state={state} update={update} />}
          {isLab && !showReview && step === 2 && <LabStep2ExamData state={state} update={update} />}
          {isLab && !showReview && step === 3 && <LabStep3GuidesProcedures state={state} update={update} />}
          {isLab && !showReview && step === 4 && <div className="p-8 text-center text-muted-foreground">Passo 4: Pagamento (Em implementação...)</div>}
          {isLab && !showReview && step === 5 && <div className="p-8 text-center text-muted-foreground">Passo 5: Autorização (Em implementação...)</div>}
          
          {showReview && <ReviewPanel state={state} unitName={unitName} guicheName={guicheName} ticketCode={ticketCode} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-card">
          <Button variant="outline" onClick={prev} disabled={step === 0 && !showReview}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          {!showReview ? (
            <button
              onClick={next}
              disabled={!canAdvance}
              className={cn(
                'inline-flex items-center gap-1 rounded-md gradient-bg px-6 py-2 text-sm font-semibold text-white shadow-sm transition-all',
                !canAdvance && 'opacity-50 cursor-not-allowed'
              )}
            >
              {step === 3 ? 'Revisar' : 'Próximo'} <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleFinalize}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-500 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 transition-colors"
            >
              <Check className="h-4 w-4" /> Confirmar Atendimento
            </button>
          )}
        </div>
      </DialogContent>

      {/* Modal de confirmação de saída */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent className="max-w-[400px]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 text-amber-500 mb-2">
              <div className="p-2 bg-amber-50 rounded-full">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <AlertDialogTitle className="text-xl">Dados não salvos</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Tem certeza que deseja sair? Todos os dados informados neste atendimento serão <strong>perdidos permanentemente</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="font-bold">CONTINUAR EDITANDO</AlertDialogCancel>
            <AlertDialogAction 
              onClick={forceClose}
              className="bg-destructive hover:bg-destructive/90 text-white font-bold px-6"
            >
              SIM, SAIR
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de confirmação de restauração de rascunho */}
      <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <AlertDialogContent className="max-w-[400px]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 text-primary mb-2">
              <div className="p-2 bg-primary/10 rounded-full">
                <UserPlus className="h-6 w-6" />
              </div>
              <AlertDialogTitle className="text-xl">Restaurar rascunho?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Encontramos um atendimento em andamento salvo às <strong>{pendingDraft?.savedAt ? new Date(pendingDraft.savedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}</strong>. Deseja continuar de onde parou?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel 
              onClick={() => {
                if (ticketId) clearDraft(ticketId)
                setShowRestoreConfirm(false)
              }}
              className="font-bold"
            >
              NÃO, COMEÇAR NOVO
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (pendingDraft) setState({ attachments: [], ...pendingDraft })
                setShowRestoreConfirm(false)
              }}
              className="gradient-bg text-white font-bold px-6"
            >
              SIM, RESTAURAR
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Post-finalize flow */}
      {showPayment && createdOrder && (
        <PaymentModal
          open
          onClose={() => setShowPayment(false)}
          orderId={createdOrder.id}
          patientId={createdOrder.patientId}
          patientName={createdOrder.patientName}
          procedureName={createdOrder.procedureName || ''}
          grossValue={state.privateValue || 0}
          onPaid={handlePaymentDone}
        />
      )}
      {showPrint && controlDoc && (
        <AttendancePrintModal
          open
          onClose={() => { setShowPrint(false); setShowAllocation(true) }}
          document={controlDoc}
          autoPrint
        />
      )}
      {showAllocation && createdOrder && (
        <QueueAllocationModal
          open
          onClose={closeAllAndExit}
          unitId={unitId}
          orderId={createdOrder.id}
          orderNumber={createdOrder.orderNumber}
          patientName={createdOrder.patientName}
          procedureName={createdOrder.procedureName || ''}
          doctorName={createdOrder.doctorName}
          doctorId={createdOrder.doctorId}
          onPrint={() => setShowPrint(true)}
        />
      )}
    </Dialog>
  )
}

// Painel de revisão final
function ReviewPanel({ state, unitName, guicheName, ticketCode }: { state: CadastroState; unitName?: string; guicheName?: string; ticketCode?: string }) {
  const requiredCount = state.attachments.filter(a => a.isRequired).length
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          📋 Resumo do Atendimento
        </h3>
        <div className="border-t border-border" />
        <dl className="space-y-2 text-sm">
          <Row label="👤 Paciente" value={`${state.tempPatient?.fullName || state.patient?.fullName} ${state.tempPatient?.age || state.patient?.age ? `(${state.tempPatient?.age || state.patient?.age} anos)` : ''}`} />
          {ticketCode && <Row label="🎫 Ficha" value={`${ticketCode}${guicheName ? ` · ${guicheName}` : ''}${unitName ? ` · ${unitName}` : ''}`} />}
          <Row label="📋 Tipo" value={state.serviceType === 'consultation' ? 'Consulta' : state.serviceType === 'exam' ? 'Exame' : 'Procedimento'} />
          {state.doctorName && <Row label="👨‍⚕️ Médico" value={`${state.doctorName}${state.specialty ? ` · ${state.specialty}` : ''}`} />}
          {state.procedureName && <Row label="💊 Procedimento" value={`${state.procedureName} · TUSS: ${state.procedureCode}`} />}
          {state.paymentType === 'convenio' && state.convenioName && (
            <Row label="💳 Convênio" value={`${state.convenioName} · Nº ${state.cardNumber}`} />
          )}
          {state.authorizationCode && (
            <Row label="🔑 Autorização" value={`${state.authorizationCode}${state.authorizationExpiry ? ` · Válida até ${state.authorizationExpiry}` : ''}`} />
          )}
          {state.weight && <Row label="⚖️ Peso" value={`${state.weight} kg`} />}
          {state.height && <Row label="📏 Altura" value={`${state.height} m`} />}
          {state.isUrgent && <Row label="🚨 Urgência" value="Sim" />}
          {state.hasFever && <Row label="🌡️ Febre" value="Sim" />}
          {state.fastingSince && <Row label="🥣 Jejum" value={state.fastingSince} />}
          <Row label="📎 Documentos" value={`${state.attachments.length} anexado(s)${requiredCount ? ` · ${requiredCount} obrigatório(s)` : ''}`} />
          <Row label="💰 Forma de pagamento" value={state.paymentType === 'convenio' ? 'Convênio' : state.paymentType === 'private' ? `Particular${state.privateValue ? ` · R$ ${state.privateValue.toFixed(2)}` : ''}` : 'Cortesia'} />
        </dl>
        {state.observation && (
          <div className="rounded-md bg-muted p-3 text-xs italic">
            " {state.observation} "
          </div>
        )}
        {state.attachmentOverrideReason && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            ⚠️ Documentos obrigatórios não anexados. Justificativa: {state.attachmentOverrideReason}
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 border-b border-border/50 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-foreground text-right">{value}</dd>
    </div>
  )
}

