import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const calls: Array<{ method: string; args: unknown[] }> = []

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', companyId: 'c1', role: 'receptionist', name: 'Teste' } }),
}))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }))
let fakeRows: Array<{ id: string; created_at: string }> = []
vi.mock('@/integrations/supabase/client', () => {
  const builder: any = {}
  for (const m of ['select', 'eq', 'neq', 'gte', 'lte', 'in', 'not', 'order']) {
    builder[m] = (...args: unknown[]) => { calls.push({ method: m, args }); return builder }
  }
  // range(de, ate) devolve no máximo 1.000 linhas, como o servidor
  builder.range = (de: number, ate: number) => {
    calls.push({ method: 'range', args: [de, ate] })
    return Promise.resolve({ data: fakeRows.slice(de, Math.min(ate + 1, de + 1000)), error: null })
  }
  return { supabase: { from: () => builder } }
})

import { useAttendanceCadastro, STATUS_PENDENTES_ANALISE } from './useAttendanceCadastro'

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('lista de atendimentos', () => {
  beforeEach(() => { calls.length = 0; fakeRows = [] })

  it('com período, busca no servidor só os pedidos daquele intervalo', async () => {
    const range = { from: '2026-11-12T03:00:00.000Z', to: '2026-11-13T02:59:59.999Z' }
    renderHook(() => useAttendanceCadastro({ range }), { wrapper })
    await waitFor(() => expect(calls.some(c => c.method === 'range')).toBe(true))
    expect(calls).toContainEqual({ method: 'gte', args: ['created_at', range.from] })
    expect(calls).toContainEqual({ method: 'lte', args: ['created_at', range.to] })
    expect(calls).toContainEqual({ method: 'eq', args: ['company_id', 'c1'] })
  })

  it('sem período (busca por atendimento/amostra), não limita por data', async () => {
    renderHook(() => useAttendanceCadastro({ range: null }), { wrapper })
    await waitFor(() => expect(calls.some(c => c.method === 'range')).toBe(true))
    expect(calls.some(c => c.method === 'gte' || c.method === 'lte')).toBe(false)
    expect(calls).toContainEqual({ method: 'eq', args: ['company_id', 'c1'] })
  })

  it('a lista não traz colunas que nenhuma tela de lista mostra', async () => {
    renderHook(() => useAttendanceCadastro(), { wrapper })
    await waitFor(() => expect(calls.some(c => c.method === 'select')).toBe(true))
    const cols = String(calls.find(c => c.method === 'select')!.args[0])
    expect(cols).not.toContain('*')
    expect(cols).not.toMatch(/\bhospital_name\b|\bmedical_record_number\b|\bhospital_episode_id\b/)
    expect(cols).toContain('lab_guides')
  })

  it('com mais de 1.000 pedidos, busca em blocos até acabar e não perde nenhum', async () => {
    fakeRows = Array.from({ length: 2500 }, (_, i) => ({ id: `p${i}`, created_at: '2026-01-01T00:00:00Z' }))
    const { result } = renderHook(() => useAttendanceCadastro(), { wrapper })
    await waitFor(() => expect(result.current.orders.length).toBe(2500))
    expect(calls.filter(c => c.method === 'range').map(c => c.args)).toEqual([[0, 999], [1000, 1999], [2000, 2999]])
    expect(new Set(result.current.orders.map(o => o.id)).size).toBe(2500)
    expect(result.current.limitado).toBe(false)
  })

  it('fila por status: filtra no servidor só os pendentes, sem limitar por data', async () => {
    renderHook(() => useAttendanceCadastro({ statuses: STATUS_PENDENTES_ANALISE }), { wrapper })
    await waitFor(() => expect(calls.some(c => c.method === 'range')).toBe(true))
    expect(calls).toContainEqual({ method: 'in', args: ['status', ['collection_done', 'in_analysis', 'validation', 'released']] })
    expect(calls.some(c => c.method === 'gte' || c.method === 'lte')).toBe(false)
  })
})
