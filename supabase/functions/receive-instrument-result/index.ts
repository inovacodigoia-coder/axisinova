import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const norm = (v: unknown) => String(v ?? '').trim().toUpperCase()

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // ---- 1. Autenticação por API Key (hash) ----
  const apiKey = req.headers.get('X-API-Key') || req.headers.get('x-api-key')
  if (!apiKey) return json({ error: 'X-API-Key ausente' }, 401)

  const keyHash = await sha256Hex(apiKey.trim())
  const { data: keyRow } = await supabase
    .from('instrument_integration_keys')
    .select('id, company_id, is_active, revoked_at')
    .eq('key_hash', keyHash)
    .maybeSingle()

  if (!keyRow || !keyRow.is_active || keyRow.revoked_at) {
    return json({ error: 'Chave de integração inválida ou revogada' }, 401)
  }
  const companyId = keyRow.company_id as string

  await supabase
    .from('instrument_integration_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRow.id)

  // ---- 2. Body ----
  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ error: 'JSON inválido' }, 400)
  }

  const idempotencyKey = String(body?.idempotency_key || '').trim()
  const eventType = String(body?.event_type || '').trim()
  const payload = body?.payload || {}

  if (!idempotencyKey) return json({ error: 'idempotency_key é obrigatório' }, 400)

  // ---- 3. Idempotência ----
  const { data: existingEvent } = await supabase
    .from('instrument_events')
    .select('id, status')
    .eq('company_id', companyId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()

  if (existingEvent) {
    return json({ status: 'duplicate', message: 'Evento já processado', event_id: existingEvent.id }, 200)
  }

  const logEvent = async (status: string, errorMessage?: string) => {
    await supabase.from('instrument_events').insert({
      company_id: companyId,
      idempotency_key: idempotencyKey,
      event_type: eventType || 'UNKNOWN',
      entity_type: body?.entity_type || null,
      entity_id: body?.entity_id ? String(body.entity_id) : null,
      payload: body ?? {},
      status,
      error_message: errorMessage || null,
    })
  }

  // ---- 4. Eventos não suportados: ignora com segurança ----
  if (eventType !== 'RESULT_READY') {
    console.log(`[receive-instrument-result] evento ignorado: ${eventType}`)
    await logEvent('ignored', `Tipo de evento não suportado: ${eventType}`)
    return json({ status: 'ignored', message: `Evento ${eventType} ignorado` }, 200)
  }

  const sampleId = String(payload?.sample_id || '').trim()
  const testCode = norm(payload?.test_code)
  const instrumentCode = String(payload?.instrument_code || '').trim()

  if (!sampleId || !testCode || !instrumentCode) {
    await logEvent('error', 'payload incompleto (sample_id, test_code, instrument_code)')
    return json({ error: 'payload incompleto: sample_id, test_code e instrument_code são obrigatórios' }, 400)
  }

  // ---- 5. Equipamento (Identificador = serial_number) ----
  const { data: equipments } = await supabase
    .from('lab_equipments')
    .select('id, name, serial_number, is_active')
    .eq('company_id', companyId)

  const equipment = (equipments || []).find((e) => norm(e.serial_number) === norm(instrumentCode))
  if (!equipment) {
    const msg = `Equipamento com identificador "${instrumentCode}" não encontrado neste laboratório`
    console.error(`[receive-instrument-result] ${msg}`)
    await logEvent('error', msg)
    return json({ error: msg }, 422)
  }

  // ---- 6. Exame + parâmetro pelo código no equipamento ----
  const { data: catalog } = await supabase
    .from('exams')
    .select('id, name, internal_code, parameters, interfacing_config, interfacing_parameters, measurement_unit')
    .eq('company_id', companyId)

  let matchedExam: any = null
  let matchedParamId: string | null = null
  let matchedParamName: string | null = null
  let matchedParamUnit: string | null = null

  for (const exam of catalog || []) {
    const params: any[] = Array.isArray(exam.parameters) ? exam.parameters : []
    const mapping: any[] = Array.isArray(exam.interfacing_parameters) ? exam.interfacing_parameters : []

    const mapped = mapping.find((m: any) => norm(m?.machineCode) === testCode)
    if (mapped) {
      const p = params.find((pp: any) => norm(pp?.name) === norm(mapped.parameterName))
      matchedExam = exam
      matchedParamId = p ? String(p.id) : '1'
      matchedParamName = p?.name || mapped.parameterName || exam.name
      matchedParamUnit = p?.unit || exam.measurement_unit || null
      break
    }

    const byParam = params.find(
      (p: any) => norm(p?.equipCode) === testCode || norm(p?.equipment_code) === testCode,
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
      norm(exam.internal_code) === testCode
    ) {
      const first = params.find((p: any) => !p?.isHidden && !p?.is_hidden)
      matchedExam = exam
      matchedParamId = first ? String(first.id) : '1'
      matchedParamName = first?.name || exam.name
      matchedParamUnit = first?.unit || exam.measurement_unit || null
      break
    }
  }

  if (!matchedExam) {
    const msg = `Nenhum exame/parâmetro mapeado para o código "${testCode}" (verifique Interfaceamento > Mapeamento de Parâmetros)`
    console.error(`[receive-instrument-result] ${msg}`)
    await logEvent('error', msg)
    return json({ error: msg }, 422)
  }

  // ---- 7. Pedido/amostra ----
  const sampleParts = sampleId.split('-')
  const candidates = Array.from(
    new Set([sampleId, sampleParts.slice(0, 2).join('-'), sampleParts[0]].filter(Boolean)),
  )

  const { data: orders } = await supabase
    .from('attendance_orders')
    .select('id, protocol, order_number, status, patient_id, patient_name, lab_guides')
    .eq('company_id', companyId)
    .or(
      candidates
        .map((c) => `protocol.eq.${c},order_number.eq.${c}`)
        .join(','),
    )
    .order('created_at', { ascending: false })

  let order: any = null
  let orderExam: any = null

  for (const o of orders || []) {
    const guides: any[] = Array.isArray(o.lab_guides) ? o.lab_guides : []
    for (const g of guides) {
      const found = (g?.exams || []).find((e: any) => String(e?.id) === String(matchedExam.id))
      if (found) {
        order = o
        orderExam = found
        break
      }
    }
    if (order) break
  }

  if (!order || !orderExam) {
    const msg = `Amostra "${sampleId}" não encontrada ou não contém o exame "${matchedExam.name}"`
    console.error(`[receive-instrument-result] ${msg}`)
    await logEvent('error', msg)
    return json({ error: msg }, 422)
  }

  // ---- 8. Grava o resultado (pendente de liberação) ----
  const examRef = `${order.id}:${matchedExam.id}`
  const nowIso = new Date().toISOString()

  const { data: existingResult } = await supabase
    .from('lab_exam_results')
    .select('id, status')
    .eq('company_id', companyId)
    .eq('exam_ref', examRef)
    .maybeSingle()

  if (existingResult?.status === 'released') {
    const msg = 'Exame já liberado — resultado do equipamento ignorado'
    await logEvent('ignored', msg)
    return json({ status: 'ignored', message: msg }, 200)
  }

  let resultId = existingResult?.id as string | undefined
  const resultPayload = {
    company_id: companyId,
    order_id: order.id,
    protocol: order.protocol,
    exam_ref: examRef,
    exam_catalog_id: matchedExam.id,
    exam_code: orderExam.internalCode || matchedExam.internal_code || null,
    exam_name: matchedExam.name,
    patient_id: order.patient_id,
    patient_name: order.patient_name,
    status: 'digitized',
    typed_at: nowIso,
  }

  if (resultId) {
    const { error } = await supabase.from('lab_exam_results').update(resultPayload).eq('id', resultId)
    if (error) {
      console.error('[receive-instrument-result] erro ao atualizar resultado', error)
      await logEvent('error', error.message)
      return json({ error: error.message }, 500)
    }
  } else {
    const { data: inserted, error } = await supabase
      .from('lab_exam_results')
      .insert(resultPayload)
      .select('id')
      .single()
    if (error || !inserted) {
      const msg = error?.message || 'Falha ao gravar resultado'
      console.error('[receive-instrument-result] erro ao gravar resultado', error)
      await logEvent('error', msg)
      return json({ error: msg }, 500)
    }
    resultId = inserted.id
  }

  const flag = String(payload?.flag || '').trim().toUpperCase()
  const statusLabel = flag === 'N' || flag === '' ? 'Normal' : flag === 'L' ? 'Baixo' : flag === 'H' ? 'Alto' : flag

  const valuePayload = {
    company_id: companyId,
    result_id: resultId!,
    parameter_key: matchedParamId,
    parameter_name: matchedParamName,
    value: String(payload?.value ?? ''),
    unit: payload?.unit || matchedParamUnit,
    reference: payload?.reference_range || null,
    status: statusLabel || null,
    source: 'instrument',
    instrument_code: instrumentCode,
    flag: flag || null,
    result_datetime: payload?.result_datetime || nowIso,
  }

  const { data: existingValue } = await supabase
    .from('lab_result_values')
    .select('id')
    .eq('result_id', resultId!)
    .eq('parameter_key', matchedParamId)
    .maybeSingle()

  const { error: valueError } = existingValue
    ? await supabase.from('lab_result_values').update(valuePayload).eq('id', existingValue.id)
    : await supabase.from('lab_result_values').insert(valuePayload)

  if (valueError) {
    console.error('[receive-instrument-result] erro ao gravar valor', valueError)
    await logEvent('error', valueError.message)
    return json({ error: valueError.message }, 500)
  }

  if (order.status === 'collection_done' || order.status === 'waiting_collection') {
    await supabase.from('attendance_orders').update({ status: 'in_analysis' }).eq('id', order.id)
  }

  await logEvent('processed')

  return json({
    status: 'processed',
    result_id: resultId!,
    exam: matchedExam.name,
    parameter: matchedParamName,
    protocol: order.protocol,
  })
})
