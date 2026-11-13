import { describe, expect, it } from 'vitest'
import {
  INATIVIDADE_ADIAR_MAX_MS, faseInatividade, podeEncerrar, rotaAutenticada,
  sortearDesvioSeg, tempoBaseMin, tempoLimiteMs,
} from './sessaoInatividade'

const ids = Array.from({ length: 3000 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`)

describe('logout por inatividade escalonado', () => {
  it('cada usuário recebe 30, 45 ou 60 min e sempre o mesmo', () => {
    for (const id of ids.slice(0, 50)) {
      expect([30, 45, 60]).toContain(tempoBaseMin(id))
      expect(tempoBaseMin(id)).toBe(tempoBaseMin(id))
    }
  })

  it('os usuários se dividem entre 30, 45 e 60 min (nenhum grupo com menos de 25%)', () => {
    const cont: Record<number, number> = { 30: 0, 45: 0, 60: 0 }
    ids.forEach(id => { cont[tempoBaseMin(id)]++ })
    for (const v of [30, 45, 60]) expect(cont[v] / ids.length).toBeGreaterThan(0.25)
  })

  it('desvio da sessão fica entre 0 e 120 segundos', () => {
    expect(sortearDesvioSeg(() => 0)).toBe(0)
    expect(sortearDesvioSeg(() => 0.999999)).toBe(120)
    expect(sortearDesvioSeg(() => 0.5)).toBe(60)
  })

  it('limite = tempo do usuário + desvio; empresa com tempo menor prevalece', () => {
    const id = ids.find(i => tempoBaseMin(i) === 60)!
    expect(tempoLimiteMs(id, 30)).toBe(60 * 60_000 + 30_000)
    expect(tempoLimiteMs(id, 30, 480)).toBe(60 * 60_000 + 30_000)
    expect(tempoLimiteMs(id, 0, 20)).toBe(20 * 60_000)
  })

  it('aviso aparece 60 s antes e expira no limite', () => {
    const limite = 30 * 60_000
    expect(faseInatividade(limite - 61_000, 0, limite)).toEqual({ fase: 'ativo' })
    expect(faseInatividade(limite - 60_000, 0, limite)).toEqual({ fase: 'aviso', segundos: 60 })
    expect(faseInatividade(limite - 1, 0, limite)).toEqual({ fase: 'aviso', segundos: 1 })
    expect(faseInatividade(limite, 0, limite)).toEqual({ fase: 'expirar' })
  })

  it('com salvamento em andamento espera, mas no máximo 5 min', () => {
    expect(podeEncerrar(false, null, 0)).toBe(true)
    expect(podeEncerrar(true, 1000, 1000 + 60_000)).toBe(false)
    expect(podeEncerrar(true, 1000, 1000 + INATIVIDADE_ADIAR_MAX_MS)).toBe(true)
    expect(INATIVIDADE_ADIAR_MAX_MS).toBe(5 * 60_000)
  })

  it('só vale em rotas autenticadas', () => {
    expect(rotaAutenticada('/app/dashboard')).toBe(true)
    expect(rotaAutenticada('/superadmin/empresas')).toBe(true)
    expect(rotaAutenticada('/login')).toBe(false)
    expect(rotaAutenticada('/totem')).toBe(false)
    expect(rotaAutenticada('/painel-tv')).toBe(false)
    expect(rotaAutenticada('/portal/abc')).toBe(false)
    expect(rotaAutenticada('/resultado')).toBe(false)
    expect(rotaAutenticada('/application')).toBe(false)
  })
})
