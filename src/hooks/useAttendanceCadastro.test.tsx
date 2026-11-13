import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const calls: Array<{ method: string; args: unknown[] }> = []

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', companyId: 'c1', role: 'receptionist', name: 'Teste' } }),
}))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }))
vi.mock('@/integrations/supabase/client', () => {
  const builder: any = {}
  for (const m of ['select', 'eq', 'neq', 'gte', 'lte']) {
    builder[m] = (...args: unknown[]) => { calls.push({ method: m, args }); return builder }
  }
  builder.order = (...args: unknown[]) => { calls.push({ method: 'order', args }); return Promise.resolve({ data: [], error: null }) }
  return { supabase: { from: () => builder } }
})

import { useAttendanceCadastro } from './useAttendanceCadastro'

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('lista de atendimentos', () => {
  beforeEach(() => { calls.length = 0 })

  it('com período, busca no servidor só os pedidos daquele intervalo', async () => {
    const range = { from: '2026-11-12T03:00:00.000Z', to: '2026-11-13T02:59:59.999Z' }
    renderHook(() => useAttendanceCadastro({ range }), { wrapper })
    await waitFor(() => expect(calls.some(c => c.method === 'order')).toBe(true))
    expect(calls).toContainEqual({ method: 'gte', args: ['created_at', range.from] })
    expect(calls).toContainEqual({ method: 'lte', args: ['created_at', range.to] })
    expect(calls).toContainEqual({ method: 'eq', args: ['company_id', 'c1'] })
  })

  it('sem período (busca por atendimento/amostra), não limita por data', async () => {
    renderHook(() => useAttendanceCadastro({ range: null }), { wrapper })
    await waitFor(() => expect(calls.some(c => c.method === 'order')).toBe(true))
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
})
