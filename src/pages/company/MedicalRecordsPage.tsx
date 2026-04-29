import { useState, useEffect } from 'react'
import { Plus, FileText, Calendar, ChevronRight, Heart, Stethoscope, Trash2 } from 'lucide-react'
import { GradientButton } from '@/components/ui/GradientButton'
import { SearchInput } from '@/components/ui/SearchInput'
import { MedicalRecordModal, type MedicalRecordFormData } from '@/components/company/MedicalRecordModal'
import { PatientModal, type PatientFormData } from '@/components/company/PatientModal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'

interface Patient {
  id: string; name: string; cpf: string; birthDate: string; phone: string
  lastVisit: string; totalVisits: number; bloodType: string; allergies: string[]
}

interface MedicalRecord {
  id: string; date: string; doctor: string; type: string; diagnosis: string; notes: string; prescription?: string; exams?: string
}

export default function MedicalRecordsPage() {
  const { user } = useAuth()
  const companyId = user?.companyId
  const [search, setSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [recordModalOpen, setRecordModalOpen] = useState(false)
  const [patientModalOpen, setPatientModalOpen] = useState(false)
  const [deleteRecord, setDeleteRecord] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchPatients = async () => {
    if (!companyId) { setLoading(false); return }
    const { data: patientsData } = await supabase
      .from('patients').select('*').eq('company_id', companyId).order('name')
    
    if (!patientsData) { setLoading(false); return }

    const { data: recordCounts } = await supabase
      .from('medical_records').select('patient_id, date').eq('company_id', companyId)

    const countMap: Record<string, { count: number; lastDate: string }> = {}
    ;(recordCounts || []).forEach(r => {
      if (!countMap[r.patient_id]) countMap[r.patient_id] = { count: 0, lastDate: r.date }
      countMap[r.patient_id].count++
      if (r.date > countMap[r.patient_id].lastDate) countMap[r.patient_id].lastDate = r.date
    })

    const mapped: Patient[] = patientsData.map(p => ({
      id: p.id, name: p.name, cpf: p.cpf,
      birthDate: new Date(p.birth_date).toLocaleDateString('pt-BR'),
      phone: p.phone, bloodType: p.blood_type || 'O+',
      allergies: p.allergies || [],
      totalVisits: countMap[p.id]?.count || 0,
      lastVisit: countMap[p.id] ? new Date(countMap[p.id].lastDate).toLocaleDateString('pt-BR') : '-',
    }))
    setPatients(mapped)
    setLoading(false)
  }

  const fetchRecords = async (patientId: string) => {
    const { data } = await supabase
      .from('medical_records').select('*').eq('patient_id', patientId).order('date', { ascending: false })
    const mapped: MedicalRecord[] = (data || []).map(r => ({
      id: r.id, date: new Date(r.date).toLocaleDateString('pt-BR'),
      doctor: r.doctor, type: r.type, diagnosis: r.diagnosis,
      notes: r.notes, prescription: r.prescription || undefined, exams: r.exams || undefined,
    }))
    setRecords(mapped)
  }

  useEffect(() => { fetchPatients() }, [companyId])
  useEffect(() => { if (selectedPatient) fetchRecords(selectedPatient.id) }, [selectedPatient])

  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.cpf.includes(search)
  )

  const handleSaveRecord = async (data: MedicalRecordFormData) => {
    if (!selectedPatient || !companyId) return
    const { error } = await supabase.from('medical_records').insert({
      company_id: companyId, patient_id: selectedPatient.id,
      date: data.date, doctor: data.doctor, type: data.type,
      diagnosis: data.diagnosis, notes: data.notes,
      prescription: data.prescription || null, exams: data.exams || null,
    })
    if (error) { toast.error('Erro ao salvar registro'); return }
    setRecordModalOpen(false)
    toast.success('Registro adicionado ao prontuário!')
    fetchRecords(selectedPatient.id)
    fetchPatients()
  }

  const handleSavePatient = async (data: PatientFormData) => {
    if (!companyId) {
      toast.error('Empresa não identificada. Faça login novamente.')
      return
    }
    const { error } = await supabase.from('patients').insert({
      company_id: companyId,
      name: data.name.trim(),
      cpf: data.cpf.replace(/\D/g, ''),
      birth_date: data.birthDate,
      phone: data.phone.replace(/\D/g, ''),
      blood_type: data.bloodType,
      allergies: data.allergies,
      email: data.email?.trim() || null,
      address: data.address?.trim() || null,
    })
    if (error) {
      console.error('[patients.insert] error:', error)
      toast.error(`Erro ao cadastrar paciente: ${error.message}`)
      return
    }
    setPatientModalOpen(false)
    toast.success('Paciente cadastrado com sucesso!')
    fetchPatients()
  }

  const handleDeleteRecord = async () => {
    if (!deleteRecord) return
    await supabase.from('medical_records').delete().eq('id', deleteRecord)
    setDeleteRecord(null)
    toast.success('Registro removido do prontuário')
    if (selectedPatient) fetchRecords(selectedPatient.id)
  }

  if (selectedPatient) {
    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedPatient(null)} className="flex items-center gap-1 text-sm text-primary hover:underline">← Voltar para lista</button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full gradient-bg text-white font-bold">{selectedPatient.name.charAt(0)}</div>
              <div>
                <h2 className="font-bold text-foreground">{selectedPatient.name}</h2>
                <p className="text-xs text-muted-foreground">CPF: {selectedPatient.cpf}</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Nascimento</span><span className="text-foreground">{selectedPatient.birthDate}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Telefone</span><span className="text-foreground">{selectedPatient.phone}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tipo Sanguíneo</span><span className="font-bold text-destructive">{selectedPatient.bloodType}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total de Visitas</span><span className="text-foreground">{selectedPatient.totalVisits}</span></div>
              {selectedPatient.allergies.length > 0 && (
                <div>
                  <span className="text-muted-foreground text-xs">Alergias:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedPatient.allergies.map((a) => (
                      <span key={a} className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">{a}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Histórico de Prontuário</h3>
              <GradientButton onClick={() => setRecordModalOpen(true)}><Plus className="h-4 w-4 mr-2" /> Nova Entrada</GradientButton>
            </div>
            {records.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum registro encontrado</p>
              </div>
            ) : (
              records.map((r) => (
                <div key={r.id} className="rounded-2xl border border-border bg-card p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] group relative">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">{r.type}</span>
                      <span className="text-xs text-muted-foreground">· {r.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{r.doctor}</span>
                      <button onClick={() => setDeleteRecord(r.id)}
                        className="hidden group-hover:block rounded p-1 hover:bg-muted transition-colors">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">{r.diagnosis}</p>
                  <p className="text-sm text-muted-foreground">{r.notes}</p>
                  {r.prescription && <p className="text-sm text-foreground/80 mt-2"><span className="font-medium">Prescrição:</span> {r.prescription}</p>}
                  {r.exams && <p className="text-sm text-foreground/80 mt-1"><span className="font-medium">Exames:</span> {r.exams}</p>}
                </div>
              ))
            )}
          </div>
        </div>

        <MedicalRecordModal open={recordModalOpen} onClose={() => setRecordModalOpen(false)} onSave={handleSaveRecord} patientName={selectedPatient.name} />
        <ConfirmModal open={!!deleteRecord} title="Remover Registro" description="Deseja realmente remover este registro do prontuário?" confirmLabel="Remover" variant="danger" onConfirm={handleDeleteRecord} onClose={() => setDeleteRecord(null)} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Prontuário Eletrônico</h1>
          <p className="text-sm text-muted-foreground">Busque e gerencie prontuários de pacientes</p>
        </div>
        <GradientButton onClick={() => setPatientModalOpen(true)}><Plus className="h-4 w-4 mr-2" /> Novo Paciente</GradientButton>
      </div>

      <div className="w-full sm:w-80">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome ou CPF..." />
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground">Carregando pacientes...</div>
      ) : patients.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum paciente cadastrado</h3>
          <p className="text-sm text-muted-foreground mb-4">Cadastre o primeiro paciente para começar a usar o prontuário eletrônico.</p>
          <GradientButton onClick={() => setPatientModalOpen(true)}><Plus className="h-4 w-4 mr-2" /> Cadastrar Primeiro Paciente</GradientButton>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <button key={p.id} onClick={() => setSelectedPatient(p)}
              className="rounded-2xl border border-border bg-card p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] text-left hover:shadow-lg hover:border-primary/30 transition-all group">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-bg text-white text-sm font-bold">{p.name.charAt(0)}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.cpf}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {p.lastVisit}</span>
                <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {p.totalVisits} visitas</span>
                {p.allergies.length > 0 && (
                  <span className="flex items-center gap-1 text-destructive"><Heart className="h-3 w-3" /> {p.allergies.length} alergia(s)</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <PatientModal open={patientModalOpen} onClose={() => setPatientModalOpen(false)} onSave={handleSavePatient} />
    </div>
  )
}
