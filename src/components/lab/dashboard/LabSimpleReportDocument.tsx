import { simpleReportColumns, type SimpleExamRow } from '@/lib/labSimpleReport'
export interface SimpleReportProps { brandName: string; periodLabel: string; generatedAt: string; origin: string; workbench: string; convenio: string; rows: SimpleExamRow[] }
export function LabSimpleReportDocument({ brandName, periodLabel, generatedAt, origin, workbench, convenio, rows }: SimpleReportProps) {
 const columns=simpleReportColumns(rows)
 return <div className="lab-report-page lab-simple-report">
  <header className="flex justify-between gap-4 border-b border-current pb-3 mb-3"><h1 className="text-base font-semibold uppercase">{brandName}</h1><span className="text-xs shrink-0">{generatedAt}</span></header>
  <h2 className="text-sm mb-3">Resumo de Exames · Relatório Simples</h2>
  <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs mb-4"><p><strong>Período:</strong> {periodLabel}</p><p><strong>Origem:</strong> {origin}</p><p><strong>Bancada:</strong> {workbench}</p><p><strong>Convênio:</strong> {convenio}</p></div>
  <table className="w-full border-collapse text-[10px]">
   <thead><tr className="border-y border-current text-left"><th className="py-1 pr-2">Sigla</th><th className="py-1 pr-2">Exame</th>{columns.tuss&&<th className="py-1 pr-2">Código TUSS</th>}{columns.sigtap&&<th className="py-1 pr-2">Código SUS (SIGTAP)</th>}<th className="py-1 text-right">Qtd. exames</th></tr></thead>
   <tbody>{rows.map(row=><tr key={row.key} className="border-b border-current"><td className="py-1 pr-2 align-top">{row.abbreviation}</td><td className="py-1 pr-2 break-words">{row.name}</td>{columns.tuss&&<td className="py-1 pr-2 align-top">{row.tussCode}</td>}{columns.sigtap&&<td className="py-1 pr-2 align-top">{row.sigtapCode}</td>}<td className="py-1 text-right align-top">{row.count.toLocaleString('pt-BR')}</td></tr>)}
   {!rows.length&&<tr><td colSpan={3+Number(columns.tuss)+Number(columns.sigtap)} className="py-6 text-center">Sem exames no período selecionado.</td></tr>}</tbody>
  </table>
  <p className="text-xs font-semibold text-right mt-3">Total: {rows.reduce((total,row)=>total+row.count,0).toLocaleString('pt-BR')}</p>
 </div>
}