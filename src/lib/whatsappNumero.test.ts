import { describe, expect, it, vi } from 'vitest'
import { podeRemoverNumero, removerNumeroRemoto } from '../../supabase/functions/whatsapp-instancia/removerNumero'
import { nomePrincipalContato, perfilSecundarioContato } from './inovachatNome'
import { consultarValorNumero } from './whatsappNumeroValor'

describe('Pacote de ajustes — regras isoladas', () => {
  it('configuracoes.whatsapp autoriza somente a própria empresa', () => {
    expect(podeRemoverNumero(false, true, 'empresa-a', 'empresa-a')).toBe(true)
    expect(podeRemoverNumero(false, true, 'empresa-a', 'empresa-b')).toBe(false)
    expect(podeRemoverNumero(false, false, 'empresa-a', 'empresa-a')).toBe(false)
    expect(podeRemoverNumero(false, true, null, 'empresa-a')).toBe(false)
  })
  it('Super Admin pode remover qualquer empresa', () => {
    expect(podeRemoverNumero(true, false, null, 'empresa-b')).toBe(true)
  })
  it('desconecta, exclui na uazapi e só depois apaga local', async () => {
    const ordem: string[] = []
    await removerNumeroRemoto(true, async (metodo, caminho) => {
      ordem.push(`${metodo} ${caminho}`); return { status: 200, retryAfter: null }
    }, async () => { ordem.push('local') })
    expect(ordem).toEqual(['POST /instance/disconnect', 'DELETE /instance', 'local'])
  })
  it('instância desconectada vai direto à exclusão', async () => {
    const remoto = vi.fn(async () => ({ status: 200, retryAfter: null }))
    const local = vi.fn(async () => {})
    await removerNumeroRemoto(false, remoto, local)
    expect(remoto.mock.calls).toEqual([['DELETE', '/instance']]); expect(local).toHaveBeenCalledOnce()
  })
  it.each([0, 400, 401, 404, 429, 500, 504])('falha remota %i preserva local e token', async status => {
    const local = vi.fn(async () => {})
    expect(await removerNumeroRemoto(false, async () => ({ status, retryAfter: null }), local)).toEqual({ status, retryAfter: null })
    expect(local).not.toHaveBeenCalled()
  })
  it('falha ao desconectar não tenta DELETE nem apaga local', async () => {
    const remoto = vi.fn(async () => ({ status: 503, retryAfter: null }))
    const local = vi.fn(async () => {})
    await removerNumeroRemoto(true, remoto, local)
    expect(remoto).toHaveBeenCalledOnce(); expect(local).not.toHaveBeenCalled()
  })
  it('valor vem da consulta configurada, inclusive zero, sem preço fixo', async () => {
    expect(await consultarValorNumero(async () => ({ data: '275.50', error: null }))).toBe(275.5)
    expect(await consultarValorNumero(async () => ({ data: 0, error: null }))).toBe(0)
  })
  it('falha na consulta de preço não inventa valor', async () => {
    await expect(consultarValorNumero(async () => ({ data: null, error: new Error('falha') }))).rejects.toThrow()
  })
  it('vínculo usa nome do paciente e mantém perfil secundário separado', () => {
    const c = { paciente_id: 'paciente', paciente: { name: 'João Paciente' }, nome_exibicao: 'Jo@b' }
    expect(nomePrincipalContato(c, 'telefone')).toBe('João Paciente')
    expect(perfilSecundarioContato(c)).toBe('no WhatsApp: Jo@b')
  })
  it('sem vínculo mantém nome WhatsApp ou telefone', () => {
    const c = { paciente_id: null, paciente: null, nome_exibicao: 'Jo@b' }
    expect(nomePrincipalContato(c, 'telefone')).toBe('Jo@b'); expect(perfilSecundarioContato(c)).toBeNull()
    expect(nomePrincipalContato({ ...c, nome_exibicao: null }, 'telefone')).toBe('telefone')
  })
})