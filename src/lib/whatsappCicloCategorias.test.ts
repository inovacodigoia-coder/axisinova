// Executa as funções SQL reais em PostgreSQL isolado; nenhum acesso à produção ou ao WhatsApp.
// @vitest-environment node
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const original = readFileSync('drizzle/migrations/0098_whatsapp_automacoes_ciclo_11a.sql', 'utf8')
const migration = readFileSync('drizzle/migrations/0099_whatsapp_ciclo_categorias_frequencia_optout.sql', 'utf8')
const company = '00000000-0000-4000-8000-000000000001'
const appointment = '00000000-0000-4000-8000-000000000002'
const contact = '00000000-0000-4000-8000-000000000003'
const instance = '00000000-0000-4000-8000-000000000004'
const phone = '5584999990000'
let db: PGlite

const functionSql = (name: string) => {
  const start = original.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`)
  if (start < 0) throw new Error(`Função ausente: ${name}`)
  const tail = original.slice(start)
  const end = tail.match(/END (\$\$|\$function\$);/)
  if (!end || end.index === undefined) throw new Error(`Fim ausente: ${name}`)
  return tail.slice(0, end.index + end[0].length)
}
async function clock(time: string) {
  await db.exec(`CREATE OR REPLACE FUNCTION public.fixture_now() RETURNS timestamptz LANGUAGE sql AS $$ SELECT '${time}'::timestamptz $$;`)
}
async function reserve() {
  return (await db.query('SELECT * FROM public.whatsapp_reservar_envios()')).rows
}
async function releaseInstance() {
  await db.exec('UPDATE whatsapp_instancias SET proximo_envio_apos=NULL;')
}
async function enqueue(type: string) {
  return (await db.query<{ result: string }>('SELECT whatsapp__ciclo_um($1,$2,fixture_now()) AS result', [appointment, type])).rows[0]?.result
}

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
    CREATE FUNCTION get_user_company_id(uuid) RETURNS uuid LANGUAGE sql AS $$ SELECT '${company}'::uuid $$;
    CREATE FUNCTION inovachat_usuario_tem(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
    CREATE FUNCTION whatsapp_normalizar_celular(text) RETURNS text LANGUAGE sql AS $$ SELECT $1 $$;
    CREATE FUNCTION whatsapp_tel_canonico(text) RETURNS text LANGUAGE sql AS $$ SELECT $1 $$;
    CREATE FUNCTION whatsapp_nome_responsavel(uuid,uuid) RETURNS text LANGUAGE sql AS $$ SELECT 'Fixture' $$;
    CREATE FUNCTION whatsapp_render_modelo(text,text,text,boolean,text,timestamptz,text) RETURNS text LANGUAGE sql AS $$ SELECT $1 $$;
    CREATE FUNCTION whatsapp_cabecalho(text,text) RETURNS text LANGUAGE sql AS $$ SELECT $2 $$;
    CREATE TABLE companies(id uuid, whatsapp_habilitado boolean, name text, nome_fantasia text);
    CREATE TABLE whatsapp_config_empresa(company_id uuid, envio_automatico_ativo boolean, ciclo_pausado boolean, ciclo_limite_dia int, ciclo_limite_semana int, janela_inicio time, janela_fim time);
    CREATE TABLE whatsapp_instancias(id uuid, company_id uuid, status text, ativo_no_rodizio boolean, proximo_envio_apos timestamptz, limite_diario int, ultimo_envio_em timestamptz);
    CREATE TABLE appointments(id uuid, company_id uuid, patient_id uuid, patient_name text, patient_phone1 text, patient_phone2 text, visit_type text, appointment_type text, doctor_id uuid, doctor text, date date, time time, status text, sched_status text, created_by uuid);
    CREATE TABLE patients(id uuid, name text, phone text, phone2 text);
    CREATE TABLE whatsapp_contatos(id uuid, company_id uuid, telefone text, paciente_id uuid, nome_exibicao text);
    CREATE TABLE whatsapp_automacoes(id uuid DEFAULT gen_random_uuid(), company_id uuid, tipo text, ativo boolean, filtro_tipos_atendimento text[], filtro_medicos uuid[], ordem int, criado_em timestamptz DEFAULT now(), deslocamento_minutos int, horario_fixo time, texto text, incluir_aviso_saida boolean);
    CREATE TABLE whatsapp_fila_envios(id uuid DEFAULT gen_random_uuid(), company_id uuid, tipo text, agendamento_id uuid, telefone_destino text, texto_final text, ciclo_adiamentos int DEFAULT 0, status text, instancia_id uuid, agendada_para timestamptz, enviada_em timestamptz, atualizado_em timestamptz DEFAULT now(), criado_em timestamptz DEFAULT now(), paciente_nome text, criado_por uuid, responsavel_nome text, automacao_id uuid, formato_envio text, erro text);
    CREATE TABLE whatsapp_optout(company_id uuid, telefone text, origem text, criado_por uuid, UNIQUE(company_id,telefone));
    CREATE TABLE whatsapp_automacoes_auditoria(company_id uuid, acao text, dados_novos jsonb, usuario_id uuid);
    CREATE FUNCTION whatsapp_optout_tem(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS(SELECT 1 FROM whatsapp_optout WHERE company_id=$1 AND telefone=$2) $$;
  `)
  const names = ['whatsapp__ciclo_um', 'whatsapp_reservar_envios', 'whatsapp_optout_processar', 'inovachat_optout_definir']
  for (const name of names) await db.exec(functionSql(name))
  // Guards protect production definitions, not fixture formatting across PostgreSQL versions.
  await db.exec(migration.replace(/IF md5\(d\) <> '[a-f0-9]+' THEN RAISE EXCEPTION '[^']+'; END IF;/g, ''))
  await clock('2026-10-19 17:00:00-03')
  for (const name of names) {
    const def = (await db.query<{ def: string }>('SELECT pg_get_functiondef(oid) AS def FROM pg_proc WHERE proname=$1', [name])).rows[0]?.def
    if (!def) throw new Error(`Função ausente: ${name}`)
    await db.exec(def.replaceAll('now()', 'public.fixture_now()'))
  }
  await db.exec(`
    INSERT INTO companies VALUES ('${company}',true,'Fixture',NULL);
    INSERT INTO whatsapp_config_empresa VALUES ('${company}',true,false,1,3,'07:00','20:00');
    INSERT INTO whatsapp_instancias VALUES ('${instance}','${company}','connected',true,NULL,NULL,NULL);
    INSERT INTO appointments VALUES ('${appointment}','${company}',NULL,'Fixture','${phone}',NULL,'first_visit','exam',NULL,'Fixture','2026-10-20','09:00','waiting','scheduled',NULL);
    INSERT INTO whatsapp_contatos VALUES ('${contact}','${company}','${phone}',NULL,'Fixture');
    INSERT INTO whatsapp_automacoes(company_id,tipo,ativo,ordem,deslocamento_minutos,horario_fixo,texto,incluir_aviso_saida) VALUES
      ('${company}','inclusao_agenda',true,1,5,NULL,'Fixture',false),
      ('${company}','pre_atendimento',true,2,1440,'18:00','Fixture',false),
      ('${company}','pos_atendimento',true,3,120,NULL,'Fixture',true);
  `)
}, 30000)
afterEach(async () => { await db.close() })

