import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { authenticateIntegration } from '../_shared/integrationAuth.ts'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'GET') return json({ error: 'Método não permitido' }, 405)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // ---- 1. Autenticação: OAuth2 (Bearer) ou API Key legada ----
  const auth = await authenticateIntegration(req, supabase, 'exams:read')
  if (!auth.ok) return json({ error: auth.error }, auth.status)
  const companyId = auth.companyId

  // ---- 2. Paginação opcional ----
  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
  const limit = Math.min(5000, Math.max(1, parseInt(url.searchParams.get('limit') || '2000', 10) || 2000))
  const from = (page - 1) * limit

  // ---- 3. Catálogo da empresa da chave ----
  const { data: exams, error } = await supabase
    .from('exams')
    .select('id, name, internal_code, tuss_code, is_active, type, default_material, selected_materials, measurement_unit, parameters, interfacing_parameters, workbench_id')
    .eq('company_id', companyId)
    .eq('is_active', true)
    // Apenas exames de Laboratório entram na integração com equipamentos;
    // exames do tipo "clinical" (ex.: Raio X) nunca são devolvidos.
    .neq('type', 'clinical')
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

  // Laudos cadastrados por exame (o equipamento informa o laudo em laudo_code)
  const { data: laudoRows } = await supabase
    .from('exam_laudos')
    .select('exam_id, code, name, sort_order, is_active')
    .eq('company_id', companyId)
    .order('sort_order', { ascending: true })

  const laudosByExam = new Map<string, any[]>()
  for (const l of laudoRows || []) {
    const key = String((l as any).exam_id)
    const list = laudosByExam.get(key) || []
    list.push({
      code: (l as any).code,
      name: (l as any).name,
      order: (l as any).sort_order,
      is_active: (l as any).is_active !== false,
    })
    laudosByExam.set(key, list)
  }

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
      laudos: laudosByExam.get(String(e.id)) || [],
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
