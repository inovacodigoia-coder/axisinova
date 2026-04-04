import { cn } from '@/lib/utils'
import type { DoctorProductionData } from '@/types/bi.types'

interface DoctorProductionChartProps { data: DoctorProductionData[]; dark?: boolean }

export function DoctorProductionChart({ data, dark }: DoctorProductionChartProps) {
  const maxRev = Math.max(...data.map(d => d.revenue))
  const sorted = [...data].sort((a, b) => b.revenue - a.revenue)
  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className={cn('rounded-xl border p-5', dark ? 'bg-[#1A1F2E] border-white/[0.06]' : 'bg-card border-border')}>
      <h3 className={cn('text-sm font-semibold mb-4', dark ? 'text-white' : 'text-foreground')}>Performance Médica</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className={dark ? 'text-white/40' : 'text-muted-foreground'}>
              <th className="text-left py-2 font-medium">#</th>
              <th className="text-left py-2 font-medium">Médico</th>
              <th className="text-right py-2 font-medium">Consultas</th>
              <th className="text-right py-2 font-medium">Exames</th>
              <th className="text-right py-2 font-medium">Proced.</th>
              <th className="text-right py-2 font-medium">Total</th>
              <th className="text-right py-2 font-medium">Receita</th>
              <th className="text-right py-2 font-medium">Tempo Médio</th>
              <th className="text-right py-2 font-medium">Faltosos</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((doc, i) => (
              <tr key={doc.doctorId} className={cn('border-t', dark ? 'border-white/[0.06]' : 'border-border')}>
                <td className="py-3">{i < 3 ? medals[i] : i + 1}</td>
                <td className="py-3">
                  <p className={cn('font-semibold', dark ? 'text-white' : 'text-foreground')}>{doc.doctorName}</p>
                  <p className={dark ? 'text-white/40' : 'text-muted-foreground'}>{doc.specialty}</p>
                </td>
                <td className="text-right py-3">
                  <span className={dark ? 'text-white' : 'text-foreground'}>{doc.consultations}</span>
                </td>
                <td className="text-right py-3">{doc.exams}</td>
                <td className="text-right py-3">{doc.procedures}</td>
                <td className={cn('text-right py-3 font-bold', dark ? 'text-white' : 'text-foreground')}>{doc.totalAttendances}</td>
                <td className="text-right py-3">
                  <div className="flex flex-col items-end gap-1">
                    <span className={cn('font-semibold', dark ? 'text-white' : 'text-foreground')}>R$ {(doc.revenue / 1000).toFixed(1)}k</span>
                    <div className={cn('h-1 w-16 rounded-full', dark ? 'bg-white/10' : 'bg-muted')}>
                      <div className="h-full rounded-full gradient-bg" style={{ width: `${(doc.revenue / maxRev) * 100}%` }} />
                    </div>
                  </div>
                </td>
                <td className="text-right py-3">{doc.avgAttendanceTime} min</td>
                <td className="text-right py-3">
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    doc.absenteeRate > 15 ? 'bg-red-500/15 text-red-400' :
                    doc.absenteeRate > 10 ? 'bg-amber-500/15 text-amber-400' :
                    'bg-emerald-500/15 text-emerald-400'
                  )}>
                    {doc.absenteeRate}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
