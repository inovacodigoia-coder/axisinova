import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checkCnpjExists, registerCompany } from './registration'

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), insert: vi.fn(), signOut: vi.fn(), signUp: vi.fn() }))
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc, from: () => ({ insert: mocks.insert }), auth: { signOut: mocks.signOut, signUp: mocks.signUp } } }))
const data = { razaoSocial: 'Empresa teste', nomeFantasia: 'Teste', cnpj: '57.500.185/0001-10', segmento: 'laboratorio', cep: '59000-000', logradouro: 'Rua teste', numero: '1', bairro: 'Centro', cidade: 'Natal', estado: 'RN', nomeCompleto: 'Administrador teste', cpf: '529.982.247-25', emailAdmin: 'teste@example.com', senha: 'NotUsed123!', plano: 'Pro' }
beforeEach(() => { vi.clearAllMocks(); mocks.rpc.mockResolvedValue({ data: false, error: null }); mocks.insert.mockResolvedValue({ error: null }); mocks.signUp.mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }) })
describe('Cadastro — CNPJ e contatos opcionais', () => {
  it('não apresenta falha de consulta como CNPJ disponível', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'unavailable' } })
    await expect(checkCnpjExists(data.cnpj)).rejects.toThrow('Não foi possível verificar o CNPJ')
  })
  it('bloqueia CNPJ realmente cadastrado', async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null })
    await expect(registerCompany(data)).rejects.toThrow('CNPJ já está cadastrado')
    expect(mocks.insert).not.toHaveBeenCalled()
  })
  it('não confunde outra chave duplicada com CNPJ duplicado', async () => {
    mocks.insert.mockResolvedValue({ error: { code: '23505', message: 'duplicate key violates unique constraint "origins_establishment_id_unique"' } })
    await expect(registerCompany(data)).rejects.toThrow('origins_establishment_id_unique')
  })
  it('identifica duplicidade na chave de CNPJ', async () => {
    mocks.insert.mockResolvedValue({ error: { code: '23505', message: 'duplicate key violates unique constraint "companies_cnpj_unique"' } })
    await expect(registerCompany(data)).rejects.toThrow('CNPJ já está cadastrado')
  })
  it('envia telefone e e-mail comerciais ausentes como null', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: false, error: null }).mockResolvedValueOnce({ data: 'test-company', error: null })
    await registerCompany(data)
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ telefone: null, email: null }))
  })
})