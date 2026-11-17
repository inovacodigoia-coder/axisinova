import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// Cadastro gratuito fica aguardando aprovação do Super Admin — PGlite isolado, sem dados reais.
let db: PGlite
const SUPER = '00000000-0000-4000-8000-0000000000f1'
const ADMIN_LAB = '00000000-0000-4000-8000-0000000000f2'
const LAB = '00000000-0000-4000-8000-00000000000a'
const MIG = process.env.CADASTRO_APROVACAO_MIG
  || `drizzle/migrations/${readdirSync('drizzle/migrations').find(f => /cadastro_aprovacao/.test(f))}`
const uma = async (sql: string) => (await db.query<Record<string, any>>(sql)).rows[0]
const como = (uid: string | null) => db.exec(`SELECT set_config('test.uid', '${uid ?? ''}', false)`)
const cadastrar = async (cnpj = '57.500.185/0001-10') => (await uma(`SELECT empresa_cadastro_publico('Clínica Nova','${cnpj}','Nova','clinica',null,null,null,'Pro','59000-000','Rua','1',null,'Centro','Natal','RN') id`)).id as string
let n = 0
const signUp = async (meta: Record<string, string>, app: Record<string, string> = { provider: 'email' }) => {
  const id = `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`
  await db.query(`INSERT INTO auth.users(id,email,raw_user_meta_data,raw_app_meta_data) VALUES($1,$2,$3,$4)`, [id, `u${n}@x.com`, JSON.stringify(meta), JSON.stringify(app)])
  return (await uma(`SELECT role, company_id, is_active FROM profiles WHERE id='${id}'`)) as { role: string; company_id: string | null; is_active: boolean }
}

beforeEach(async () => {
  n = 0
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth; CREATE SCHEMA private;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb, raw_app_meta_data jsonb, email_confirmed_at timestamptz);
    CREATE TYPE app_role AS ENUM ('company_admin','doctor','receptionist','other');
    CREATE TABLE companies(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, cnpj text, nome_fantasia text, segmento text, telefone text, email text, website text,
      plano text, status text DEFAULT 'active', cep text, logradouro text, numero text, complemento text, bairro text, cidade text, estado text, valor_mensal numeric, created_at timestamptz DEFAULT now());
    CREATE TABLE profiles(id uuid PRIMARY KEY, company_id uuid, full_name text, cpf text, role text DEFAULT 'company_admin', badge_code text, is_active boolean DEFAULT true, created_at timestamptz DEFAULT now());
    CREATE TABLE user_roles(user_id uuid, role app_role, UNIQUE(user_id, role));
    CREATE FUNCTION private.is_super_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') $$;
    INSERT INTO companies(id,name,cnpj,status) VALUES ('${LAB}','labsaude','11.111.111/0001-11','active');
    INSERT INTO profiles(id,company_id,role) VALUES ('${SUPER}',null,'super_admin'),('${ADMIN_LAB}','${LAB}','company_admin');
  `)
  await db.exec(readFileSync(MIG, 'utf8'))
  await db.exec(`CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`)
})
afterEach(async () => { await db.close() })

describe('Cadastro gratuito aguarda aprovação do Super Admin', () => {
  it('empresa do cadastro gratuito nasce "aguardando aprovação" e o administrador sem acesso', async () => {
    const id = await cadastrar()
    expect((await uma(`SELECT status, cadastro_publico FROM companies WHERE id='${id}'`))).toEqual({ status: 'pending', cadastro_publico: true })
    expect(await signUp({ role: 'company_admin', company_id: id, full_name: 'Dono' })).toEqual({ role: 'company_admin', company_id: id, is_active: false })
  })

  it('Super Admin aprova: empresa fica ativa e o administrador passa a entrar', async () => {
    const id = await cadastrar()
    await signUp({ role: 'company_admin', company_id: id })
    await como(SUPER)
    expect((await db.query(`SELECT * FROM empresa_cadastros_pendentes()`)).rows).toHaveLength(1)
    await db.exec(`SELECT empresa_aprovar_cadastro('${id}')`)
    expect((await uma(`SELECT status, cadastro_aprovado_por FROM companies WHERE id='${id}'`))).toEqual({ status: 'active', cadastro_aprovado_por: SUPER })
    expect((await uma(`SELECT is_active FROM profiles WHERE company_id='${id}'`)).is_active).toBe(true)
    expect((await db.query(`SELECT * FROM empresa_cadastros_pendentes()`)).rows).toHaveLength(0)
  })

  it('administrador de empresa não aprova cadastro nem vê a lista', async () => {
    const id = await cadastrar()
    await como(ADMIN_LAB)
    await expect(db.exec(`SELECT empresa_aprovar_cadastro('${id}')`)).rejects.toThrow(/Só o Super Admin/)
    await expect(db.exec(`SELECT * FROM empresa_cadastros_pendentes()`)).rejects.toThrow(/Só o Super Admin/)
  })

  it('não aprova de novo uma empresa que já está ativa', async () => {
    await como(SUPER)
    await expect(db.exec(`SELECT empresa_aprovar_cadastro('${LAB}')`)).rejects.toThrow(/não está aguardando aprovação/)
  })

  it('cadastro gratuito não entra em empresa existente nem vira Super Admin', async () => {
    expect(await signUp({ role: 'company_admin', company_id: LAB })).toEqual({ role: 'other', company_id: null, is_active: false })
    expect(await signUp({ role: 'super_admin' })).toEqual({ role: 'other', company_id: null, is_active: false })
  })

  it('só o primeiro administrador fica na empresa nova; um segundo cadastro é recusado', async () => {
    const id = await cadastrar()
    await signUp({ role: 'company_admin', company_id: id })
    expect(await signUp({ role: 'company_admin', company_id: id })).toEqual({ role: 'other', company_id: null, is_active: false })
  })

  it('usuário criado pelo sistema (Usuários) mantém empresa, função e acesso', async () => {
    expect(await signUp({ role: 'doctor', company_id: LAB }, { provider: 'email', provisionado: 'true' })).toEqual({ role: 'doctor', company_id: LAB, is_active: true })
  })
})
