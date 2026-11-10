import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// Grupo do Portal Externo no Chat Interno — PostgreSQL isolado (PGlite), sem dados reais.
let db: PGlite
const C = '00000000-0000-4000-8000-000000000001'
const C2 = '00000000-0000-4000-8000-000000000002'
const U1 = '00000000-0000-4000-8000-000000000011'
const U2 = '00000000-0000-4000-8000-000000000012'
const U3 = '00000000-0000-4000-8000-000000000013' // outra empresa
const NOVO = '00000000-0000-4000-8000-000000000015'

const MIG = (() => {
  const f = readdirSync('drizzle/migrations').find(n => /^0146_.*\.sql$/.test(n))
  return f ? `drizzle/migrations/${f}` : (process.env.CHAT_PORTAL_SQL ?? '')
})()

const como = async (uid: string) => db.exec(`SET test.uid = '${uid}';`)
const rows = async (sql: string) => (await db.query<Record<string, any>>(sql)).rows
const uma = async (sql: string) => (await rows(sql))[0]
const criarAcesso = async (code: string, type: string, name: string, company = C) =>
  (await uma(`INSERT INTO external_accesses(company_id,type,name,access_code,access_password)
    VALUES('${company}','${type}','${name}','${code}','1234') RETURNING id`)).id as string

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE SCHEMA private; CREATE SCHEMA storage;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT 'service_role' $$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
    CREATE FUNCTION private.is_super_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
    CREATE TABLE companies(id uuid PRIMARY KEY);
    CREATE TABLE profiles(id uuid PRIMARY KEY, company_id uuid, full_name text, role text, is_active boolean DEFAULT true);
    CREATE FUNCTION get_user_company_id(u uuid) RETURNS uuid LANGUAGE sql AS $$ SELECT company_id FROM profiles WHERE id=u $$;
    CREATE FUNCTION is_company_manager(u uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS(SELECT 1 FROM profiles WHERE id=u AND role='company_admin') $$;
    CREATE TABLE company_sectors(id text PRIMARY KEY, company_id uuid, name text);
    CREATE TABLE sector_users(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, sector_id text, user_id uuid);
    CREATE TABLE whatsapp_mensagens(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, conversa_id uuid, criado_em timestamptz DEFAULT now(), midia_path text);
    CREATE TABLE whatsapp_conversas(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, contato_id uuid, status text);
    CREATE TABLE whatsapp_contatos(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, paciente_id uuid);
    CREATE TABLE whatsapp_fila_envios(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, criado_em timestamptz DEFAULT now(), status text);
    CREATE TABLE whatsapp_conversa_acessos(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, acessado_em timestamptz);
    CREATE TABLE whatsapp_nps_respostas(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, respondida_em timestamptz, comentario text, paciente_id uuid, paciente_nome text, agendamento_id uuid, fila_id uuid);
    CREATE TABLE whatsapp_retencao_execucoes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid);
    CREATE FUNCTION inovachat_retencao_corte(uuid) RETURNS timestamptz LANGUAGE sql AS $$ SELECT now() - interval '12 months' $$;
    CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql AS $$ SELECT string_to_array(substring(name from '^(.*)/[^/]+$'),'/') $$;
    CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text);
    CREATE PUBLICATION supabase_realtime;
    CREATE TABLE external_accesses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, type text, name text,
      status text NOT NULL DEFAULT 'active', access_code text UNIQUE, access_password text);
    CREATE TABLE external_access_logs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, access_id uuid,
      access_code text, access_type text, action text, success boolean DEFAULT true, details text, ip_address text,
      created_at timestamptz DEFAULT now());
    INSERT INTO companies(id) VALUES('${C}'),('${C2}');
    INSERT INTO profiles(id,company_id,full_name,role) VALUES
      ('${U1}','${C}','Raul Raulino','receptionist'),
      ('${U2}','${C}','Ariana Vitória','nurse'),
      ('${U3}','${C2}','Carlos','receptionist');
  `)
  await db.exec(readFileSync('drizzle/migrations/0111_chat_interno_etapa1.sql', 'utf8'))
  await db.exec(readFileSync('drizzle/migrations/0119_chat_interno_colegas.sql', 'utf8'))
  await db.exec(readFileSync(MIG, 'utf8'))
})
afterEach(async () => { await db.close() })

describe('Chat Interno — grupo do Portal Externo', () => {
  it('criar acesso de parceiro, local ou médico cria um grupo com o Nome exibido e todos os usuários da empresa', async () => {
    for (const [code, type, nome] of [['P1', 'parceiro', 'UBS Centro'], ['L1', 'local', 'Posto Norte'], ['M1', 'medico', 'Dr. João']]) {
      const id = await criarAcesso(code, type, nome)
      const conv = await uma(`SELECT * FROM chat_interno_conversa WHERE external_access_id='${id}'`)
      expect(conv.tipo).toBe('portal')
      expect(conv.nome).toBe(nome)
      const membros = (await rows(`SELECT usuario_id FROM chat_interno_participante WHERE conversa_id='${conv.id}'`)).map(r => r.usuario_id).sort()
      expect(membros).toEqual([U1, U2]) // nunca usuário de outra empresa
    }
  })

  it('acesso de paciente não cria grupo', async () => {
    await criarAcesso('PAC', 'paciente', 'Maria')
    expect(await rows(`SELECT * FROM chat_interno_conversa WHERE tipo='portal'`)).toHaveLength(0)
  })

  it('renomear o acesso renomeia o grupo; usuário novo da empresa entra no grupo', async () => {
    const id = await criarAcesso('P1', 'parceiro', 'UBS Centro')
    await db.exec(`UPDATE external_accesses SET name='UBS Centro Novo' WHERE id='${id}'`)
    const conv = await uma(`SELECT * FROM chat_interno_conversa WHERE external_access_id='${id}'`)
    expect(conv.nome).toBe('UBS Centro Novo')
    await db.exec(`INSERT INTO profiles(id,company_id,full_name) VALUES('${NOVO}','${C}','Francisca')`)
    expect(await rows(`SELECT 1 FROM chat_interno_participante WHERE conversa_id='${conv.id}' AND usuario_id='${NOVO}'`)).toHaveLength(1)
  })

  it('portal envia com código e senha; equipe vê o nome do portal e a não lida; abrir a conversa zera', async () => {
    await criarAcesso('P1', 'parceiro', 'UBS Centro')
    const r = await uma(`SELECT portal_chat_enviar('P1','1234','Bom dia, chegou a amostra?') AS r`)
    expect(r.r.ok).toBe(true)
    const m = await uma(`SELECT * FROM chat_interno_mensagem WHERE tipo='texto'`)
    expect(m.autor_id).toBeNull()
    expect(m.autor_externo).toBe('UBS Centro')
    await como(U1)
    const lista = await rows(`SELECT * FROM chat_interno_minhas_conversas()`)
    const portal = lista.find(c => c.tipo === 'portal')!
    expect(portal.nao_lidas).toBe(1)
    expect((await uma(`SELECT chat_interno_nao_lidas() AS n`)).n).toBe(1)
    await db.exec(`SELECT chat_interno_marcar_lida('${portal.id}')`)
    expect((await rows(`SELECT * FROM chat_interno_minhas_conversas()`)).find(c => c.tipo === 'portal')!.nao_lidas).toBe(0)
    expect((await uma(`SELECT chat_interno_nao_lidas() AS n`)).n).toBe(0)
  })

  it('resposta da equipe aparece no portal com o nome de quem enviou; abrir no portal zera a não lida', async () => {
    await criarAcesso('P1', 'parceiro', 'UBS Centro')
    const conv = await uma(`SELECT id FROM chat_interno_conversa WHERE tipo='portal'`)
    await como(U2)
    await db.exec(`SELECT chat_interno_enviar('${conv.id}', 'Chegou sim')`)
    const a = (await uma(`SELECT portal_chat_abrir('P1','1234') AS r`)).r
    expect(a.ok).toBe(true)
    expect(a.nao_lidas).toBe(1)
    expect(a.mensagens).toHaveLength(1) // mensagem de sistema não vai ao portal
    expect(a.mensagens[0].autor_nome).toBe('Ariana Vitória')
    expect(a.mensagens[0].externo).toBe(false)
    const b = (await uma(`SELECT portal_chat_abrir('P1','1234', true) AS r`)).r
    expect(b.nao_lidas).toBe(0)
  })

  it('senha errada, acesso inativo, paciente e chat desligado são recusados; senha errada fica registrada', async () => {
    await criarAcesso('P1', 'parceiro', 'UBS Centro')
    await criarAcesso('PAC', 'paciente', 'Maria')
    expect((await uma(`SELECT portal_chat_enviar('P1','9999','oi') AS r`)).r.error).toBe('invalid_password')
    expect(await rows(`SELECT * FROM external_access_logs WHERE success=false AND action='chat'`)).toHaveLength(1)
    expect((await uma(`SELECT portal_chat_abrir('PAC','1234') AS r`)).r.error).toBe('not_available')
    expect((await uma(`SELECT portal_chat_enviar('P1','1234','   ') AS r`)).r.error).toBe('empty')
    await db.exec(`UPDATE external_accesses SET status='inactive' WHERE access_code='P1'`)
    expect((await uma(`SELECT portal_chat_enviar('P1','1234','oi') AS r`)).r.error).toBe('inactive')
    await db.exec(`UPDATE external_accesses SET status='active' WHERE access_code='P1'; UPDATE companies SET chat_interno_habilitado=false`)
    expect((await uma(`SELECT portal_chat_abrir('P1','1234') AS r`)).r.error).toBe('chat_off')
    expect(await rows(`SELECT * FROM chat_interno_mensagem WHERE tipo='texto'`)).toHaveLength(0)
  })

  it('10 senhas erradas em 5 minutos bloqueiam o chat do portal', async () => {
    await criarAcesso('P1', 'parceiro', 'UBS Centro')
    for (let i = 0; i < 10; i++) await db.exec(`SELECT portal_chat_enviar('P1','0000','x')`)
    expect((await uma(`SELECT portal_chat_enviar('P1','1234','oi') AS r`)).r.error).toBe('locked')
  })

  it('acesso antigo sem grupo ganha o grupo ao abrir o chat pelo portal', async () => {
    await db.exec(`ALTER TABLE external_accesses DISABLE TRIGGER chat_interno_portal_acesso`)
    await criarAcesso('OLD', 'local', 'Posto Antigo')
    await db.exec(`ALTER TABLE external_accesses ENABLE TRIGGER chat_interno_portal_acesso`)
    expect(await rows(`SELECT * FROM chat_interno_conversa WHERE tipo='portal'`)).toHaveLength(0)
    expect((await uma(`SELECT portal_chat_abrir('OLD','1234') AS r`)).r.ok).toBe(true)
    expect((await uma(`SELECT nome FROM chat_interno_conversa WHERE tipo='portal'`)).nome).toBe('Posto Antigo')
  })

  it('nomes de quem enviou: qualquer usuário vê os colegas da própria empresa, nunca de outra', async () => {
    await como(U2)
    const n = await rows(`SELECT * FROM chat_interno_nomes(ARRAY['${U1}','${U3}']::uuid[])`)
    expect(n).toEqual([{ id: U1, nome: 'Raul Raulino' }])
  })

  it('funções do portal liberadas ao público; internas fechadas', async () => {
    const pode = async (role: string, fn: string) => (await uma(`SELECT has_function_privilege('${role}', '${fn}', 'EXECUTE') AS ok`)).ok
    expect(await pode('anon', 'portal_chat_enviar(text,text,text)')).toBe(true)
    expect(await pode('anon', 'portal_chat_abrir(text,text,boolean)')).toBe(true)
    expect(await pode('anon', 'chat_interno__portal_garantir(uuid)')).toBe(false)
    expect(await pode('authenticated', 'portal__chat_validar(text,text)')).toBe(false)
    expect(await pode('anon', 'chat_interno_minhas_conversas()')).toBe(false)
    expect(await pode('anon', 'chat_interno_nomes(uuid[])')).toBe(false)
  })
})
