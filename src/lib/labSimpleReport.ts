export interface SimpleExamRow { key: string; abbreviation: string; name: string; tussCode: string; sigtapCode: string; count: number }
interface ExamItem { examId?: string; id?: string; name?: string; examName?: string; code?: string; status?: string }
interface CatalogItem { id: string; name: string; internalCode?: string; tussCode?: string; sigtapCode?: string; workbenchId?: string }
interface Order { status?: string; examMode?: string; originName?: string; registeredAt?: string; labGuides?: { exams?: ExamItem[]; convenioName?: string }[]; convenioName?: string }
const norm=(value?: string)=>(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()
export function buildSimpleExamReport(orders: Order[], catalog: CatalogItem[], filters: { from: string; to: string; origin: string; workbench: string; convenio: string }): SimpleExamRow[] {
 const byId=new Map(catalog.map(e=>[e.id,e])); const byCode=new Map(catalog.filter(e=>e.internalCode).map(e=>[norm(e.internalCode),e])); const byName=new Map(catalog.map(e=>[norm(e.name),e]))
 const rows=new Map<string,SimpleExamRow>()
 for(const order of orders){
  if(['deleted','cancelled','canceled'].includes(order.status||'') || (order.examMode && order.examMode!=='lab') || !order.registeredAt) continue
  const date=new Date(order.registeredAt)
  if(Number.isNaN(date.getTime())) continue
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date)
  const part=(type:string)=>parts.find(p=>p.type===type)?.value||''
  const day=`${part('year')}-${part('month')}-${part('day')}`
  if((filters.from && day<filters.from)||(filters.to && day>filters.to)||(filters.origin!=='all'&&(order.originName||'MATRIZ')!==filters.origin)) continue
  for(const guide of order.labGuides||[]){
   if(filters.convenio!=='all'&&(guide.convenioName||order.convenioName||'Particular')!==filters.convenio) continue
   for(const item of guide.exams||[]){
    if(['cancelled','canceled','cancelado','deleted','excluido'].includes(norm(item.status))) continue
    const cat=byId.get(item.examId||item.id||'')||byCode.get(norm(item.code))||byName.get(norm(item.name||item.examName))
    if(filters.workbench!=='all'&&cat?.workbenchId!==filters.workbench) continue
    const key=cat?.id||item.examId||item.id||`${norm(item.code)}:${norm(item.name||item.examName)}`
    const row=rows.get(key)
    if(row) row.count++
    else rows.set(key,{key,abbreviation:cat?.internalCode||item.code||'',name:cat?.name||item.name||item.examName||'Exame',tussCode:cat?.tussCode?.trim()||'',sigtapCode:cat?.sigtapCode?.trim()||'',count:1})
   }
  }
 }
 return [...rows.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'))
}
export function simpleReportColumns(rows: SimpleExamRow[]) { return { tuss: rows.some(r=>!!r.tussCode), sigtap: rows.some(r=>!!r.sigtapCode) } }