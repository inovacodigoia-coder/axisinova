import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'

const cid = '00000000-0000-0000-0000-000000000001', other = '00000000-0000-0000-0000-000000000002'
const uid = '00000000-0000-0000-0000-000000000099', liberou = '00000000-0000-0000-0000-000000000098'
const pedido = '00000000-0000-0000-0000-0000000000c1'
const resLiberado = '00000000-0000-0000-0000-0000000000b1', resDigitado = '00000000-0000-0000-0000-0000000000b2'
const resOutraEmpresa = '00000000-0000-0000-0000-0000000000b3'

describe('Reteste exige desliberar — RPCs, trava e histórico', () => {
  let db: PGlite
  const estado = async (id: string) => (await db.query<{ status: string; retest_requested: boolean; released_by: string | null; released_at: string | null }>(
    'select status, retest_requested, released_by, released_at from lab_exam_results where id=$1', [id])).rows[0]

  beforeAll(async () => {
    db = new PGlite()
    await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
      CREATE FUNCTION get_user_company_id(uuid) RETURNS uuid LANGUAGE sql AS $$SELECT '${cid}'::uuid$$;
      CREATE TABLE companies(id uuid primary key);
      CREATE TABLE profiles(id uuid primary key, full_name text);
      CREATE TABLE attendance_orders(id uuid primary key, status text);
      CREATE TABLE lab_exam_results(id uuid primary key, company_id uuid, order_id uuid, protocol text, exam_ref text, exam_name text,
        status text, released_by uuid, released_at timestamptz);
      CREATE TABLE lab_result_values(id uuid primary key default gen_random_uuid(), result_id uuid, parameter_key text, parameter_name text,
        value text, unit text, source text, sort_order int);
      INSERT INTO companies VALUES('${cid}'),('${other}');
      INSERT INTO profiles VALUES('${uid}','Bioquímica Ana');
      INSERT INTO attendance_orders VALUES('${pedido}','completed');
      INSERT INTO lab_exam_results VALUES
        ('${resLiberado}','${cid}','${pedido}','1-00','${pedido}:e1','Hemograma','released','${liberou}',now()),
        ('${resDigitado}','${cid}',NULL,'1-01','p1:e2','Glicose','digitized',NULL,NULL),
        ('${resOutraEmpresa}','${other}',NULL,'2-00','p2:e1','Hemograma','released','${liberou}',now());
      INSERT INTO lab_result_values(result_id, parameter_key, parameter_name, value, unit, source, sort_order)
        VALUES ('${resLiberado}','hb','Hemoglobina','13.5','g/dL','instrument',0);
      SET test.uid='${uid}';`)
    await db.exec(readFileSync('drizzle/migrations/0141_lab_resultado_aparelho_reteste.sql', 'utf8'))
    await db.exec(readFileSync('drizzle/migrations/0176_lab_desliberar_reteste.sql', 'utf8'))
  }, 30000)
  afterAll(async () => { await db.close() })

  it('exame liberado: pedir reteste é recusado com o aviso de desliberar', async () => {
    await expect(db.query('select lab_solicitar_reteste($1)', [resLiberado]))
      .rejects.toThrow('Para solicitar reteste, deslibere o exame antes: clique em Desliberar.')
    expect((await estado(resLiberado)).retest_requested).toBe(false)
  })

  it('não dá para ligar reteste direto num exame liberado', async () => {
    await expect(db.query('update lab_exam_results set retest_requested = true where id=$1', [resLiberado]))
      .rejects.toThrow(/deslibere/)
  })

  it('desliberar exige motivo', async () => {
    await expect(db.query("select lab_desliberar_exame($1, '  ')", [resLiberado])).rejects.toThrow(/motivo/)
  })

  it('desliberar reabre o exame, grava quem/quando/motivo/valores e tira o pedido de concluído', async () => {
    await db.query("select lab_desliberar_exame($1, 'Reteste')", [resLiberado])
    const r = await estado(resLiberado)
    expect(r.status).toBe('digitized')
    expect(r.released_by).toBeNull()
    expect(r.released_at).toBeNull()
    const h = await db.query<{ motivo: string; desliberado_por: string; desliberado_por_nome: string; liberado_por_antes: string; valores: any }>(
      'select motivo, desliberado_por, desliberado_por_nome, liberado_por_antes, valores from lab_exam_desliberacao where result_id=$1', [resLiberado])
    expect(h.rows).toHaveLength(1)
    expect(h.rows[0]).toMatchObject({ motivo: 'Reteste', desliberado_por: uid, desliberado_por_nome: 'Bioquímica Ana', liberado_por_antes: liberou })
    expect(h.rows[0].valores).toEqual([{ parametro: 'hb', nome: 'Hemoglobina', valor: '13.5', unidade: 'g/dL', origem: 'instrument' }])
    const o = await db.query<{ status: string }>('select status from attendance_orders where id=$1', [pedido])
    expect(o.rows[0].status).toBe('in_analysis')
  })

  it('desliberar de novo um exame não liberado é recusado', async () => {
    await expect(db.query("select lab_desliberar_exame($1, 'Reteste')", [resLiberado])).rejects.toThrow(/não está liberado/)
  })

  it('exame desliberado: pedir reteste cria o pedido', async () => {
    await db.query('select lab_solicitar_reteste($1)', [resLiberado])
    expect((await estado(resLiberado)).retest_requested).toBe(true)
  })

  it('não libera com reteste pendente', async () => {
    await expect(db.query(`update lab_exam_results set status='released', released_by=$2, released_at=now() where id=$1`, [resLiberado, uid]))
      .rejects.toThrow(/aguarda o resultado do reteste/)
  })

  it('resultado novo consome o reteste e o exame pode ser liberado de novo', async () => {
    await db.query(`update lab_exam_results set retest_requested=false, retest_requested_by=null, retest_requested_at=null where id=$1`, [resLiberado])
    await db.query(`update lab_exam_results set status='released', released_by=$2, released_at=now() where id=$1`, [resLiberado, uid])
    const r = await estado(resLiberado)
    expect(r.status).toBe('released')
    expect(r.retest_requested).toBe(false)
  })

  it('histórico de desliberação não pode ser alterado nem apagado', async () => {
    await expect(db.query("update lab_exam_desliberacao set motivo='x'")).rejects.toThrow(/não pode ser alterado/)
    await expect(db.query('delete from lab_exam_desliberacao where result_id=$1', [resLiberado])).rejects.toThrow(/não pode ser alterado/)
  })

  it('não desliberar nem pedir reteste de exame de outra empresa', async () => {
    await expect(db.query("select lab_desliberar_exame($1, 'Reteste')", [resOutraEmpresa])).rejects.toThrow(/acesso/)
    await expect(db.query('select lab_solicitar_reteste($1)', [resOutraEmpresa])).rejects.toThrow(/acesso/)
  })

  it('cancelar reteste limpa o estado', async () => {
    await db.query('select lab_solicitar_reteste($1)', [resDigitado])
    await db.query('select lab_cancelar_reteste($1)', [resDigitado])
    const r = await db.query<{ retest_requested: boolean; retest_requested_by: string | null }>(
      'select retest_requested, retest_requested_by from lab_exam_results where id=$1', [resDigitado])
    expect(r.rows[0].retest_requested).toBe(false)
    expect(r.rows[0].retest_requested_by).toBeNull()
  })
})
