// =====================================================================
// PatientReviewModal — Revisão final antes de salvar o paciente
// =====================================================================
import { useMemo } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { GradientButton } from '@/components/ui/GradientButton'
import {
  User, Phone, ShieldCheck, Users, HeartPulse, FileText,
  Save, Loader2, AlertTriangle, CheckCircle2, Pencil,
} from 'lucide-react'
import type { PatientFormValues } from '@/utils/patient.schema'
import {
  GENDER_LABELS, ETHNICITY_LABELS, MARITAL_LABELS, STATUS_LABELS,
} from '@/types/patient.types'

interface Props {
  open: boolean
  values: PatientFormValues | null
  saving: boolean
  isEditing: boolean
  onCancel: () => void
  onConfirm: () => void
  onEditSection: (section: 'personal' | 'contact' | 'insurance' | 'responsible' | 'clinical' | 'notes') => void
}

const Row = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/50 last:border-0">
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
    <span className="text-xs text-foreground text-right max-w-[60%] break-words">
      {value === undefined || value === null || value === '' ? <em className="text-muted-foreground/60">—</em> : value}
    </span>
  </div>
)

const Section = ({
  title, icon: Icon, onEdit, children,
}: { title: string; icon: any; onEdit: () => void; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="rounded-lg gradient-bg p-1.5">
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
      </div>
      <button type="button" onClick={onEdit}
        className="inline-flex items-center gap-1 rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted">
        <Pencil className="h-3 w-3" />
        Editar
      </button>
    </div>
    <div className="space-y-0">{children}</div>
  </div>
)

export function PatientReviewModal({
  open, values, saving, isEditing, onCancel, onConfirm, onEditSection,
}: Props) {
  const v = values

  const age = useMemo(() => {
    if (!v?.birthDate) return null
    const b = new Date(v.birthDate)
    if (Number.isNaN(b.getTime())) return null
    const t = new Date()
    let a = t.getFullYear() - b.getFullYear()
    const m = t.getMonth() - b.getMonth()
    if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--
    return a
  }, [v?.birthDate])

  const checks = useMemo(() => {
    if (!v) return [] as Array<{ ok: boolean; text: string }>
    return [
      { ok: !!v.fullName, text: 'Nome completo informado' },
      { ok: !!v.birthDate, text: 'Data de nascimento informada' },
      { ok: !!v.phone1, text: 'Telefone principal informado' },
      { ok: !v.cpf || v.cpf.length >= 11, text: 'CPF válido (ou não informado)' },
      { ok: age === null || age >= 18 || !!v.responsible?.name, text: 'Responsável (se menor de idade)' },
      { ok: v.convenios.length > 0 || true, text: `${v.convenios.length} convênio(s) cadastrado(s)` },
    ]
  }, [v, age])

  if (!v) return null

  const fmtDate = (d?: string) => {
    if (!d) return ''
    const [y, m, day] = d.split('-')
    if (!y || !m || !day) return d
    return `${day}/${m}/${y}`
  }

  const addr = v.address
  const addrLine = addr && (addr.street || addr.city)
    ? `${addr.street || ''}${addr.number ? ', ' + addr.number : ''}${addr.complement ? ' - ' + addr.complement : ''}${addr.neighborhood ? ', ' + addr.neighborhood : ''}${addr.city ? ' - ' + addr.city : ''}${addr.state ? '/' + addr.state : ''}${addr.cep ? ' • CEP ' + addr.cep : ''}`
    : ''

  return (
    <Dialog open={open} onOpenChange={o => { if (!o && !saving) onCancel() }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Revisão final — {isEditing ? 'Confirmar alterações' : 'Confirmar cadastro'}
          </DialogTitle>
          <DialogDescription>
            Confira todos os dados antes de {isEditing ? 'salvar as alterações' : 'cadastrar o paciente'}.
            Você pode editar qualquer seção antes de confirmar.
          </DialogDescription>
        </DialogHeader>

        {/* Checklist */}
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-xs font-bold text-foreground mb-2">Verificações rápidas</p>
          <div className="grid sm:grid-cols-2 gap-1.5">
            {checks.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {c.ok
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                  : <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
                <span className={c.ok ? 'text-foreground' : 'text-amber-700 dark:text-amber-400'}>{c.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-3">
          {/* Pessoal */}
          <Section title="Dados pessoais" icon={User} onEdit={() => onEditSection('personal')}>
            <Row label="Nome completo" value={v.fullName} />
            {v.socialName && <Row label="Nome social" value={v.socialName} />}
            <Row label="Data de nascimento" value={`${fmtDate(v.birthDate)}${age !== null ? ` (${age} anos)` : ''}`} />
            <Row label="Sexo" value={GENDER_LABELS[v.gender]} />
            <Row label="CPF" value={v.cpf} />
            <Row label="RG" value={v.rg ? `${v.rg}${v.rgIssuer ? ' ' + v.rgIssuer : ''}${v.rgState ? '/' + v.rgState : ''}` : ''} />
            <Row label="Mãe" value={v.motherName} />
            {v.fatherName && <Row label="Pai" value={v.fatherName} />}
            {v.ethnicity && <Row label="Etnia" value={ETHNICITY_LABELS[v.ethnicity]} />}
            {v.maritalStatus && <Row label="Estado civil" value={MARITAL_LABELS[v.maritalStatus]} />}
            <Row label="Status" value={STATUS_LABELS[v.status]} />
          </Section>

          {/* Contato */}
          <Section title="Contato e endereço" icon={Phone} onEdit={() => onEditSection('contact')}>
            <Row label="Telefone principal" value={v.phone1} />
            {v.phone2 && <Row label="Telefone 2" value={v.phone2} />}
            {v.phone3 && <Row label="Telefone 3" value={v.phone3} />}
            <Row label="E-mail" value={v.email} />
            {v.emailSecondary && <Row label="E-mail secundário" value={v.emailSecondary} />}
            <Row label="Endereço" value={addrLine} />
            {v.occupation && <Row label="Ocupação" value={v.occupation} />}
            {v.employer && <Row label="Empregador" value={v.employer} />}
          </Section>

          {/* Convênios */}
          <Section title={`Convênios (${v.convenios.length})`} icon={ShieldCheck} onEdit={() => onEditSection('insurance')}>
            {v.convenios.length === 0 && (
              <p className="text-xs text-muted-foreground italic">Particular — nenhum convênio cadastrado</p>
            )}
            {v.convenios.map((c, i) => (
              <div key={i} className="rounded-lg border border-border/60 p-2 mb-2 last:mb-0">
                <p className="text-xs font-bold text-foreground">{c.convenioName} {c.planName && <span className="text-muted-foreground font-normal">— {c.planName}</span>}</p>
                <p className="text-[11px] text-muted-foreground">Carteirinha: {c.cardNumber} {c.cardExpiry && `• Val. ${c.cardExpiry}`}</p>
                {!c.isHolder && c.holderName && (
                  <p className="text-[11px] text-muted-foreground">Titular: {c.holderName}</p>
                )}
              </div>
            ))}
          </Section>

          {/* Responsável */}
          <Section title="Responsável" icon={Users} onEdit={() => onEditSection('responsible')}>
            {!v.responsible?.name ? (
              <p className="text-xs text-muted-foreground italic">
                {age !== null && age < 18
                  ? <span className="text-amber-700 dark:text-amber-400">⚠ Paciente menor sem responsável!</span>
                  : 'Não aplicável'}
              </p>
            ) : (
              <>
                <Row label="Nome" value={v.responsible.name} />
                <Row label="CPF" value={v.responsible.cpf} />
                <Row label="Parentesco" value={v.responsible.relationship} />
                <Row label="Telefone" value={v.responsible.phone1} />
                {v.responsible.email && <Row label="E-mail" value={v.responsible.email} />}
              </>
            )}
          </Section>

          {/* Clínico */}
          <Section title="Dados clínicos" icon={HeartPulse} onEdit={() => onEditSection('clinical')}>
            <Row label="Tipo sanguíneo" value={v.clinicalData.bloodType && v.clinicalData.bloodType !== 'unknown' ? v.clinicalData.bloodType : ''} />
            <Row label="Alergias" value={
              v.clinicalData.allergies.length > 0
                ? v.clinicalData.allergies.map(a => `${a.substance} (${a.severity})`).join(', ')
                : ''
            } />
            <Row label="Condições crônicas" value={v.clinicalData.chronicConditions.join(', ')} />
            <Row label="Medicamentos contínuos" value={
              v.clinicalData.continuousMedications.length > 0
                ? v.clinicalData.continuousMedications.map(m => `${m.name}${m.dosage ? ' ' + m.dosage : ''}`).join(', ')
                : ''
            } />
            {v.clinicalData.needsPriority && <Row label="Atendimento prioritário" value="Sim" />}
            {v.clinicalData.organDonor && <Row label="Doador de órgãos" value="Sim" />}
            {v.clinicalData.disabilities && <Row label="Deficiências/condições" value={v.clinicalData.disabilities} />}
          </Section>

          {/* Observações */}
          <Section title="Observações" icon={FileText} onEdit={() => onEditSection('notes')}>
            {v.referralSource && <Row label="Origem" value={v.referralSource} />}
            {v.referralBy && <Row label="Indicado por" value={v.referralBy} />}
            {v.tags.length > 0 && (
              <Row label="Tags" value={v.tags.join(', ')} />
            )}
            {v.internalAlerts?.message && (
              <Row label="Alerta interno" value={
                <span className={
                  v.internalAlerts.color === 'red' ? 'text-destructive font-semibold' :
                  v.internalAlerts.color === 'yellow' ? 'text-amber-600 font-semibold' :
                  'text-primary font-semibold'
                }>{v.internalAlerts.message}</span>
              } />
            )}
            {v.generalNotes && <Row label="Observações gerais" value={<span className="text-left block">{v.generalNotes}</span>} />}
            {v.financialNotes && <Row label="Obs. financeiras" value={v.financialNotes} />}
          </Section>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <button type="button" onClick={onCancel} disabled={saving}
            className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50">
            Voltar e editar
          </button>
          <GradientButton type="button" onClick={onConfirm} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            {saving ? 'Salvando...' : isEditing ? 'Confirmar alterações' : 'Confirmar e cadastrar'}
          </GradientButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
