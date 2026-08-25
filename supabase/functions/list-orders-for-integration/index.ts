import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Status considerados "coletados" (a amostra já existe fisicamente)
const COLLECTED_STATUSES = ['collection_done', 'in_analysis', 'validation', 'released', 'completed']
const CANCELLED_STATUSES = ['deleted', 'cancelled']

const normalizeSex = (g: unknown): string | null => {
  const v = String(g ?? '').trim().toLowerCase()
  if (!v) return null
  if (v.startsWith('m')) return 'M'
  if (v.startsWith('f')) return 'F'
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'GET') return json({ error: 'Método não permitido' }, 405)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // ---- 1. Autenticação por API Key ----
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

  supabase
    .from('instrument_integration_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRow.id)
    .then(() => {})

  // ---- 2. Janela de tempo ----
  const url = new URL(req.url)
  const sinceParam = url.searchParams.get('since')
  let since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  if (sinceParam) {
    const parsed = new Date(sinceParam)
    if (isNaN(parsed.getTime())) return json({ error: 'Parâmetro "since" inválido (use ISO 8601)' }, 400)
    since = parsed
  }
  const limit = Math.min(1000, Math.max(1, parseInt(url.searchParams.get('limit') || '500', 10) || 500))

  // ---- 3. Pedidos alterados depois de `since` ----
  const { data: orders, error } = await supabase
    .from('attendance_orders')
    .select('id, order_number, protocol, status, patient_id, patient_name, lab_guides, updated_at, created_at')
    .eq('company_id', companyId)
    .in('status', [...COLLECTED_STATUSES, ...CANCELLED_STATUSES])
    .gt('updated_at', since.toISOString())
    .order('updated_at', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('[list-orders-for-integration] erro ao ler pedidos:', error.message)
    return json({ error: 'Não foi possível ler os pedidos' }, 500)
  }

  // ---- 4. Dados de paciente ----
  const patientIds = [...new Set((orders || []).map((o: any) => o.patient_id).filter(Boolean))]
  const patientMap = new Map<string, any>()
  if (patientIds.length) {
    const { data: patients } = await supabase
      .from('patients')
      .select('id, name, birth_date, gender, cpf, sequence_id')
      .in('id', patientIds)
    for (const p of patients || []) patientMap.set(String(p.id), p)
  }

  const out: any[] = []

  for (const o of orders || []) {
    const cancelled = CANCELLED_STATUSES.includes(String(o.status))
    const guides: any[] = Array.isArray(o.lab_guides) ? o.lab_guides : []

    const exams: any[] = []
    let collectedAt: string | null = null

    for (const g of guides) {
      const list: any[] = Array.isArray(g?.exams) ? g.exams : []
      for (const e of list) {
        const isCollected = e?.collected === true || !!e?.collectedAt
        if (!cancelled && !isCollected) continue
        const code = String(e?.internalCode || e?.tussCode || e?.code || e?.id || '').trim()
        if (!code) continue
        exams.push({
          code,
          material: e?.material ?? e?.defaultMaterial ?? null,
        })
        const at = e?.collectedAt ? new Date(e.collectedAt) : null
        if (at && !isNaN(at.getTime())) {
          const iso = at.toISOString()
          if (!collectedAt || iso < collectedAt) collectedAt = iso
        }
      }
    }

    // Pedido não cancelado e sem nenhuma amostra coletada → não interessa ainda
    if (!cancelled && exams.length === 0) continue

    const p = o.patient_id ? patientMap.get(String(o.patient_id)) : null

    out.push({
      label: String(o.order_number || o.protocol || o.id),
      status: cancelled ? 'cancelled' : 'collected',
      collected_at: cancelled ? null : collectedAt,
      patient_ref: p ? String(p.sequence_id ?? p.id) : null,
      patient_name: o.patient_name ?? p?.name ?? null,
      patient_birth_date: p?.birth_date ?? null,
      patient_sex: normalizeSex(p?.gender),
      exams: cancelled ? [] : exams,
    })
  }

  return json({ orders: out })
})
