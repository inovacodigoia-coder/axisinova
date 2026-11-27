/** Explicit opt-in marker on the company-owned report template, never by exam name. */
export const EAS_LAUDO3_LAYOUT = 'layout:eas-touros-l003'
export const isEasLaudo3 = (exam: any) => exam?.reportTemplate?.description === EAS_LAUDO3_LAYOUT
export function coletaEasLaudo3(exam: any, order: any) {
  const value = exam?.collectedAt || order?.collectionTime
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })
    : '—'
}

const fields = [
  ['eas3-miccao', 'Micção', 'MÉTODO DE COLETA', '', 'Primeira micção', 'selection', ''],
  ['eas3-jato', 'Jato', 'MÉTODO DE COLETA', '', 'Jato médio', 'selection', ''],
  ['1', 'Volume', 'EXAME FÍSICO', 'mL', '', 'numerical', ''],
  ['2', 'Cor', 'EXAME FÍSICO', '', 'Amarelo', 'selection', ''],
  ['3', 'Aspecto', 'EXAME FÍSICO', '', 'Límpido', 'selection', ''],
  ['5', 'Depósito', 'EXAME FÍSICO', '', 'Ausente', 'selection', ''],
  ['6', 'Densidade', 'EXAME FÍSICO', '', '1.005 a 1.030', 'numerical', ''],
  ['7', 'pH', 'EXAME QUÍMICO', '', '5,0 a 6,5', 'numerical', ''],
  ['8', 'Nitrito', 'EXAME QUÍMICO', '', 'Negativo', 'selection', ''],
  ['9', 'Proteínas', 'EXAME QUÍMICO', '', 'Ausentes', 'selection', ''],
  ['10', 'Glicose', 'EXAME QUÍMICO', '', 'Ausente', 'selection', ''],
  ['11', 'Corpos cetônicos', 'EXAME QUÍMICO', '', 'Ausentes', 'selection', ''],
  ['12', 'Urobilinogênio', 'EXAME QUÍMICO', '', 'Normal', 'selection', ''],
  ['13', 'Bilirrubina', 'EXAME QUÍMICO', '', 'Ausente', 'selection', ''],
  ['17', 'Leucócitos (químico)', 'EXAME QUÍMICO', '', 'Ausentes', 'selection', 'Leucócitos'],
  ['14', 'Sangue', 'EXAME QUÍMICO', '', 'Ausente', 'selection', ''],
  ['23', 'Leucócitos', 'EXAME MICROSCÓPICO DO SEDIMENTO', 'por campo', 'Inferior a 5 por campo', 'numerical', ''],
  ['16', 'Células epiteliais', 'EXAME MICROSCÓPICO DO SEDIMENTO', '', 'Inferior a 8 por campo', 'selection', ''],
  ['18', 'Hemácias', 'EXAME MICROSCÓPICO DO SEDIMENTO', 'por campo', 'Ausentes', 'numerical', ''],
  ['19', 'Cilindros', 'EXAME MICROSCÓPICO DO SEDIMENTO', '', 'Ausentes ou raros hialinos', 'selection', ''],
  ['20', 'Cristais', 'EXAME MICROSCÓPICO DO SEDIMENTO', '', 'Ausentes ou alguns', 'selection', ''],
  ['21', 'Muco', 'EXAME MICROSCÓPICO DO SEDIMENTO', '', '', 'selection', ''],
  ['22', 'Bactérias', 'EXAME MICROSCÓPICO DO SEDIMENTO', '', 'Ausente', 'selection', ''],
]

/** Reference and input configuration only; never imports the sample patient's results. */
export function parametrosEasLaudo3(base: any[] = []) {
  return fields.map(([id, name, section, unit, reference, type, reportLabel]) => {
    const source = base.find(p => String(p.id) === id) || {}
    const options = type === 'selection'
      ? Array.from(new Set([...(source.options || []), ...(reference && !reference.includes('por campo') ? [reference] : [])]))
      : []
    return {
      ...source, id, name, section, unit, type, reportLabel, options,
      origin: 'manual', equipCode: '', isCalculated: false, formula: '', isHidden: false,
      isMandatory: true, allowNegative: false, defaultValueEnabled: false, defaultValue: '',
      allowEditSelection: true,
      referenceMode: reference ? 'completa' : 'simples', referenceFullText: reference,
      referenceValues: reference ? [{
        id: `${id}-eas3-ref`, description: 'Modelo EAS L003', ageUnit: 'anos',
        minAge: 0, maxAge: 150, sex: 'Both', order: 1, textRange: reference,
        normalText: reference, minValue: '', maxValue: '',
        isFasting: false, isPregnant: false, useFasting: false,
      }] : [],
    }
  })
}

/** Keep a selected report's template instead of replacing it with the catalog default. */
export function configurarLaudoImpresso(e: any, row: any, laudo: any, templates: any[]) {
  const configured = laudo || row
  const tpl = e.reportTemplate || (configured?.report_template_id
    ? templates.find(t => t.id === configured.report_template_id)
    : templates.find(t => t.is_default && t.is_active))
  const params = Array.isArray(laudo?.parameters) ? laudo.parameters : []
  return {
    ...e,
    reportObservations: e.reportObservations ?? configured?.report_observations ?? '',
    singlePage: e.singlePage ?? (configured?.report_single_page || tpl?.single_page || false),
    reportTemplate: tpl || null,
    results: (e.results || []).map((r: any) => {
      const p = params.find((p: any) => String(p.id) === String(r.parameterId))
      return p ? { ...r, section: r.section || p.section || '', reportLabel: p.reportLabel || r.reportLabel } : r
    }),
  }
}