describe('categorias de ciclo — regras SQL', () => {
  it.each(['inclusao_agenda', 'pre_atendimento'])('classifica %s como serviço', async type => {
    expect((await db.query('SELECT whatsapp_automacao_categoria($1) AS categoria', [type])).rows).toEqual([{ categoria: 'servico' }])
  })
  it.each(['pos_atendimento','nps','avaliacao_google','aniversario','indicacao','atualizacao_cadastral','questionario','novo_tipo'])('classifica %s como relacionamento', async type => {
    expect((await db.query('SELECT whatsapp_automacao_categoria($1) AS categoria', [type])).rows).toEqual([{ categoria: 'relacionamento' }])
  })
  it('criado às 17:00 para amanhã às 09:00: ambos os serviços saem hoje, sem contar frequência', async () => {
    expect(await enqueue('inclusao_agenda')).toBe('ENFILEIRADA')
    expect(await enqueue('pre_atendimento')).toBe('ENFILEIRADA')
    await clock('2026-10-19 17:05:00-03')
    expect(await reserve()).toHaveLength(1)
    await releaseInstance()
    await clock('2026-10-19 18:00:00-03')
    expect(await reserve()).toHaveLength(1)
    expect((await db.query('SELECT tipo,status,ciclo_adiamentos FROM whatsapp_fila_envios ORDER BY tipo')).rows).toEqual([
      { tipo: 'ciclo_inclusao_agenda', status: 'enviando', ciclo_adiamentos: 0 },
      { tipo: 'ciclo_pre_atendimento', status: 'enviando', ciclo_adiamentos: 0 },
    ])
    await db.exec("UPDATE appointments SET sched_status='completed';")
    expect(await enqueue('pos_atendimento')).toBe('ENFILEIRADA')
    await releaseInstance()
    await clock('2026-10-19 19:59:00-03')
    await db.exec("UPDATE whatsapp_fila_envios SET agendada_para=fixture_now() WHERE tipo='ciclo_pos_atendimento';")
    expect(await reserve()).toHaveLength(1)
  })
  it('dois pós-atendimentos do mesmo telefone: segundo adiado para amanhã às 09:00', async () => {
    await db.exec(`INSERT INTO whatsapp_fila_envios(company_id,tipo,telefone_destino,status,agendada_para) VALUES
      ('${company}','ciclo_pos_atendimento','${phone}','agendada',fixture_now()),
      ('${company}','ciclo_pos_atendimento','${phone}','agendada',fixture_now());`)
    expect(await reserve()).toHaveLength(1)
    await releaseInstance()
    expect(await reserve()).toHaveLength(0)
    expect((await db.query("SELECT ciclo_adiamentos, to_char(agendada_para AT TIME ZONE 'America/Fortaleza','YYYY-MM-DD HH24:MI') AS horario FROM whatsapp_fila_envios WHERE status='agendada'")).rows).toEqual([{ ciclo_adiamentos: 1, horario: '2026-10-20 09:00' }])
    await clock('2026-10-20 09:00:00-03')
    expect(await reserve()).toHaveLength(1)
  })
  it('limite de 3 em 7 dias considera só relacionamento e respeita os valores configurados', async () => {
    await db.exec(`UPDATE whatsapp_config_empresa SET ciclo_limite_dia=2;
      INSERT INTO whatsapp_fila_envios(company_id,tipo,telefone_destino,status,enviada_em) SELECT '${company}','ciclo_pos_atendimento','${phone}','enviada',fixture_now()-i*interval '1 day' FROM generate_series(1,3) i;
      INSERT INTO whatsapp_fila_envios(company_id,tipo,telefone_destino,status,agendada_para) VALUES ('${company}','ciclo_pos_atendimento','${phone}','agendada',fixture_now());`)
    expect(await reserve()).toHaveLength(0)
    expect((await db.query("SELECT ciclo_adiamentos FROM whatsapp_fila_envios WHERE status='agendada'")).rows).toEqual([{ ciclo_adiamentos: 1 }])
  })
  it.each(['paciente','manual'])('SAIR %s cancela só relacionamento; serviço e confirmação continuam', async origem => {
    await db.exec(`INSERT INTO whatsapp_fila_envios(company_id,tipo,telefone_destino,status,agendada_para) SELECT '${company}',tipo,'${phone}','agendada',fixture_now() FROM unnest(ARRAY['ciclo_inclusao_agenda','ciclo_pre_atendimento','ciclo_pos_atendimento','confirmacao_agendamento']) tipo;`)
    if (origem === 'paciente') await db.query("SELECT whatsapp_optout_processar($1,$2,'sair')", [instance,phone])
    else await db.query('SELECT inovachat_optout_definir($1,true)', [contact])
    expect((await db.query("SELECT tipo,status FROM whatsapp_fila_envios WHERE tipo<>'resposta_automatica' ORDER BY tipo")).rows).toEqual([
      { tipo: 'ciclo_inclusao_agenda', status: 'agendada' },
      { tipo: 'ciclo_pos_atendimento', status: 'cancelada' },
      { tipo: 'ciclo_pre_atendimento', status: 'agendada' },
      { tipo: 'confirmacao_agendamento', status: 'agendada' },
    ])
    await db.exec("DELETE FROM whatsapp_fila_envios; UPDATE appointments SET sched_status='completed';")
    expect(await enqueue('inclusao_agenda')).toBe('ENFILEIRADA')
    expect(await enqueue('pre_atendimento')).toBe('ENFILEIRADA')
    expect(await enqueue('pos_atendimento')).toBe('OPTOUT')
    await clock('2026-10-19 18:00:00-03')
    expect(await reserve()).toHaveLength(1)
    await releaseInstance()
    expect(await reserve()).toHaveLength(1)
  })
})