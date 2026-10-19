// Real PostgreSQL functions, isolated fixtures: never sends or deletes operational data.
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const sql = readFileSync('drizzle/migrations/0102_nps_retencao_navegacao.sql', 'utf8')
const C = '00000000-0000-4000-8000-000000000001'
const OTHER = '00000000-0000-4000-8000-000000000002'
const CONTACT = '00000000-0000-4000-8000-000000000003'
const CONV = '00000000-0000-4000-8000-000000000004'
const NPS = '00000000-0000-4000-8000-000000000005'
const FILA = '00000000-0000-4000-8000-000000000006'
const PAT = '00000000-0000-4000-8000-000000000007'
const DOC = '00000000-0000-4000-8000-000000000008'
let db: PGlite
async function rows(query: string, params: unknown[] = []) { return (await db.query<Record<string, any>>(query, params)).rows }
function fn(name: string) {
  const start = sql.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`)
  const body = sql.indexOf('AS $$', start)
  if (start < 0 || body < 0) throw new Error(`Missing ${name}`)
  return sql.slice(start, sql.indexOf('$$;', body + 5) + 3)
}
const call = async (name: string) => (await rows(`SELECT ${name}($1) result`, [C]))[0].result

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${PAT}'::uuid $$;
    CREATE FUNCTION get_user_company_id(uuid) RETURNS uuid LANGUAGE sql AS $$ SELECT '${C}'::uuid $$;
    CREATE FUNCTION whatsapp_tel_canonico(text) RETURNS text LANGUAGE sql AS $$ SELECT $1 $$;
    CREATE FUNCTION whatsapp_tem_permissao(text) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
    CREATE FUNCTION inovachat_tem_permissao(text) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
    CREATE FUNCTION inovachat_usuario_tem(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
    CREATE FUNCTION inovachat_ativo(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
    CREATE FUNCTION inovachat_pode_ver(uuid,text,uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT $4 = 'allowed' $$;
    CREATE TABLE companies(id uuid PRIMARY KEY, inovachat_retencao_meses int);
    CREATE FUNCTION inovachat_retencao_corte(uuid) RETURNS timestamptz LANGUAGE sql AS $$
      SELECT now()-make_interval(months => inovachat_retencao_meses) FROM companies WHERE id=$1 $$;
    CREATE TABLE whatsapp_contatos(id uuid PRIMARY KEY, company_id uuid, telefone text, paciente_id uuid);
    CREATE TABLE whatsapp_conversas(id uuid PRIMARY KEY, company_id uuid, contato_id uuid REFERENCES whatsapp_contatos(id) ON DELETE CASCADE,
      status text, responsavel_id uuid, setor_id text, ultima_mensagem_em timestamptz);
    CREATE TABLE whatsapp_mensagens(id uuid PRIMARY KEY, company_id uuid, conversa_id uuid REFERENCES whatsapp_conversas(id) ON DELETE CASCADE,
      criado_em timestamptz, midia_path text);
    CREATE TABLE whatsapp_conversa_acessos(id uuid PRIMARY KEY, company_id uuid, acessado_em timestamptz);
    CREATE TABLE whatsapp_fila_envios(id uuid PRIMARY KEY, company_id uuid, telefone_destino text, criado_em timestamptz, status text);
    CREATE TABLE whatsapp_nps_respostas(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, fila_id uuid NOT NULL UNIQUE
      CONSTRAINT whatsapp_nps_respostas_fila_id_fkey REFERENCES whatsapp_fila_envios(id) ON DELETE CASCADE,
      paciente_id uuid, paciente_nome text, agendamento_id uuid, comentario text, nota int, categoria text,
      medico_id uuid, medico_nome text, tipo_atendimento text, respondida_em timestamptz);
    CREATE TABLE whatsapp_auditoria(company_id uuid, acao text, depois jsonb, usuario_id uuid);
    CREATE TABLE profiles(id uuid, company_id uuid, is_active boolean, is_admin boolean, role text);
    CREATE TABLE user_notifications(company_id uuid,user_id uuid,category text,priority text,title text,message text,action_route text);
    INSERT INTO companies VALUES ('${C}',6),('${OTHER}',12);
    INSERT INTO whatsapp_contatos VALUES ('${CONTACT}','${C}','5584999990000','${PAT}');
    INSERT INTO whatsapp_conversas VALUES ('${CONV}','${C}','${CONTACT}','na_fila',NULL,'allowed',now());
    INSERT INTO whatsapp_fila_envios VALUES ('${FILA}','${C}','5584999990000',now()-interval '8 months','enviada');
    INSERT INTO whatsapp_nps_respostas VALUES ('${NPS}','${C}','${FILA}','${PAT}','Ana','${PAT}','Demora',5,'detrator','${DOC}','Dr. X','consultation',now()-interval '7 months');
    INSERT INTO profiles VALUES ('${PAT}','${C}',true,true,'company_admin');
  `)
  const alter = sql.match(/ALTER TABLE public.whatsapp_nps_respostas DROP CONSTRAINT[^;]+;/)?.[0]
  if (!alter) throw new Error('Missing cascade removal')
  await db.exec(alter)
  for (const name of ['inovachat_retencao_contar', 'inovachat_retencao_limpar', 'inovachat_excluir_contato_executar', 'whatsapp_nps_conversa', 'whatsapp__nps_avisar']) await db.exec(fn(name))
  const grants = sql.slice(sql.indexOf('REVOKE ALL ON FUNCTION public.whatsapp_nps_conversa'), sql.indexOf('CREATE OR REPLACE FUNCTION public.whatsapp__nps_avisar'))
  await db.exec(grants)
})
afterEach(async () => { await db.close() })

