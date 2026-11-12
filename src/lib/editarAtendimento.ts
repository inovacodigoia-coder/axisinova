// Edição do atendimento pelo modal Detalhes Atendimento (menu ⋮ → Editar).
// Converte o pedido salvo para o formato das etapas do Cadastro de Atendimento
// e devolve só os campos que mudaram, para o histórico registrar o que foi alterado.

export interface EstadoEdicao {
  patient?: any
  weight?: string
  height?: string
  isUrgent?: boolean
  hasFever?: boolean
  fastingSince?: string
  fastingStartHour?: string
  fastingType?: string
  hospitalId?: string
  hospitalName?: string
  hospitalSectorId?: string
  hospitalSectorName?: string
  bed?: string
  medicalRecordNumber?: string
  observation?: string
  doctorId?: string
  doctorName?: string
  doctorCRM?: string
  requestingDoctor?: string
  specialty?: string
  authorizationPassword?: string
  apoioNomeEnvio?: string
  guides: any[]
}

const txt = (v: any) => (v === null || v === undefined ? '' : String(v))

/** Guia salva → guia no formato da etapa "Guias e Procedimentos" (mantém todos os campos dos exames). */
export function guiaParaEdicao(g: any, i: number) {
  const nome = g?.name || g?.convenioName || g?.plan || 'GUIA'
  return {
    ...g,
    id: txt(g?.id) || String(i + 1),
    name: nome,
    plan: g?.plan || g?.convenioName || g?.name || '',
    convenioName: g?.convenioName || g?.plan || g?.name || '',
    convenioId: g?.convenioId ?? null,
    operator: g?.operator || '',
    number: txt(g?.number),
    exams: Array.isArray(g?.exams) ? g.exams : [],
  }
}

/** Linha de attendance_orders → estado das etapas do cadastro. */
export function estadoDoPedido(row: any, patient?: any): EstadoEdicao {
  return {
    patient,
    weight: txt(row?.weight),
    height: txt(row?.height),
    isUrgent: !!row?.is_urgent,
    hasFever: !!row?.has_fever,
    fastingSince: row?.is_fasting ? 'Sim' : 'Não',
    fastingStartHour: txt(row?.fasting_start_hour),
    fastingType: txt(row?.fasting_type),
    hospitalId: txt(row?.hospital_id),
    hospitalName: txt(row?.hospital_name),
    hospitalSectorId: txt(row?.hospital_sector_id),
    hospitalSectorName: txt(row?.hospital_sector_name),
    bed: txt(row?.bed),
    medicalRecordNumber: txt(row?.medical_record_number),
    observation: txt(row?.service_observation),
    doctorId: txt(row?.doctor_id),
    doctorName: txt(row?.doctor_name),
    doctorCRM: txt(row?.doctor_crm),
    requestingDoctor: txt(row?.requesting_doctor),
    specialty: txt(row?.specialty),
    authorizationPassword: txt(row?.authorization_password),
    guides: (Array.isArray(row?.lab_guides) ? row.lab_guides : []).map(guiaParaEdicao),
  }
}

const nulo = (v: any) => {
  const s = txt(v).trim()
  return s === '' ? null : s
}

const igual = (a: any, b: any) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

function prazoMaisTarde(guides: any[]): string | null {
  let max: string | null = null
  for (const g of guides || []) for (const e of g?.exams || []) {
    const d = e?.expectedDeliveryDate || e?.deliveryDate
    if (!d) continue
    const t = new Date(d)
    if (isNaN(t.getTime())) continue
    const iso = t.toISOString()
    if (!max || iso > max) max = iso
  }
  return max
}

/** Campos de attendance_orders que mudaram (vazio = nada a salvar). */
export function alteracoesDoPedido(row: any, s: EstadoEdicao): Record<string, any> {
  const jejum = String(s.fastingSince || 'Não').toLowerCase().startsWith('s')
  const novo: Record<string, any> = {
    weight: nulo(s.weight),
    height: nulo(s.height),
    is_urgent: !!s.isUrgent,
    has_fever: !!s.hasFever,
    is_fasting: jejum,
    fasting_start_hour: jejum ? nulo(s.fastingStartHour) : null,
    fasting_type: jejum ? nulo(s.fastingType) : null,
    hospital_id: nulo(s.hospitalId),
    hospital_name: nulo(s.hospitalName),
    hospital_sector_id: nulo(s.hospitalSectorId),
    hospital_sector_name: nulo(s.hospitalSectorName),
    bed: nulo(s.bed),
    medical_record_number: nulo(s.medicalRecordNumber),
    service_observation: nulo(s.observation),
    doctor_id: nulo(s.doctorId),
    doctor_name: nulo(s.doctorName),
    doctor_crm: nulo(s.doctorCRM),
    requesting_doctor: nulo(s.requestingDoctor),
    specialty: nulo(s.specialty),
    authorization_password: nulo(s.authorizationPassword),
  }
  const patch: Record<string, any> = {}
  for (const [k, v] of Object.entries(novo)) {
    const atual = typeof v === 'boolean' ? !!row?.[k] : nulo(row?.[k])
    if (!igual(atual, v)) patch[k] = v
  }
  const guias = s.guides || []
  if (!igual(row?.lab_guides || [], guias)) {
    patch.lab_guides = guias
    const g0 = guias[0]
    const convId = g0?.convenioId ?? null
    const convNome = g0?.convenioName || g0?.name || g0?.plan || null
    if (convId !== (row?.convenio_id ?? null)) patch.convenio_id = convId
    if (convNome && convNome !== row?.convenio_name) patch.convenio_name = convNome
    const prazo = prazoMaisTarde(guias)
    if (prazo && prazo !== (row?.delivery_date ? new Date(row.delivery_date).toISOString() : null)) patch.delivery_date = prazo
  }
  return patch
}

const norm = (v: any) => txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase()
const chaveExame = (e: any) => txt(e?.examId || e?.id)

/**
 * Exames que estavam no pedido, foram tirados na edição e já têm resultado digitado.
 * Esses não podem sair do pedido pela edição (o resultado ficaria sem exame).
 */
export function examesRemovidosComResultado(guiasAntes: any[], guiasDepois: any[], resultados: any[]): string[] {
  const depois = (guiasDepois || []).flatMap((g: any) => g?.exams || [])
  const chavesDepois = new Set(depois.map(chaveExame).filter(Boolean))
  const nomesDepois = new Set(depois.map((e: any) => norm(e?.name)).filter(Boolean))
  const bloqueados: string[] = []
  for (const e of (guiasAntes || []).flatMap((g: any) => g?.exams || [])) {
    const k = chaveExame(e)
    const nome = norm(e?.name)
    if ((k && chavesDepois.has(k)) || (!k && nomesDepois.has(nome))) continue
    const temResultado = (resultados || []).some((r: any) => {
      const ref = txt(r?.exam_ref)
      return (k && (txt(r?.exam_catalog_id) === k || ref === k || ref.endsWith(`:${k}`)))
        || (nome && norm(r?.exam_name) === nome)
        || (e?.code && txt(r?.exam_code) === txt(e.code))
    })
    if (temResultado) bloqueados.push(txt(e?.name) || 'Exame')
  }
  return bloqueados
}
