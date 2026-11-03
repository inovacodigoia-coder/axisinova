import { it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MapaSumarioUrina } from './MapaSumarioUrina'

it('folha do Sumário de Urina usa a grafia do axisinova: UROBILINOGÊNIO, LEUCÓCITOS: e Biurato de amônia', () => {
  const { container } = render(<MapaSumarioUrina paciente="AGATHA BARBOSA DA SILVA" codigo="34-01" />)
  const text = container.textContent ?? ''
  expect(text).toContain('UROBILINOGÊNIO:')
  expect(text).not.toContain('UROBINOGÊNIO')
  expect(text).toContain('LEUCÓCITOS:')
  expect(text).toContain('Biurato de amônia')
  expect(text).not.toContain('Biurato de amonia')
})
