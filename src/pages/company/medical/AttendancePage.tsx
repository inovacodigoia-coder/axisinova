import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useScheduling } from '@/context/SchedulingContext'
import { useRegisters } from '@/context/RegistersContext'
import { useMedical } from '@/context/MedicalContext'
import { useAuth } from '@/context/AuthContext'
import { useQueue } from '@/context/QueueContext'
import { useCID10Search } from '@/hooks/useCID10Search'
import { MOCK_MEDICATIONS_LIST } from '@/mocks/medical.mock'
import { NoExamsCatalogState } from '@/components/medical/empty-states/NoExamsCatalogState'
import { NoAttendanceHistoryState } from '@/components/medical/empty-states/NoAttendanceHistoryState'
import type { AttendanceRecord, VitalSigns, PrescriptionItem, ExamRequest, CID10, Diagnosis } from '@/types/medical.types'
import { AlertTriangle, Clock, Save, CheckCircle, ChevronDown, ChevronUp, Plus, X, Search, Printer } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

const PHYSICAL_EXAM_TEMPLATES: Record<string, string> = {
  'Cardiorrespiratório': 'Cardiorrespiratório: Ritmo cardíaco regular, em 2 tempos, bulhas normofonéticas, sem sopros. Murmúrio vesicular presente bilateralmente, sem ruídos adventícios. ',
  'Abdominal': 'Abdome: plano, flácido, indolor à palpação superficial e profunda, sem visceromegalias, ruídos hidroaéreos presentes. ',
  'Neurológico': 'Neurológico: Paciente lúcido e orientado no tempo e espaço. Pupilas isocóricas e fotorreagentes. Força muscular preservada nos 4 membros. Reflexos profundos simétricos. ',
  'Musculoesquelético': 'Musculoesquelético: Sem deformidades articulares. Amplitude de movimento preservada. Sem sinais flogísticos. ',
  'Pele e Mucosas': 'Pele e Mucosas: Pele íntegra, hidratada, corada, acianótica, anictérica. Mucosas úmidas e coradas. ',
  'Cabeça e Pescoço': 'Cabeça e Pescoço: Normocefálico. Orofaringe sem hiperemia. Otoscopia normal bilateral. Linfonodos cervicais não palpáveis. ',
}

function getAge(birthDate: string) {
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
}

