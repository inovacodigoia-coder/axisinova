import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import type { Ctx, Lab } from './soap.ts'

export { corsHeaders }
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

export const adminClient = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

export interface Chamador { tipo: 'cron' | 'usuario'; userId?: string; companyId?: string; client?: any }

/** Aceita a rotina agendada (x-apoio-cron) ou um usuário logado. `perm` é conferida para usuários. */
export async function autenticar(req: Request, admin: any, perm?: string): Promise<Chamador | Response> {
  const cron = req.headers.get('x-apoio-cron')
  if (cron) {
    const { data } = await admin.from('apoio_cron_config').select('token').eq('id', 1).maybeSingle()
    if (data?.token && data.token === cron) return { tipo: 'cron' }
    return json({ error: 'Token inválido' }, 401)
  }
  const h = req.headers.get('Authorization')
  if (!h?.startsWith('Bearer ')) return json({ error: 'Não autenticado' }, 401)
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: h } } })
  const { data: { user } } = await client.auth.getUser()
  if (!user) return json({ error: 'Sessão inválida' }, 401)
  if (perm) {
    const { data: ok } = await client.rpc('apoio_tem_permissao', { _perm: perm })
    if (!ok) return json({ error: 'Você não tem permissão para esta ação' }, 403)
  }
  const { data: cid } = await client.rpc('get_user_company_id', { _user_id: user.id })
  return { tipo: 'usuario', userId: user.id, companyId: cid as string, client }
}

const LAB_COLS = 'id, company_id, nome, cod_lab, endpoint_url, opcoes, modo_contingencia, guardar_pdf_sempre, ativo, conector'

export async function carregarCtx(admin: any, apoioId: string): Promise<Ctx> {
  const { data: lab, error } = await admin.from('apoio_laboratorio').select(LAB_COLS).eq('id', apoioId).single()
  if (error || !lab) throw new Error('Laboratório de apoio não encontrado')
  const { data: senha, error: e2 } = await admin.rpc('apoio_get_senha', { _apoio_id: apoioId })
  if (e2) throw new Error('Não foi possível ler a senha do conector (função apoio_get_senha ausente?)')
  if (!senha) throw new Error('Senha do conector não cadastrada')
  return { admin, lab: lab as Lab, senha: senha as string }
}

/** Apoios automáticos ativos (nunca os que estão em modo manual/contingência) */
export async function apoiosAutomaticos(admin: any, apoioId?: string, companyId?: string): Promise<Lab[]> {
  let q = admin.from('apoio_laboratorio').select(LAB_COLS).eq('ativo', true).eq('modo_contingencia', false)
  if (apoioId) q = q.eq('id', apoioId)
  if (companyId) q = q.eq('company_id', companyId)
  const { data } = await q
  const libs: Lab[] = []
  for (const l of data ?? []) {
    const { data: ok } = await admin.rpc('apoio_modulo_liberado', { _company_id: l.company_id })
    if (ok && (l.conector || 'pardini').toLowerCase().includes('pardini')) libs.push(l)
  }
  return libs
}

export async function cursorLer(admin: any, lab: Lab, rotina: string) {
  const { data } = await admin.from('apoio_cursor').select('*').eq('apoio_id', lab.id).eq('rotina', rotina).maybeSingle()
  return data as { ate: string | null; ultimo_sucesso: string | null } | null
}

export async function cursorGravar(admin: any, lab: Lab, rotina: string, r: { ate?: string; erro?: string | null }) {
  const agora = new Date().toISOString()
  const row: any = { company_id: lab.company_id, apoio_id: lab.id, rotina, ultima_execucao: agora }
  if (r.ate) row.ate = r.ate
  if (r.erro) { row.ultimo_erro = r.erro.slice(0, 2000); row.ultimo_erro_em = agora }
  else { row.ultimo_sucesso = agora }
  await admin.from('apoio_cursor').upsert(row, { onConflict: 'apoio_id,rotina' })
}

/** Roda `fn` para cada apoio isoladamente: a falha de um não para os outros */
export async function paraCada(admin: any, labs: Lab[], rotina: string, fn: (ctx: Ctx) => Promise<any>) {
  const out: any[] = []
  for (const lab of labs) {
    try {
      const ctx = await carregarCtx(admin, lab.id)
      const r = await fn(ctx)
      await cursorGravar(admin, lab, rotina, { ate: r?.ate, erro: null })
      out.push({ apoio: lab.nome, ok: true, ...r })
    } catch (e) {
      const msg = (e as Error).message
      await cursorGravar(admin, lab, rotina, { erro: msg })
      out.push({ apoio: lab.nome, ok: false, erro: msg })
    }
  }
  return out
}

export const uuidOk = (s: unknown) => typeof s === 'string' && /^[0-9a-f-]{36}$/i.test(s)
export const idMsg = () => `AX${Date.now()}${Math.floor(Math.random() * 1000)}`
