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
    if (data?.token && data.token === cron) { definirOrigem('automatico'); return { tipo: 'cron' } }
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
  definirOrigem('manual', user.id)
  return { tipo: 'usuario', userId: user.id, companyId: cid as string, client }
}

const LAB_COLS = 'id, company_id, nome, cod_lab, endpoint_url, opcoes, modo_contingencia, guardar_pdf_sempre, ativo, conector'

export async function carregarCtx(admin: any, apoioId: string): Promise<Ctx> {
  const { data: lab, error } = await admin.from('apoio_laboratorio').select(LAB_COLS).eq('id', apoioId).single()
  if (error || !lab) throw new Error('Laboratório de apoio não encontrado')
  const senha = await lerSenha(admin, apoioId)
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

const ROTINA_PT: Record<string, string> = { transmissao: 'Transmitir remessa', resultado: 'Buscar resultados', rastreabilidade: 'Status das amostras', pendencia: 'Pendências técnicas', catalogo: 'Baixar catálogo', modelos: 'Buscar modelos', recebimento: 'Confirmar recebimento', pdf: 'Baixar laudo PDF', cancelamento: 'Cancelar exame', conexao: 'Testar conexão' }

export async function cursorGravar(admin: any, lab: Lab, rotina: string, r: { ate?: string; erro?: string | null }) {
  const agora = new Date().toISOString()
  const row: any = { company_id: lab.company_id, apoio_id: lab.id, rotina, ultima_execucao: agora }
  if (r.ate) row.ate = r.ate
  const { data: atual } = await admin.from('apoio_cursor').select('falhas_desde, falhas_n, alerta_em').eq('apoio_id', lab.id).eq('rotina', rotina).maybeSingle()
  if (r.erro) {
    row.ultimo_erro = r.erro.slice(0, 2000); row.ultimo_erro_em = agora
    row.falhas_desde = atual?.falhas_desde || agora
    row.falhas_n = (atual?.falhas_n || 0) + 1
    // Um aviso por rotina: o primeiro na hora, depois no máximo 1 por hora, agrupado
    const ultimoAviso = atual?.alerta_em ? new Date(atual.alerta_em).getTime() : 0
    if (!ultimoAviso || Date.now() - ultimoAviso > 3600_000) {
      row.alerta_em = agora
      const desde = new Date(row.falhas_desde).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
      const nome = ROTINA_PT[rotina] || rotina
      const msg = row.falhas_n > 1 ? `${nome} falhou ${row.falhas_n} vezes desde ${desde}.` : `${nome} falhou às ${desde}.`
      await admin.rpc('apoio_alertar', { _company: lab.company_id, _evento: 'apoio_integracao_falha', _perm: 'apoio.laboratorio.gerenciar', _titulo: `Falha na integração com ${lab.nome}`, _msg: msg, _rota: `/app/apoio/terceirizacao?aba=log&sit=nao_sucesso&apoio=${lab.id}`, _prioridade: 'high' }).then(() => {}, () => {})
    }
  } else {
    row.ultimo_sucesso = agora; row.falhas_desde = null; row.falhas_n = 0; row.alerta_em = null
  }
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

/** Senha do conector: tenta o Vault (apoio_get_senha); se a função não existir, usa a coluna cifrada. */
export async function lerSenha(admin: any, apoioId: string): Promise<string | null> {
  const v = await admin.rpc('apoio_get_senha', { _apoio_id: apoioId })
  if (!v.error && v.data) return v.data as string
  const chave = Deno.env.get('APOIO_CRYPTO_KEY')
  if (!chave) throw new Error('Chave de cifragem do conector ausente')
  const c = await admin.rpc('apoio_senha_ler_cifrada', { _apoio_id: apoioId, _chave: chave })
  if (c.error) throw new Error('Não foi possível ler a senha do conector')
  return (c.data as string) ?? null
}
