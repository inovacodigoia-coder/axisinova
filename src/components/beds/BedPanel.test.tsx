import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BedPanel } from './BedPanel'

vi.mock('@/hooks/useMedicamentos', () => ({ useMedicamentos: () => ({ itens: [] }), medicamentoLabel: () => '' }))
vi.mock('@/hooks/useHospitalPrintPermission', () => ({ useHospitalPrintPermission: () => false }))
vi.mock('@/components/inpatient/AdmissionRequestDialog', () => ({ AdmissionRequestDialog: () => null }))
vi.mock('@/components/triage/HospitalIdentificationDialog', () => ({ HospitalIdentificationDialog: () => null }))
vi.mock('@/hooks/useCollectionPosts', () => ({ rpc: vi.fn() }))
vi.mock('@/integrations/supabase/client', () => {
  const query: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'order', 'in', 'limit']) query[method] = () => query
  query.maybeSingle = async () => ({ data: null })
  query.then = (resolve: (r: unknown) => void) => resolve({ data: [] })
  const channel = { on: () => channel, subscribe: () => channel }
  return { supabase: { from: () => query, channel: () => channel, removeChannel: vi.fn() } }
})

afterEach(cleanup)
describe('Edição do aprazamento no leito', () => {
  it('permite alterar e limpar intervalo e doses sem perder a via digitada', () => {
    render(<BedPanel bed={{ id: 'bed', name: 'Leito de teste' } as any} occupancy={{ id: 'occ', patient_name: 'Paciente de teste' } as any} sectors={[]} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Prescrever' }))
    const interval = screen.getByLabelText('A cada (h)')
    const count = screen.getByLabelText('Doses')
    const route = screen.getByLabelText('Via')
    fireEvent.change(interval, { target: { value: '8' } })
    fireEvent.change(count, { target: { value: '3' } })
    fireEvent.change(route, { target: { value: 'Intravenosa' } })
    expect(interval).toHaveValue(8)
    expect(count).toHaveValue(3)
    expect(route).toHaveValue('Intravenosa')
    fireEvent.change(interval, { target: { value: '' } })
    fireEvent.change(count, { target: { value: '' } })
    expect(interval).toHaveValue(null)
    expect(count).toHaveValue(null)
    fireEvent.change(interval, { target: { value: '12' } })
    fireEvent.change(count, { target: { value: '6' } })
    expect(interval).toHaveValue(12)
    expect(count).toHaveValue(6)
    expect(route).toHaveValue('Intravenosa')
  })
})