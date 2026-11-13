import { describe, it, expect, vi } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const assinaturas: Array<(e: string, s: unknown) => void> = []
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { onAuthStateChange: vi.fn((cb: (e: string, s: unknown) => void) => { assinaturas.push(cb); return { data: { subscription: { unsubscribe() {} } } } }) } },
}))

describe('authEventos', () => {
  it('uma única assinatura para vários ouvintes, com aviso adiado para fora do callback', async () => {
    vi.useFakeTimers()
    const { aoMudarAutenticacao, aoEntrarOuRenovar } = await import('./authEventos')
    const a = vi.fn(); const b = vi.fn()
    const cancelarA = aoMudarAutenticacao(a)
    aoEntrarOuRenovar(b)
    expect(assinaturas.length).toBe(1)

    assinaturas[0]('SIGNED_IN', null)
    expect(a).not.toHaveBeenCalled() // nada roda dentro do callback
    vi.runAllTimers()
    expect(a).toHaveBeenCalledWith('SIGNED_IN', null)
    expect(b).toHaveBeenCalledTimes(1)

    cancelarA()
    assinaturas[0]('TOKEN_REFRESHED', null)
    vi.runAllTimers()
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it('nenhum outro arquivo do app assina onAuthStateChange diretamente', () => {
    const achados: string[] = []
    const varrer = (dir: string) => {
      for (const nome of readdirSync(dir)) {
        const p = join(dir, nome)
        if (statSync(p).isDirectory()) { if (nome !== 'integrations') varrer(p); continue }
        if (!/\.(ts|tsx)$/.test(nome) || /\.test\./.test(nome) || p.endsWith(join('lib', 'authEventos.ts'))) continue
        if (readFileSync(p, 'utf8').includes('onAuthStateChange(')) achados.push(p)
      }
    }
    varrer(join(process.cwd(), 'src'))
    expect(achados).toEqual([])
  })
})
