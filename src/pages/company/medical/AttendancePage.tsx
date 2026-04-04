import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MOCK_APPOINTMENTS, MOCK_PATIENTS } from '@/mocks/scheduling.mock'
import { getPatientAttendances, getPatientAlerts, MOCK_ATTENDANCE_RECORDS, MOCK_CID10, MOCK_MEDICATIONS_LIST } from '@/mocks/medical.mock'
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

  const appointment = MOCK_APPOINTMENTS.find(a => a.id === appointmentId)
  const patient = appointment ? MOCK_PATIENTS.find(p => p.id === appointment.patientId) : null
  const alerts = patient ? getPatientAlerts(patient.id) : []
  const history = patient ? getPatientAttendances(patient.id) : []

  // Attendance state
  const [startedAt] = useState(() => new Date().toISOString())
  const [elapsed, setElapsed] = useState(0)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ vitals: true, complaint: true })

  // Clinical form state
  const [vitals, setVitals] = useState<Partial<VitalSigns>>({})
  const [chiefComplaint, setChiefComplaint] = useState('')
  const [anamnesis, setAnamnesis] = useState('')
  const [physicalExam, setPhysicalExam] = useState('')
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null)
  const [cidSearch, setCidSearch] = useState('')
  const [cidResults, setCidResults] = useState<CID10[]>([])
  const [prescription, setPrescription] = useState<PrescriptionItem[]>([])
  const [examRequests, setExamRequests] = useState<ExamRequest[]>([])
  const [certificateDays, setCertificateDays] = useState<number>(0)
  const [certificateReason, setCertificateReason] = useState('')
  const [showCertificate, setShowCertificate] = useState(false)
  const [notes, setNotes] = useState('')
  const [followUpDays, setFollowUpDays] = useState<number>(0)
  const [showFollowUp, setShowFollowUp] = useState(false)
  const [saving, setSaving] = useState(false)

  // Timer
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  // CID search
  useEffect(() => {
    if (cidSearch.length < 2) { setCidResults([]); return }
    const q = cidSearch.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const results = MOCK_CID10.filter(c =>
      c.code.toLowerCase().startsWith(q) ||
      c.description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
    ).slice(0, 8)
    setCidResults(results)
  }, [cidSearch])

  // BMI calculation
  const bmi = useMemo(() => {
    if (vitals.weight && vitals.height) {
      return Math.round((vitals.weight / ((vitals.height / 100) ** 2)) * 10) / 10
    }
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

  // Vital alerts
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
      setDiagnosis(prev => prev ? {
        ...prev,
        cid10Secondary: [...(prev.cid10Secondary || []), cid]
      } : null)
    }
    setCidSearch('')
    setCidResults([])
  }

  const handleFinalize = () => {
    setSaving(true)
    setTimeout(() => {
      toast.success('Atendimento finalizado e assinado digitalmente!')
      setSaving(false)
      navigate('/app/medico')
    }, 1500)
  }

  const handleSaveDraft = () => {
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
        <span className="flex items-center gap-2 font-medium text-foreground">
          <span>{icon}</span> {title}
        </span>
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
        <input
          type="number"
          value={value ?? ''}
          onChange={e => onChange(e.target.value ? Number(e.target.value) : undefined)}
          className="flex-1 bg-transparent text-sm outline-none w-16"
          placeholder="—"
        />
        <span className="text-xs text-muted-foreground">{unit}</span>
        {alert && <AlertTriangle className="h-3 w-3 text-orange-500" />}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
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
              <p className="text-xs text-muted-foreground">{appointment.convenioName} · {appointment.type === 'consultation' ? 'Consulta' : appointment.type === 'exam' ? 'Exame' : 'Procedimento'}</p>
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

        {/* Alert bar */}
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
          <div className="text-xs text-muted-foreground mb-4">
            {history.length} atendimentos registrados
          </div>
          <div className="space-y-0">
            {/* Active indicator */}
            <div className="flex gap-3 pb-4">
              <div className="flex flex-col items-center">
                <div className="h-3 w-3 rounded-full bg-gradient-to-r from-primary to-secondary animate-pulse" />
                <div className="w-px flex-1 bg-border" />
              </div>
              <div className="flex-1 pb-2">
                <p className="text-xs font-bold text-primary">EM ANDAMENTO</p>
                <p className="text-xs text-muted-foreground">{appointment.type === 'consultation' ? 'Consulta' : 'Exame'} · {appointment.doctorName}</p>
              </div>
            </div>
            {history.slice(0, 8).map((record, i) => (
              <div key={record.id} className="flex gap-3 pb-4">
                <div className="flex flex-col items-center">
                  <div className={`h-3 w-3 rounded-full ${record.status === 'signed' ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                  {i < history.length - 1 && <div className="w-px flex-1 bg-border" />}
                </div>
                <div className="flex-1 pb-1">
                  <p className="text-xs font-medium text-foreground">
                    {new Date(record.startedAt).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                  {record.diagnosis && (
                    <p className="text-xs text-muted-foreground">{record.diagnosis.cid10Primary.code} · {record.diagnosis.cid10Primary.description}</p>
                  )}
                  {record.prescription && record.prescription.length > 0 && (
                    <p className="text-[10px] text-muted-foreground">[{record.prescription.length} medicamentos]</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">{record.chiefComplaint.slice(0, 60)}...</p>
                </div>
              </div>
            ))}
          </div>
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

          {/* Section: Vital Signs */}
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

          {/* Section: Chief Complaint */}
          <Section id="complaint" title="Queixa Principal" icon="🗣️">
            <textarea
              value={chiefComplaint}
              onChange={e => setChiefComplaint(e.target.value)}
              placeholder="Descreva o motivo principal da consulta..."
              className="w-full rounded-lg border border-input bg-background p-3 text-sm min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
            />
          </Section>

          {/* Section: Anamnesis */}
          <Section id="anamnesis" title="Anamnese" icon="📝">
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">História da Doença Atual</label>
                <textarea
                  value={anamnesis}
                  onChange={e => setAnamnesis(e.target.value)}
                  placeholder="Descreva a história da doença atual..."
                  className="w-full rounded-lg border border-input bg-background p-3 text-sm min-h-[120px] resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={5}
                />
                <div className="text-right text-[10px] text-muted-foreground mt-1">{anamnesis.length} caracteres</div>
              </div>
            </div>
          </Section>

          {/* Section: Physical Exam */}
          <Section id="exam" title="Exame Físico" icon="🩺">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {Object.keys(PHYSICAL_EXAM_TEMPLATES).map(system => (
                  <button
                    key={system}
                    onClick={() => setPhysicalExam(prev => prev + PHYSICAL_EXAM_TEMPLATES[system])}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors"
                  >
                    {system}
                  </button>
                ))}
              </div>
              <textarea
                value={physicalExam}
                onChange={e => setPhysicalExam(e.target.value)}
                placeholder="Descreva os achados do exame físico..."
                className="w-full rounded-lg border border-input bg-background p-3 text-sm min-h-[160px] resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                rows={8}
              />
            </div>
          </Section>

          {/* Section: Diagnosis */}
          <Section id="diagnosis" title="Diagnóstico (CID-10)" icon="🔍">
            <div className="space-y-3">
              <div className="relative">
                <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    value={cidSearch}
                    onChange={e => setCidSearch(e.target.value)}
                    placeholder="Busque por código CID ou descrição..."
                    className="flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
                {cidResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 rounded-lg border border-border bg-card shadow-lg max-h-48 overflow-y-auto">
                    {cidResults.map(cid => (
                      <button
                        key={cid.code}
                        onClick={() => selectCid(cid)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                      >
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
                      <span className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium">
                        {diagnosis.cid10Primary.code} · {diagnosis.cid10Primary.description}
                      </span>
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
                            <button onClick={() => setDiagnosis(prev => prev ? { ...prev, cid10Secondary: prev.cid10Secondary?.filter(c => c.code !== cid.code) } : null)}>
                              <X className="h-3 w-3" />
                            </button>
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

          {/* Section: Prescription */}
          <Section id="prescription" title="Prescrição Médica" icon="💊">
            <div className="space-y-3">
              {prescription.map(item => (
                <div key={item.id} className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-1">
                      <div className="col-span-2">
                        <label className="text-[10px] text-muted-foreground">Medicamento</label>
                        <input
                          value={item.medication}
                          onChange={e => updatePrescriptionItem(item.id, 'medication', e.target.value)}
                          list="meds-list"
                          className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                          placeholder="Nome do medicamento"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Dosagem</label>
                        <input value={item.dosage} onChange={e => updatePrescriptionItem(item.id, 'dosage', e.target.value)} className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm outline-none" placeholder="500mg" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Via</label>
                        <select value={item.route} onChange={e => updatePrescriptionItem(item.id, 'route', e.target.value)} className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm">
                          {['Oral', 'EV', 'IM', 'SC', 'Tópica', 'Inalatória', 'Sublingual'].map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Frequência</label>
                        <select value={item.frequency} onChange={e => updatePrescriptionItem(item.id, 'frequency', e.target.value)} className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm">
                          {['1x/dia', '2x/dia', '3x/dia', '6/6h', '8/8h', '12/12h', 'Contínuo', 'Se necessário'].map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Duração</label>
                        <input value={item.duration} onChange={e => updatePrescriptionItem(item.id, 'duration', e.target.value)} className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm outline-none" placeholder="7 dias" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Qtd</label>
                        <input type="number" value={item.quantity} onChange={e => updatePrescriptionItem(item.id, 'quantity', Number(e.target.value))} className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm outline-none" />
                      </div>
                    </div>
                    <button onClick={() => removePrescriptionItem(item.id)} className="p-1 ml-2 rounded hover:bg-muted"><X className="h-4 w-4 text-muted-foreground" /></button>
                  </div>
                  <input
                    value={item.instructions || ''}
                    onChange={e => updatePrescriptionItem(item.id, 'instructions', e.target.value)}
                    className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs outline-none"
                    placeholder="Instruções adicionais..."
                  />
                </div>
              ))}
              <datalist id="meds-list">
                {MOCK_MEDICATIONS_LIST.map(m => <option key={m} value={m} />)}
              </datalist>
              <button onClick={addPrescriptionItem} className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg border border-dashed border-border hover:bg-muted transition-colors w-full justify-center">
                <Plus className="h-4 w-4" /> Adicionar Medicamento
              </button>
            </div>
          </Section>

          {/* Section: Exam Requests */}
          <Section id="exams" title="Solicitação de Exames" icon="🔬">
            <div className="space-y-3">
              {examRequests.map(ex => (
                <div key={ex.id} className="p-3 rounded-lg border border-border bg-muted/30 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{ex.examName}</p>
                    <p className="text-xs text-muted-foreground">{ex.examCode} · {ex.urgency === 'routine' ? 'Rotina' : ex.urgency === 'urgent' ? 'Urgente' : 'Emergência'}</p>
                  </div>
                  <button onClick={() => setExamRequests(prev => prev.filter(e => e.id !== ex.id))} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
                </div>
              ))}
              <button
                onClick={() => setExamRequests(prev => [...prev, {
                  id: `erq_${Date.now()}`, examId: '', examName: 'Hemograma Completo', examCode: '40304361',
                  urgency: 'routine', clinicalIndication: '', requestedAt: new Date().toISOString()
                }])}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg border border-dashed border-border hover:bg-muted transition-colors w-full justify-center"
              >
                <Plus className="h-4 w-4" /> Solicitar Exame
              </button>
            </div>
          </Section>

          {/* Section: Certificate */}
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

          {/* Section: Notes */}
          <Section id="notes" title="Notas e Retorno" icon="📋">
            <div className="space-y-3">
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Observações gerais do atendimento..."
                className="w-full rounded-lg border border-input bg-background p-3 text-sm min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                rows={3}
              />
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
                    <div className="text-sm text-muted-foreground mt-4">
                      Retorno previsto: <span className="font-medium text-foreground">{followUpDate}</span>
                    </div>
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
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Save className="h-3 w-3" /> Salvando automaticamente...
          </span>
          <div className="flex gap-2">
            <button onClick={handleSaveDraft} className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors">
              💾 Salvar Rascunho
            </button>
            <button onClick={handleFinalize} disabled={saving} className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50">
              {saving ? 'Salvando...' : '✅ Finalizar e Assinar'}
            </button>
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> {formatElapsed()}
          </span>
        </div>
      </div>
    </div>
  )
}
