import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// Etapa 2A — log, limite por minuto e bloqueio por tentativas da API de Parceiros (PGlite, dados fictícios).
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
const GESTOR = '00000000-0000-4000-8000-000000000020'
const COMUM = '00000000-0000-4000-8000-000000000021'
const SUPER = '00000000-0000-4000-8000-000000000022'
const GESTOR_OUTRA = '00000000-0000-4000-8000-000000000023'

type Pre = { permitido: boolean; retry_after: number; error_code?: string; bloqueio_ignorado?: boolean }
/** Etapa 2A.1: o /oauth-token chama depois de conferir client_id + segredo (valida = credencial correta). */
const pre = async (ip: string | null, cid: string, valida = false) =>
  (await db.query<{ r: Pre }>(`SELECT api_oauth_pre($1, $2, $3) r`, [ip, cid, valida])).rows[0].r
const resultado = (ip: string | null, cid: string, r: string, log: unknown = null) =>
  db.query(`SELECT api_oauth_resultado($1, $2, $3, $4::jsonb)`, [ip, cid, r, log === null ? null : JSON.stringify(log)])
const consumir = async (itens: unknown) =>
  (await db.query<{ r: Pre }>(`SELECT api_limite_consumir($1::jsonb) r`, [JSON.stringify(itens)])).rows[0].r

/** Evita cruzar a virada do minuto no meio do teste da janela de 60 s. */
const longeDaVirada = async () => {
  const s = new Date().getSeconds()
  if (s >= 50) await new Promise(r => setTimeout(r, (61 - s) * 1000))
}

