import { brDay, brl, codigoDe, groupByBench, groupByExam, groupByPatient, sortLines, type CustomFields, type CustomLayout, type CustomLine, type CustomSort, type Group } from '@/lib/labCustomReport'
export interface CustomReportProps { brandName: string; company?: { cnpj?: string; address?: string; logoUrl?: string | null }; periodLabel: string; generatedAt: string; filters: string; layout: CustomLayout; sort: CustomSort; benchPatients: boolean; fields: CustomFields; lines: CustomLine[] }
const LAYOUT_TITLE: Record<CustomLayout, string> = { exame: 'Por exame com pacientes', bancada: 'Por bancada', paciente: 'Por paciente', tabela: 'Tabela corrida' }
const qtd = (n: number) => n.toLocaleString('pt-BR')
function ExamHead({ g, f }: { g: Group; f: CustomFields }) {
  const l = g.lines[0]
  return <div className="flex flex-wrap justify-between gap-2 border-b border-current py-1 font-semibold">
    <span>{f.exame ? <>{l.abbreviation && `${l.abbreviation} · `}{g.title}</> : 'Exame'}{f.codigo && codigoDe(l) && <span className="font-normal"> ({codigoDe(l)})</span>}</span>
    <span className="flex gap-4">{f.bancada && <span>Bancada: {l.workbench}</span>}{f.qtdExame && <span>Qtd: {qtd(g.count)}</span>}{f.valor && <span>{brl(g.value)}</span>}</span>
  </div>
}
function PatientList({ lines, f }: { lines: CustomLine[]; f: CustomFields }) {
  if (!f.pacientes) return null
  return <table className="w-full text-[10px] mb-2"><tbody>{lines.map((l, i) => <tr key={i} className="border-b border-dotted border-current"><td className="py-0.5 pl-3 w-20">{brDay(l.day)}</td><td className="w-20">{l.protocol}</td>{f.origem && <td className="w-32">{l.origin}</td>}<td>{l.patient}</td>{f.convenio && <td>{l.convenio}</td>}{f.valor && <td className="text-right">{brl(l.value)}</td>}</tr>)}</tbody></table>
}
export function LabCustomReportDocument(p: CustomReportProps) {
  const { fields: f, lines } = p
  const patients = new Set(lines.map(l => l.patientKey)).size
  const total = lines.reduce((t, l) => t + l.value, 0)
  return <div className="lab-report-page lab-simple-report text-xs">
    <header className="flex justify-between gap-4 border-b border-current pb-3 mb-3">
      <div className="flex items-center gap-3">{f.empresa && p.company?.logoUrl && <img src={p.company.logoUrl} alt="" className="h-10 object-contain" />}<div><h1 className="text-base font-semibold uppercase">{p.brandName}</h1>{f.empresa && <p className="text-[10px]">{[p.company?.cnpj && `CNPJ ${p.company.cnpj}`, p.company?.address].filter(Boolean).join(' · ')}</p>}</div></div>
      <span className="text-xs shrink-0">{p.generatedAt}</span>
    </header>
    <h2 className="text-sm mb-1">Relatório Personalizado · {LAYOUT_TITLE[p.layout]}</h2>
    <p className="mb-4"><strong>Período:</strong> {p.periodLabel} · {p.filters}</p>
    {!lines.length && <p className="py-6 text-center">Sem exames no período selecionado.</p>}
    {p.layout === 'exame' && groupByExam(lines).map(g => <section key={g.key} className="mb-2 break-inside-avoid-page"><ExamHead g={g} f={f} /><PatientList lines={g.lines} f={f} /></section>)}
    {p.layout === 'bancada' && groupByBench(lines).map(b => <section key={b.key} className="mb-4">
      <div className="flex justify-between bg-muted px-2 py-1 font-bold uppercase"><span>{f.bancada ? b.title : 'Bancada'}</span><span className="flex gap-4">{f.qtdBancada && <span>Qtd: {qtd(b.count)}</span>}{f.valor && <span>{brl(b.value)}</span>}</span></div>
      {(b.children || []).map(g => <div key={g.key} className="pl-2"><ExamHead g={g} f={{ ...f, bancada: false }} />{p.benchPatients && <PatientList lines={g.lines} f={f} />}</div>)}
    </section>)}
    {p.layout === 'paciente' && groupByPatient(lines).map(g => <section key={g.key} className="mb-3 break-inside-avoid-page">
      <div className="flex justify-between border-b border-current py-1 font-semibold"><span>{f.pacientes ? g.title : 'Paciente'}</span><span className="flex gap-4"><span>Exames: {qtd(g.count)}</span>{f.valor && <span>{brl(g.value)}</span>}</span></div>
      <table className="w-full text-[10px]"><tbody>{g.lines.map((l, i) => <tr key={i} className="border-b border-dotted border-current"><td className="py-0.5 pl-3 w-20">{brDay(l.day)}</td><td className="w-20">{l.protocol}</td>{f.origem && <td className="w-32">{l.origin}</td>}<td>{f.exame && l.examName}{f.codigo && codigoDe(l) && ` (${codigoDe(l)})`}</td>{f.bancada && <td>{l.workbench}</td>}{f.convenio && <td>{l.convenio}</td>}{f.valor && <td className="text-right">{brl(l.value)}</td>}</tr>)}</tbody></table>
    </section>)}
    {p.layout === 'tabela' && !!lines.length && <table className="w-full border-collapse text-[10px]">
      <thead><tr className="border-y border-current text-left"><th className="py-1">Data</th><th>Pedido</th>{f.origem && <th>Origem</th>}{f.pacientes && <th>Paciente</th>}{f.exame && <th>Exame</th>}{f.codigo && <th>Código</th>}{f.bancada && <th>Bancada</th>}{f.convenio && <th>Convênio</th>}{f.valor && <th className="text-right">Valor</th>}</tr></thead>
      <tbody>{sortLines(lines, p.sort).map((l, i) => <tr key={i} className="border-b border-current"><td className="py-0.5">{brDay(l.day)}</td><td>{l.protocol}</td>{f.origem && <td>{l.origin}</td>}{f.pacientes && <td>{l.patient}</td>}{f.exame && <td>{l.examName}</td>}{f.codigo && <td>{codigoDe(l)}</td>}{f.bancada && <td>{l.workbench}</td>}{f.convenio && <td>{l.convenio}</td>}{f.valor && <td className="text-right">{brl(l.value)}</td>}</tr>)}</tbody>
    </table>}
    {f.totais && !!lines.length && <p className="font-semibold text-right mt-3">Total: {qtd(lines.length)} exames · {qtd(patients)} pacientes{f.valor && ` · ${brl(total)}`}</p>}
  </div>
}
