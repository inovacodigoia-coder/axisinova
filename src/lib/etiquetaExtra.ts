/** Etiqueta extra: o usuário escolhe se sai nome do paciente, nome do exame e data da coleta. */
export interface CamposEtiquetaExtra { paciente: boolean; exame: boolean; dataColeta: boolean }
export const CAMPOS_EXTRA_PADRAO: CamposEtiquetaExtra = { paciente: true, exame: false, dataColeta: true }

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

/** Quantidade de etiquetas: total de etiquetas que vai sair, de 1 a 50. */
export const QTD_ETIQUETAS_MIN = 1
export const QTD_ETIQUETAS_MAX = 50

/** Normaliza a quantidade digitada: inteiro dentro do intervalo, senão volta ao mínimo. */
export function qtdEtiquetasValida(valor: unknown): number {
  const n = Math.floor(Number(valor))
  if (!Number.isFinite(n)) return QTD_ETIQUETAS_MIN
  return Math.min(QTD_ETIQUETAS_MAX, Math.max(QTD_ETIQUETAS_MIN, n))
}

/**
 * Etiquetas que vão sair: repete os tubos na mesma ordem até chegar na quantidade
 * total pedida. Ex.: 2 tubos e total 5 → tubo 1, 2, 1, 2, 1.
 */
export function etiquetasParaImprimir<T>(labels: T[], total: number): T[] {
  if (!labels.length) return []
  const n = qtdEtiquetasValida(total)
  return Array.from({ length: n }, (_, i) => labels[i % labels.length])
}

/**
 * Etiqueta Extra = UMA etiqueta só do paciente (não repete as etiquetas dos tubos):
 * sem bancada, material ou tubo; exames do pedido juntos se o usuário pedir.
 * Repetida até o total escolhido.
 */
export function etiquetaExtraDoPaciente<T extends { workbench?: string; material?: string; tube?: string; examNames?: string[]; collectedAt?: string }>(labels: T[], total: number): T[] {
  if (!labels.length) return []
  const examNames = Array.from(new Set(labels.flatMap(l => l.examNames || []).filter(Boolean)))
  const coletas = labels.map(l => l.collectedAt).filter(Boolean).map(v => new Date(v as string).getTime()).filter(n => !isNaN(n))
  const base = { ...labels[0], workbench: '', material: '', tube: '', examNames, collectedAt: coletas.length ? new Date(Math.min(...coletas)).toISOString() : undefined }
  return Array.from({ length: qtdEtiquetasValida(total) }, () => base)
}
