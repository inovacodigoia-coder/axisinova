import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { InstrumentGraphicsSection } from './InstrumentGraphicsSection'

const { query, ROW } = vi.hoisted(() => {
  const row = {
    id: 'g1',
    label: 'SUB SCATTERGRAM',
    item_code: 'SS-FS',
    image_format: 'PNG',
    image_base64: 'AAAA',
    equipment_id: 'CELLME',
    created_at: '2026-10-30T18:48:00.000Z',
  }
  const q: any = {}
  for (const m of ['select', 'eq', 'order', 'limit']) q[m] = () => q
  q.then = (res: any) => Promise.resolve({ data: [row] }).then(res)
  return { query: q, ROW: row }
})

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => query } }))
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { companyId: '00000000-0000-0000-0000-000000000001' } }),
}))

afterEach(() => { cleanup(); vi.clearAllMocks() })

it('abre o gráfico ampliado com botão Fechar ao clicar na miniatura', async () => {
  render(<InstrumentGraphicsSection protocol="12-00" />)

  const miniatura = await screen.findByRole('button', { name: /ampliar gráfico sub scattergram/i })
  fireEvent.click(miniatura)

  const fechar = await screen.findByRole('button', { name: /^fechar$/i })
  const imagemAmpliada = document.querySelectorAll('[role="dialog"] img')
  expect(imagemAmpliada).toHaveLength(1)
  expect(imagemAmpliada[0].getAttribute('src')).toBe('data:image/png;base64,AAAA')
  expect(imagemAmpliada[0].getAttribute('alt')).toBe(ROW.label)
  expect(screen.getByRole('heading', { name: /sub scattergram/i })).toBeInTheDocument()

  fireEvent.click(fechar)
  await waitFor(() => expect(screen.queryByRole('button', { name: /^fechar$/i })).not.toBeInTheDocument())
})
