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

const norm = (v: unknown) => String(v ?? '').trim().toUpperCase()

const COLLECTED_STATUSES = ['collection_done', 'in_analysis', 'validation', 'released', 'completed']
const CANCELLED_STATUSES = ['deleted', 'cancelled']
const ALLOWED_FORMATS = ['BMP', 'PNG', 'JPEG', 'JPG', 'GIF', 'WEBP']
const MAX_IMAGE_BYTES = 2 * 1024 * 1024 // 2MB decodificados

const TUBE_TYPES = ['gel', 'edta', 'citrato', 'urina']

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

const isValidBase64 = (value: string): boolean => {
  if (!value || /[^A-Za-z0-9+/=\r\n]/.test(value)) return false
  try {
    const bytes = Uint8Array.from(atob(value.replace(/\s/g, '')), (c) => c.charCodeAt(0))
    if (bytes.length === 0) return false
    if (bytes.length > MAX_IMAGE_BYTES) return false
    return true
  } catch {
    return false
  }
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

  // ---- 2. Body ----
  let body: any
  try {
    body = await req.json()
  } catch {
    return fail('JSON inválido', 400)
  }

  const idempotencyKey = String(body?.idempotency_key ?? '').trim()
  const sampleBarcode = String(body?.sample_barcode ?? '').trim()
  const equipmentId = String(body?.equipment_id ?? '').trim()
  const itemCode = String(body?.item_code ?? '').trim()
  const label = String(body?.label ?? '').trim() || null
  const imageFormat = norm(body?.image_format)
  const imageBase64 = String(body?.image_base64 ?? '').trim()

  if (!idempotencyKey) return fail('idempotency_key é obrigatório', 400)
  if (!sampleBarcode) return fail('sample_barcode é obrigatório', 400)
  if (!equipmentId) return fail('equipment_id é obrigatório', 400)
  if (!itemCode) return fail('item_code é obrigatório', 400)
  if (!imageFormat) return fail('image_format é obrigatório', 400)
  if (!ALLOWED_FORMATS.includes(imageFormat)) {
    return fail(`image_format="${imageFormat}" não suportado — use: ${ALLOWED_FORMATS.join(', ')}`, 400)
  }
  if (!imageBase64) return fail('image_base64 é obrigatório', 400)
  if (!isValidBase64(imageBase64)) {
    return fail('image_base64 inválido, vazio ou maior que 2MB decodificados', 400)
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
      event_type: 'GRAPHIC',
      entity_type: 'sample',
      entity_id: sampleBarcode,
      // não grava a imagem inteira no log de eventos
      payload: {
        idempotency_key: idempotencyKey,
        sample_barcode: sampleBarcode,
        equipment_id: equipmentId,
        item_code: itemCode,
        label,
        image_format: imageFormat,
        image_bytes: Math.floor(imageBase64.length * 0.75),
      },
      status,
      error_message: errorMessage || null,
    })
  }

  const reject = async (msg: string, status = 422) => {
    console.error(`[receive-instrument-graphic] ${msg}`)
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
    .select('id, protocol, order_number, status, created_at')
    .eq('company_id', companyId)
    .gt('created_at', since)
    .order('created_at', { ascending: false })
    .limit(3000)

  const barcodeUpper = norm(sampleBarcode)

  let order: any = null
  let cancelledMatch: any = null

  for (const o of orders || []) {
    const orderLabel = String(o.order_number || o.protocol || o.id)
    const candidates = new Set<string>([norm(orderLabel), norm(o.protocol), norm(o.order_number)])
    for (let idx = 1; idx <= TUBE_TYPES.length; idx++) {
      const code = buildSampleCode(orderLabel, idx, companySeq)
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
    return reject(`Pedido da amostra sample_barcode=${sampleBarcode} está cancelado/excluído — gráfico não aceito`)
  }
  if (!order) {
    return reject(`Nenhum pedido encontrado com sample_barcode=${sampleBarcode}`)
  }
  if (!COLLECTED_STATUSES.includes(String(order.status))) {
    return reject(
      `Amostra sample_barcode=${sampleBarcode} pertence ao pedido ${order.protocol} que ainda não teve coleta confirmada (status "${order.status}")`,
    )
  }

  // ---- 6. Grava o gráfico ----
  const { data: inserted, error } = await supabase
    .from('lab_result_graphics')
    .insert({
      company_id: companyId,
      order_id: order.id,
      protocol: order.protocol,
      sample_barcode: sampleBarcode,
      equipment_id: equipmentId,
      item_code: itemCode,
      label,
      image_format: imageFormat,
      image_base64: imageBase64,
    })
    .select('id')
    .single()

  if (error || !inserted) {
    return reject(`Falha ao gravar gráfico: ${error?.message || 'erro desconhecido'}`, 500)
  }

  await logEvent('processed')

  return ok({
    graphic_id: inserted.id,
    protocol: order.protocol,
    item_code: itemCode,
  })
})
