import { describe, it, expect } from 'vitest'
import { mensagemErroFuncao } from './erroFuncao'

describe('mensagemErroFuncao', () => {
  it('mostra a mensagem do servidor para e-mail já cadastrado', async () => {
    const erro = { message: 'Edge Function returned a non-2xx status code', context: new Response(JSON.stringify({ error: 'Este e-mail já está cadastrado' }), { status: 400 }) }
    expect(await mensagemErroFuncao(erro, 'Erro ao criar usuário')).toBe('Este e-mail já está cadastrado')
  })
  it('usa o texto padrão quando o corpo não traz mensagem', async () => {
    const erro = { context: new Response('falha', { status: 500 }) }
    expect(await mensagemErroFuncao(erro, 'Erro ao criar usuário')).toBe('Erro ao criar usuário')
  })
})