export default function AttendancePage() {
  const { appointmentId } = useParams<{ appointmentId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { patients, appointments, updateAppointment } = useScheduling()
  const { doctors, specialties, exams, procedures, convenios } = useRegisters()
  const { attendanceRecords, addAttendanceRecord, updateAttendanceRecord, getPatientAlerts, getPatientAttendances } = useMedical()
  const { state: queueState, updateStatus: updateQueueStatus } = useQueue()

  const activeCompanyId = user?.companyId ?? ''
  const appointment = appointments.find(a => a.id === appointmentId)
  const patient = appointment ? patients.find(p => p.id === appointment.patientId) : null
  const doctor = appointment ? doctors.find(d => d.id === appointment.doctorId) : null
  const convenio = appointment ? convenios.find(c => c.id === appointment.convenioId) : null
  const alerts = patient ? getPatientAlerts(patient.id, activeCompanyId) : []
  const history = patient ? getPatientAttendances(patient.id, activeCompanyId) : []

  // Check if there's an existing in-progress record for this appointment
  const existingRecord = attendanceRecords.find(r => r.appointmentId === appointmentId && r.status === 'in_progress')

  // Attendance state
  const [recordId] = useState(() => existingRecord?.id ?? `att_${Date.now()}`)
  const [startedAt] = useState(() => existingRecord?.startedAt ?? new Date().toISOString())
  const [elapsed, setElapsed] = useState(0)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ vitals: true, complaint: true })

  // Clinical form state - restore from draft or existing record
  const [vitals, setVitals] = useState<Partial<VitalSigns>>(existingRecord?.vitalSigns ?? {})
  const [chiefComplaint, setChiefComplaint] = useState(existingRecord?.chiefComplaint ?? '')
  const [anamnesis, setAnamnesis] = useState(existingRecord?.anamnesis ?? '')
  const [physicalExam, setPhysicalExam] = useState(existingRecord?.physicalExam ?? '')
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(existingRecord?.diagnosis ?? null)
  const [cidSearch, setCidSearch] = useState('')
  const cidResults = useCID10Search(cidSearch)
  const [prescription, setPrescription] = useState<PrescriptionItem[]>(existingRecord?.prescription ?? [])
  const [examRequests, setExamRequests] = useState<ExamRequest[]>(existingRecord?.examRequests ?? [])
  const [certificateDays, setCertificateDays] = useState<number>(existingRecord?.certificateDays ?? 0)
  const [certificateReason, setCertificateReason] = useState(existingRecord?.certificateReason ?? '')
  const [showCertificate, setShowCertificate] = useState(!!(existingRecord?.certificateDays))
  const [notes, setNotes] = useState(existingRecord?.notes ?? '')
  const [followUpDays, setFollowUpDays] = useState<number>(existingRecord?.followUpDays ?? 0)
  const [showFollowUp, setShowFollowUp] = useState(!!(existingRecord?.followUpDays))
  const [saving, setSaving] = useState(false)
  const [examSearchTerm, setExamSearchTerm] = useState('')
  const [showExamDropdown, setShowExamDropdown] = useState(false)

  // Draft check on mount
  const [showDraftRestore, setShowDraftRestore] = useState(false)
  const [draftData, setDraftData] = useState<any>(null)

  useEffect(() => {
    if (existingRecord) return
    const draft = localStorage.getItem(`attendance_draft_${appointmentId}`)
    if (draft) {
      try {
        setDraftData(JSON.parse(draft))
        setShowDraftRestore(true)
      } catch { /* ignore */ }
    }
  }, [appointmentId, existingRecord])

  const restoreDraft = () => {
    if (!draftData) return
    if (draftData.chiefComplaint) setChiefComplaint(draftData.chiefComplaint)
    if (draftData.anamnesis) setAnamnesis(draftData.anamnesis)
    if (draftData.physicalExam) setPhysicalExam(draftData.physicalExam)
    if (draftData.vitals) setVitals(draftData.vitals)
    if (draftData.diagnosis) setDiagnosis(draftData.diagnosis)
    if (draftData.prescription) setPrescription(draftData.prescription)
    if (draftData.notes) setNotes(draftData.notes)
    setShowDraftRestore(false)
    toast.success('Rascunho restaurado!')
  }

  // Create record if new
  useEffect(() => {
    if (existingRecord || !appointment) return
    const newRecord: AttendanceRecord = {
      id: recordId,
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      companyId: activeCompanyId,
      startedAt,
      chiefComplaint: '',
      status: 'in_progress',
      createdBy: user?.id ?? '',
      updatedAt: new Date().toISOString(),
    }
    addAttendanceRecord(newRecord)
    updateAppointment(appointment.id, { status: 'in_progress' })

    const queueEntry = queueState.entries.find(e => e.appointmentId === appointment.id)
    if (queueEntry) {
      updateQueueStatus(queueEntry.id, 'in_progress')
    }
  }, [])

  // Timer
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  // Auto-save draft every 30s
  const lastSavedRef = useRef('')
  useEffect(() => {
    const interval = setInterval(() => {
      const currentData = JSON.stringify({ chiefComplaint, anamnesis, physicalExam, vitals, diagnosis, prescription, notes })
      if (currentData !== lastSavedRef.current) {
        localStorage.setItem(`attendance_draft_${appointmentId}`, currentData)
        lastSavedRef.current = currentData
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [chiefComplaint, anamnesis, physicalExam, vitals, diagnosis, prescription, notes, appointmentId])

  // Exam catalog from registers
  const examCatalog = useMemo(() => {
    const examItems = exams
      .filter(e => e.isActive && e.companyId === activeCompanyId)
      .map(e => ({
        id: e.id, type: 'exam' as const, name: e.name, code: e.tussCode,
        specialty: specialties.find(s => s.id === e.specialtyId)?.name,
        prepInstructions: e.preparationInstructions,
        requiresAuthorization: e.requiresAuthorization,
      }))
    const procedureItems = procedures
      .filter(p => p.isActive && p.companyId === activeCompanyId)
      .map(p => ({
        id: p.id, type: 'procedure' as const, name: p.name, code: p.tussCode,
        specialty: specialties.find(s => s.id === p.specialtyId)?.name,
        prepInstructions: p.preOperativeInstructions,
        requiresAuthorization: p.requiresAuthorization,
      }))
    return [...examItems, ...procedureItems]
  }, [exams, procedures, specialties, activeCompanyId])

  const filteredCatalog = useMemo(() => {
    if (!examSearchTerm || examSearchTerm.length < 2) return examCatalog.slice(0, 8)
    const term = examSearchTerm.toLowerCase()
    return examCatalog.filter(item =>
      item.name.toLowerCase().includes(term) || item.code?.includes(term)
    ).slice(0, 8)
  }, [examSearchTerm, examCatalog])

  // BMI
  const bmi = useMemo(() => {
    if (vitals.weight && vitals.height) return Math.round((vitals.weight / ((vitals.height / 100) ** 2)) * 10) / 10
    return null
  }, [vitals.weight, vitals.height])

  const bmiClass = useMemo(() => {
    if (!bmi) return null
    if (bmi < 18.5) return { label: 'Abaixo do peso', color: 'text-blue-600' }
    if (bmi < 25) return { label: 'Normal', color: 'text-green-600' }
    if (bmi < 30) return { label: 'Sobrepeso', color: 'text-yellow-600' }
    if (bmi < 35) return { label: 'Obesidade I', color: 'text-orange-500' }
    if (bmi < 40) return { label: 'Obesidade II', color: 'text-orange-600' }
    return { label: 'Obesidade III', color: 'text-red-600' }
  }, [bmi])

  const vitalAlerts = useMemo(() => {
    const a: string[] = []
    if (vitals.bloodPressureSystolic && vitals.bloodPressureSystolic > 140) a.push('Hipertensão')
    if (vitals.bloodPressureDiastolic && vitals.bloodPressureDiastolic > 90) a.push('PA Diastólica elevada')
    if (vitals.oxygenSaturation && vitals.oxygenSaturation < 95) a.push('SpO₂ baixa')
    if (vitals.temperature && vitals.temperature > 37.8) a.push('Febre')
    if (vitals.glucometry && vitals.glucometry > 200) a.push('Hiperglicemia')
    return a
  }, [vitals])

  const toggleSection = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))

  const addPrescriptionItem = () => {
    setPrescription(prev => [...prev, {
      id: `rx_new_${Date.now()}`, medication: '', dosage: '', form: 'Comprimido', route: 'Oral',
      frequency: '8/8h', duration: '7 dias', quantity: 1, isControlled: false,
    }])
  }

  const updatePrescriptionItem = (id: string, field: string, value: any) => {
    setPrescription(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const removePrescriptionItem = (id: string) => setPrescription(prev => prev.filter(p => p.id !== id))

  const selectCid = (cid: CID10) => {
    if (!diagnosis) {
      setDiagnosis({ cid10Primary: cid, type: 'confirmed' })
    } else {
      setDiagnosis(prev => prev ? { ...prev, cid10Secondary: [...(prev.cid10Secondary || []), cid] } : null)
    }
    setCidSearch('')
  }

  const onSelectExam = (item: typeof examCatalog[0]) => {
    const newRequest: ExamRequest = {
      id: `erq_${Date.now()}`,
      examCatalogId: item.id,
      examCatalogType: item.type,
      examName: item.name,
      examCode: item.code,
      urgency: 'routine',
      clinicalIndication: '',
      prepInstructions: item.prepInstructions ?? '',
      requestedAt: new Date().toISOString(),
    }
    setExamRequests(prev => [...prev, newRequest])
    setExamSearchTerm('')
    setShowExamDropdown(false)
  }

  const handleFinalize = () => {
    if (!chiefComplaint.trim()) {
      toast.error('Queixa principal é obrigatória')
      return
    }
    setSaving(true)

    const finalRecord: AttendanceRecord = {
      id: recordId,
      appointmentId: appointment!.id,
      patientId: appointment!.patientId,
      doctorId: appointment!.doctorId,
      companyId: activeCompanyId,
      startedAt,
      finishedAt: new Date().toISOString(),
      duration: Math.round((Date.now() - new Date(startedAt).getTime()) / 60000),
      vitalSigns: Object.keys(vitals).length > 0 ? { ...vitals, recordedAt: new Date().toISOString() } as VitalSigns : undefined,
      chiefComplaint,
      anamnesis: anamnesis || undefined,
      physicalExam: physicalExam || undefined,
      diagnosis: diagnosis || undefined,
      prescription: prescription.length > 0 ? prescription : undefined,
      examRequests: examRequests.length > 0 ? examRequests : undefined,
      certificateDays: showCertificate ? certificateDays : undefined,
      certificateReason: showCertificate ? certificateReason : undefined,
      notes: notes || undefined,
      followUpDays: showFollowUp ? followUpDays : undefined,
      status: 'signed',
      signedAt: new Date().toISOString(),
      createdBy: user?.id ?? '',
      updatedAt: new Date().toISOString(),
    }

    updateAttendanceRecord(finalRecord)
    updateAppointment(appointment!.id, { status: 'completed' })

    const queueEntry = queueState.entries.find(e => e.appointmentId === appointment!.id)
    if (queueEntry) {
      updateQueueStatus(queueEntry.id, 'completed')
    }

    localStorage.removeItem(`attendance_draft_${appointmentId}`)
    toast.success('Atendimento finalizado e assinado digitalmente!')
    setSaving(false)
    navigate('/app/medico')
  }

  const handleSaveDraft = () => {
    const currentData = JSON.stringify({ chiefComplaint, anamnesis, physicalExam, vitals, diagnosis, prescription, notes })
    localStorage.setItem(`attendance_draft_${appointmentId}`, currentData)
    lastSavedRef.current = currentData
    toast.success('Rascunho salvo com sucesso!')
  }

  const formatElapsed = () => `${Math.floor(elapsed / 60).toString().padStart(2, '0')}:${(elapsed % 60).toString().padStart(2, '0')}`

  const followUpDate = useMemo(() => {
    if (!followUpDays) return null
    const d = new Date()
    d.setDate(d.getDate() + followUpDays)
    return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
  }, [followUpDays])

  if (!appointment || !patient) {
    return <div className="text-center py-12 text-muted-foreground">Agendamento não encontrado.</div>
  }

  const Section = ({ id, title, icon, children }: { id: string; title: string; icon: string; children: React.ReactNode }) => (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <button onClick={() => toggleSection(id)} className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
        <span className="flex items-center gap-2 font-medium text-foreground"><span>{icon}</span> {title}</span>
        {expandedSections[id] ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {expandedSections[id] && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  const VitalInput = ({ label, unit, value, onChange, alert }: { label: string; unit: string; value?: number; onChange: (v: number | undefined) => void; alert?: boolean }) => (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className={`flex items-center gap-1 rounded-lg border ${alert ? 'border-orange-400 bg-orange-50' : 'border-input'} px-3 py-2`}>
        <input type="number" value={value ?? ''} onChange={e => onChange(e.target.value ? Number(e.target.value) : undefined)} className="flex-1 bg-transparent text-sm outline-none w-16" placeholder="—" />
        <span className="text-xs text-muted-foreground">{unit}</span>
        {alert && <AlertTriangle className="h-3 w-3 text-orange-500" />}
      </div>
    </div>
  )

  // Use previous prescription
  const lastPrescriptionRecord = history.find(r => r.status === 'signed' && r.prescription && r.prescription.length > 0 && r.id !== recordId)

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Draft restore modal */}
      {showDraftRestore && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
          <div className="bg-card rounded-xl border border-border p-6 max-w-md shadow-lg">
            <p className="text-lg font-semibold text-foreground mb-2">💾 Rascunho encontrado</p>
            <p className="text-sm text-muted-foreground mb-4">Existe um rascunho deste atendimento salvo. Deseja restaurar?</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowDraftRestore(false); localStorage.removeItem(`attendance_draft_${appointmentId}`) }} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted">🗑 Descartar</button>
              <button onClick={restoreDraft} className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:opacity-90">💾 Restaurar</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-20 bg-card border-b border-border px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm">
              {patient.fullName.split(' ').slice(0, 2).map(n => n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground">{patient.fullName}</span>
                <span className="text-sm text-muted-foreground">{getAge(patient.birthDate)} anos</span>
                {appointment.visitType === 'first_visit' ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-gradient-to-r from-primary to-secondary text-white">1ª VEZ</span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-muted text-muted-foreground">RETORNO</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {convenio?.name ?? appointment.convenioName} · {doctor ? `Dr. ${doctor.fullName}` : appointment.doctorName} · {appointment.type === 'consultation' ? 'Consulta' : appointment.type === 'exam' ? 'Exame' : 'Procedimento'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="font-mono font-medium">{formatElapsed()}</span>
            </div>
            {alerts.length > 0 && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-destructive/10 text-destructive text-xs font-medium">
                <AlertTriangle className="h-3 w-3" /> {alerts.length} alertas
              </span>
            )}
            <button onClick={handleFinalize} disabled={saving} className="flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50">
              <CheckCircle className="h-4 w-4" /> Finalizar
            </button>
          </div>
        </div>

        {alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length > 0 && (
          <div className="mt-2 p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>⚠️ ATENÇÃO: {alerts.filter(a => a.severity === 'critical' || a.severity === 'high').map(a => a.description).join(' · ')}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Timeline sidebar */}
        <div className="hidden lg:block w-[340px] border-r border-border overflow-y-auto bg-muted/30 p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">HISTÓRICO DO PACIENTE</h3>
          <div className="text-xs text-muted-foreground mb-4">{history.length} atendimentos registrados</div>
          {history.length === 0 ? (
            <NoAttendanceHistoryState />
          ) : (
            <div className="space-y-0">
              <div className="flex gap-3 pb-4">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-gradient-to-r from-primary to-secondary animate-pulse" />
                  <div className="w-px flex-1 bg-border" />
                </div>
                <div className="flex-1 pb-2">
                  <p className="text-xs font-bold text-primary">EM ANDAMENTO</p>
                  <p className="text-xs text-muted-foreground">{appointment.type === 'consultation' ? 'Consulta' : 'Exame'} · {doctor?.fullName ?? appointment.doctorName}</p>
                </div>
              </div>
              {history.filter(r => r.id !== recordId).slice(0, 8).map((record, i) => {
                const recDoctor = doctors.find(d => d.id === record.doctorId)
                return (
                  <div key={record.id} className="flex gap-3 pb-4">
                    <div className="flex flex-col items-center">
                      <div className={`h-3 w-3 rounded-full ${record.status === 'signed' ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                      {i < 7 && <div className="w-px flex-1 bg-border" />}
                    </div>
                    <div className="flex-1 pb-1">
                      <p className="text-xs font-medium text-foreground">
                        {new Date(record.startedAt).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                        {recDoctor && <span className="text-muted-foreground"> · Dr. {recDoctor.fullName}</span>}
                      </p>
                      {record.diagnosis && (
                        <p className="text-xs text-muted-foreground">{record.diagnosis.cid10Primary.code} · {record.diagnosis.cid10Primary.description}</p>
                      )}
                      {record.prescription && record.prescription.length > 0 && (
                        <p className="text-[10px] text-muted-foreground">[{record.prescription.length} medicamentos]</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-0.5">{record.chiefComplaint.slice(0, 60)}{record.chiefComplaint.length > 60 ? '...' : ''}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Main form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Quick nav tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { id: 'vitals', label: 'Vitais' }, { id: 'complaint', label: 'Queixa' },
              { id: 'anamnesis', label: 'Anamnese' }, { id: 'exam', label: 'Ex. Físico' },
              { id: 'diagnosis', label: 'Diagnóstico' }, { id: 'prescription', label: 'Prescrição' },
              { id: 'exams', label: 'Exames' }, { id: 'certificate', label: 'Atestado' },
              { id: 'notes', label: 'Notas' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => toggleSection(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                  expandedSections[tab.id] ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Vital Signs */}
          <Section id="vitals" title="Sinais Vitais" icon="💓">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <VitalInput label="PA Sistólica" unit="mmHg" value={vitals.bloodPressureSystolic} onChange={v => setVitals(p => ({ ...p, bloodPressureSystolic: v }))} alert={vitals.bloodPressureSystolic ? vitals.bloodPressureSystolic > 140 : false} />
              <VitalInput label="PA Diastólica" unit="mmHg" value={vitals.bloodPressureDiastolic} onChange={v => setVitals(p => ({ ...p, bloodPressureDiastolic: v }))} alert={vitals.bloodPressureDiastolic ? vitals.bloodPressureDiastolic > 90 : false} />
              <VitalInput label="Freq. Cardíaca" unit="bpm" value={vitals.heartRate} onChange={v => setVitals(p => ({ ...p, heartRate: v }))} />
              <VitalInput label="Temperatura" unit="°C" value={vitals.temperature} onChange={v => setVitals(p => ({ ...p, temperature: v }))} alert={vitals.temperature ? vitals.temperature > 37.8 : false} />
              <VitalInput label="Sat. O₂" unit="%" value={vitals.oxygenSaturation} onChange={v => setVitals(p => ({ ...p, oxygenSaturation: v }))} alert={vitals.oxygenSaturation ? vitals.oxygenSaturation < 95 : false} />
              <VitalInput label="Freq. Resp." unit="irpm" value={vitals.respiratoryRate} onChange={v => setVitals(p => ({ ...p, respiratoryRate: v }))} />
              <VitalInput label="Peso" unit="kg" value={vitals.weight} onChange={v => setVitals(p => ({ ...p, weight: v }))} />
              <VitalInput label="Altura" unit="cm" value={vitals.height} onChange={v => setVitals(p => ({ ...p, height: v }))} />
              <VitalInput label="Glicemia" unit="mg/dL" value={vitals.glucometry} onChange={v => setVitals(p => ({ ...p, glucometry: v }))} alert={vitals.glucometry ? vitals.glucometry > 200 : false} />
            </div>
            {bmi && bmiClass && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">IMC:</span>
                <span className={`font-bold ${bmiClass.color}`}>{bmi}</span>
                <span className={bmiClass.color}>({bmiClass.label})</span>
              </div>
            )}
            {vitalAlerts.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {vitalAlerts.map(a => (
                  <span key={a} className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-orange-100 text-orange-700">⚠️ {a}</span>
                ))}
              </div>
            )}
          </Section>

          {/* Chief Complaint */}
          <Section id="complaint" title="Queixa Principal" icon="🗣️">
            <textarea
              value={chiefComplaint}
              onChange={e => setChiefComplaint(e.target.value)}
              placeholder="Descreva o motivo principal da consulta..."
              className="w-full rounded-lg border border-input bg-background p-3 text-sm min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
            />
          </Section>

          {/* Anamnesis */}
          <Section id="anamnesis" title="Anamnese" icon="📝">
            <div className="space-y-3">
              <textarea
                value={anamnesis}
                onChange={e => setAnamnesis(e.target.value)}
                placeholder="Descreva a história da doença atual..."
                className="w-full rounded-lg border border-input bg-background p-3 text-sm min-h-[120px] resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                rows={5}
              />
              <div className="text-right text-[10px] text-muted-foreground">{anamnesis.length} caracteres</div>
            </div>
          </Section>

          {/* Physical Exam */}
          <Section id="exam" title="Exame Físico" icon="🩺">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {Object.keys(PHYSICAL_EXAM_TEMPLATES).map(system => (
                  <button key={system} onClick={() => setPhysicalExam(prev => prev + PHYSICAL_EXAM_TEMPLATES[system])} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors">
                    {system}
                  </button>
                ))}
              </div>
              <textarea value={physicalExam} onChange={e => setPhysicalExam(e.target.value)} placeholder="Descreva os achados do exame físico..." className="w-full rounded-lg border border-input bg-background p-3 text-sm min-h-[160px] resize-y focus:outline-none focus:ring-2 focus:ring-ring" rows={8} />
            </div>
          </Section>

          {/* Diagnosis */}
          <Section id="diagnosis" title="Diagnóstico (CID-10)" icon="🔍">
            <div className="space-y-3">
              <div className="relative">
                <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input value={cidSearch} onChange={e => setCidSearch(e.target.value)} placeholder="Busque por código CID ou descrição..." className="flex-1 bg-transparent text-sm outline-none" />
                </div>
                {cidResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 rounded-lg border border-border bg-card shadow-lg max-h-48 overflow-y-auto">
                    {cidResults.map(cid => (
                      <button key={cid.code} onClick={() => selectCid(cid)} className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors">
                        <span className="font-bold text-primary">{cid.code}</span>
                        <span className="text-foreground ml-2">{cid.description}</span>
                        <span className="text-[10px] text-muted-foreground ml-2">({cid.category})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {diagnosis && (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Diagnóstico Principal:</label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium">{diagnosis.cid10Primary.code} · {diagnosis.cid10Primary.description}</span>
                      <button onClick={() => setDiagnosis(null)} className="p-1 rounded hover:bg-muted"><X className="h-3 w-3" /></button>
                    </div>
                  </div>
                  {diagnosis.cid10Secondary && diagnosis.cid10Secondary.length > 0 && (
                    <div>
                      <label className="text-xs text-muted-foreground">Diagnósticos Secundários:</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {diagnosis.cid10Secondary.map(cid => (
                          <span key={cid.code} className="px-2 py-1 rounded-lg bg-muted text-foreground text-xs flex items-center gap-1">
                            {cid.code} · {cid.description}
                            <button onClick={() => setDiagnosis(prev => prev ? { ...prev, cid10Secondary: prev.cid10Secondary?.filter(c => c.code !== cid.code) } : null)}><X className="h-3 w-3" /></button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3 mt-2">
                    {(['confirmed', 'working', 'differential'] as const).map(t => (
                      <label key={t} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="radio" name="diagType" checked={diagnosis.type === t} onChange={() => setDiagnosis(prev => prev ? { ...prev, type: t } : null)} className="accent-primary" />
                        {t === 'confirmed' ? 'Confirmado' : t === 'working' ? 'Presuntivo' : 'Diferencial'}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Prescription */}
          <Section id="prescription" title="Prescrição Médica" icon="💊">
            <div className="space-y-3">
              {lastPrescriptionRecord && prescription.length === 0 && (
                <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 text-sm">
                  <p className="text-blue-900 font-medium">💊 Usar prescrição anterior?</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Atendimento de {new Date(lastPrescriptionRecord.startedAt).toLocaleDateString('pt-BR')}: {lastPrescriptionRecord.prescription!.map(p => p.medication).join(', ')}
                  </p>
                  <button onClick={() => setPrescription(lastPrescriptionRecord.prescription!.map(p => ({ ...p, id: `rx_imp_${Date.now()}_${Math.random().toString(36).slice(2)}` })))} className="mt-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                    Importar prescrição
                  </button>
                </div>
              )}
              {prescription.map(item => (
                <div key={item.id} className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-1">
                      <div className="col-span-2">
                        <label className="text-[10px] text-muted-foreground">Medicamento</label>
                        <input value={item.medication} onChange={e => updatePrescriptionItem(item.id, 'medication', e.target.value)} list="meds-list" className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring" placeholder="Nome do medicamento" />
                      </div>
                      <div><label className="text-[10px] text-muted-foreground">Dosagem</label><input value={item.dosage} onChange={e => updatePrescriptionItem(item.id, 'dosage', e.target.value)} className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm outline-none" placeholder="500mg" /></div>
                      <div><label className="text-[10px] text-muted-foreground">Via</label><select value={item.route} onChange={e => updatePrescriptionItem(item.id, 'route', e.target.value)} className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm">{['Oral', 'EV', 'IM', 'SC', 'Tópica', 'Inalatória', 'Sublingual'].map(o => <option key={o}>{o}</option>)}</select></div>
                      <div><label className="text-[10px] text-muted-foreground">Frequência</label><select value={item.frequency} onChange={e => updatePrescriptionItem(item.id, 'frequency', e.target.value)} className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm">{['1x/dia', '2x/dia', '3x/dia', '6/6h', '8/8h', '12/12h', 'Contínuo', 'Se necessário'].map(o => <option key={o}>{o}</option>)}</select></div>
                      <div><label className="text-[10px] text-muted-foreground">Duração</label><input value={item.duration} onChange={e => updatePrescriptionItem(item.id, 'duration', e.target.value)} className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm outline-none" placeholder="7 dias" /></div>
                      <div><label className="text-[10px] text-muted-foreground">Qtd</label><input type="number" value={item.quantity} onChange={e => updatePrescriptionItem(item.id, 'quantity', Number(e.target.value))} className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm outline-none" /></div>
                    </div>
                    <button onClick={() => removePrescriptionItem(item.id)} className="p-1 ml-2 rounded hover:bg-muted"><X className="h-4 w-4 text-muted-foreground" /></button>
                  </div>
                  <input value={item.instructions || ''} onChange={e => updatePrescriptionItem(item.id, 'instructions', e.target.value)} className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs outline-none" placeholder="Instruções adicionais..." />
                </div>
              ))}
              <datalist id="meds-list">{MOCK_MEDICATIONS_LIST.map(m => <option key={m} value={m} />)}</datalist>
              <button onClick={addPrescriptionItem} className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg border border-dashed border-border hover:bg-muted transition-colors w-full justify-center">
                <Plus className="h-4 w-4" /> Adicionar Medicamento
              </button>
            </div>
          </Section>

          {/* Exam Requests - with real catalog */}
          <Section id="exams" title="Solicitação de Exames" icon="🔬">
            <div className="space-y-3">
              {examCatalog.length === 0 ? (
                <NoExamsCatalogState />
              ) : (
                <div className="relative">
                  <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <input
                      value={examSearchTerm}
                      onChange={e => { setExamSearchTerm(e.target.value); setShowExamDropdown(true) }}
                      onFocus={() => setShowExamDropdown(true)}
                      placeholder="Buscar exame ou procedimento por nome ou código TUSS..."
                      className="flex-1 bg-transparent text-sm outline-none"
                    />
                  </div>
                  {showExamDropdown && filteredCatalog.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 rounded-lg border border-border bg-card shadow-lg max-h-52 overflow-y-auto">
                      {filteredCatalog.map(item => (
                        <button key={`${item.type}_${item.id}`} onClick={() => onSelectExam(item)} className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors border-b border-border last:border-b-0">
                          <div className="flex items-center gap-2">
                            <span>{item.type === 'exam' ? '🔬' : '⚕️'}</span>
                            <span className="font-medium text-foreground">{item.name}</span>
                            {item.code && <span className="text-xs text-muted-foreground">TUSS: {item.code}</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {item.specialty && <span className="text-[10px] text-muted-foreground">{item.specialty}</span>}
                            {item.requiresAuthorization && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">Requer autorização</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {examRequests.map(ex => (
                <div key={ex.id} className="p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span>{ex.examCatalogType === 'exam' ? '🔬' : '⚕️'}</span>
                        <p className="text-sm font-medium text-foreground">{ex.examName}</p>
                      </div>
                      {ex.examCode && <p className="text-xs text-muted-foreground ml-6">Código TUSS: {ex.examCode}</p>}
                    </div>
                    <button onClick={() => setExamRequests(prev => prev.filter(e => e.id !== ex.id))} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-6">
                    <div>
                      <label className="text-[10px] text-muted-foreground">Urgência</label>
                      <div className="flex gap-2 mt-1">
                        {(['routine', 'urgent', 'emergency'] as const).map(u => (
                          <label key={u} className="flex items-center gap-1 text-xs cursor-pointer">
                            <input type="radio" checked={ex.urgency === u} onChange={() => setExamRequests(prev => prev.map(e => e.id === ex.id ? { ...e, urgency: u } : e))} className="accent-primary" />
                            {u === 'routine' ? 'Rotina' : u === 'urgent' ? 'Urgente' : 'Emergência'}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Indicação clínica *</label>
                      <input
                        value={ex.clinicalIndication}
                        onChange={e => setExamRequests(prev => prev.map(r => r.id === ex.id ? { ...r, clinicalIndication: e.target.value } : r))}
                        className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs outline-none"
                        placeholder="Indicação..."
                      />
                    </div>
                  </div>
                  {ex.prepInstructions && (
                    <p className="text-[10px] text-muted-foreground mt-2 ml-6">Preparo: {ex.prepInstructions}</p>
                  )}
                </div>
              ))}
            </div>
          </Section>

          {/* Certificate */}
          <Section id="certificate" title="Atestado Médico" icon="📄">
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showCertificate} onChange={e => setShowCertificate(e.target.checked)} className="accent-primary rounded" />
                <span className="text-sm text-foreground">Emitir atestado</span>
              </label>
              {showCertificate && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Dias de afastamento</label>
                    <input type="number" value={certificateDays || ''} onChange={e => setCertificateDays(Number(e.target.value))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none" min={1} max={365} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Motivo</label>
                    <select value={certificateReason} onChange={e => setCertificateReason(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                      <option value="">Selecione</option>
                      <option>Consulta médica</option>
                      <option>Tratamento</option>
                      <option>Cirurgia</option>
                      <option>Repouso</option>
                      <option>Outro</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Notes */}
          <Section id="notes" title="Notas e Retorno" icon="📋">
            <div className="space-y-3">
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações gerais do atendimento..." className="w-full rounded-lg border border-input bg-background p-3 text-sm min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-ring" rows={3} />
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showFollowUp} onChange={e => setShowFollowUp(e.target.checked)} className="accent-primary rounded" />
                <span className="text-sm text-foreground">Agendar retorno</span>
              </label>
              {showFollowUp && (
                <div className="flex items-center gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Retorno em</label>
                    <div className="flex items-center gap-2">
                      <input type="number" value={followUpDays || ''} onChange={e => setFollowUpDays(Number(e.target.value))} className="w-20 rounded border border-input bg-background px-2 py-1.5 text-sm outline-none" />
                      <span className="text-sm text-muted-foreground">dias</span>
                    </div>
                  </div>
                  {followUpDate && (
                    <div className="text-sm text-muted-foreground mt-4">Retorno previsto: <span className="font-medium text-foreground">{followUpDate}</span></div>
                  )}
                </div>
              )}
            </div>
          </Section>
        </div>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 z-20 bg-card border-t border-border px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1"><Save className="h-3 w-3" /> Auto-save ativo</span>
          <div className="flex gap-2">
            <button onClick={handleSaveDraft} className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors">💾 Salvar Rascunho</button>
            <button onClick={handleFinalize} disabled={saving} className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50">{saving ? 'Salvando...' : '✅ Finalizar e Assinar'}</button>
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {formatElapsed()}</span>
        </div>
      </div>
    </div>
  )
}
