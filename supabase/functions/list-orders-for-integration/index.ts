import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { authenticateIntegration } from '../_shared/integrationAuth.ts'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

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

// ---- Tubos (mesma regra do front: src/types/lab.types.ts + AttendanceDetailsModal) ----
const TUBE_TYPES = [
  { type: 'gel', label: 'Soro (gel separador)' },
  { type: 'edta', label: 'Sangue total EDTA' },
  { type: 'citrato', label: 'Plasma citratado' },
  { type: 'urina', label: 'Urina' },
]

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

/** Código da amostra: <pedido>-<tubo>-<idEmpresa> (igual ao front) */
const buildSampleCode = (protocol: string, tubeIndex: number, companySequenceId?: number | null) => {
  const base = `${String(protocol || '').trim()}-${tubeIndex}`
  return companySequenceId ? `${base}-${companySequenceId}` : base
}

/** Hash determinístico de 9 chars por amostra — é o código de barras impresso na etiqueta */
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
  if (req.method !== 'GET') return json({ error: 'Método não permitido' }, 405)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // ---- 1. Autenticação: OAuth2 (Bearer) ou API Key legada ----
  const auth = await authenticateIntegration(req, supabase, 'orders:read')
  if (!auth.ok) return json({ error: auth.error }, auth.status)
  const companyId = auth.companyId

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

  // ---- 3. Empresa (sequence_id compõe o código da amostra) ----
  const { data: company } = await supabase
    .from('companies')
    .select('sequence_id')
    .eq('id', companyId)
    .maybeSingle()
  const companySeq = (company?.sequence_id ?? null) as number | null

  // ---- 4. Pedidos alterados depois de `since` ----
  // O filtro `since` deve considerar o horário do EVENTO (coleta ou cancelamento),
  // não a criação do pedido. O trigger update_attendance_orders_updated_at garante
  // que updated_at acompanha qualquer alteração (inclusive coleta), e o filtro
  // fino abaixo (eventTime > since) usa o collected_at real das amostras.
  const { data: orders, error } = await supabase
    .from('attendance_orders')
    .select('id, order_number, protocol, status, patient_id, patient_name, lab_guides, updated_at, created_at')
    .eq('company_id', companyId)
    .in('status', [...COLLECTED_STATUSES, ...CANCELLED_STATUSES])
    .gt('updated_at', since.toISOString())
    .order('updated_at', { ascending: true })
    .limit(limit)

  /** Momento do evento relevante: última coleta registrada (ou updated_at p/ cancelados) */
  const orderEventTime = (o: any): number => {
    const updated = new Date(o.updated_at || o.created_at || 0).getTime()
    if (CANCELLED_STATUSES.includes(String(o.status))) return updated
    let latest = 0
    const guides: any[] = Array.isArray(o.lab_guides) ? o.lab_guides : []
    for (const g of guides) {
      for (const e of Array.isArray(g?.exams) ? g.exams : []) {
        const t = e?.collectedAt ? new Date(e.collectedAt).getTime() : 0
        if (!isNaN(t) && t > latest) latest = t
      }
    }
    return latest || updated
  }

  if (error) {
    console.error('[list-orders-for-integration] erro ao ler pedidos:', error.message)
    return json({ error: 'Não foi possível ler os pedidos' }, 500)
  }

  // ---- 5. Dados de paciente ----
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
    // Filtro fino: só devolve se o EVENTO (coleta/cancelamento) ocorreu depois de `since`
    if (orderEventTime(o) <= since.getTime()) continue
    const orderLabel = String(o.order_number || o.protocol || o.id)
    const cancelled = CANCELLED_STATUSES.includes(String(o.status))
    const p = o.patient_id ? patientMap.get(String(o.patient_id)) : null

    const base = {
      order_label: orderLabel,
      patient_ref: p ? String(p.sequence_id ?? p.id) : null,
      patient_name: o.patient_name ?? p?.name ?? null,
      patient_birth_date: p?.birth_date ?? null,
      patient_sex: normalizeSex(p?.gender),
    }

    if (cancelled) {
      out.push({ ...base, status: 'cancelled', samples: [] })
      continue
    }

    // Exames coletados agrupados por tipo de tubo
    const guides: any[] = Array.isArray(o.lab_guides) ? o.lab_guides : []
    const byTube = new Map<string, { exams: any[]; collectedAt: string | null }>()

    for (const g of guides) {
      const list: any[] = Array.isArray(g?.exams) ? g.exams : []
      for (const e of list) {
        const code = String(e?.internalCode || e?.tussCode || e?.code || e?.id || '').trim()
        if (!code) continue
        const material = e?.material ?? e?.defaultMaterial ?? null
        const type = tubeTypeForMaterial(material)
        if (!byTube.has(type)) byTube.set(type, { exams: [], collectedAt: null })
        const bucket = byTube.get(type)!
        const isCollected = e?.collected === true || !!e?.collectedAt
        bucket.exams.push({ code, material, collected: isCollected })
        const at = e?.collectedAt ? new Date(e.collectedAt) : null
        if (at && !isNaN(at.getTime())) {
          const iso = at.toISOString()
          if (!bucket.collectedAt || iso < bucket.collectedAt) bucket.collectedAt = iso
        }
      }
    }

    // Índice do tubo segue a mesma ordem usada na impressão das etiquetas
    const presentTypes = TUBE_TYPES.filter((t) => byTube.has(t.type))
    const tubes = presentTypes.length ? presentTypes : []

    const samples: any[] = []
    tubes.forEach((tube, idx) => {
      const bucket = byTube.get(tube.type)!
      // só devolve tubos efetivamente coletados
      if (!bucket.exams.some((e) => e.collected)) return
      const sampleCode = buildSampleCode(orderLabel, idx + 1, companySeq)
      samples.push({
        sample_barcode: generateSampleHash(sampleCode),
        sample_code: sampleCode,
        collected_at: bucket.collectedAt,
        material: bucket.exams.find((e) => e.material)?.material ?? tube.label,
        exams: bucket.exams.filter((e) => e.collected).map((e) => ({ code: e.code })),
      })
    })

    if (samples.length === 0) continue

    out.push({ ...base, status: 'collected', samples })
  }

  return json({ orders: out })
})
