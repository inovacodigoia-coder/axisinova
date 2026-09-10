export type LabelFieldKey =
  | 'sector'
  | 'dateTime'
  | 'sampleCode'
  | 'sampleHash'
  | 'patientName'
  | 'birthDate'
  | 'material'
  | 'examRefs'
  | 'labName'
  | 'brand'

export interface LabelFieldStyle {
  /** Tamanho em pontos (pt) */
  size: number
  bold: boolean
}

export interface LabelConfig {
  widthMm: number
  heightMm: number
  rotation: number
  marginMm: number
  barcodeHeightMm: number
  fields: Record<LabelFieldKey, LabelFieldStyle>
}

export const LABEL_FIELD_LABELS: Record<LabelFieldKey, string> = {
  sector: 'Título do Setor/Exame',
  dateTime: 'Data/Hora de emissão',
  sampleCode: 'Código da amostra / protocolo',
  sampleHash: 'ID da etiqueta (hash)',
  patientName: 'Nome do Paciente',
  birthDate: 'Data de Nascimento',
  material: 'Tipo de Amostra/Tubo',
  examRefs: 'Referências dos exames',
  labName: 'Laboratório de Origem',
  brand: 'Marca do sistema',
}

export const LABEL_FIELD_ORDER: LabelFieldKey[] = [
  'sector',
  'dateTime',
  'sampleCode',
  'sampleHash',
  'patientName',
  'birthDate',
  'material',
  'examRefs',
  'labName',
  'brand',
]

export const FONT_MIN_PT = 5
export const FONT_MAX_PT = 24
export const MARGIN_MIN_MM = 0
export const MARGIN_MAX_MM = 10
export const BARCODE_MIN_MM = 5
export const BARCODE_MAX_MM = 20

export const PT_TO_PX = 96 / 72
export const MM_TO_PX = 96 / 25.4

export const defaultLabelFields: Record<LabelFieldKey, LabelFieldStyle> = {
  sector: { size: 7.5, bold: true },
  dateTime: { size: 7.5, bold: true },
  sampleCode: { size: 9, bold: true },
  sampleHash: { size: 7.5, bold: true },
  patientName: { size: 7.5, bold: true },
  birthDate: { size: 7, bold: false },
  material: { size: 7.5, bold: true },
  examRefs: { size: 6.75, bold: true },
  labName: { size: 6, bold: true },
  brand: { size: 6, bold: false },
}

export const defaultLabelConfig: LabelConfig = {
  widthMm: 50,
  heightMm: 30,
  rotation: 0,
  marginMm: 1,
  barcodeHeightMm: 6.5,
  fields: defaultLabelFields,
}

export interface LabelPreset {
  name: string
  config: LabelConfig
}

export const labelPresets: LabelPreset[] = [
  {
    name: 'CD410 rotacionado 50x25',
    config: { ...defaultLabelConfig, widthMm: 50, heightMm: 25, rotation: 90, barcodeHeightMm: 5.5 },
  },
  {
    name: 'CD410 single 50x25 (2 por página)',
    config: { ...defaultLabelConfig, widthMm: 50, heightMm: 25, rotation: 0, barcodeHeightMm: 5.5 },
  },
  {
    name: 'CD410 single 50x25 (1 por página)',
    config: { ...defaultLabelConfig, widthMm: 50, heightMm: 25, rotation: 0, barcodeHeightMm: 5.5 },
  },
  {
    name: '50x30 padrão',
    config: { ...defaultLabelConfig },
  },
]

export function normalizeLabelConfig(raw: unknown): LabelConfig {
  const base = defaultLabelConfig
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<LabelConfig>
  const clamp = (v: unknown, min: number, max: number, fb: number) => {
    const n = Number(v)
    if (!Number.isFinite(n)) return fb
    return Math.min(max, Math.max(min, n))
  }
  const fields = { ...base.fields }
  const rawFields = (r.fields || {}) as Record<string, Partial<LabelFieldStyle>>
  ;(Object.keys(fields) as LabelFieldKey[]).forEach((k) => {
    const f = rawFields[k]
    if (f) {
      fields[k] = {
        size: clamp(f.size, FONT_MIN_PT, FONT_MAX_PT, base.fields[k].size),
        bold: typeof f.bold === 'boolean' ? f.bold : base.fields[k].bold,
      }
    }
  })
  return {
    widthMm: clamp(r.widthMm, 10, 200, base.widthMm),
    heightMm: clamp(r.heightMm, 10, 200, base.heightMm),
    rotation: [0, 90, -90, 180].includes(Number(r.rotation)) ? Number(r.rotation) : 0,
    marginMm: clamp(r.marginMm, MARGIN_MIN_MM, MARGIN_MAX_MM, base.marginMm),
    barcodeHeightMm: clamp(r.barcodeHeightMm, BARCODE_MIN_MM, BARCODE_MAX_MM, base.barcodeHeightMm),
    fields,
  }
}

/** Altura estimada (mm) do conteúdo com a configuração atual. */
export function estimateContentHeightMm(config: LabelConfig): number {
  const lineMm = (pt: number) => (pt * PT_TO_PX * 1.2) / MM_TO_PX
  const textLines: LabelFieldKey[] = [
    'sector',
    'sampleCode',
    'patientName',
    'material',
    'examRefs',
    'labName',
  ]
  const headerMm = Math.max(lineMm(config.fields.sector.size), lineMm(config.fields.dateTime.size))
  const codeLineMm = Math.max(lineMm(config.fields.sampleCode.size), lineMm(config.fields.sampleHash.size))
  const footerMm = Math.max(lineMm(config.fields.labName.size), lineMm(config.fields.brand.size))
  const middle = textLines
    .filter((k) => !['sector', 'sampleCode', 'labName'].includes(k))
    .reduce((acc, k) => acc + lineMm(config.fields[k].size), 0)
  return headerMm + config.barcodeHeightMm + codeLineMm + middle + footerMm + config.marginMm * 2
}