describe('NPS retention and protected navigation', () => {
  it('simulation counts expired NPS without changing comment, patient or queue', async () => {
    expect((await call('inovachat_retencao_contar')).nps_anonimizadas).toBe(1)
    expect((await rows('SELECT comentario,paciente_id FROM whatsapp_nps_respostas'))[0]).toEqual({ comentario: 'Demora', paciente_id: PAT })
    expect((await rows('SELECT count(*)::int n FROM whatsapp_fila_envios'))[0].n).toBe(1)
  })
  it('real cleanup anonymizes before queue deletion and preserves all statistical fields', async () => {
    const before = (await rows('SELECT nota,categoria,medico_id,tipo_atendimento,respondida_em FROM whatsapp_nps_respostas'))[0]
    expect((await call('inovachat_retencao_limpar')).nps_anonimizadas).toBe(1)
    expect((await rows('SELECT nota,categoria,medico_id,tipo_atendimento,respondida_em FROM whatsapp_nps_respostas'))[0]).toEqual(before)
    expect((await rows('SELECT comentario,paciente_id,paciente_nome,agendamento_id FROM whatsapp_nps_respostas'))[0]).toEqual({ comentario: null, paciente_id: null, paciente_nome: null, agendamento_id: null })
    expect((await rows('SELECT count(*)::int n FROM whatsapp_fila_envios'))[0].n).toBe(0)
    expect((await call('inovachat_retencao_limpar')).nps_anonimizadas).toBe(0)
  })
  it('retention uses each company cutoff and leaves recent responses intact', async () => {
    await db.exec(`UPDATE companies SET inovachat_retencao_meses=12 WHERE id='${C}'`)
    expect((await call('inovachat_retencao_limpar')).nps_anonimizadas).toBe(0)
    expect((await rows('SELECT comentario FROM whatsapp_nps_respostas'))[0].comentario).toBe('Demora')
  })
  it('batches at most 500 and keeps origins of responses awaiting anonymization', async () => {
    await db.exec(`INSERT INTO whatsapp_fila_envios SELECT gen_random_uuid(),'${C}','5584999990000',now()-interval '8 months','enviada' FROM generate_series(1,500);
      INSERT INTO whatsapp_nps_respostas(company_id,fila_id,paciente_id,comentario,nota,categoria,respondida_em)
        SELECT company_id,id,'${PAT}','Private',9,'promotor',now()-interval '7 months' FROM whatsapp_fila_envios WHERE id<>'${FILA}';`)
    expect((await call('inovachat_retencao_limpar')).nps_anonimizadas).toBe(500)
    expect((await rows('SELECT count(*)::int n FROM whatsapp_nps_respostas WHERE comentario IS NOT NULL'))[0].n).toBe(1)
    expect((await rows('SELECT count(*)::int n FROM whatsapp_nps_respostas n JOIN whatsapp_fila_envios f ON f.id=n.fila_id WHERE n.comentario IS NOT NULL'))[0].n).toBe(1)
    expect((await call('inovachat_retencao_limpar')).nps_anonimizadas).toBe(1)
    expect((await rows('SELECT count(*)::int n FROM whatsapp_nps_respostas'))[0].n).toBe(501)
  })
  it('contact erasure deletes linked NPS and audits count only, preserving other company', async () => {
    await db.exec(`INSERT INTO whatsapp_fila_envios VALUES ('${OTHER}','${OTHER}','5584999990000',now(),'enviada');
      INSERT INTO whatsapp_nps_respostas(company_id,fila_id,comentario,nota,categoria,respondida_em) VALUES ('${OTHER}','${OTHER}','Other company',10,'promotor',now());`)
    const r = (await rows('SELECT inovachat_excluir_contato_executar($1,$2,0) r', [CONTACT, PAT]))[0].r
    expect(r.nps_apagadas).toBe(1)
    expect((await rows('SELECT company_id,comentario FROM whatsapp_nps_respostas'))).toEqual([{ company_id: OTHER, comentario: 'Other company' }])
    const audit = (await rows('SELECT depois FROM whatsapp_auditoria'))[0].depois
    expect(audit.nps_apagadas).toBe(1)
    expect(JSON.stringify(audit)).not.toContain('Demora')
    expect(JSON.stringify(audit)).not.toContain('5584999990000')
  })
  it('resolves the patient conversation from the queue origin, not the patient ID', async () => {
    await db.exec('UPDATE whatsapp_nps_respostas SET paciente_id=NULL')
    expect((await rows('SELECT whatsapp_nps_conversa($1) r', [NPS]))[0].r).toEqual({ status: 'ok', conversa_id: CONV })
  })
  it('missing conversation returns a safe list destination', async () => {
    await db.exec(`DELETE FROM whatsapp_conversas WHERE id='${CONV}'`)
    expect((await rows('SELECT whatsapp_nps_conversa($1) r', [NPS]))[0].r).toEqual({ status: 'sem_conversa' })
  })
  it('sector restrictions prevent opening a hidden conversation', async () => {
    await db.exec("UPDATE whatsapp_conversas SET setor_id='denied'")
    await expect(rows('SELECT whatsapp_nps_conversa($1)', [NPS])).rejects.toThrow(/Sem permissão/)
  })
  it('a response from another company cannot resolve contact data', async () => {
    await db.exec(`UPDATE whatsapp_nps_respostas SET company_id='${OTHER}'`)
    await expect(rows('SELECT whatsapp_nps_conversa($1)', [NPS])).rejects.toThrow(/Sem permissão/)
  })
  it('anonymous callers cannot execute the resolver', async () => {
    await db.exec('SET ROLE anon')
    await expect(rows('SELECT whatsapp_nps_conversa($1)', [NPS])).rejects.toThrow(/permission denied/)
  })
  it('detractor notification routes through the same protected origin resolver', async () => {
    await rows('SELECT whatsapp__nps_avisar($1,$2,$3,$4)', [C, '5584999990000', 'Low rating', 'Rating 5'])
    expect((await rows('SELECT action_route FROM user_notifications'))[0].action_route).toBe(`/app/inovachat?nps=${NPS}`)
  })
})