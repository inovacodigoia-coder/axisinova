import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

let db: PGlite
const C = '00000000-0000-4000-8000-000000000001'
const C2 = '00000000-0000-4000-8000-000000000002'
const U1 = '00000000-0000-4000-8000-000000000011'
const U2 = '00000000-0000-4000-8000-000000000012'
const U3 = '00000000-0000-4000-8000-000000000013' // outra empresa
const ADM = '00000000-0000-4000-8000-000000000014'

const como = async (uid: string, superAdmin = false) =>
  db.exec(`SET test.uid = '${uid}'; SET test.super = '${superAdmin}';`)

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE SCHEMA private; CREATE SCHEMA storage;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT coalesce(current_setting('test.role',true),'service_role') $$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
    CREATE FUNCTION private.is_super_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT coalesce(current_setting('test.super',true),'false')::boolean $$;
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
    INSERT INTO companies(id) VALUES('${C}'),('${C2}');
    INSERT INTO profiles(id,company_id,full_name,role) VALUES
      ('${U1}','${C}','Ana','receptionist'),
      ('${U2}','${C}','Bruno','nurse'),
      ('${U3}','${C2}','Carlos','receptionist'),
      ('${ADM}','${C}','Dora Admin','company_admin');
  `)
  await db.exec(readFileSync('drizzle/migrations/0111_chat_interno_etapa1.sql', 'utf8'))
})
afterEach(async () => { await db.close() })
const rows = async (sql: string) => (await db.query<Record<string, any>>(sql)).rows
const uma = async (sql: string) => (await rows(sql))[0]

describe('Chat Interno — PostgreSQL isolado', () => {
  it('conversa direta é única por par de usuários', async () => {
    await como(U1)
    const a = await uma(`SELECT chat_interno_conversa_direta('${U2}') AS id`)
    await como(U2)
    const b = await uma(`SELECT chat_interno_conversa_direta('${U1}') AS id`)
    expect(a.id).toBe(b.id)
    expect(await rows(`SELECT * FROM chat_interno_conversa WHERE tipo='direta'`)).toHaveLength(1)
    expect(await rows(`SELECT * FROM chat_interno_participante WHERE conversa_id='${a.id}'`)).toHaveLength(2)
  })

  it('colega de outra empresa é rejeitado', async () => {
    await como(U1)
    await expect(db.exec(`SELECT chat_interno_conversa_direta('${U3}')`)).rejects.toThrow('outra empresa')
    expect(await rows('SELECT * FROM chat_interno_conversa')).toHaveLength(0)
  })

  it('enviar mensagem gera não lida para o outro e marcar lida zera', async () => {
    await como(U1)
    const { id } = await uma(`SELECT chat_interno_conversa_direta('${U2}') AS id`)
    await db.exec(`SELECT chat_interno_enviar('${id}', 'Olá, tudo bem?')`)
    await como(U2)
    expect((await uma('SELECT chat_interno_nao_lidas() AS n')).n).toBe(1)
    await db.exec(`SELECT chat_interno_marcar_lida('${id}')`)
    expect((await uma('SELECT chat_interno_nao_lidas() AS n')).n).toBe(0)
    await como(U1)
    expect((await uma('SELECT chat_interno_nao_lidas() AS n')).n).toBe(0)
  })

  it('quem não participa não envia e mensagem vazia ou longa demais é recusada', async () => {
    await como(U1)
    const { id } = await uma(`SELECT chat_interno_conversa_direta('${U2}') AS id`)
    await como(ADM)
    await expect(db.exec(`SELECT chat_interno_enviar('${id}', 'intrometido')`)).rejects.toThrow('não participa')
    await como(U1)
    await expect(db.exec(`SELECT chat_interno_enviar('${id}', '   ')`)).rejects.toThrow('vazia')
    await expect(db.exec(`SELECT chat_interno_enviar('${id}', repeat('x', 4001))`)).rejects.toThrow('4000')
  })

  it('módulo desligado pelo Super Admin recusa uso e menu depende do flag', async () => {
    await como(U1)
    await expect(db.exec(`SELECT chat_interno_liberar('${C}', false)`)).rejects.toThrow('Super Admin')
    await como(U1, true)
    await db.exec(`SELECT chat_interno_liberar('${C}', false)`)
    await como(U1)
    expect((await uma('SELECT chat_interno_meu_acesso() AS a')).a.ver).toBe(false)
    await expect(db.exec(`SELECT chat_interno_conversa_direta('${U2}')`)).rejects.toThrow('desligado')
    await como(U1, true)
    await db.exec(`SELECT chat_interno_liberar('${C}', true, 12)`)
    expect((await uma(`SELECT chat_interno_retencao_meses FROM companies WHERE id='${C}'`)).chat_interno_retencao_meses).toBe(12)
  })

  it('apagar mensagem: só o autor, exclusão lógica sem remover a linha', async () => {
    await como(U1)
    const { id } = await uma(`SELECT chat_interno_conversa_direta('${U2}') AS id`)
    const { m } = await uma(`SELECT chat_interno_enviar('${id}', 'apague-me') AS m`)
    await como(U2)
    await expect(db.exec(`SELECT chat_interno_apagar_mensagem('${m}')`)).rejects.toThrow()
    await como(U1)
    await db.exec(`SELECT chat_interno_apagar_mensagem('${m}')`)
    const msg = await uma(`SELECT * FROM chat_interno_mensagem WHERE id='${m}'`)
    expect(msg.apagada).toBe(true)
    expect(msg.conteudo).toBeNull()
  })

  it('grupo: criar, gerenciar só criador/admin, sair', async () => {
    await como(U1)
    const { id } = await uma(`SELECT chat_interno_criar_grupo('Plantão', ARRAY['${U2}'::uuid]) AS id`)
    expect((await uma(`SELECT conteudo FROM chat_interno_mensagem WHERE conversa_id='${id}' AND tipo='sistema'`)).conteudo).toContain('criou o grupo')
    await como(U2)
    await expect(db.exec(`SELECT chat_interno_grupo_adicionar('${id}', '${ADM}')`)).rejects.toThrow('criador do grupo')
    await como(U1)
    await db.exec(`SELECT chat_interno_grupo_adicionar('${id}', '${ADM}')`)
    expect(await rows(`SELECT * FROM chat_interno_participante WHERE conversa_id='${id}'`)).toHaveLength(3)
    await como(ADM)
    await db.exec(`SELECT chat_interno_grupo_remover('${id}', '${U2}')`)
    expect(await rows(`SELECT * FROM chat_interno_participante WHERE conversa_id='${id}'`)).toHaveLength(2)
    await db.exec(`SELECT chat_interno_sair('${id}')`)
    expect(await rows(`SELECT * FROM chat_interno_participante WHERE conversa_id='${id}'`)).toHaveLength(1)
  })

  it('canal de setor nasce com o setor e acompanha os usuários vinculados', async () => {
    await db.exec(`INSERT INTO company_sectors VALUES('REC','${C}','Recepção')`)
    const canal = await uma(`SELECT * FROM chat_interno_conversa WHERE tipo='setor' AND setor_id='REC'`)
    expect(canal.nome).toBe('Recepção')
    await db.exec(`INSERT INTO sector_users(company_id,sector_id,user_id) VALUES('${C}','REC','${U1}'),('${C}','REC','${U2}')`)
    expect(await rows(`SELECT * FROM chat_interno_participante WHERE conversa_id='${canal.id}'`)).toHaveLength(2)
    await db.exec(`UPDATE company_sectors SET name='Recepção Central' WHERE id='REC'`)
    expect((await uma(`SELECT nome FROM chat_interno_conversa WHERE id='${canal.id}'`)).nome).toBe('Recepção Central')
    await db.exec(`DELETE FROM sector_users WHERE user_id='${U2}'`)
    expect(await rows(`SELECT * FROM chat_interno_participante WHERE conversa_id='${canal.id}'`)).toHaveLength(1)
  })

  it('retenção: corte de 24 meses por padrão, configurável, e contagem entra no job', async () => {
    const corte = await uma(`SELECT chat_interno_retencao_corte('${C}') AS c`)
    const meses = (Date.now() - new Date(c.c).getTime()) / (30.44 * 24 * 3600 * 1000)
    expect(meses).toBeGreaterThan(23)
    expect(meses).toBeLessThan(25)
    await como(U1)
    const { id } = await uma(`SELECT chat_interno_conversa_direta('${U2}') AS id`)
    await db.exec(`SELECT chat_interno_enviar('${id}', 'antiga')`)
    await db.exec(`UPDATE chat_interno_mensagem SET criado_em = now() - interval '25 months'`)
    const contagem = (await uma(`SELECT inovachat_retencao_contar('${C}') AS r`)).r
    expect(contagem.chat_mensagens).toBe(1)
    expect(contagem.chat_anexos).toBe(0)
  })

  it('funções internas não ficam executáveis por anon ou authenticated; tabelas sem escrita direta', async () => {
    const p = await uma(`SELECT
      has_function_privilege('anon','chat_interno_enviar(uuid,text,uuid,jsonb)','EXECUTE') AS env_anon,
      has_function_privilege('authenticated','chat_interno_enviar(uuid,text,uuid,jsonb)','EXECUTE') AS env_auth,
      has_function_privilege('authenticated','chat_interno__sistema(uuid,uuid,text)','EXECUTE') AS sis_auth,
      has_function_privilege('authenticated','chat_interno_setor_sync_trg()','EXECUTE') AS trg_auth,
      has_function_privilege('authenticated','chat_interno_mensagem','INSERT') AS ins_auth,
      has_function_privilege('anon','chat_interno_mensagem','SELECT') AS sel_anon`)
    expect(p).toEqual({ env_anon: false, env_auth: true, sis_auth: false, trg_auth: false, ins_auth: false, sel_anon: false })
  })
})
