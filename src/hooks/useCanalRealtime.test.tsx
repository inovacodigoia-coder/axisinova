import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const canais: any[] = []
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn((nome: string) => {
      const c: any = { nome, on: vi.fn(() => c), subscribe: vi.fn(() => c) }
      canais.push(c)
      return c
    }),
    removeChannel: vi.fn(),
  },
}))
vi.mock('@/lib/queryClient', () => ({ queryClient: { invalidateQueries: vi.fn() } }))

import { supabase } from '@/integrations/supabase/client'
import { pausaRealtime } from '@/lib/realtimePausa'
import { useCanalRealtime } from './useCanalRealtime'

describe('useCanalRealtime', () => {
  beforeEach(() => { canais.length = 0; vi.clearAllMocks() })

  it('remove o canal ao desmontar e não duplica ao re-renderizar', () => {
    const { rerender, unmount } = renderHook(() => useCanalRealtime('x', c => c, ['a']))
    rerender(); rerender()
    expect(supabase.channel).toHaveBeenCalledTimes(1)
    unmount()
    expect(supabase.removeChannel).toHaveBeenCalledWith(canais[0])
  })

  it('sem nome (sem empresa) não assina', () => {
    renderHook(() => useCanalRealtime(null, c => c, []))
    expect(supabase.channel).not.toHaveBeenCalled()
  })

  it('pausa remove o canal; retomada reassina e recarrega uma vez', () => {
    vi.useFakeTimers()
    const aoRetomar = vi.fn()
    renderHook(() => useCanalRealtime('fila', c => c, [], { aoRetomar }))
    expect(supabase.channel).toHaveBeenCalledTimes(1)
    act(() => { pausaRealtime.visibilidade(false); vi.advanceTimersByTime(2 * 60_000) })
    expect(supabase.removeChannel).toHaveBeenCalledTimes(1)
    act(() => { pausaRealtime.visibilidade(true) })
    expect(supabase.channel).toHaveBeenCalledTimes(2)
    expect(aoRetomar).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('tela crítica (manterEmSegundoPlano) não pausa', () => {
    vi.useFakeTimers()
    renderHook(() => useCanalRealtime('chat', c => c, [], { manterEmSegundoPlano: true }))
    act(() => { pausaRealtime.visibilidade(false); vi.advanceTimersByTime(3 * 60_000) })
    expect(supabase.removeChannel).not.toHaveBeenCalled()
    act(() => { pausaRealtime.visibilidade(true) })
    expect(supabase.channel).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
