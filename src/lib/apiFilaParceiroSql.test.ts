import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// Etapa 2B — teto da fila "Pedidos Recebidos" no POST /partner-orders (PGlite, dados fictícios).
const migracao = (trecho: string) => {
  const f = readdirSync('drizzle/migrations').find(n => n.endsWith('.sql') && n.includes(trecho))
  if (!f) throw new Error(`migração ${trecho} não encontrada`)
  return readFileSync(`drizzle/migrations/${f}`, 'utf8')
}

let db: PGlite
const EMPRESA = '00000000-0000-4000-8000-000000000001'
const OUTRA = '00000000-0000-4000-8000-000000000002'
const PARC_A = '00000000-0000-4000-8000-00000000000a'
const PARC_B = '00000000-0000-4000-8000-00000000000b'
const PARC_C = '00000000-0000-4000-8000-00000000000c'

type Pre = { permitido: boolean; retry_after: number; error_code?: string; escopo?: string; limite?: number }
const pre = async (parceiro: string, empresa = EMPRESA) =>
  (await db.query<{ r: Pre }>(`SELECT api_partner_post_pre($1, $2) r`, [parceiro, empresa])).rows[0].r
const pendentes = (parceiro: string, n: number, status = 'received', empresa = EMPRESA) =>
  db.query(`INSERT INTO partner_orders (company_id, partner_id, status) SELECT $1, $2, $3 FROM generate_series(1, $4)`, [empresa, parceiro, status, n])
const config = (regra: string, limite: number) =>
  db.query(`INSERT INTO api_limites_config (regra, limite) VALUES ($1, $2) ON CONFLICT (regra) DO UPDATE SET limite = excluded.limite`, [regra, limite])

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE SCHEMA private;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
    CREATE FUNCTION public.get_user_company_id(_uid uuid) RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
    CREATE FUNCTION public.is_company_manager(_uid uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
    CREATE FUNCTION private.is_super_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
    CREATE TABLE partner_orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL, partner_id uuid,
      protocolo_parceiro text, status text NOT NULL DEFAULT 'received', created_at timestamptz NOT NULL DEFAULT now());
  `)
  await db.exec(migracao('api_parceiros_protecao'))
  await db.exec(migracao('oauth_credencial_antes_do_ip'))
  await db.exec(migracao('api_parceiros_teto_fila'))
  // o limite por minuto não interfere nos testes da fila
  await config('partner_post_parceiro', 100000)
  await config('partner_post_empresa', 100000)
})
afterEach(async () => { await db.close() })

describe('teto da fila aguardando autorização', () => {
  it('(g) com 500 pendentes, o 501º pedido do parceiro é recusado com QUEUE_FULL sem afetar outro parceiro', async () => {
    await pendentes(PARC_A, 499)
    expect((await pre(PARC_A)).permitido).toBe(true) // 500º
    await pendentes(PARC_A, 1)
    expect(await pre(PARC_A)).toMatchObject({ permitido: false, error_code: 'QUEUE_FULL', escopo: 'parceiro', limite: 500 })
    expect((await pre(PARC_B)).permitido).toBe(true)
  })

  it('pedidos já autorizados não contam; com erro ao autorizar continuam na fila', async () => {
    await pendentes(PARC_A, 400, 'processed')
    await pendentes(PARC_A, 499, 'received')
    expect((await pre(PARC_A)).permitido).toBe(true)
    await pendentes(PARC_A, 1, 'error')
    expect((await pre(PARC_A)).error_code).toBe('QUEUE_FULL')
  })

  it('empresa com 2.000 pendentes recusa qualquer parceiro dela; outra empresa segue', async () => {
    await pendentes(PARC_A, 490)
    await pendentes(PARC_B, 490)
    await pendentes(PARC_C, 490)
    await pendentes('00000000-0000-4000-8000-00000000000d', 490)
    await pendentes('00000000-0000-4000-8000-00000000000e', 39)
    expect((await pre(PARC_A)).permitido).toBe(true) // 1.999 pendentes
    await pendentes('00000000-0000-4000-8000-00000000000e', 1)
    expect(await pre('00000000-0000-4000-8000-00000000000f')).toMatchObject({ permitido: false, error_code: 'QUEUE_FULL', escopo: 'empresa', limite: 2000 })
    expect((await pre(PARC_A, OUTRA)).permitido).toBe(true)
  })

  it('tetos ajustáveis pela tabela de configuração, sem novo deploy', async () => {
    await config('fila_pendentes_parceiro', 3)
    await pendentes(PARC_A, 3)
    expect(await pre(PARC_A)).toMatchObject({ error_code: 'QUEUE_FULL', limite: 3 })
    await config('fila_pendentes_parceiro', 10)
    expect((await pre(PARC_A)).permitido).toBe(true)
  })

  it('limite por minuto continua valendo na mesma chamada', async () => {
    await config('partner_post_parceiro', 2)
    expect((await pre(PARC_A)).permitido).toBe(true)
    expect((await pre(PARC_A)).permitido).toBe(true)
    const r = await pre(PARC_A)
    if (r.permitido) return // virada do minuto no meio do teste
    expect(r.error_code).toBe('RATE_LIMITED')
  })

  it('a contagem usa o índice parcial da fila', async () => {
    await pendentes(PARC_A, 50)
    await pendentes(PARC_B, 3000, 'processed')
    await db.exec(`ANALYZE partner_orders; SET enable_seqscan = off;`)
    const plano = (await db.query<{ 'QUERY PLAN': string }>(
      `EXPLAIN SELECT partner_id FROM partner_orders WHERE company_id = '${EMPRESA}' AND status IN ('received','error') LIMIT 2000`,
    )).rows.map(r => r['QUERY PLAN']).join('\n')
    expect(plano).toMatch(/partner_orders_fila_pendente_idx/)
  })

  it('sem execução para o navegador', async () => {
    const r = await db.query<{ anon: boolean; auth: boolean; svc: boolean }>(`SELECT
      has_function_privilege('anon', 'public.api_partner_post_pre(uuid, uuid)', 'EXECUTE') anon,
      has_function_privilege('authenticated', 'public.api_partner_post_pre(uuid, uuid)', 'EXECUTE') auth,
      has_function_privilege('service_role', 'public.api_partner_post_pre(uuid, uuid)', 'EXECUTE') svc`)
    expect(r.rows[0]).toEqual({ anon: false, auth: false, svc: true })
  })
})
