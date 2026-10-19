// InovaChat 10C: retenção. Diário via pg_cron (inovachat_retencao_tick, código de uso único) ou manual pelo Super Admin (só simulação).
// Modo vem do banco (whatsapp_config_global.retencao_modo): simulação só conta e registra; real apaga em lotes de até 500.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { BUCKET } from '../_shared/inovachatMidia.ts'

const resp = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const url = Deno.env.get('SUPABASE_URL')!
  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  let manual = false
  const h = req.headers.get('x-worker-secret') ?? ''
  if (/^[0-9a-f]{64}$/.test(h)) {
    const { data } = await db.rpc('whatsapp_worker_consumir_token', { p_token: h })
    if (data !== true) return resp(401, { ok: false })
  } else {
    const auth = req.headers.get('Authorization') ?? ''
    if (!auth.startsWith('Bearer ')) return resp(401, { ok: false })
    const userDb = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
    const { error } = await userDb.rpc('whatsapp_retencao_modo') // lança erro se não for Super Admin
    if (error) return resp(403, { ok: false, mensagem: 'Apenas o Super Admin.' })
    manual = true
  }

  const { data: cfg } = await db.from('whatsapp_config_global').select('retencao_modo').limit(1).maybeSingle()
  const modoCfg = String(cfg?.retencao_modo ?? 'simulacao')
  if (!manual && modoCfg === 'desligada') return resp(200, { ok: true, modo: 'desligada' })
  const modo: 'simulacao' | 'real' = manual ? 'simulacao' : (modoCfg === 'real' ? 'real' : 'simulacao')

  const { data: emps } = await db.from('companies').select('id').or('whatsapp_habilitado.eq.true,inovachat_habilitado.eq.true')
  const resultado: unknown[] = []
  for (const e of emps ?? []) {
    const linha: Record<string, unknown> = { company_id: e.id, modo, manual, mensagens: 0, midias: 0, conversas: 0, contatos: 0, fila: 0, acessos: 0, nps_anonimizadas: 0, erro: null }
    try {
      if (modo === 'simulacao') {
        const { data: c, error } = await db.rpc('inovachat_retencao_contar', { p_company: e.id })
        if (error) throw new Error(error.message)
        Object.assign(linha, c)
      } else {
        const erros: string[] = []
        const { data: ms } = await db.rpc('inovachat_retencao_midias', { p_company: e.id, p_limite: 500 })
        const lista = (ms ?? []) as { id: string; path: string }[]
        const ok: string[] = []
        for (let i = 0; i < lista.length; i += 100) {
          const lote = lista.slice(i, i + 100)
          const { error } = await db.storage.from(BUCKET).remove(lote.map((x) => x.path))
          if (error) erros.push(`arquivos: ${error.message}`.slice(0, 200)) // não apaga o registro sem remover o arquivo
          else ok.push(...lote.map((x) => x.id))
        }
        if (ok.length) {
          const { data: n } = await db.rpc('inovachat_retencao_apagar_msgs', { p_company: e.id, p_ids: ok })
          linha.midias = Number(n ?? 0)
        }
        const { data: l, error: le } = await db.rpc('inovachat_retencao_limpar', { p_company: e.id })
        if (le) erros.push(le.message.slice(0, 200))
        else { Object.assign(linha, l); linha.mensagens = Number((l as any)?.mensagens ?? 0) + Number(linha.midias) }
        if (erros.length) linha.erro = erros.join('; ')
      }
    } catch (x) {
      linha.erro = (x instanceof Error ? x.message : 'erro').slice(0, 300)
    }
    const total = ['mensagens', 'midias', 'conversas', 'contatos', 'fila', 'acessos', 'nps_anonimizadas'].reduce((s, k) => s + Number(linha[k] ?? 0), 0)
    if (total > 0 || linha.erro || manual) await db.from('whatsapp_retencao_execucoes').insert(linha)
    resultado.push(linha)
  }
  return resp(200, { ok: true, modo, empresas: resultado.length })
})
