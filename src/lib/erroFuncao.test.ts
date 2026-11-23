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

describe('mensagemErroFuncao com outros formatos de recusa', () => {
  it('lê "motivo" (Apoio) e "mensagem" (WhatsApp/InovaChat)', async () => {
    const motivo = { context: new Response(JSON.stringify({ ok: false, motivo: 'Somente administradores' }), { status: 403 }) }
    const mensagem = { context: new Response(JSON.stringify({ ok: false, mensagem: 'Este número não existe mais no servidor do WhatsApp.' }), { status: 404 }) }
    expect(await mensagemErroFuncao(motivo, 'x')).toBe('Somente administradores')
    expect(await mensagemErroFuncao(mensagem, 'x')).toBe('Este número não existe mais no servidor do WhatsApp.')
  })
  it('usa o motivo que já veio em data quando a resposta foi 200', async () => {
    expect(await mensagemErroFuncao(null, 'x', { ok: false, mensagem: 'Conversa encerrada' })).toBe('Conversa encerrada')
  })
})
