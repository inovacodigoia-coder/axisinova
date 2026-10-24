import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

let db: PGlite
const C = '00000000-0000-4000-8000-000000000001'
const N = '00000000-0000-4000-8000-000000000002'
const U = '00000000-0000-4000-8000-000000000003'
const I = '00000000-0000-4000-8000-000000000004'
const CT = '00000000-0000-4000-8000-000000000005'
const P = '00000000-0000-4000-8000-000000000006'
beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT coalesce(current_setting('test.role',true),'service_role') $$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${U}'::uuid $$;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
    CREATE TABLE companies(id uuid PRIMARY KEY,crm_habilitado boolean DEFAULT false,whatsapp_numeros_autorizados int DEFAULT 2);
    CREATE TABLE crm_config(company_id uuid PRIMARY KEY,evolucao_automatica boolean DEFAULT false);
    CREATE TABLE profiles(id uuid PRIMARY KEY,company_id uuid,role text);
    CREATE FUNCTION get_user_company_id(u uuid) RETURNS uuid LANGUAGE sql AS $$ SELECT company_id FROM profiles WHERE id=u $$;
    CREATE TABLE whatsapp_instancias(id uuid PRIMARY KEY,company_id uuid,apelido text,numero_conectado text);
    CREATE TABLE whatsapp_instancia_segredos(instancia_id uuid REFERENCES whatsapp_instancias(id) ON DELETE CASCADE,token_instancia_cifrado text);
    CREATE TABLE whatsapp_auditoria(company_id uuid,acao text,antes jsonb,depois jsonb,usuario_id uuid,criado_em timestamptz);
    CREATE TABLE patients(id uuid PRIMARY KEY,company_id uuid,name text);
    CREATE TABLE whatsapp_contatos(id uuid PRIMARY KEY,company_id uuid,paciente_id uuid,nome_exibicao text);
    CREATE TABLE whatsapp_conversas(id uuid PRIMARY KEY,company_id uuid,contato_id uuid);
    CREATE TABLE user_notifications(company_id uuid,user_id uuid,title text,message text,action_route text);
    INSERT INTO companies(id,crm_habilitado) VALUES('${C}',true);
    INSERT INTO crm_config VALUES('${C}',false);
    INSERT INTO profiles VALUES('${U}','${C}','company_admin');
    INSERT INTO whatsapp_instancias VALUES('${I}','${C}','Recepção','5584999981234');
    INSERT INTO whatsapp_instancia_segredos VALUES('${I}','token-fixture');
    INSERT INTO patients VALUES('${P}','${C}','João Paciente');
    INSERT INTO whatsapp_contatos VALUES('${CT}','${C}','${P}','Jo@b');
    INSERT INTO whatsapp_conversas VALUES('${I}','${C}','${CT}');
  `)
  await db.exec(readFileSync('drizzle/migrations/0110_pacote_whatsapp_nomes_crm_novas_empresas.sql','utf8'))
  await db.exec(`CREATE TRIGGER crm_config_empresa AFTER INSERT OR UPDATE OF crm_habilitado ON companies FOR EACH ROW EXECUTE FUNCTION crm_config_padrao_trg();`)
})
afterEach(async () => { await db.close() })
const rows = async (sql: string) => (await db.query<Record<string, any>>(sql)).rows

describe('Pacote WhatsApp/CRM — PostgreSQL isolado', () => {
  it('empresa nova recebe evolução TRUE ao habilitar o CRM posteriormente', async () => {
    await db.exec(`INSERT INTO companies(id) VALUES('${N}'); UPDATE companies SET crm_habilitado=true WHERE id='${N}';`)
    expect((await rows(`SELECT evolucao_automatica FROM crm_config WHERE company_id='${N}'`))[0].evolucao_automatica).toBe(true)
  })
  it('empresa nova criada com CRM ligado recebe TRUE', async () => {
    await db.exec(`INSERT INTO companies(id,crm_habilitado) VALUES('${N}',true);`)
    expect((await rows(`SELECT evolucao_automatica FROM crm_config WHERE company_id='${N}'`))[0].evolucao_automatica).toBe(true)
  })
  it('empresa existente mantém FALSE mesmo após desligar e religar', async () => {
    await db.exec(`UPDATE companies SET crm_habilitado=false WHERE id='${C}'; UPDATE companies SET crm_habilitado=true WHERE id='${C}';`)
    expect((await rows(`SELECT evolucao_automatica FROM crm_config WHERE company_id='${C}'`))[0].evolucao_automatica).toBe(false)
  })
  it('empresa existente sem configuração ainda recebe o padrão antigo', async () => {
    await db.exec(`DELETE FROM crm_config WHERE company_id='${C}'; UPDATE companies SET crm_habilitado=true WHERE id='${C}';`)
    expect((await rows(`SELECT evolucao_automatica FROM crm_config WHERE company_id='${C}'`))[0].evolucao_automatica).toBe(false)
  })
  it('exclusão local apaga token, audita autor/apelido/últimos 4/data e não altera cota', async () => {
    await db.exec(`SELECT whatsapp_remover_instancia_local('${I}','${U}','Recepção');`)
    expect(await rows('SELECT * FROM whatsapp_instancias')).toHaveLength(0)
    expect(await rows('SELECT * FROM whatsapp_instancia_segredos')).toHaveLength(0)
    const audit = (await rows('SELECT * FROM whatsapp_auditoria'))[0]
    expect(audit.usuario_id).toBe(U); expect(audit.antes).toMatchObject({ apelido:'Recepção',ultimos_4_digitos:'1234' })
    expect(audit.criado_em).toBeTruthy(); expect(JSON.stringify(audit)).not.toContain('5584999981234')
    expect((await rows(`SELECT whatsapp_numeros_autorizados FROM companies WHERE id='${C}'`))[0].whatsapp_numeros_autorizados).toBe(2)
  })
  it('apelido incorreto é rejeitado sem apagar registro/token', async () => {
    await expect(db.exec(`SELECT whatsapp_remover_instancia_local('${I}','${U}','Outro');`)).rejects.toThrow('Apelido divergente')
    expect(await rows('SELECT * FROM whatsapp_instancia_segredos')).toHaveLength(1)
  })
  it('usuário de outra empresa é rejeitado', async () => {
    await db.exec(`UPDATE profiles SET company_id='${N}' WHERE id='${U}';`)
    await expect(db.exec(`SELECT whatsapp_remover_instancia_local('${I}','${U}','Recepção');`)).rejects.toThrow('Sem permissão')
    expect(await rows('SELECT * FROM whatsapp_instancias')).toHaveLength(1)
  })
  it('Super Admin mantém remoção entre empresas', async () => {
    await db.exec(`UPDATE profiles SET company_id='${N}',role='super_admin' WHERE id='${U}'; SELECT whatsapp_remover_instancia_local('${I}','${U}','Recepção');`)
    expect(await rows('SELECT * FROM whatsapp_instancias')).toHaveLength(0)
  })
  it('funções internas não ficam executáveis por anon ou authenticated', async () => {
    const perms = await rows(`SELECT has_function_privilege('anon','whatsapp_remover_instancia_local(uuid,uuid,text)','EXECUTE') a,has_function_privilege('authenticated','whatsapp_remover_instancia_local(uuid,uuid,text)','EXECUTE') u,has_function_privilege('authenticated','inovachat_notificacao_nome_trg()','EXECUTE') t`)
    expect(perms[0]).toEqual({a:false,u:false,t:false})
  })
  it('notificação vinculada tem título paciente e perfil WhatsApp secundário', async () => {
    await db.exec(`INSERT INTO user_notifications VALUES('${C}','${U}','Nova conversa na fila','Chegou uma conversa.','/app/inovachat?c=${I}');`)
    const n = (await rows('SELECT * FROM user_notifications'))[0]
    expect(n.title).toBe('João Paciente'); expect(n.message).toContain('no WhatsApp: Jo@b')
    expect(n.action_route).toBe(`/app/inovachat?c=${I}`); expect(n.user_id).toBe(U)
  })
  it('sem vínculo mantém título e texto originais', async () => {
    await db.exec(`UPDATE whatsapp_contatos SET paciente_id=NULL; INSERT INTO user_notifications VALUES('${C}','${U}','Conversa transferida','Transferiu uma conversa','/app/inovachat?c=${I}');`)
    expect((await rows('SELECT title,message FROM user_notifications'))[0]).toEqual({title:'Conversa transferida',message:'Transferiu uma conversa'})
  })
  it('paciente de outra empresa não é exposto na notificação', async () => {
    await db.exec(`UPDATE patients SET company_id='${N}'; INSERT INTO user_notifications VALUES('${C}','${U}','Nova conversa','Mensagem','/app/inovachat?c=${I}');`)
    expect((await rows('SELECT title FROM user_notifications'))[0].title).toBe('Nova conversa')
  })
})