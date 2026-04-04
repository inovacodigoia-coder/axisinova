import { useState, useMemo } from 'react'
import { MOCK_APPOINTMENTS } from '@/mocks/scheduling.mock'
import { getAbsentees } from '@/mocks/scheduling.mock'
import { format, subDays } from 'date-fns'
import { Download, RefreshCw } from 'lucide-react'
import { GradientButton } from '@/components/ui/GradientButton'
import { toast } from 'sonner'
import { APPOINTMENT_TYPE_CONFIG } from '@/types/scheduling.types'

export default function AbsenteesPage() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd')
  const [startDate, setStartDate] = useState(thirtyDaysAgo)
  const [endDate, setEndDate] = useState(today)

  const absentees = useMemo(() => getAbsentees(startDate, endDate), [startDate, endDate])

  const estimatedLoss = absentees.length * 180 // R$180 avg per appointment

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pacientes Faltosos</h1>
          <p className="text-sm text-muted-foreground">Relatório de ausências e remarcações</p>
        </div>
        <GradientButton onClick={() => toast.info('Exportação em desenvolvimento')}><Download className="h-4 w-4 mr-2" /> Exportar Relatório</GradientButton>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">De:</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Até:</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
        </div>
      </div>

      <div className="flex gap-4">
        <div className="rounded-xl border border-border bg-card p-4 flex-1">
          <p className="text-2xl font-bold text-destructive">{absentees.length}</p>
          <p className="text-sm text-muted-foreground">Faltosos no período</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex-1">
          <p className="text-2xl font-bold text-foreground">R$ {estimatedLoss.toLocaleString('pt-BR')}</p>
          <p className="text-sm text-muted-foreground">Receita perdida estimada</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Paciente</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Horário</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Médico</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Convênio</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {absentees.map(apt => (
                <tr key={apt.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{apt.patientName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{apt.date.split('-').reverse().join('/')}</td>
                  <td className="px-4 py-3 text-muted-foreground">{apt.time}</td>
                  <td className="px-4 py-3 text-muted-foreground">{apt.doctorName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{APPOINTMENT_TYPE_CONFIG[apt.type].icon} {APPOINTMENT_TYPE_CONFIG[apt.type].label}</td>
                  <td className="px-4 py-3 text-muted-foreground">{apt.convenioName}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toast.info('Remarcação em desenvolvimento')}
                      className="flex items-center gap-1 rounded-lg border border-primary/30 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/5 transition-colors">
                      <RefreshCw className="h-3 w-3" /> Remarcar
                    </button>
                  </td>
                </tr>
              ))}
              {absentees.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhum faltoso no período selecionado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
