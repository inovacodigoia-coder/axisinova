import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'

describe('Labsaude — lote operacional autorizado', () => {
  let db: PGlite
  const seed = readFileSync('src/lib/labsaudeInventorySeed.sql', 'utf8')
  beforeAll(async () => {
    db = new PGlite()
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT NULL::uuid$$;
      CREATE FUNCTION get_user_company_id(uuid) RETURNS uuid LANGUAGE sql AS $$SELECT NULL::uuid$$;
      CREATE FUNCTION is_company_manager(uuid) RETURNS boolean LANGUAGE sql AS $$SELECT false$$;
      CREATE TABLE company_sectors(id text PRIMARY KEY,company_id uuid,name text,is_active boolean,allowed_profile_ids text[]);
      CREATE TABLE sector_users(user_id uuid,company_id uuid,sector_id text);
      CREATE TABLE access_profiles(id text,company_id uuid,is_active boolean,permissions jsonb);
      CREATE TABLE farmacia_medicamentos(id uuid PRIMARY KEY,company_id uuid,codigo int,nome text,principio_ativo text,apresentacao text,forma text,unidade text,ativo boolean,created_by uuid);
      INSERT INTO company_sectors VALUES('43d71e18-2182-4c40-a640-7f3d6626d8cd','7858af33-878e-40c4-9305-e912cc6655c3','Pronto Atendimento Adulto',true,'{}');`)
    await db.exec(readFileSync('drizzle/migrations/0134_almoxarifado_solicitacoes_setores.sql', 'utf8'))
    await db.exec(seed)
  }, 30000)
  afterAll(async () => { await db.close() })
  it('contém dez itens apenas na Labsaude', async () => {
    expect((await db.query<{n:number}>('select count(*)::int n from almox_itens')).rows[0].n).toBe(10)
    expect((await db.query<{n:number}>("select count(*)::int n from almox_itens where company_id <> '7858af33-878e-40c4-9305-e912cc6655c3'")).rows[0].n).toBe(0)
  })
  it('contém cinco solicitações: três aprovadas e duas recusadas', async () => {
    expect((await db.query('select status,count(*)::int n from almox_solicitacoes group by status order by status')).rows).toEqual([{status:'aprovada',n:3},{status:'recusada',n:2}])
  })
  it('farmácia tem saldos baixos 2 e 3 e normais 40 e 60', async () => {
    expect((await db.query<{q:string}>("select quantidade q from almox_saldos where local='farmacia' order by quantidade")).rows.map(r=>Number(r.q))).toEqual([2,3,40,60])
  })
  it('recusas não transferem; cada item conserva as 100 unidades iniciais', async () => {
    expect((await db.query<{n:number}>("select count(*)::int n from almox_movimentos m join almox_solicitacoes s on s.id=m.solicitacao_id where s.status='recusada'")).rows[0].n).toBe(0)
    expect((await db.query<{q:string}>('select sum(quantidade) q from almox_saldos group by item_id')).rows.map(r=>Number(r.q))).toEqual(Array(10).fill(100))
  })
  it('medicamentos de teste estão inativos e vinculados ao estoque', async () => {
    expect((await db.query<{n:number}>('select count(*)::int n from farmacia_medicamentos where ativo')).rows[0].n).toBe(0)
    expect((await db.query<{n:number}>("select count(*)::int n from almox_itens i join farmacia_medicamentos m on m.id=i.medicamento_id join almox_saldos s on s.item_id=i.id where s.local='farmacia'")).rows[0].n).toBe(4)
  })
  it('reexecutar não duplica solicitações, estoque ou movimentações', async () => {
    await db.exec(seed)
    expect((await db.query('select (select count(*)::int from almox_itens) itens,(select count(*)::int from almox_solicitacoes) pedidos,(select count(*)::int from almox_movimentos) movimentos,(select sum(quantidade)::int from almox_saldos) saldo')).rows[0]).toEqual({itens:10,pedidos:5,movimentos:17,saldo:1000})
  })
})