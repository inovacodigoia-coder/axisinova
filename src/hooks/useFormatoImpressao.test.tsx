import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useFormatoImpressao } from './useFormatoImpressao'

const mock = vi.hoisted(() => ({ user: { id: 'u1', companyId: 'c1' }, rows: new Map<string, any>(), writes: vi.fn() }))
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: mock.user }) }))
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({
  select: () => ({ eq: (_: string, user: string) => ({ eq: async (_: string, company: string) => ({
    data: [...mock.rows.values()].filter(row => row.user_id === user && row.company_id === company), error: null,
  }) }) }),
  upsert: async (row: any) => { mock.writes(row); mock.rows.set(`${row.user_id}:${row.company_id}:${row.documento}`, row); return { error: null } },
}) } }))

beforeEach(() => { mock.rows.clear(); mock.writes.mockClear(); mock.user = { id: 'u1', companyId: 'c1' } })
afterEach(cleanup)
const abrir = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return renderHook(() => useFormatoImpressao(true), {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  })
}

it('A4 continua salvo depois de fechar e abrir com uma sessão sem cache', async () => {
  const primeiro = abrir()
  await waitFor(() => expect(primeiro.result.current.carregando).toBe(false))
  await act(async () => { await primeiro.result.current.guardar('comprovante', 'A4') })
  primeiro.unmount()
  const segundo = abrir()
  await waitFor(() => expect(segundo.result.current.formatos.comprovante).toBe('A4'))
  expect(segundo.result.current.formatos.controle_interno).toBeUndefined()
})

it('preferências não passam para outro usuário nem outra empresa', async () => {
  mock.rows.set('u1:c1:comprovante', { user_id: 'u1', company_id: 'c1', documento: 'comprovante', formato: 'A4' })
  mock.user = { id: 'u2', companyId: 'c1' }
  const outroUsuario = abrir()
  await waitFor(() => expect(outroUsuario.result.current.carregando).toBe(false))
  expect(outroUsuario.result.current.formatos).toEqual({})
  outroUsuario.unmount()
  mock.user = { id: 'u1', companyId: 'c2' }
  const outraEmpresa = abrir()
  await waitFor(() => expect(outraEmpresa.result.current.carregando).toBe(false))
  expect(outraEmpresa.result.current.formatos).toEqual({})
})