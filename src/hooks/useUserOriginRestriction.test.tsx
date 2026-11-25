import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

let response: { data: unknown; error: unknown } = { data: null, error: null }
const mocks = vi.hoisted(() => {
  const maybeSingle = vi.fn()
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  return { maybeSingle, eq, select, from }
})

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }))

import { useUserOriginRestriction } from './useUserOriginRestriction'

describe('configuração de origens da Busca de Atendimentos', () => {
  beforeEach(() => {
    response = { data: null, error: null }
    vi.clearAllMocks()
    mocks.maybeSingle.mockImplementation(async () => response)
  })

  it('sem configuração salva, mantém a restrição desativada e todas as origens', async () => {
    const { result } = renderHook(() => useUserOriginRestriction('usuario-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.enabled).toBe(false)
    expect(result.current.originIds).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('carrega a ativação e todas as origens associadas ao usuário', async () => {
    response = { data: { enabled: true, origin_ids: ['origem-a', 'origem-b'] }, error: null }
    const { result } = renderHook(() => useUserOriginRestriction('usuario-1'))
    await waitFor(() => expect(result.current.enabled).toBe(true))
    expect(result.current.originIds).toEqual(['origem-a', 'origem-b'])
    expect(mocks.eq).toHaveBeenCalledWith('user_id', 'usuario-1')
  })

  it('falha de leitura não assume liberação de todas as origens', async () => {
    response = { data: null, error: { message: 'falha' } }
    const { result } = renderHook(() => useUserOriginRestriction('usuario-1'))
    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.enabled).toBe(false)
    expect(result.current.originIds).toEqual([])
  })

  it('modal fechado não consulta configuração', async () => {
    const { result } = renderHook(() => useUserOriginRestriction('usuario-1', false))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mocks.from).not.toHaveBeenCalled()
  })
})
