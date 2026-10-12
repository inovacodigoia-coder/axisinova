// InovaChat 10C: exclusão dos dados de um contato a pedido do titular (LGPD).
// Papel (admin da empresa ou Super Admin) e telefone digitado conferidos no banco com o login do usuário; exclusão só com service role.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { BUCKET } from '../_shared/inovachatMidia.ts'

const resp = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return resp(405, { ok: false, mensagem: 'Use POST.' })
  const auth = req.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return resp(401, { ok: false, mensagem: 'Faça login novamente.' })
  const url = Deno.env.get('SUPABASE_URL')!
  const userDb = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: cl, error: ce } = await userDb.auth.getClaims(auth.slice(7))
  if (ce || !cl?.claims?.sub) return resp(401, { ok: false, mensagem: 'Faça login novamente.' })
  let b: any
  try { b = await req.json() } catch { return resp(400, { ok: false, mensagem: 'Corpo inválido.' }) }
  const contato = String(b?.contato_id ?? '')
  if (!/^[0-9a-f-]{36}$/i.test(contato)) return resp(400, { ok: false, mensagem: 'Contato inválido.' })

  const { data: prep, error } = await userDb.rpc('inovachat_excluir_contato_preparar', { p_contato: contato, p_telefone: String(b?.telefone ?? '') })
  const p = prep as any
  if (error || !p?.ok) return resp(403, { ok: false, mensagem: p?.mensagem ?? 'Não foi possível excluir.' })
  const paths = (p.paths ?? []) as string[]
  let removidas = 0
  for (let i = 0; i < paths.length; i += 100) {
    const lote = paths.slice(i, i + 100)
    const { error: re } = await db.storage.from(BUCKET).remove(lote)
    if (re) return resp(500, { ok: false, mensagem: 'Não foi possível remover os arquivos. Nada foi excluído do histórico; tente de novo.' })
    removidas += lote.length
  }
  const { data: r, error: ee } = await db.rpc('inovachat_excluir_contato_executar', { p_contato: contato, p_usuario: cl.claims.sub, p_midias: removidas })
  if (ee) return resp(500, { ok: false, mensagem: 'Não foi possível excluir os dados.' })
  return resp(200, { ok: true, ...(r as any) })
})