const comoUsuario = async <T,>(role: string, uid: string | null, sql: string) => {
  await db.exec(`SET ROLE ${role}; SELECT set_config('request.jwt.claim.sub', '${uid ?? ''}', false);`)
  try { return await db.query<T>(sql) } finally {
    await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub', '', false);`)
  }
}

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE SCHEMA private;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE TABLE profiles(id uuid PRIMARY KEY, company_id uuid, role text);
    CREATE FUNCTION public.get_user_company_id(_uid uuid) RETURNS uuid LANGUAGE sql SECURITY DEFINER AS $$ SELECT company_id FROM public.profiles WHERE id = _uid $$;
    CREATE FUNCTION public.is_company_manager(_uid uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid AND role = 'company_admin') $$;
    CREATE FUNCTION private.is_super_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin') $$;
    GRANT USAGE ON SCHEMA auth, private TO authenticated, anon;
    INSERT INTO profiles VALUES ('${GESTOR}', '${EMPRESA}', 'company_admin'), ('${COMUM}', '${EMPRESA}', 'receptionist'),
      ('${SUPER}', NULL, 'super_admin'), ('${GESTOR_OUTRA}', '${OUTRA}', 'company_admin');
  `)
  await db.exec(migracao('api_parceiros_protecao'))
  await db.exec(migracao('oauth_credencial_antes_do_ip'))
})
afterEach(async () => { await db.close() })

describe('limite do /oauth-token', () => {
  it('(a) a 31ª requisição do mesmo IP no mesmo minuto é recusada com tempo de espera', async () => {
    await longeDaVirada()
    for (let i = 1; i <= 30; i++) expect((await pre('203.0.113.7', `cid-${i}`)).permitido, `req ${i}`).toBe(true)
    const r = await pre('203.0.113.7', 'cid-31')
    expect(r).toMatchObject({ permitido: false, error_code: 'RATE_LIMITED' })
    expect(r.retry_after).toBeGreaterThanOrEqual(1)
    expect(r.retry_after).toBeLessThanOrEqual(60)
    // outro IP segue normal
    expect((await pre('203.0.113.8', 'cid-1')).permitido).toBe(true)
  })

  it('a 31ª emissão bem-sucedida do mesmo client_id no minuto é recusada', async () => {
    await longeDaVirada()
    for (let i = 0; i < 30; i++) await resultado(`198.51.100.${i}`, 'cid-ok', 'sucesso')
    expect(await pre('198.51.100.200', 'cid-ok', true)).toMatchObject({ permitido: false, error_code: 'RATE_LIMITED' })
  })

  it('o limite muda pela tabela de configuração, sem deploy', async () => {
    await longeDaVirada()
    await db.exec(`INSERT INTO api_limites_config(regra, limite, janela_segundos) VALUES ('oauth_ip', 2, 60)`)
    expect((await pre('192.0.2.1', 'x')).permitido).toBe(true)
    expect((await pre('192.0.2.1', 'x')).permitido).toBe(true)
    expect((await pre('192.0.2.1', 'x')).permitido).toBe(false)
  })
})

describe('bloqueio por tentativas', () => {
  it('(b) 5 senhas erradas do par client_id+IP bloqueiam o par; o mesmo client_id de outro IP continua', async () => {
    for (let i = 0; i < 5; i++) await resultado('203.0.113.10', 'cid-alvo', 'falha_credencial')
    const bloqueado = await pre('203.0.113.10', 'cid-alvo')
    expect(bloqueado).toMatchObject({ permitido: false, error_code: 'LOCKED' })
    expect(bloqueado.retry_after).toBeGreaterThan(14 * 60)
    expect(bloqueado.retry_after).toBeLessThanOrEqual(15 * 60)
    // parceiro legítimo em outro IP: passa e emite
    expect((await pre('198.51.100.20', 'cid-alvo')).permitido).toBe(true)
    await resultado('198.51.100.20', 'cid-alvo', 'sucesso')
    // o IP do atacante com outro client_id não está bloqueado (só 5 falhas no IP)
    expect((await pre('203.0.113.10', 'cid-outro')).permitido).toBe(true)
  })

  it('nunca bloqueia só pelo client_id (sem IP não conta falha)', async () => {
    for (let i = 0; i < 30; i++) await resultado(null, 'cid-publico', 'falha_credencial')
    expect((await pre('198.51.100.30', 'cid-publico')).permitido).toBe(true)
    expect((await db.query(`SELECT 1 FROM api_auth_falhas`)).rows.length).toBe(0)
  })

  it('(c) 20 falhas do mesmo IP bloqueiam o IP para qualquer client_id', async () => {
    for (let i = 0; i < 20; i++) await resultado('203.0.113.50', `cid-${i % 4}`, 'falha_credencial')
    expect(await pre('203.0.113.50', 'cid-nunca-usado')).toMatchObject({ permitido: false, error_code: 'LOCKED' })
    expect((await pre('203.0.113.51', 'cid-1')).permitido).toBe(true)
  })

  it('um sucesso zera as falhas do par', async () => {
    for (let i = 0; i < 4; i++) await resultado('203.0.113.60', 'cid-p', 'falha_credencial')
    await resultado('203.0.113.60', 'cid-p', 'sucesso')
    for (let i = 0; i < 4; i++) await resultado('203.0.113.60', 'cid-p', 'falha_credencial')
    expect((await pre('203.0.113.60', 'cid-p')).permitido).toBe(true)
  })

  it('outras recusas (parceiro pendente, escopo) não contam como falha de credencial', async () => {
    for (let i = 0; i < 10; i++) await resultado('203.0.113.70', 'cid-pend', 'outro')
    expect((await pre('203.0.113.70', 'cid-pend')).permitido).toBe(true)
  })
})

describe('Etapa 2A.1 — credencial válida nunca é barrada por bloqueio de IP', () => {
  const IP_LAB = '203.0.113.90' // vários servidores do mesmo laboratório atrás do mesmo IP público

  it('(a) 20+ falhas de um IP não impedem uma credencial válida vinda desse mesmo IP', async () => {
    await longeDaVirada()
    for (let i = 0; i < 25; i++) await resultado(IP_LAB, `cid-mal-configurado-${i % 3}`, 'falha_credencial')
    // o IP está bloqueado para credencial errada...
    expect(await pre(IP_LAB, 'cid-servidor-ok')).toMatchObject({ permitido: false, error_code: 'LOCKED' })
    // ...mas o servidor com credencial válida renova o token, e isso fica marcado para o log
    expect(await pre(IP_LAB, 'cid-servidor-ok', true)).toMatchObject({ permitido: true, bloqueio_ignorado: true })
    await resultado(IP_LAB, 'cid-servidor-ok', 'sucesso')
    // o sucesso não desbloqueia o IP para os outros
    expect(await pre(IP_LAB, 'cid-mal-configurado-0')).toMatchObject({ permitido: false, error_code: 'LOCKED' })
  })

  it('(b) 5 falhas de um par bloqueiam só esse par; outro servidor no mesmo IP segue', async () => {
    for (let i = 0; i < 5; i++) await resultado(IP_LAB, 'cid-par', 'falha_credencial')
    expect(await pre(IP_LAB, 'cid-par')).toMatchObject({ permitido: false, error_code: 'LOCKED' })
    // outro client_id do mesmo IP (inválido ou válido) não é afetado
    expect((await pre(IP_LAB, 'cid-vizinho')).permitido).toBe(true)
    expect(await pre(IP_LAB, 'cid-vizinho', true)).toMatchObject({ permitido: true, bloqueio_ignorado: false })
    // o próprio par com o segredo certo passa, e o acerto zera as falhas do par
    expect(await pre(IP_LAB, 'cid-par', true)).toMatchObject({ permitido: true, bloqueio_ignorado: true })
    await resultado(IP_LAB, 'cid-par', 'sucesso')
    expect((await pre(IP_LAB, 'cid-par')).permitido).toBe(true)
  })

  it('(c) o limite de 30/minuto por IP não bloqueia emissões bem-sucedidas', async () => {
    await longeDaVirada()
    // 40 servidores diferentes no mesmo IP renovando no mesmo minuto
    for (let i = 0; i < 40; i++) {
      expect((await pre(IP_LAB, `cid-srv-${i}`, true)).permitido, `servidor ${i}`).toBe(true)
      await resultado(IP_LAB, `cid-srv-${i}`, 'sucesso')
    }
    // emissões válidas não gastam o limite por IP: 30 tentativas inválidas ainda cabem
    for (let i = 0; i < 30; i++) expect((await pre(IP_LAB, `cid-x-${i}`)).permitido, `inválida ${i}`).toBe(true)
    expect(await pre(IP_LAB, 'cid-x-31')).toMatchObject({ permitido: false, error_code: 'RATE_LIMITED' })
    // e mesmo com o limite por IP estourado, credencial válida continua passando
    expect((await pre(IP_LAB, 'cid-srv-0', true)).permitido).toBe(true)
  })

  it('(d) credencial inválida recebe 401 e depois 429 no bloqueio, igual para client_id existente ou não', async () => {
    // existente com senha errada e inexistente seguem o mesmo caminho (valida = false)
    for (const cid of ['cid-existe', 'cid-nao-existe']) {
      const ip = cid === 'cid-existe' ? '198.51.100.91' : '198.51.100.92'
      for (let i = 0; i < 5; i++) {
        expect((await pre(ip, cid)).permitido, `${cid} tentativa ${i + 1}`).toBe(true) // → 401
        await resultado(ip, cid, 'falha_credencial')
      }
      const r = await pre(ip, cid) // → 429
      expect(r).toMatchObject({ permitido: false, error_code: 'LOCKED' })
      expect(r).not.toHaveProperty('bloqueio_ignorado')
    }
    // credencial inválida nunca recebe a marcação de "bloqueio ignorado"
    expect((await pre('198.51.100.93', 'cid-livre'))).not.toHaveProperty('bloqueio_ignorado')
  })
})

describe('limite do partner-orders', () => {
  it('(d) o limite é por parceiro e não afeta outro parceiro', async () => {
    await longeDaVirada()
    for (let i = 0; i < 120; i++) {
      expect((await consumir([{ regra: 'partner_get_parceiro', chave: PARC_A }])).permitido).toBe(true)
    }
    expect(await consumir([{ regra: 'partner_get_parceiro', chave: PARC_A }])).toMatchObject({ permitido: false, error_code: 'RATE_LIMITED' })
    expect((await consumir([{ regra: 'partner_get_parceiro', chave: PARC_B }])).permitido).toBe(true)
  })

  it('o limite da empresa soma os parceiros dela', async () => {
    await longeDaVirada()
    await db.exec(`INSERT INTO api_limites_config(regra, limite) VALUES ('partner_post_empresa', 3)`)
    const post = (p: string) => consumir([{ regra: 'partner_post_parceiro', chave: p }, { regra: 'partner_post_empresa', chave: EMPRESA }])
    expect((await post(PARC_A)).permitido).toBe(true)
    expect((await post(PARC_A)).permitido).toBe(true)
    expect((await post(PARC_B)).permitido).toBe(true)
    expect(await post(PARC_B)).toMatchObject({ permitido: false, regra: 'partner_post_empresa' })
  })
})

describe('registro das chamadas', () => {
  it('(e) grava sucesso e falha sem corpo, token nem segredo', async () => {
    await resultado('203.0.113.80', 'cid-log', 'sucesso', {
      endpoint: 'oauth-token', metodo: 'POST', status_code: 200, client_id: 'cid-log', ip: '203.0.113.80', duration_ms: 12,
      client_secret: 'axis_sec_SEGREDO', authorization: 'Bearer TOKEN', body: { paciente: { cpf: '12345678909' } },
    })
    await db.query(`SELECT api_log_registrar($1::jsonb)`, [JSON.stringify({
      endpoint: 'partner-orders', metodo: 'POST', status_code: 422, error_code: 'INVALID_CPF', company_id: EMPRESA,
      partner_id: PARC_A, user_agent: 'x'.repeat(500), access_token: 'eyJ...', payload: { nome: 'Maria' },
    })])
    const rows = (await db.query<Record<string, unknown>>(`SELECT * FROM api_request_logs ORDER BY status_code`)).rows
    expect(rows.map(r => r.status_code)).toEqual([200, 422])
    expect(rows[1]).toMatchObject({ error_code: 'INVALID_CPF', partner_id: PARC_A })
    expect(String(rows[1].user_agent).length).toBe(200)
    const txt = JSON.stringify(rows)
    expect(txt).not.toMatch(/SEGREDO|TOKEN|eyJ|12345678909|Maria|paciente/)
  })

  it('(f) usuário comum e parceiro (anônimo) não leem o log; gestor da empresa e Super Admin leem', async () => {
    await db.query(`SELECT api_log_registrar($1::jsonb)`, [JSON.stringify({ endpoint: 'partner-orders', metodo: 'GET', status_code: 200, company_id: EMPRESA })])
    const ver = async (role: string, uid: string | null) =>
      (await comoUsuario<{ id: string }>(role, uid, `SELECT id FROM api_request_logs`)).rows.length
    expect(await ver('authenticated', COMUM)).toBe(0)
    expect(await ver('authenticated', GESTOR_OUTRA)).toBe(0)
    await expect(ver('anon', null)).rejects.toThrow(/permission denied/)
    expect(await ver('authenticated', GESTOR)).toBe(1)
    expect(await ver('authenticated', SUPER)).toBe(1)
  })

  it('ninguém logado altera, apaga ou grava log/contadores', async () => {
    await expect(comoUsuario('authenticated', GESTOR, `DELETE FROM api_request_logs`)).rejects.toThrow(/permission denied/)
    await expect(comoUsuario('authenticated', GESTOR, `UPDATE api_request_logs SET status_code = 1`)).rejects.toThrow(/permission denied/)
    await expect(comoUsuario('authenticated', GESTOR, `INSERT INTO api_request_logs(endpoint, metodo, status_code) VALUES ('x','GET',200)`)).rejects.toThrow(/permission denied/)
    await expect(comoUsuario('authenticated', SUPER, `SELECT * FROM api_limite_contadores`)).rejects.toThrow(/permission denied/)
    await expect(comoUsuario('authenticated', SUPER, `SELECT api_limite_consumir('[]'::jsonb)`)).rejects.toThrow(/permission denied/)
    await expect(comoUsuario('anon', null, `SELECT api_oauth_pre('1.1.1.1', 'x', true)`)).rejects.toThrow(/permission denied/)
    await expect(comoUsuario('authenticated', SUPER, `SELECT api_oauth_pre('1.1.1.1', 'x', true)`)).rejects.toThrow(/permission denied/)
  })

  it('a limpeza apaga só contadores antigos, nunca o log', async () => {
    await db.exec(`
      INSERT INTO api_limite_contadores VALUES ('oauth_ip', 'velho', now() - interval '3 hours', 5), ('oauth_ip', 'novo', now(), 1);
      SELECT api_log_registrar('{"endpoint":"oauth-token","metodo":"POST","status_code":401}'::jsonb);
      UPDATE api_request_logs SET created_at = now() - interval '3 hours';
    `)
    // a limpeza é oportunista (2%): força várias execuções
    for (let i = 0; i < 400; i++) await db.query(`SELECT api__limpar_contadores()`)
    expect((await db.query<{ chave: string }>(`SELECT chave FROM api_limite_contadores`)).rows.map(r => r.chave)).toEqual(['novo'])
    expect((await db.query(`SELECT 1 FROM api_request_logs`)).rows.length).toBe(1)
  })
})
