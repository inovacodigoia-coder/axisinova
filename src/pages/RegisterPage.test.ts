import { describe, expect, it } from 'vitest'
import { step1Schema } from './RegisterPage'
const company = { razaoSocial: 'Empresa teste', nomeFantasia: 'Teste', cnpj: '57.500.185/0001-10', segmento: 'laboratorio' }
describe('Cadastro — campos comerciais', () => {
  it('telefone comercial é opcional', () => {
    expect(step1Schema.safeParse({ ...company, emailComercial: 'teste@example.com' }).success).toBe(true)
    expect(step1Schema.safeParse({ ...company, telefone: '', emailComercial: 'teste@example.com' }).success).toBe(true)
    expect(step1Schema.safeParse({ ...company, telefone: '123', emailComercial: 'teste@example.com' }).success).toBe(false)
  })
  it('e-mail comercial é opcional, mas deve ser válido quando preenchido', () => {
    expect(step1Schema.safeParse({ ...company, telefone: '(84) 3333-4444' }).success).toBe(true)
    expect(step1Schema.safeParse({ ...company, emailComercial: '' }).success).toBe(true)
    expect(step1Schema.safeParse({ ...company, emailComercial: 'invalido' }).success).toBe(false)
  })
})