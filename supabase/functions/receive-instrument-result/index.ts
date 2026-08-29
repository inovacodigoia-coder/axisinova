import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const ok = (extra: Record<string, unknown> = {}) => json({ success: true, ...extra }, 200)
const fail = (error: string, status = 422) => json({ success: false, error }, status)

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const norm = (v: unknown) => String(v ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toUpperCase()

const COLLECTED_STATUSES = ['collection_done', 'in_analysis', 'validation', 'released', 'completed']
const CANCELLED_STATUSES = ['deleted', 'cancelled']

const TUBE_TYPES = ['gel', 'edta', 'citrato', 'urina']

const tubeTypeForMaterial = (material: unknown): string => {
  const m = String(material ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim()
  if (!m) return 'gel'
  if (m.includes('urina') || m.includes('frasco')) return 'urina'
  if (m.includes('edta') || m.includes('sangue total') || m.includes('hemograma')) return 'edta'
  if (m.includes('citrat') || m.includes('coagulacao')) return 'citrato'
  if (m.includes('plasma')) return 'citrato'
  if (m.includes('soro') || m.includes('gel') || m.includes('sangue')) return 'gel'
  return 'gel'
}

const buildSampleCode = (protocol: string, tubeIndex: number, companySequenceId?: number | null) => {
  const base = `${String(protocol || '').trim()}-${tubeIndex}`
  return companySequenceId ? `${base}-${companySequenceId}` : base
}

const generateSampleHash = (sampleCode: string): string => {
  const input = String(sampleCode || '').toUpperCase()
  if (!input) return ''
  const fnv = (seed: number) => {
    let h = seed >>> 0
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i)
      h = Math.imul(h, 0x01000193) >>> 0
    }
    return h >>> 0
  }
  const a = fnv(0x811c9dc5)
  const b = fnv(0x9e3779b9)
  const raw = (a.toString(36) + b.toString(36)).toUpperCase().replace(/[^A-Z0-9]/g, '')
  return (raw + '000000000').slice(0, 9)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return fail('Método não permitido: use POST', 405)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // ---- 1. Autenticação por API Key ----
  const apiKey = req.headers.get('X-API-Key') || req.headers.get('x-api-key')
  if (!apiKey) return fail('X-API-Key ausente', 401)

  const keyHash = await sha256Hex(apiKey.trim())
  const { data: keyRow } = await supabase
    .from('instrument_integration_keys')
    .select('id, company_id, is_active, revoked_at')
    .eq('key_hash', keyHash)
    .maybeSingle()

  if (!keyRow || !keyRow.is_active || keyRow.revoked_at) {
    return fail('Chave de integração inválida ou revogada', 401)
  }
  const companyId = keyRow.company_id as string

  await supabase
    .from('instrument_integration_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRow.id)

  // ---- 2. Body (contrato plano; aceita nomes legados) ----
  let body: any
  try {
    body = await req.json()
  } catch {
    return fail('JSON inválido', 400)
  }

  const p = body?.payload && typeof body.payload === 'object' ? { ...body.payload, ...body } : body || {}

  const idempotencyKey = String(p.idempotency_key ?? '').trim()
  const sampleBarcode = String(p.sample_barcode ?? p.sample_id ?? p.sample_code ?? '').trim()
  const equipmentId = String(p.equipment_id ?? p.instrument_code ?? p.equipment ?? '').trim()
  const testCode = norm(p.test_code ?? p.code)
  const rawValue = p.value

  if (!idempotencyKey) return fail('idempotency_key é obrigatório', 400)
  if (!sampleBarcode) return fail('sample_barcode é obrigatório', 400)
  if (!equipmentId) return fail('equipment_id é obrigatório', 400)
  if (!testCode) return fail('test_code é obrigatório', 400)
  if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') {
    return fail('value é obrigatório', 400)
  }

  // ---- 3. Idempotência ----
  const { data: existingEvent } = await supabase
    .from('instrument_events')
    .select('id, status, error_message')
    .eq('company_id', companyId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()

  if (existingEvent) {
    if (existingEvent.status === 'processed') {
      return ok({ duplicate: true, message: 'Evento já processado anteriormente', event_id: existingEvent.id })
    }
    return fail(
      `Evento com este idempotency_key já foi recebido e falhou: ${existingEvent.error_message || 'erro anterior'}. Use uma nova idempotency_key para reenviar.`,
      409,
    )
  }

  const logEvent = async (status: string, errorMessage?: string) => {
    await supabase.from('instrument_events').insert({
      company_id: companyId,
      idempotency_key: idempotencyKey,
      event_type: 'RESULT_READY',
      entity_type: 'sample',
      entity_id: sampleBarcode,
      payload: body ?? {},
      status,
      error_message: errorMessage || null,
    })
  }

  const reject = async (msg: string, status = 422) => {
    console.error(`[receive-instrument-result] ${msg}`)
    await logEvent('error', msg)
    return fail(msg, status)
  }

  // ---- 4. Equipamento (serial_number = identificador de interface) ----
  const { data: equipments } = await supabase
    .from('lab_equipments')
    .select('id, name, serial_number, is_active')
    .eq('company_id', companyId)

  const equipment = (equipments || []).find((e) => norm(e.serial_number) === norm(equipmentId))
  if (!equipment) {
    return reject(`Nenhum equipamento cadastrado com equipment_id="${equipmentId}" nesta empresa`)
  }
  if (equipment.is_active === false) {
    return reject(`Equipamento "${equipment.name}" está inativo`)
  }

  // ---- 5. Pedido/amostra pelo sample_barcode ----
  const { data: company } = await supabase
    .from('companies')
    .select('sequence_id')
    .eq('id', companyId)
    .maybeSingle()
  const companySeq = (company?.sequence_id ?? null) as number | null

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const { data: orders } = await supabase
    .from('attendance_orders')
    .select('id, protocol, order_number, status, patient_id, patient_name, lab_guides, created_at')
    .eq('company_id', companyId)
    .gt('created_at', since)
    .order('created_at', { ascending: false })
    .limit(3000)

  const barcodeUpper = norm(sampleBarcode)

  let order: any = null
  let cancelledMatch: any = null

  for (const o of orders || []) {
    const label = String(o.order_number || o.protocol || o.id)
    const candidates = new Set<string>([norm(label), norm(o.protocol), norm(o.order_number)])
    for (let idx = 1; idx <= TUBE_TYPES.length; idx++) {
      const code = buildSampleCode(label, idx, companySeq)
      candidates.add(norm(code))
      candidates.add(norm(generateSampleHash(code)))
    }
    if (!candidates.has(barcodeUpper)) continue
    if (CANCELLED_STATUSES.includes(String(o.status))) {
      cancelledMatch = o
      continue
    }
    order = o
    break
  }

  if (!order && cancelledMatch) {
    return reject(`Pedido da amostra sample_barcode=${sampleBarcode} está cancelado/excluído — resultado não aceito`)
  }
  if (!order) {
    return reject(`Nenhum pedido encontrado com sample_barcode=${sampleBarcode}`)
  }
  if (!COLLECTED_STATUSES.includes(String(order.status))) {
    return reject(
      `Amostra sample_barcode=${sampleBarcode} pertence ao pedido ${order.protocol} que ainda não teve coleta confirmada (status "${order.status}")`,
    )
  }

  // ---- 6. Exame/parâmetro do pedido pelo test_code ----
  const { data: catalog } = await supabase
    .from('exams')
    .select('id, name, internal_code, tuss_code, parameters, interfacing_config, interfacing_parameters, measurement_unit')
    .eq('company_id', companyId)

  const guides: any[] = Array.isArray(order.lab_guides) ? order.lab_guides : []
  const orderExamIds = new Set<string>()
  const orderExamByCatalogId = new Map<string, any>()
  for (const g of guides) {
    for (const e of g?.exams || []) {
      if (e?.id) {
        orderExamIds.add(String(e.id))
        orderExamByCatalogId.set(String(e.id), e)
      }
    }
  }

  let matchedExam: any = null
  let matchedParamId: string | null = null
  let matchedParamName: string | null = null
  let matchedParamUnit: string | null = null

  for (const exam of catalog || []) {
    if (!orderExamIds.has(String(exam.id))) continue
    const params: any[] = Array.isArray(exam.parameters) ? exam.parameters : []
    const mapping: any[] = Array.isArray(exam.interfacing_parameters) ? exam.interfacing_parameters : []

    const mapped = mapping.find((m: any) => norm(m?.machineCode) === testCode)
    if (mapped) {
      const pp = params.find((x: any) => norm(x?.name) === norm(mapped.parameterName))
      matchedExam = exam
      matchedParamId = pp ? String(pp.id) : '1'
      matchedParamName = pp?.name || mapped.parameterName || exam.name
      matchedParamUnit = pp?.unit || exam.measurement_unit || null
      break
    }

    const byParam = params.find(
      (x: any) => norm(x?.equipCode) === testCode || norm(x?.equipment_code) === testCode || norm(x?.internalCode) === testCode,
    )
    if (byParam) {
      matchedExam = exam
      matchedParamId = String(byParam.id)
      matchedParamName = byParam.name || exam.name
      matchedParamUnit = byParam.unit || exam.measurement_unit || null
      break
    }

    if (
      norm((exam.interfacing_config as any)?.equipmentCode) === testCode ||
      norm(exam.internal_code) === testCode ||
      norm(exam.tuss_code) === testCode
    ) {
      const visibleParams = params.filter((x: any) => !x?.isHidden && !x?.is_hidden)
      // Um código no nível do exame só identifica o valor quando há um único
      // parâmetro. Em painéis, escolher o primeiro faria analitos distintos se
      // sobrescreverem sob a mesma parameter_key.
      if (visibleParams.length > 1) continue
      const first = visibleParams[0]
      matchedExam = exam
      matchedParamId = first ? String(first.id) : '1'
      matchedParamName = first?.name || exam.name
      matchedParamUnit = first?.unit || exam.measurement_unit || null
      break
    }
  }

  if (!matchedExam) {
    return reject(
      `test_code="${testCode}" não corresponde a nenhum exame/parâmetro do pedido ${order.protocol} (verifique Interfaceamento > Mapeamento de Parâmetros)`,
    )
  }

  const orderExam = orderExamByCatalogId.get(String(matchedExam.id))

  // ---- 7. Grava o resultado (pendente de liberação) ----
  const examRef = `${order.id}:${matchedExam.id}`
  const nowIso = new Date().toISOString()

  const { data: existingResult } = await supabase
    .from('lab_exam_results')
    .select('id, status')
    .eq('company_id', companyId)
    .eq('exam_ref', examRef)
    .maybeSingle()

  if (existingResult?.status === 'released') {
    const msg = `Exame "${matchedExam.name}" já foi liberado — resultado do equipamento não foi gravado`
    await logEvent('ignored', msg)
    return fail(msg, 409)
  }

  let resultId = existingResult?.id as string | undefined
  const resultPayload = {
    company_id: companyId,
    order_id: order.id,
    protocol: order.protocol,
    exam_ref: examRef,
    exam_catalog_id: matchedExam.id,
    exam_code: orderExam?.internalCode || matchedExam.internal_code || null,
    exam_name: matchedExam.name,
    patient_id: order.patient_id,
    patient_name: order.patient_name,
    status: 'digitized',
    typed_at: nowIso,
  }

  if (resultId) {
    const { error } = await supabase.from('lab_exam_results').update(resultPayload).eq('id', resultId)
    if (error) return reject(`Falha ao atualizar resultado: ${error.message}`, 500)
  } else {
    const { data: inserted, error } = await supabase
      .from('lab_exam_results')
      .insert(resultPayload)
      .select('id')
      .single()
    if (error || !inserted) return reject(`Falha ao gravar resultado: ${error?.message || 'erro desconhecido'}`, 500)
    resultId = inserted.id
  }

  const flag = String(p.flag ?? '').trim().toUpperCase()
  const statusLabel = flag === '' || flag === 'N' ? 'Normal' : flag === 'L' ? 'Baixo' : flag === 'H' ? 'Alto' : flag

  const valuePayload = {
    company_id: companyId,
    result_id: resultId!,
    parameter_key: matchedParamId,
    parameter_name: matchedParamName,
    value: String(rawValue),
    unit: p.unit || matchedParamUnit,
    reference: p.reference_range || null,
    status: statusLabel || null,
    source: 'instrument',
    instrument_code: equipmentId,
    flag: flag || null,
    result_datetime: p.result_datetime || nowIso,
  }

  const { data: existingValue } = await supabase
    .from('lab_result_values')
    .select('id')
    .eq('result_id', resultId!)
    .eq('parameter_key', matchedParamId)
    .maybeSingle()

  let parameterResultId = existingValue?.id as string | undefined
  let valueError: { message: string } | null = null

  if (parameterResultId) {
    const { error } = await supabase
      .from('lab_result_values')
      .update(valuePayload)
      .eq('id', parameterResultId)
    valueError = error
  } else {
    const { data: insertedValue, error } = await supabase
      .from('lab_result_values')
      .insert(valuePayload)
      .select('id')
      .single()
    valueError = error
    parameterResultId = insertedValue?.id
  }

  if (valueError || !parameterResultId) {
    return reject(`Falha ao gravar valor: ${valueError?.message || 'registro do parâmetro não retornado'}`, 500)
  }

  if (order.status === 'collection_done') {
    await supabase.from('attendance_orders').update({ status: 'in_analysis' }).eq('id', order.id)
  }

  await logEvent('processed')

  return ok({
    result_id: resultId!,
    parameter_result_id: parameterResultId,
    parameter_key: matchedParamId,
    protocol: order.protocol,
    exam: matchedExam.name,
    parameter: matchedParamName,
  })
})
