/** Etiqueta extra: o usuário escolhe se sai nome do paciente, nome do exame e data da coleta. */
export interface CamposEtiquetaExtra { paciente: boolean; exame: boolean; dataColeta: boolean }
export const CAMPOS_EXTRA_PADRAO: CamposEtiquetaExtra = { paciente: true, exame: true, dataColeta: true }

export function formatarDataEtiqueta(d: Date): string {
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
}

/** Primeira data de coleta entre os exames do tubo. */
export function dataColetaDoTubo(exams: any[]): string | undefined {
  const ts = (exams || []).map(e => e?.collectedAt).filter(Boolean).map(v => new Date(v).getTime()).filter(n => !isNaN(n))
  return ts.length ? new Date(Math.min(...ts)).toISOString() : undefined
}

export function dadosEtiquetaExtra(
  l: { patientName?: string; examNames?: string[]; collectedAt?: string },
  campos: CamposEtiquetaExtra,
  agora: Date = new Date(),
): { paciente: string; exames: string[]; dataHora: string } {
  const coleta = campos.dataColeta && l.collectedAt ? new Date(l.collectedAt) : null
  return {
    paciente: campos.paciente ? (l.patientName || '') : '',
    exames: campos.exame ? (l.examNames || []).filter(Boolean) : [],
    dataHora: formatarDataEtiqueta(coleta && !isNaN(coleta.getTime()) ? coleta : agora),
  }
}
