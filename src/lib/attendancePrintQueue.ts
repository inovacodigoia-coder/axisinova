export interface AttendancePrintJob {
  id: string
  format: string
}

/** Duas vias compartilham papel; bobina não comporta duas metades de uma folha. */
export function prepararFilaImpressao(jobs: AttendancePrintJob[]): AttendancePrintJob[] {
  const receipt = jobs.find(job => job.id === 'comprovante')
  const control = jobs.find(job => job.id === 'controle_interno')
  if (!receipt || !control) return jobs.slice()
  const format = receipt.format === 'A5' && control.format === 'A5' ? 'A5' : 'A4'
  let inserted = false
  return jobs.flatMap(job => {
    if (job.id !== 'comprovante' && job.id !== 'controle_interno') return [job]
    if (inserted) return []
    inserted = true
    return [{ id: 'comprovante_controle', format }]
  })
}