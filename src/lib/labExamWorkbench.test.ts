import { describe, expect, it } from 'vitest'
import { matchesExamWorkbench, resolveExamWorkbench } from './labExamWorkbench'

const acidId = 'd4894d45-0a47-4bf7-9cd5-2caee1acff85'
const biochemistry = 'cc9fc08a-edfe-454d-9756-3069860b568a'
const catalog = [{ id: acidId, workbenchId: biochemistry }]

describe('workbench of exams added through Edit Guide', () => {
  it('includes received Acid Uric with missing routing in the Bioquímica filter', () => {
    const saved = { examId: acidId, collected: true, isColeta: false, status: 'pending' }
    const exam = { ...saved, workbenchId: resolveExamWorkbench(saved, catalog) }
    expect(exam.workbenchId).toBe(biochemistry)
    expect(matchesExamWorkbench(exam, [biochemistry])).toBe(true)
    expect(exam.collected).toBe(true)
    expect(exam.status).toBe('pending')
  })

  it('preserves a frozen destination instead of the current catalog workbench', () => {
    const saved = { examId: acidId, bancadaId: 'frozen-destination', workbenchId: biochemistry }
    expect(resolveExamWorkbench(saved, catalog)).toBe('frozen-destination')
    expect(matchesExamWorkbench(saved, ['frozen-destination'])).toBe(true)
    expect(matchesExamWorkbench(saved, [biochemistry])).toBe(false)
  })

  it('supports catalog ids stored as id without guessing a destination for missing exams', () => {
    expect(resolveExamWorkbench({ id: acidId }, catalog)).toBe(biochemistry)
    expect(resolveExamWorkbench({ examId: 'missing' }, catalog)).toBe('')
    expect(matchesExamWorkbench({}, [])).toBe(true)
    expect(matchesExamWorkbench({}, [biochemistry])).toBe(false)
  })
})