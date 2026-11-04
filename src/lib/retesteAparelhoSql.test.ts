import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'

const cid = '00000000-0000-0000-0000-000000000001', other = '00000000-0000-0000-0000-000000000002'
const uid = '00000000-0000-0000-0000-000000000099'
const resLiberado = '00000000-0000-0000-0000-0000000000b1', resDigitado = '00000000-0000-0000-0000-0000000000b2'
const resOutraEmpresa = '00000000-0000-0000-0000-0000000000b3'

describe('Reteste do aparelho — RPCs e histórico de valores', () => {
  let db: PGlite
  beforeAll(async () => {
    db = new PGlite()
    await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
      CREATE FUNCTION get_user_company_id(uuid) RETURNS uuid LANGUAGE sql AS $$SELECT '${cid}'::uuid$$;
      CREATE TABLE companies(id uuid primary key);
      CREATE TABLE lab_exam_results(id uuid primary key, company_id uuid, exam_ref text, status text,
        released_by uuid, released_at timestamptz);
      INSERT INTO companies VALUES('${cid}'),('${other}');
      INSERT INTO lab_exam_results VALUES
        ('${resLiberado}','${cid}','p1:e1','released','${uid}',now()),
        ('${resDigitado}','${cid}','p1:e2','digitized',NULL,NULL),
        ('${resOutraEmpresa}','${other}','p2:e1','released','${uid}',now());
      SET test.uid='${uid}';`)
    await db.exec(readFileSync('drizzle/migrations/0141_lab_resultado_aparelho_reteste.sql', 'utf8'))
  }, 30000)
  afterAll(async () => { await db.close() })

  it('solicitar reteste em exame liberado grava quem pediu e quando', async () => {
    await db.query('select lab_solicitar_reteste($1)', [resLiberado])
    const r = await db.query<{ retest_requested: boolean; retest_requested_by: string; retest_requested_at: string }>(
      'select retest_requested, retest_requested_by, retest_requested_at from lab_exam_results where id=$1', [resLiberado])
    expect(r.rows[0].retest_requested).toBe(true)
    expect(r.rows[0].retest_requested_by).toBe(uid)
    expect(r.rows[0].retest_requested_at).toBeTruthy()
  })

  it('recusa reteste em exame não liberado', async () => {
    await expect(db.query('select lab_solicitar_reteste($1)', [resDigitado]))
      .rejects.toThrow(/liberado/)
  })

  it('recusa reteste de exame de outra empresa', async () => {
    await expect(db.query('select lab_solicitar_reteste($1)', [resOutraEmpresa]))
      .rejects.toThrow(/acesso/)
  })

  it('cancelar reteste limpa o estado', async () => {
    await db.query('select lab_cancelar_reteste($1)', [resLiberado])
    const r = await db.query<{ retest_requested: boolean; retest_requested_by: string | null }>(
      'select retest_requested, retest_requested_by from lab_exam_results where id=$1', [resLiberado])
    expect(r.rows[0].retest_requested).toBe(false)
    expect(r.rows[0].retest_requested_by).toBeNull()
  })

  it('histórico guarda o valor substituído com motivo', async () => {
    await db.query(`insert into lab_result_value_history
      (company_id, result_id, parameter_key, parameter_name, value, unit, source, reason, replaced_by)
      values ($1,$2,'1','Glicose','7.09','mg/dL','instrument','reteste','instrument')`, [cid, resLiberado])
    const r = await db.query<{ value: string; reason: string }>(
      'select value, reason from lab_result_value_history where result_id=$1', [resLiberado])
    expect(r.rows).toEqual([{ value: '7.09', reason: 'reteste' }])
  })
})
