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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'GET') return json({ error: 'Método não permitido' }, 405)

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

  // ---- 2. Paginação opcional ----
  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
  const limit = Math.min(5000, Math.max(1, parseInt(url.searchParams.get('limit') || '2000', 10) || 2000))
  const from = (page - 1) * limit

  // ---- 3. Catálogo da empresa da chave ----
  const { data: exams, error } = await supabase
    .from('exams')
    .select('id, name, internal_code, tuss_code, is_active, default_material, selected_materials, measurement_unit, parameters, interfacing_parameters, workbench_id')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name', { ascending: true })
    .range(from, from + limit - 1)

  if (error) {
    console.error('[list-exams-for-integration] erro ao ler exames:', error.message)
    return json({ error: 'Não foi possível ler o catálogo' }, 500)
  }

  const { data: benches } = await supabase
    .from('lab_workbenches')
    .select('id, name')
    .eq('company_id', companyId)

  const benchName = new Map((benches || []).map((b: any) => [String(b.id), b.name as string]))

  const materialOf = (e: any): string | null => {
    if (e.default_material) return String(e.default_material)
    const sel = e.selected_materials
    if (Array.isArray(sel) && sel.length) {
      const first = sel[0]
      return typeof first === 'string' ? first : (first?.name ?? null)
    }
    return null
  }

  const out: any[] = []

  for (const e of exams || []) {
    const code = String(e.internal_code || e.tuss_code || e.id)
    const sector = e.workbench_id ? benchName.get(String(e.workbench_id)) ?? null : null
    const material = materialOf(e)

    out.push({
      code,
      name: e.name,
      material,
      sector,
      is_active: e.is_active !== false,
      parent_code: null,
      parameter_order: null,
    })

    // Parâmetros do exame = "painel" que se desdobra em vários resultados
    const params: any[] = Array.isArray(e.parameters) ? e.parameters : []
    const mapping: any[] = Array.isArray(e.interfacing_parameters) ? e.interfacing_parameters : []

    params
      .filter((p: any) => p && !p.isHidden && !p.is_hidden)
      .forEach((p: any, idx: number) => {
        const mapped = mapping.find(
          (m: any) => String(m?.parameterName ?? '').trim().toUpperCase() === String(p?.name ?? '').trim().toUpperCase(),
        )
        const paramCode = String(
          mapped?.machineCode || p.equipCode || p.equipment_code || p.internalCode || p.internal_code || p.code || '',
        ).trim()
        if (!paramCode || paramCode === code) return
        out.push({
          code: paramCode,
          name: p.name ?? paramCode,
          material,
          sector,
          is_active: true,
          parent_code: code,
          parameter_order: typeof p.sortOrder === 'number' ? p.sortOrder : idx + 1,
        })
      })
  }

  return json({ exams: out })
})
