// Utilitários para resolver os Parâmetros do Exame e suas Faixas de Referência
// a partir do que está cadastrado no Catálogo de Exames.

export interface ResolvedParam {
  id: string
  name: string
  unit: string
  reference: string
  isCalculated?: boolean
  formula?: string
}

interface PatientCtx {
  gender?: string
  age?: number
}

function normalizeSex(gender?: string): 'M' | 'F' | null {
  if (!gender) return null
  const g = gender.toString().toLowerCase()
  if (g === 'm' || g === 'male' || g === 'masculino') return 'M'
  if (g === 'f' || g === 'female' || g === 'feminino') return 'F'
  return null
}

function formatRange(r: any): string {
  if (!r) return ''
  if (r.normalText || r.textRange || r.text_range) return r.normalText || r.textRange || r.text_range
  const min = r.minValue ?? r.min_value
  const max = r.maxValue ?? r.max_value
  if (min != null && max != null && min !== '' && max !== '') return `${min} a ${max}`
  if (min != null && min !== '') return `> ${min}`
  if (max != null && max !== '') return `< ${max}`
  return r.description || ''
}

/** Escolhe a faixa de referência que combina com sexo/idade do paciente. */
export function pickReference(ranges: any[] | undefined, patient: PatientCtx): string {
  if (!ranges || ranges.length === 0) return ''
  const sex = normalizeSex(patient.gender)
  const age = patient.age

  const matches = ranges.filter((r) => {
    const rSex = (r.sex ?? r.gender ?? 'Both')?.toString()
    const sexOk = !rSex || rSex === 'Both' || rSex === 'both' || !sex || rSex.toUpperCase().startsWith(sex)
    const minAge = r.minAge ?? r.age_min
    const maxAge = r.maxAge ?? r.age_max
    const ageOk =
      age == null ||
      ((minAge == null || age >= Number(minAge)) && (maxAge == null || age <= Number(maxAge)))
    return sexOk && ageOk
  })

  const chosen = matches[0] || ranges[0]
  return formatRange(chosen)
}

/**
 * Monta a lista de parâmetros de um exame do catálogo.
 * Se o exame não tiver parâmetros cadastrados, gera um parâmetro único
 * com o nome do exame, sua unidade de medida e a referência do exame.
 */
export function buildExamParams(catalogExam: any | undefined, fallbackName: string, patient: PatientCtx): ResolvedParam[] {
  const params: any[] = Array.isArray(catalogExam?.parameters) ? catalogExam.parameters : []
  const examLevelRefs: any[] = Array.isArray(catalogExam?.reference_values) ? catalogExam.reference_values : []
  const examUnit = catalogExam?.measurement_unit || ''

  const visible = params.filter((p) => !p.isHidden && !p.is_hidden)

  if (visible.length === 0) {
    return [
      {
        id: '1',
        name: catalogExam?.name || fallbackName,
        unit: examUnit,
        reference: pickReference(examLevelRefs, patient),
      },
    ]
  }

  return visible.map((p, idx) => ({
    id: String(p.id ?? idx + 1),
    name: p.name || `Parâmetro ${idx + 1}`,
    unit: p.unit || examUnit,
    reference: pickReference(
      (p.referenceValues && p.referenceValues.length ? p.referenceValues : examLevelRefs),
      patient,
    ),
    isCalculated: !!(p.isCalculated || p.is_calculated),
    formula: p.formula,
  }))
}

/** Chave de busca normalizada (código interno ou nome). */
export function catalogKey(value?: string) {
  return (value || '').toString().trim().toLowerCase()
}

/** Normaliza texto: sem acentos, minúsculo, apenas letras/números com espaço simples. */
export function normalizeText(value?: string) {
  return (value || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const STOPWORDS = new Set(['de', 'da', 'do', 'com', 'e', 'em', 'a', 'o', 'para', 'por'])

function tokens(value?: string) {
  return normalizeText(value)
    .split(' ')
    .filter((t) => t && !STOPWORDS.has(t))
}

/**
 * Encontra o exame do catálogo correspondente, tolerando diferenças de nome
 * (ex.: "Hemograma com Contagem de Plaquetas" x "Hemograma Completo").
 */
export function findCatalogExam(
  catalogList: any[],
  exam: { examId?: string; code?: string; name?: string },
): any | undefined {
  if (!catalogList || catalogList.length === 0) return undefined

  const byExact = catalogList.find(
    (c) =>
      (exam.examId && catalogKey(c.id) === catalogKey(exam.examId)) ||
      (exam.code && c.internal_code && catalogKey(c.internal_code) === catalogKey(exam.code)) ||
      (exam.name && c.name && normalizeText(c.name) === normalizeText(exam.name)),
  )
  if (byExact) return byExact

  const target = tokens(exam.name || exam.code)
  if (target.length === 0) return undefined

  let best: any
  let bestScore = 0
  catalogList.forEach((c) => {
    const cand = tokens(c.name)
    if (cand.length === 0) return
    const inter = cand.filter((t) => target.includes(t)).length
    const score = inter / Math.max(1, Math.min(cand.length, target.length))
    if (score > bestScore) {
      bestScore = score
      best = c
    }
  })

  // exige pelo menos metade dos termos em comum para evitar falsos positivos
  return bestScore >= 0.5 ? best : undefined
}

const toNum = (v: any) => {
  const n = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.'))
  return isNaN(n) ? null : n
}

/**
 * Avalia a fórmula de um parâmetro calculado.
 * A fórmula usa tokens [Nome do Parâmetro]; retorna '' quando faltar valor.
 */
export function evaluateFormula(
  formula: string | undefined,
  params: ResolvedParam[],
  valueOf: (paramId: string) => string,
): string {
  if (!formula || !formula.trim()) return ''

  let expr = formula
  let missing = false

  expr = expr.replace(/\[([^\]]+)\]/g, (_m, rawName: string) => {
    const wanted = normalizeText(rawName)
    const p = params.find(
      (x) => normalizeText(x.name) === wanted || normalizeText(x.name).startsWith(wanted) || wanted.startsWith(normalizeText(x.name)),
    )
    const n = p ? toNum(valueOf(p.id)) : null
    if (n == null) {
      missing = true
      return '0'
    }
    return String(n)
  })

  if (missing) return ''
  if (!/^[0-9+\-*/().\s]+$/.test(expr)) return ''

  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${expr});`)()
    if (typeof result !== 'number' || !isFinite(result)) return ''
    return String(Math.round(result * 100) / 100).replace('.', ',')
  } catch {
    return ''
  }
}
