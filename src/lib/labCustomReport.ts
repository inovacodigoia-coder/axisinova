// Relatório personalizado: mesmas regras de contagem do Relatório simples (pedidos reais, dia em São Paulo, sem cancelados).
export type CustomLayout = 'exame' | 'bancada' | 'paciente' | 'tabela'
export type CustomSort = 'data' | 'paciente' | 'exame'
export interface CustomFields { empresa: boolean; exame: boolean; codigo: boolean; bancada: boolean; pacientes: boolean; origem: boolean; convenio: boolean; qtdExame: boolean; qtdBancada: boolean; valor: boolean; totais: boolean }
export const DEFAULT_FIELDS: CustomFields = { empresa: true, exame: true, codigo: true, bancada: true, pacientes: true, origem: true, convenio: false, qtdExame: true, qtdBancada: true, valor: false, totais: true }
export interface CustomLine { day: string; protocol: string; origin: string; patient: string; patientKey: string; examKey: string; examName: string; abbreviation: string; tussCode: string; sigtapCode: string; workbenchId: string; workbench: string; convenio: string; value: number }
interface ExamItem { examId?: string; id?: string; name?: string; examName?: string; code?: string; status?: string; price?: number | string; value?: number | string; valor?: number | string }
interface CatalogItem { id: string; name: string; internalCode?: string; tussCode?: string; sigtapCode?: string; workbenchId?: string; price?: number }
interface Order { status?: string; examMode?: string; originName?: string; registeredAt?: string; protocol?: string; orderNumber?: string | number; patientId?: string; patientName?: string; convenioName?: string; labGuides?: { exams?: ExamItem[]; convenioName?: string }[] }
const norm = (v?: string) => (v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
export function buildCustomLines(orders: Order[], catalog: CatalogItem[], benches: { id: string; name: string }[], f: { from: string; to: string; origin: string; workbench: string; convenio: string }): CustomLine[] {
  const byId = new Map(catalog.map(e => [e.id, e])); const byCode = new Map(catalog.filter(e => e.internalCode).map(e => [norm(e.internalCode), e])); const byName = new Map(catalog.map(e => [norm(e.name), e]))
  const benchName = new Map(benches.map(b => [b.id, b.name]))
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })
  const out: CustomLine[] = []
  for (const o of orders) {
    if (['deleted', 'cancelled', 'canceled'].includes(o.status || '') || (o.examMode && o.examMode !== 'lab') || !o.registeredAt) continue
    const d = new Date(o.registeredAt); if (Number.isNaN(d.getTime())) continue
    const day = fmt.format(d)
    if ((f.from && day < f.from) || (f.to && day > f.to) || (f.origin !== 'all' && (o.originName || 'MATRIZ') !== f.origin)) continue
    for (const g of o.labGuides || []) {
      const convenio = g.convenioName || o.convenioName || 'Particular'
      if (f.convenio !== 'all' && convenio !== f.convenio) continue
      for (const it of g.exams || []) {
        if (['cancelled', 'canceled', 'cancelado', 'deleted', 'excluido'].includes(norm(it.status))) continue
        const cat = byId.get(it.examId || it.id || '') || byCode.get(norm(it.code)) || byName.get(norm(it.name || it.examName))
        if (f.workbench !== 'all' && cat?.workbenchId !== f.workbench) continue
        const wb = cat?.workbenchId || ''
        out.push({ day, protocol: String(o.protocol || o.orderNumber || '-'), origin: o.originName || 'MATRIZ', patient: o.patientName || '-', patientKey: o.patientId || norm(o.patientName), examKey: cat?.id || it.examId || it.id || `${norm(it.code)}:${norm(it.name || it.examName)}`, examName: cat?.name || it.name || it.examName || 'Exame', abbreviation: cat?.internalCode || it.code || '', tussCode: cat?.tussCode?.trim() || '', sigtapCode: cat?.sigtapCode?.trim() || '', workbenchId: wb, workbench: benchName.get(wb) || 'Sem bancada', convenio, value: num(it.price ?? it.value ?? it.valor) })
      }
    }
  }
  return out
}
export interface Group { key: string; title: string; sub?: string; count: number; value: number; lines: CustomLine[]; children?: Group[] }
const sum = (ls: CustomLine[]) => ls.reduce((t, l) => t + l.value, 0)
const by = <K extends keyof CustomLine>(ls: CustomLine[], k: K) => { const m = new Map<string, CustomLine[]>(); ls.forEach(l => { const key = String(l[k]); m.set(key, [...(m.get(key) || []), l]) }); return m }
const cmp = (a: string, b: string) => a.localeCompare(b, 'pt-BR')
const byDayPatient = (a: CustomLine, b: CustomLine) => cmp(a.day, b.day) || cmp(a.patient, b.patient)
export function groupByExam(ls: CustomLine[]): Group[] {
  return [...by(ls, 'examKey').entries()].map(([key, g]) => ({ key, title: g[0].examName, sub: g[0].workbench, count: g.length, value: sum(g), lines: [...g].sort(byDayPatient) })).sort((a, b) => cmp(a.title, b.title))
}
export function groupByBench(ls: CustomLine[]): Group[] {
  return [...by(ls, 'workbenchId').entries()].map(([key, g]) => ({ key, title: g[0].workbench, count: g.length, value: sum(g), lines: g, children: groupByExam(g) })).sort((a, b) => cmp(a.title, b.title))
}
export function groupByPatient(ls: CustomLine[]): Group[] {
  return [...by(ls, 'patientKey').entries()].map(([key, g]) => ({ key, title: g[0].patient, count: g.length, value: sum(g), lines: [...g].sort((a, b) => cmp(a.day, b.day) || cmp(a.examName, b.examName)) })).sort((a, b) => cmp(a.title, b.title))
}
export function sortLines(ls: CustomLine[], s: CustomSort): CustomLine[] {
  return [...ls].sort((a, b) => s === 'paciente' ? cmp(a.patient, b.patient) || cmp(a.day, b.day) : s === 'exame' ? cmp(a.examName, b.examName) || byDayPatient(a, b) : byDayPatient(a, b) || cmp(a.examName, b.examName))
}
export const brDay = (d: string) => d.split('-').reverse().join('/')
export const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export function codigoDe(l: CustomLine) { return [l.tussCode && `TUSS ${l.tussCode}`, l.sigtapCode && `SUS ${l.sigtapCode}`].filter(Boolean).join(' · ') }
/** Linhas planas para Excel/CSV, respeitando os campos marcados e a forma escolhida. */
export function exportRows(ls: CustomLine[], layout: CustomLayout, f: CustomFields, s: CustomSort): Record<string, string | number>[] {
  const ordered = layout === 'tabela' ? sortLines(ls, s) : layout === 'paciente' ? groupByPatient(ls).flatMap(g => g.lines) : layout === 'bancada' ? groupByBench(ls).flatMap(b => (b.children || []).flatMap(g => g.lines)) : groupByExam(ls).flatMap(g => g.lines)
  return ordered.map(l => {
    const r: Record<string, string | number> = {}
    if (f.bancada && layout === 'bancada') r.Bancada = l.workbench
    if (f.pacientes && layout === 'paciente') r.Paciente = l.patient
    if (f.exame) { r.Sigla = l.abbreviation; r.Exame = l.examName }
    if (f.codigo) { r['Código TUSS'] = l.tussCode; r['Código SUS (SIGTAP)'] = l.sigtapCode }
    if (f.bancada && layout !== 'bancada') r.Bancada = l.workbench
    if (f.pacientes) { r.Data = brDay(l.day); r.Pedido = l.protocol; if (f.origem) r.Origem = l.origin; if (layout !== 'paciente') r.Paciente = l.patient }
    else if (f.origem) r.Origem = l.origin
    if (f.convenio) r['Convênio'] = l.convenio
    if (f.valor) r['Valor (R$)'] = l.value
    return r
  })
}
