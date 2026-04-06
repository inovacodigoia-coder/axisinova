import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useScheduling } from '@/context/SchedulingContext'
import { useRegisters } from '@/context/RegistersContext'
import { useMedical } from '@/context/MedicalContext'
import { useAuth } from '@/context/AuthContext'
import { EmptyTimelineState } from '@/components/medical/empty-states/EmptyTimelineState'
import { AlertTriangle, Phone, Mail, Calendar, FileText, Pill, TestTube, Paperclip, Activity, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

function getAge(birthDate: string) {
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
}

export default function PatientRecordPage() {
  const { patientId } = useParams<{ patientId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { patients } = useScheduling()
  const { doctors, convenios } = useRegisters()
  const { getPatientAttendances, getPatientAlerts, getPatientMedications, getPatientExamResults, addPatientAlert } = useMedical()
  const [activeTab, setActiveTab] = useState('resumo')

  const activeCompanyId = user?.companyId ?? ''
  const patient = patients.find(p => p.id === patientId)
  const attendances = patient ? getPatientAttendances(patient.id, activeCompanyId) : []
  const alerts = patient ? getPatientAlerts(patient.id, activeCompanyId) : []
  const medications = patient ? getPatientMedications(patient.id) : []
  const examResults = patient ? getPatientExamResults(patient.id) : []

  const activeMeds = medications.filter(m => m.status === 'active')
  const allergies = alerts.filter(a => a.type === 'allergy')
  const chronicConditions = alerts.filter(a => a.type === 'chronic_condition')

  // Extract all prescriptions from signed attendances
  const allPrescriptions = useMemo(() =>
    attendances
      .filter(r => r.status === 'signed' && r.prescription && r.prescription.length > 0)
      .flatMap(r => r.prescription!.map(p => ({
        ...p,
        prescribedAt: r.startedAt,
        prescribedBy: doctors.find(d => d.id === r.doctorId)?.fullName ?? 'Médico',
        attendanceId: r.id,
      }))),
    [attendances, doctors]
  )

  // Extract all exam requests
  const allExamRequests = useMemo(() =>
    attendances
      .filter(r => r.examRequests && r.examRequests.length > 0)
      .flatMap(r => (r.examRequests ?? []).map(e => ({
        ...e,
        requestedInAttendance: r.startedAt,
        requestedBy: doctors.find(d => d.id === r.doctorId)?.fullName ?? '',
      }))),
    [attendances, doctors]
  )

  // Add allergy
  const [showAllergyForm, setShowAllergyForm] = useState(false)
  const [newAllergyDesc, setNewAllergyDesc] = useState('')
  const [newAllergySeverity, setNewAllergySeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')

  const handleAddAllergy = () => {
    if (!newAllergyDesc.trim() || !patientId) return
    addPatientAlert({
      id: `alert_${Date.now()}`,
      patientId,
      companyId: activeCompanyId,
      type: 'allergy',
      severity: newAllergySeverity,
      description: newAllergyDesc,
      createdBy: user?.name ?? '',
      createdAt: new Date().toISOString(),
      isActive: true,
    })
    setNewAllergyDesc('')
    setShowAllergyForm(false)
    toast.success('Alergia registrada!')
  }

  if (!patient) {
    return <div className="text-center py-12 text-muted-foreground">Paciente não encontrado.</div>
  }

  const tabs = [
    { id: 'resumo', label: 'Resumo', icon: Activity },
    { id: 'atendimentos', label: 'Atendimentos', icon: FileText },
    { id: 'alergias', label: 'Alergias', icon: AlertTriangle },
    { id: 'medicamentos', label: 'Medicamentos', icon: Pill },
    { id: 'exames', label: 'Exames', icon: TestTube },
    { id: 'anexos', label: 'Anexos', icon: Paperclip },
  ]

  const primaryConvenio = patient.convenioId ? convenios.find(c => c.id === patient.convenioId) : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
            {patient.fullName.split(' ').slice(0, 2).map(n => n[0]).join('')}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{patient.fullName}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
              <span>{getAge(patient.birthDate)} anos · {patient.gender === 'M' ? 'Masculino' : patient.gender === 'F' ? 'Feminino' : 'Outro'}</span>
              {patient.cpf && <span>CPF: {patient.cpf}</span>}
              {primaryConvenio && <span>{primaryConvenio.name}</span>}
              <span><Calendar className="inline h-3 w-3 mr-1" />{new Date(patient.birthDate).toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
              <span><Phone className="inline h-3 w-3 mr-1" />{patient.phone1}</span>
              {patient.email && <span><Mail className="inline h-3 w-3 mr-1" />{patient.email}</span>}
            </div>
          </div>
          <button
            onClick={() => navigate(`/app/atendimento/new?patient=${patient.id}`)}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 transition-opacity"
          >
            ➕ Novo Atendimento
          </button>
        </div>

        {/* No clinical data message */}
        {attendances.length === 0 && (
          <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm flex items-start gap-2">
            <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Nenhum registro clínico ainda</p>
              <p className="text-xs mt-0.5">Este paciente ainda não possui atendimentos registrados. O prontuário será preenchido durante o primeiro atendimento.</p>
            </div>
          </div>
        )}

        {/* Critical alerts */}
        {alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Alertas Críticos:</p>
              <ul className="mt-1 space-y-0.5">
                {alerts.filter(a => a.severity === 'critical' || a.severity === 'high').map(a => (
                  <li key={a.id} className="text-xs">• {a.description}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Resumo tab */}
      {activeTab === 'resumo' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Total atendimentos</p>
                <p className="text-2xl font-bold text-foreground">{attendances.length}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Último atendimento</p>
                <p className="text-sm font-medium text-foreground">{attendances[0] ? new Date(attendances[0].startedAt).toLocaleDateString('pt-BR') : '—'}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Medicamentos em Uso</h3>
              {activeMeds.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum medicamento em uso contínuo.</p>
              ) : (
                <div className="space-y-2">
                  {activeMeds.map(m => (
                    <div key={m.id} className="flex items-center gap-2 text-sm">
                      <Pill className="h-3 w-3 text-primary" />
                      <span className="text-foreground">{m.medication}</span>
                      <span className="text-muted-foreground">· {m.frequency}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Alergias</h3>
              {allergies.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma alergia registrada.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allergies.map(a => (
                    <span key={a.id} className={`px-2 py-1 rounded-full text-xs font-medium ${
                      a.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {a.description.split('—')[0].trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Últimos Atendimentos</h3>
            {attendances.length === 0 ? (
              <EmptyTimelineState />
            ) : (
              <div className="space-y-0">
                {attendances.slice(0, 5).map((record, i) => {
                  const recDoctor = doctors.find(d => d.id === record.doctorId)
                  return (
                    <div key={record.id} className="flex gap-3 pb-4">
                      <div className="flex flex-col items-center">
                        <div className={`h-3 w-3 rounded-full ${record.status === 'in_progress' ? 'bg-primary animate-pulse' : 'bg-green-500'}`} />
                        {i < Math.min(attendances.length, 5) - 1 && <div className="w-px flex-1 bg-border" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-foreground">
                          {new Date(record.startedAt).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                          {recDoctor && <span className="text-muted-foreground"> · Dr. {recDoctor.fullName}</span>}
                          {record.status === 'in_progress' && <span className="ml-2 text-primary font-bold">EM ANDAMENTO</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{record.chiefComplaint.slice(0, 80)}{record.chiefComplaint.length > 80 ? '...' : ''}</p>
                        {record.diagnosis && (
                          <p className="text-[10px] text-primary mt-0.5">{record.diagnosis.cid10Primary.code} · {record.diagnosis.cid10Primary.description}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Atendimentos tab */}
      {activeTab === 'atendimentos' && (
        <div className="space-y-4">
          {attendances.length === 0 && <EmptyTimelineState />}
          {attendances.map((record, i) => {
            const recDoctor = doctors.find(d => d.id === record.doctorId)
            return (
              <motion.div key={record.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-foreground">
                      {new Date(record.startedAt).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {recDoctor ? `Dr. ${recDoctor.fullName}` : ''} · {record.duration ? `${record.duration} min` : 'Em andamento'} · {record.status === 'signed' ? '✅ Assinado' : record.status === 'completed' ? 'Concluído' : '🔄 Em andamento'}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-foreground mb-2"><span className="font-medium">Queixa:</span> {record.chiefComplaint}</p>
                {record.diagnosis && (
                  <p className="text-sm text-foreground mb-1">
                    <span className="font-medium">Diagnóstico:</span> <span className="text-primary">{record.diagnosis.cid10Primary.code}</span> — {record.diagnosis.cid10Primary.description}
                  </p>
                )}
                {record.prescription && record.prescription.length > 0 && <p className="text-xs text-muted-foreground">{record.prescription.length} medicamento(s) prescrito(s)</p>}
                {record.examRequests && record.examRequests.length > 0 && <p className="text-xs text-muted-foreground">{record.examRequests.length} exame(s) solicitado(s)</p>}
                {record.certificateDays && <p className="text-xs text-muted-foreground">Atestado: {record.certificateDays} dia(s)</p>}
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Alergias tab */}
      {activeTab === 'alergias' && (
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-foreground">Alergias</h3>
              <button onClick={() => setShowAllergyForm(!showAllergyForm)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted">
                <Plus className="h-3 w-3" /> Registrar alergia
              </button>
            </div>
            {showAllergyForm && (
              <div className="p-4 rounded-xl border border-border bg-card mb-4 space-y-3">
                <input value={newAllergyDesc} onChange={e => setNewAllergyDesc(e.target.value)} placeholder="Descrição da alergia..." className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none" />
                <div className="flex gap-2">
                  {(['low', 'medium', 'high', 'critical'] as const).map(s => (
                    <label key={s} className="flex items-center gap-1 text-xs cursor-pointer">
                      <input type="radio" checked={newAllergySeverity === s} onChange={() => setNewAllergySeverity(s)} className="accent-primary" />
                      {s === 'low' ? 'Baixa' : s === 'medium' ? 'Média' : s === 'high' ? 'Alta' : 'Crítica'}
                    </label>
                  ))}
                </div>
                <button onClick={handleAddAllergy} className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:opacity-90">Salvar</button>
              </div>
            )}
            {allergies.length === 0 && !showAllergyForm ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Nenhuma alergia registrada para este paciente.</p>
                <button onClick={() => setShowAllergyForm(true)} className="mt-2 text-sm text-primary font-medium hover:underline">+ Registrar primeira alergia</button>
              </div>
            ) : (
              <div className="space-y-3">
                {allergies.map(a => (
                  <div key={a.id} className={`rounded-xl border p-4 ${a.severity === 'critical' ? 'border-red-300 bg-red-50' : 'border-border bg-card'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        a.severity === 'critical' ? 'bg-red-200 text-red-800' : a.severity === 'high' ? 'bg-orange-200 text-orange-800' : 'bg-yellow-200 text-yellow-800'
                      }`}>{a.severity.toUpperCase()}</span>
                      <span className="font-medium text-foreground">{a.description}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Registrado por {a.createdBy} em {new Date(a.createdAt).toLocaleDateString('pt-BR')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Condições Crônicas</h3>
            {chronicConditions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma condição crônica registrada.</p>
            ) : (
              <div className="space-y-3">
                {chronicConditions.map(c => (
                  <div key={c.id} className="rounded-xl border border-border bg-card p-4">
                    <p className="font-medium text-foreground">{c.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">Registrado por {c.createdBy} em {new Date(c.createdAt).toLocaleDateString('pt-BR')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Medicamentos tab */}
      {activeTab === 'medicamentos' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Medicamentos</h3>
          {allPrescriptions.length === 0 && medications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Nenhum medicamento registrado.</p>
              <p className="text-xs text-muted-foreground mt-1">Os medicamentos serão adicionados durante os atendimentos.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {medications.map(m => (
                <div key={m.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{m.medication}</p>
                    <p className="text-xs text-muted-foreground">{m.dosage} · {m.frequency} · Desde {new Date(m.startDate).toLocaleDateString('pt-BR')}</p>
                    <p className="text-xs text-muted-foreground">Prescrito por {m.prescribedBy}</p>
                  </div>
                  <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${
                    m.status === 'active' ? 'bg-green-100 text-green-700' : m.status === 'suspended' ? 'bg-yellow-100 text-yellow-700' : 'bg-muted text-muted-foreground'
                  }`}>{m.status === 'active' ? 'Em uso' : m.status === 'suspended' ? 'Suspenso' : 'Concluído'}</span>
                </div>
              ))}
              {allPrescriptions.length > 0 && (
                <>
                  <h4 className="text-sm font-medium text-muted-foreground mt-4">Histórico de Prescrições</h4>
                  {allPrescriptions.slice(0, 20).map((p, i) => (
                    <div key={`${p.attendanceId}_${p.id}_${i}`} className="rounded-xl border border-border bg-card p-3 text-sm">
                      <p className="font-medium text-foreground">{p.medication} {p.dosage}</p>
                      <p className="text-xs text-muted-foreground">{p.frequency} · {p.duration} · {new Date(p.prescribedAt).toLocaleDateString('pt-BR')} · {p.prescribedBy}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Exames tab */}
      {activeTab === 'exames' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Exames Solicitados</h3>
          {allExamRequests.length === 0 && examResults.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Nenhum exame solicitado ainda.</p>
              <p className="text-xs text-muted-foreground mt-1">Os exames aparecerão aqui quando forem solicitados durante os atendimentos.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {examResults.map(e => {
                const statusLabels: Record<string, { label: string; color: string }> = {
                  requested: { label: 'Solicitado', color: 'bg-blue-100 text-blue-700' },
                  collected: { label: 'Coletado', color: 'bg-yellow-100 text-yellow-700' },
                  in_analysis: { label: 'Em análise', color: 'bg-orange-100 text-orange-700' },
                  result_available: { label: 'Resultado disponível', color: 'bg-green-100 text-green-700' },
                  delivered: { label: 'Entregue', color: 'bg-muted text-muted-foreground' },
                }
                const st = statusLabels[e.status]
                return (
                  <div key={e.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground">{e.examName}</p>
                        <p className="text-xs text-muted-foreground">Código: {e.examCode} · Solicitado por {e.requestedBy}</p>
                        <p className="text-xs text-muted-foreground">Data: {new Date(e.requestedAt).toLocaleDateString('pt-BR')}</p>
                        {e.resultSummary && <p className="text-sm text-foreground mt-1">{e.resultSummary}</p>}
                      </div>
                      <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${st?.color ?? 'bg-muted text-muted-foreground'}`}>{st?.label ?? e.status}</span>
                    </div>
                  </div>
                )
              })}
              {allExamRequests.filter(e => !examResults.some(r => r.examName === e.examName)).map((e, i) => (
                <div key={`req_${e.id}_${i}`} className="rounded-xl border border-border bg-card p-4">
                  <p className="font-medium text-foreground">{e.examName}</p>
                  <p className="text-xs text-muted-foreground">{e.examCode ? `TUSS: ${e.examCode} · ` : ''}Solicitado por {e.requestedBy} em {new Date(e.requestedInAttendance).toLocaleDateString('pt-BR')}</p>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700 mt-1 inline-block">Solicitado</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Anexos tab */}
      {activeTab === 'anexos' && (
        <div className="text-center py-12">
          <Paperclip className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum anexo disponível.</p>
          <p className="text-xs text-muted-foreground mt-1">Documentos e imagens anexados durante atendimentos aparecerão aqui.</p>
        </div>
      )}
    </div>
  )
}
