import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LabReportHeader } from './LabReportHeader'

const SUB1 = 'SECRETARIA MUNICIPAL DE SAÚDE'
const SUB2 = 'PREFEITURA MUNICIPAL DE TOUROS'

describe('LabReportHeader subtitle', () => {
  it('puts each subtitle line in its own block, in order, inside the centered header block', () => {
    const { container } = render(
      <LabReportHeader laboratoryName="LAB MUNICIPAL" laboratorySubtitle={`${SUB1}\n${SUB2}`} />
    )
    const first = screen.getByText(SUB1)
    const second = screen.getByText(SUB2)
    expect(first).not.toBe(second)
    expect(first.parentElement).toBe(second.parentElement)
    expect(first.parentElement?.className).toContain('text-center')
    expect(container.textContent).toContain(`${SUB1}${SUB2}`)
  })

  it('keeps a single-line subtitle as one block', () => {
    render(<LabReportHeader laboratoryName="LAB MUNICIPAL" laboratorySubtitle={SUB1} />)
    const line = screen.getByText(SUB1)
    expect(line.parentElement?.querySelectorAll('div')).toHaveLength(1)
  })
})
