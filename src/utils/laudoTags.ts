/** Etiquetas dinâmicas disponíveis nos modelos de laudo. */
export interface LaudoTag {
  tag: string
  label: string
  group: 'Exame' | 'Paciente' | 'Atendimento' | 'Laboratório'
}

export const LAUDO_TAGS: LaudoTag[] = [
  { tag: '{{exame.nome}}', label: 'Nome do exame', group: 'Exame' },
  { tag: '{{exame.codigo}}', label: 'Código do exame', group: 'Exame' },
  { tag: '{{exame.material}}', label: 'Material', group: 'Exame' },
  { tag: '{{exame.metodo}}', label: 'Metodologia', group: 'Exame' },
  { tag: '{{exame.bancada}}', label: 'Bancada técnica', group: 'Exame' },
  { tag: '{{exame.observacoes}}', label: 'Observações do laudo', group: 'Exame' },
  { tag: '{{paciente.nome}}', label: 'Nome do paciente', group: 'Paciente' },
  { tag: '{{paciente.nascimento}}', label: 'Data de nascimento', group: 'Paciente' },
  { tag: '{{paciente.idade}}', label: 'Idade', group: 'Paciente' },
  { tag: '{{paciente.sexo}}', label: 'Sexo', group: 'Paciente' },
  { tag: '{{atendimento.protocolo}}', label: 'Protocolo', group: 'Atendimento' },
  { tag: '{{atendimento.data}}', label: 'Data do atendimento', group: 'Atendimento' },
  { tag: '{{atendimento.coleta}}', label: 'Data da coleta', group: 'Atendimento' },
  { tag: '{{atendimento.medico}}', label: 'Médico solicitante', group: 'Atendimento' },
  { tag: '{{atendimento.local}}', label: 'Local/Origem', group: 'Atendimento' },
  { tag: '{{lab.nome}}', label: 'Nome do laboratório', group: 'Laboratório' },
  { tag: '{{lab.responsavel}}', label: 'Responsável técnico', group: 'Laboratório' },
  { tag: '{{lab.registro}}', label: 'Registro do responsável', group: 'Laboratório' },
]

const fmtDate = (v?: string) => (v ? new Date(v).toLocaleDateString('pt-BR') : '')
const fmtDateTime = (v?: string) =>
  v ? new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''

export function buildLaudoTagContext(order: any = {}, exam: any = {}, lab: any = {}) {
  const birth = order.patientBirthDate ? new Date(order.patientBirthDate) : null
  const age = birth ? String(new Date().getFullYear() - birth.getFullYear()) : ''
  const gender =
    order.patientGender === 'M' || order.patientGender === 'male'
      ? 'Masculino'
      : order.patientGender === 'F' || order.patientGender === 'female'
        ? 'Feminino'
        : 'Outro'

  return {
    '{{exame.nome}}': exam.name || '',
    '{{exame.codigo}}': exam.code || '',
    '{{exame.material}}': exam.material || '',
    '{{exame.metodo}}': exam.methodology || '',
    '{{exame.bancada}}': exam.workbench || '',
    '{{exame.observacoes}}': exam.reportObservations || exam.internalObservations || '',
    '{{paciente.nome}}': order.patientName || '',
    '{{paciente.nascimento}}': fmtDate(order.patientBirthDate),
    '{{paciente.idade}}': age ? `${age} anos` : '',
    '{{paciente.sexo}}': gender,
    '{{atendimento.protocolo}}': order.protocol || '',
    '{{atendimento.data}}': fmtDateTime(order.registeredAt),
    '{{atendimento.coleta}}': fmtDateTime(order.collectionTime),
    '{{atendimento.medico}}': order.doctorName || order.requestingDoctor || '',
    '{{atendimento.local}}': order.originName || '',
    '{{lab.nome}}': lab.name || '',
    '{{lab.responsavel}}': lab.responsible || '',
    '{{lab.registro}}': lab.register || '',
  } as Record<string, string>
}

/** Substitui as etiquetas do modelo pelos valores reais. */
export function renderLaudoTemplate(template?: string, ctx: Record<string, string> = {}) {
  if (!template) return ''
  return template.replace(/\{\{\s*[\w.]+\s*\}\}/g, (m) => {
    const key = `{{${m.replace(/[{}\s]/g, '')}}}`
    return ctx[key] ?? ''
  })
}
