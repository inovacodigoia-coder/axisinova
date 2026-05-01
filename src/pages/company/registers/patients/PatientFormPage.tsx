// =====================================================================
// PatientFormPage — Cadastro / edição de paciente em 6 seções
// =====================================================================
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowLeft, Save, Loader2, User, Phone, ShieldCheck, Users, HeartPulse, FileText } from 'lucide-react'

import { GradientButton } from '@/components/ui/GradientButton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/integrations/supabase/client'

import { patientFormSchema, emptyPatientForm, type PatientFormValues } from '@/utils/patient.schema'
import { dbToPatient, patientToDb } from '@/utils/patient.adapter'
import { stringSimilarity } from '@/utils/patient.validators'
import type { Patient } from '@/types/patient.types'

import { PersonalSection } from '@/components/patients/form/PersonalSection'
import { ContactSection } from '@/components/patients/form/ContactSection'
import { InsuranceSection } from '@/components/patients/form/InsuranceSection'
import { ResponsibleSection } from '@/components/patients/form/ResponsibleSection'
import { ClinicalSection } from '@/components/patients/form/ClinicalSection'
import { NotesSection } from '@/components/patients/form/NotesSection'
import { DuplicateWarningModal } from '@/components/patients/form/DuplicateWarningModal'
import { PatientReviewModal } from '@/components/patients/form/PatientReviewModal'

const TABS = [
  { value: 'personal', label: 'Pessoal', icon: User, fields: ['fullName', 'birthDate', 'gender', 'cpf', 'rg', 'motherName'] },
  { value: 'contact', label: 'Contato', icon: Phone, fields: ['phone1', 'email', 'address'] },
  { value: 'insurance', label: 'Convênios', icon: ShieldCheck, fields: ['convenios'] },
  { value: 'responsible', label: 'Responsável', icon: Users, fields: ['responsible'] },
  { value: 'clinical', label: 'Clínico', icon: HeartPulse, fields: ['clinicalData'] },
  { value: 'notes', label: 'Observações', icon: FileText, fields: ['generalNotes', 'tags'] },
] as const

type TabKey = typeof TABS[number]['value']

