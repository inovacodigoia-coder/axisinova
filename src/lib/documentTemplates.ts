import DOMPurify from 'dompurify'
export interface DocumentTemplate {
  id: string; company_id: string | null; name: string; type: string; body_html: string;
  default_format: string; signature_mode: string; is_active: boolean; is_system_default: boolean; source_template_id: string | null
}
export const documentFields = {
  Paciente: ['paciente_nome','paciente_data_nascimento','paciente_idade','paciente_sexo','paciente_cpf','paciente_rg','paciente_telefone','paciente_endereco','responsavel_nome','responsavel_cpf'],
  Atendimento: ['atendimento_codigo','atendimento_data','atendimento_hora','atendimento_hora_inicio','atendimento_hora_fim','convenio','medico_solicitante','unidade_origem','lista_exames'],
  Empresa: ['empresa_nome','empresa_cnpj','empresa_cidade','empresa_uf','responsavel_tecnico_nome','responsavel_tecnico_registro'],
  Emissão: ['data_extenso','dia_semana','data_impressao','hora_impressao','local_data_extenso'],
}
export const fieldNames = Object.values(documentFields).flat()
export function effectiveTemplates(rows: DocumentTemplate[]) {
  const replaced = new Set(rows.filter(r => r.company_id).map(r => r.source_template_id))
  return rows.filter(r => !r.is_system_default || !replaced.has(r.id))
}
export function sanitizeDocument(html: string) {
  const clean = DOMPurify.sanitize(html, { ALLOWED_TAGS: ['p','h1','h2','h3','strong','b','em','i','u','ul','ol','li','br','span'], ALLOWED_ATTR: ['style'], ALLOW_DATA_ATTR: false, ALLOW_ARIA_ATTR: false })
  const doc = new DOMParser().parseFromString(clean, 'text/html')
  doc.querySelectorAll('[style]').forEach(el => {
    const declarations = (el.getAttribute('style') || '').split(';').map(s => s.trim()).filter(s => /^(text-align: (left|right|center|justify)|font-size: (8|9|10|11|12|14|16|18|20|24|28|32)pt)$/.test(s))
    if (declarations.length) el.setAttribute('style', declarations.join('; ') + ';'); else el.removeAttribute('style')
  })
  return doc.body.innerHTML
}
export function validateDocument(html: string) {
  const unknown = [...html.matchAll(/\{\{([^{}]+)\}\}/g)].map(m => m[1]).filter(k => !fieldNames.includes(k))
  if (unknown.length) throw new Error(`Campo {{${unknown[0]}}} não existe`)
  if (html.length > 100000 || !html.replace(/<[^>]*>/g,'').trim()) throw new Error('Informe o texto do documento (até 100.000 caracteres)')
}
export function renderDocument(html: string, values: Record<string,string>) {
  const escape = (v: string) => v.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] || c))
  return sanitizeDocument(sanitizeDocument(html).replace(/\{\{([^{}]+)\}\}/g, (_,k) => escape(values[k]?.trim() || '______')))
}
export function documentValues(order: Record<string,any>, patient: Record<string,any>, company: Record<string,any>, settings: Record<string,any>, now = new Date()): Record<string,string> {
  const date = (v: string) => { if (!v) return ''; const d = new Date(v.length === 10 ? v+'T12:00:00-03:00' : v); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}) }
  const time = (v: string) => v && !Number.isNaN(new Date(v).getTime()) ? new Date(v).toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'}) : ''
  const emission = now.toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo',day:'numeric',month:'long',year:'numeric'})
  const weekday = now.toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo',weekday:'long'})
  const birth = patient.birth_date; const today = now.toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'})
  const age = birth ? Number(today.slice(0,4))-Number(birth.slice(0,4))-(today.slice(5)<birth.slice(5) ? 1 : 0) : ''
  const responsible = patient.responsible || {}; const address = patient.address_data || {}
  const exams = (order.lab_guides || []).flatMap((g: any) => g.exams || [])
  return {
    paciente_nome:patient.name || order.patient_name || '', paciente_data_nascimento:date(birth), paciente_idade:age === '' ? '' : `${age} anos`, paciente_sexo:({male:'Masculino',female:'Feminino',M:'Masculino',F:'Feminino',other:'Outro',not_informed:''} as Record<string,string>)[patient.gender] || '', paciente_cpf:patient.cpf || '', paciente_rg:patient.rg || '', paciente_telefone:patient.phone || '', paciente_endereco:[address.street,address.number,address.complement,address.neighborhood,address.city,address.state].filter(Boolean).join(', ') || patient.address || '', responsavel_nome:responsible.name || responsible.fullName || '', responsavel_cpf:responsible.cpf || '',
    atendimento_codigo:order.order_number || order.protocol || '', atendimento_data:date(order.created_at), atendimento_hora:time(order.created_at), atendimento_hora_inicio:time(order.started_at), atendimento_hora_fim:time(order.finished_at), convenio:order.convenio_name || '', medico_solicitante:order.requesting_doctor || order.doctor_name || '', unidade_origem:order.origin_name || '', lista_exames:exams.map((e:any) => [e.code,e.name].filter(Boolean).join(' — ')).join('; '),
    empresa_nome:company.nome_fantasia || company.name || '', empresa_cnpj:company.cnpj || '', empresa_cidade:company.cidade || '', empresa_uf:company.estado || '', responsavel_tecnico_nome:settings.signature_name || settings.responsible_name || '', responsavel_tecnico_registro:settings.signature_register || settings.responsible_register || '', data_extenso:emission, dia_semana:weekday, data_impressao:date(now.toISOString()), hora_impressao:time(now.toISOString()), local_data_extenso:`${company.cidade || '______'}, ${weekday}, ${emission}`,
  }
}
export const exampleDocumentValues = documentValues({order_number:'EXEMPLO',created_at:'2026-10-30T11:42:00Z',started_at:'2026-10-30T11:42:00Z',finished_at:'2026-10-30T13:15:00Z',lab_guides:[{exams:[{code:'HEM',name:'Hemograma'}]}]}, {name:'PACIENTE DE EXEMPLO',birth_date:'1990-05-15'}, {name:'LABORATÓRIO DE EXEMPLO',cidade:'TOUROS',estado:'RN'}, {signature_name:'RESPONSÁVEL DE EXEMPLO'},new Date('2026-10-30T15:00:00Z'))