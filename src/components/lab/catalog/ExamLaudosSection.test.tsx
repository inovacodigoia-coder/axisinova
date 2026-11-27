import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ExamLaudosSection from './ExamLaudosSection'
import type { ExamLaudo } from '@/hooks/useExamLaudos'

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }))

const laudos: ExamLaudo[] = ['L001', 'L002'].map((code, i) => ({
  id: code, code, exam_id: 'eas', company_id: 'teste', name: `Laudo ${i + 1}`,
  sort_order: i + 1, is_active: i === 0, methodology: null, parameters: [],
  reference_values: [], result_deadline_days: null, workbench_id: null,
  selected_materials: [], default_material: null,
}))

afterEach(cleanup)
describe('configuração dos laudos do exame', () => {
  it('abre a configuração inclusive para o laudo já selecionado, sem gravar', () => {
    const onConfigure = vi.fn(), onSelect = vi.fn()
    render(<ExamLaudosSection examId="eas" companyId="teste" laudos={laudos}
      selectedLaudoId="L001" onConfigure={onConfigure} onSelect={onSelect} onReload={vi.fn()} />)
    const buttons = screen.getAllByRole('button', { name: 'Configurar' })
    fireEvent.click(buttons[0])
    expect(onConfigure).toHaveBeenLastCalledWith('L001')
    fireEvent.click(buttons[1])
    expect(onConfigure).toHaveBeenLastCalledWith('L002')
    expect(onSelect).not.toHaveBeenCalled()
  })
})