export default function PatientFormPage() {
  const navigate = useNavigate()
  const { patientId } = useParams<{ patientId?: string }>()
  const isEditing = Boolean(patientId)
  const { user } = useAuth()

  const methods = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: emptyPatientForm(),
    mode: 'onBlur',
  })
  const { handleSubmit, reset, formState: { errors, isDirty } } = methods

  const [tab, setTab] = useState<TabKey>('personal')
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [duplicates, setDuplicates] = useState<Array<{ patient: Patient; reason: string; score?: number }>>([])
  const [pendingValues, setPendingValues] = useState<PatientFormValues | null>(null)
  const [reviewValues, setReviewValues] = useState<PatientFormValues | null>(null)
  const allPatientsRef = useRef<Patient[]>([])

  // Carrega o paciente em edição
  useEffect(() => {
    if (!isEditing || !patientId) return
    let cancel = false
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase.from('patients').select('*').eq('id', patientId).maybeSingle()
      if (cancel) return
      if (error || !data) {
        toast.error('Paciente não encontrado')
        navigate('/app/cadastros/pacientes')
        return
      }
      const p = dbToPatient(data)
      reset(toFormValues(p))
      setLoading(false)
    })()
    return () => { cancel = true }
  }, [isEditing, patientId, navigate, reset])

  // Carrega lista de pacientes da empresa para detecção de duplicados
  useEffect(() => {
    if (!user?.companyId) return
    supabase.from('patients').select('id,company_id,name,cpf,birth_date,mother_name')
      .eq('company_id', user.companyId)
      .then(({ data }) => { allPatientsRef.current = (data || []).map(dbToPatient) })
  }, [user?.companyId])

  // Detecta erros por aba para badge visual
  const tabErrorMap = useMemo(() => {
    const map: Record<TabKey, number> = { personal: 0, contact: 0, insurance: 0, responsible: 0, clinical: 0, notes: 0 }
    for (const t of TABS) {
      for (const f of t.fields) {
        if ((errors as any)[f]) map[t.value]++
      }
    }
    return map
  }, [errors])

  const findDuplicates = (values: PatientFormValues) => {
    if (isEditing) return [] as typeof duplicates
    const list = allPatientsRef.current
    const out: typeof duplicates = []
    const cleanCPF = (values.cpf || '').replace(/\D/g, '')
    for (const p of list) {
      // CPF idêntico — bloqueio forte
      if (cleanCPF && p.cpf && p.cpf === cleanCPF) {
        out.push({ patient: p, reason: 'CPF idêntico', score: 1 })
        continue
      }
      // Mesmo nome + mesma data de nascimento
      if (
        values.fullName && p.fullName && values.birthDate && p.birthDate &&
        p.birthDate === values.birthDate &&
        stringSimilarity(values.fullName, p.fullName) > 0.85
      ) {
        out.push({ patient: p, reason: 'Nome + data de nascimento', score: stringSimilarity(values.fullName, p.fullName) })
        continue
      }
      // Mesma mãe + nome similar
      if (
        values.motherName && p.motherName &&
        stringSimilarity(values.motherName, p.motherName) > 0.9 &&
        stringSimilarity(values.fullName || '', p.fullName) > 0.8
      ) {
        out.push({ patient: p, reason: 'Nome da mãe + nome similar', score: stringSimilarity(values.fullName || '', p.fullName) })
      }
    }
    return out.slice(0, 5)
  }

  const persist = async (values: PatientFormValues) => {
    if (!user?.companyId) {
      toast.error('Empresa não identificada. Faça login novamente.')
      return
    }
    setSaving(true)
    const payload = patientToDb({ ...values, companyId: user.companyId } as any)
    if (!isEditing) payload.registered_by = user.id

    const { data, error } = isEditing
      ? await supabase.from('patients').update(payload as any).eq('id', patientId!).select().single()
      : await supabase.from('patients').insert(payload as any).select().single()

    setSaving(false)
    if (error) {
      console.error('[PatientFormPage] save error:', error)
      toast.error(`Erro ao salvar: ${error.message}`)
      return
    }
    toast.success(isEditing ? 'Paciente atualizado!' : 'Paciente cadastrado com sucesso!')
    setPendingValues(null)
    setDuplicates([])
    setReviewValues(null)
    if (data?.id) navigate(`/app/cadastros/pacientes/${data.id}`)
    else navigate('/app/cadastros/pacientes')
  }

  const onSubmit = (values: PatientFormValues) => {
    // Abre tela de revisão antes de qualquer persistência
    setReviewValues(values)
  }

  const confirmFromReview = () => {
    if (!reviewValues) return
    const dups = findDuplicates(reviewValues)
    if (dups.length > 0) {
      setDuplicates(dups)
      setPendingValues(reviewValues)
      return
    }
    persist(reviewValues)
  }

  const onInvalid = (errs: any) => {
    // Foca na primeira aba com erro
    for (const t of TABS) {
      if (t.fields.some(f => errs[f])) {
        setTab(t.value)
        break
      }
    }
    toast.error('Verifique os campos destacados.')
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button type="button" onClick={() => navigate('/app/cadastros/pacientes')}
              className="rounded-lg p-2 hover:bg-muted">
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </button>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-foreground truncate">
                {isEditing ? 'Editar paciente' : 'Novo paciente'}
              </h1>
              <p className="text-sm text-muted-foreground">Preencha as informações do paciente</p>
            </div>
          </div>
          <GradientButton type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            {saving ? 'Salvando...' : 'Salvar paciente'}
          </GradientButton>
        </div>

        <Tabs value={tab} onValueChange={v => setTab(v as TabKey)} className="space-y-5">
          <div className="sticky top-16 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 bg-muted/95 backdrop-blur border-b border-border">
            <TabsList className="flex w-full justify-start gap-1 overflow-x-auto bg-transparent p-0 h-auto">
              {TABS.map(t => {
                const Icon = t.icon
                const errCount = tabErrorMap[t.value]
                return (
                  <TabsTrigger key={t.value} value={t.value}
                    className="relative inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-xs font-semibold data-[state=active]:gradient-bg data-[state=active]:text-white data-[state=inactive]:bg-card data-[state=inactive]:text-foreground data-[state=inactive]:border-border">
                    <Icon className="h-3.5 w-3.5" />
                    {t.label}
                    {errCount > 0 && (
                      <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                        {errCount}
                      </span>
                    )}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>

          <TabsContent value="personal" className="m-0"><PersonalSection /></TabsContent>
          <TabsContent value="contact" className="m-0"><ContactSection /></TabsContent>
          <TabsContent value="insurance" className="m-0"><InsuranceSection /></TabsContent>
          <TabsContent value="responsible" className="m-0"><ResponsibleSection /></TabsContent>
          <TabsContent value="clinical" className="m-0"><ClinicalSection /></TabsContent>
          <TabsContent value="notes" className="m-0"><NotesSection /></TabsContent>
        </Tabs>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <p className="text-xs text-muted-foreground">
            {isDirty ? 'Alterações não salvas' : 'Tudo salvo'}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate('/app/cadastros/pacientes')}
              className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted">
              Cancelar
            </button>
            <GradientButton type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
              {isEditing ? 'Salvar alterações' : 'Cadastrar paciente'}
            </GradientButton>
          </div>
        </div>
      </form>

      <DuplicateWarningModal
        open={duplicates.length > 0}
        candidates={duplicates}
        onCancel={() => { setDuplicates([]); setPendingValues(null) }}
        onContinue={() => { if (pendingValues) persist(pendingValues) }}
        onOpen={p => navigate(`/app/cadastros/pacientes/${p.id}`)}
      />
    </FormProvider>
  )
}

// Converte um Patient (do banco) para o shape do form
function toFormValues(p: Patient): PatientFormValues {
  const base = emptyPatientForm()
  return {
    ...base,
    fullName: p.fullName,
    socialName: p.socialName || '',
    cpf: p.cpf ? p.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '',
    rg: p.rg || '',
    rgIssuer: p.rgIssuer || '',
    rgState: p.rgState || '',
    rgIssueDate: p.rgIssueDate || '',
    birthDate: p.birthDate,
    birthCity: p.birthCity || '',
    birthState: p.birthState || '',
    nationality: p.nationality || 'Brasileira',
    gender: p.gender,
    ethnicity: p.ethnicity,
    maritalStatus: p.maritalStatus,
    education: p.education,
    motherName: p.motherName || '',
    fatherName: p.fatherName || '',
    status: p.status,
    phone1: p.phone1 ? p.phone1.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3') : '',
    phone1Type: p.phone1Type,
    phone2: p.phone2 || '',
    phone2Type: p.phone2Type,
    phone3: p.phone3 || '',
    email: p.email || '',
    emailSecondary: p.emailSecondary || '',
    address: p.address || base.address,
    occupation: p.occupation || '',
    employer: p.employer || '',
    workPhone: p.workPhone || '',
    convenios: p.convenios || [],
    responsible: p.responsible,
    clinicalData: p.clinicalData,
    referralSource: p.referralSource || '',
    referralBy: p.referralBy || '',
    generalNotes: p.generalNotes || '',
    internalAlerts: p.internalAlerts,
    financialNotes: p.financialNotes || '',
    tags: p.tags || [],
  }
}
