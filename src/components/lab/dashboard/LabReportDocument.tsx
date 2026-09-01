import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend, Tooltip } from 'recharts'
import { CHART_COLORS } from '@/hooks/useChartColors'
import type { LabReportSections, ReportRow } from '@/hooks/useLabReportData'

export type ChartKind = 'none' | 'pie' | 'donut' | 'bar' | 'line'

export interface ReportSectionConfig {
  key: keyof LabReportSections
  label: string
  chart: ChartKind
}

interface Props {
  brandName: string
  logoUrl?: string | null
  periodLabel: string
  generatedAt: string
  sections: ReportSectionConfig[]
  data: LabReportSections
}

const money = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function SectionChart({ kind, rows }: { kind: ChartKind; rows: ReportRow[] }) {
  if (kind === 'none' || !rows.length) return null
  const chartData = rows.slice(0, 8).map(r => ({ name: r.label, value: r.count }))

  if (kind === 'pie' || kind === 'donut') {
    return (
      <PieChart width={420} height={230}>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="38%"
          cy="50%"
          outerRadius={85}
          innerRadius={kind === 'donut' ? 48 : 0}
          isAnimationActive={false}
          label={(e: any) => `${e.value}`}
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS.series[i % CHART_COLORS.series.length]} />
          ))}
        </Pie>
        <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 10 }} />
      </PieChart>
    )
  }

  if (kind === 'line') {
    return (
      <LineChart width={620} height={210} data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={45} />
        <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke={CHART_COLORS.primary} strokeWidth={2} isAnimationActive={false} />
      </LineChart>
    )
  }

  return (
    <BarChart width={620} height={210} data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
      <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={45} />
      <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
      <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
        {chartData.map((_, i) => (
          <Cell key={i} fill={CHART_COLORS.series[i % CHART_COLORS.series.length]} />
        ))}
      </Bar>
    </BarChart>
  )
}

export function LabReportDocument({ brandName, logoUrl, periodLabel, generatedAt, sections, data }: Props) {
  return (
    <div className="lab-report-page bg-white text-[#0f172a] mx-auto" style={{ width: '210mm', padding: '12mm' }}>
      <header className="flex items-center gap-3 border-b-2 pb-3 mb-4" style={{ borderColor: CHART_COLORS.primary }}>
        {logoUrl && <img src={logoUrl} alt={brandName} style={{ height: 44, width: 44, objectFit: 'contain' }} />}
        <div className="flex-1">
          <h1 className="text-lg font-bold leading-tight">{brandName}</h1>
          <p className="text-[11px] text-slate-600">Relatório Laboratorial Personalizado</p>
        </div>
        <div className="text-right text-[10px] text-slate-600 leading-snug">
          <p><strong>Período:</strong> {periodLabel}</p>
          <p><strong>Gerado em:</strong> {generatedAt}</p>
        </div>
      </header>

      {sections.map(sec => {
        if (sec.key === 'resumo') {
          const r = data.resumo
          const items = [
            ['Pedidos', String(r.totalOrders)],
            ['Exames', String(r.totalExams)],
            ['Pacientes', String(r.totalPatients)],
            ['Liberados', String(r.released)],
            ['Em andamento', String(r.pending)],
            ['Faturamento', money(r.revenue)],
          ]
          return (
            <section key="resumo" className="mb-5" style={{ breakInside: 'avoid' }}>
              <h2 className="text-sm font-bold mb-2">Resumo Geral</h2>
              <div className="grid grid-cols-3 gap-2">
                {items.map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-slate-200 p-2">
                    <p className="text-[9px] uppercase text-slate-500">{label}</p>
                    <p className="text-base font-bold">{value}</p>
                  </div>
                ))}
              </div>
            </section>
          )
        }

        if (sec.key === 'pedidos') {
          return (
            <section key="pedidos" className="mb-5">
              <h2 className="text-sm font-bold mb-2">Pedidos Detalhados ({data.pedidos.length})</h2>
              <table className="w-full text-[9px] border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-left">
                    {['Protocolo', 'Paciente', 'Data/Hora', 'Status', 'Convênio', 'Exames', 'Valor'].map(h => (
                      <th key={h} className="border border-slate-200 px-1.5 py-1 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.pedidos.map((p, i) => (
                    <tr key={i} style={{ breakInside: 'avoid' }}>
                      <td className="border border-slate-200 px-1.5 py-1">{p.protocol}</td>
                      <td className="border border-slate-200 px-1.5 py-1">{p.patient}</td>
                      <td className="border border-slate-200 px-1.5 py-1">{p.date}</td>
                      <td className="border border-slate-200 px-1.5 py-1">{p.status}</td>
                      <td className="border border-slate-200 px-1.5 py-1">{p.convenio}</td>
                      <td className="border border-slate-200 px-1.5 py-1 text-center">{p.exams}</td>
                      <td className="border border-slate-200 px-1.5 py-1 text-right">{money(p.value)}</td>
                    </tr>
                  ))}
                  {!data.pedidos.length && (
                    <tr><td colSpan={7} className="border border-slate-200 px-2 py-3 text-center text-slate-500">Sem dados no período</td></tr>
                  )}
                </tbody>
              </table>
            </section>
          )
        }

        const rows = data[sec.key] as ReportRow[]
        return (
          <section key={sec.key} className="mb-5" style={{ breakInside: 'avoid' }}>
            <h2 className="text-sm font-bold mb-2">{sec.label}</h2>
            {sec.chart !== 'none' && (
              <div className="mb-2 flex justify-center">
                <SectionChart kind={sec.chart} rows={rows} />
              </div>
            )}
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr className="bg-slate-100 text-left">
                  <th className="border border-slate-200 px-2 py-1 font-semibold">Descrição</th>
                  <th className="border border-slate-200 px-2 py-1 font-semibold w-20 text-center">Qtd.</th>
                  <th className="border border-slate-200 px-2 py-1 font-semibold w-20 text-center">%</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="border border-slate-200 px-2 py-1">{r.label}</td>
                    <td className="border border-slate-200 px-2 py-1 text-center">{r.count}</td>
                    <td className="border border-slate-200 px-2 py-1 text-center">{r.percentage}%</td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan={3} className="border border-slate-200 px-2 py-3 text-center text-slate-500">Sem dados no período</td></tr>
                )}
              </tbody>
            </table>
          </section>
        )
      })}

      <footer className="mt-6 border-t border-slate-200 pt-2 text-center text-[9px] text-slate-500">
        {brandName} · Relatório gerado em {generatedAt} · Axis Inova
      </footer>
    </div>
  )
}
