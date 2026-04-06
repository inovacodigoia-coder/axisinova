import { useState, useMemo } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { GradientButton } from '@/components/ui/GradientButton'
import { useScheduling } from '@/context/SchedulingContext'
import { useRegisters } from '@/context/RegistersContext'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import { toast } from 'sonner'
import { APPOINTMENT_TYPE_CONFIG } from '@/types/scheduling.types'
import { format, subDays } from 'date-fns'

export default function AbsenteesPage() {
  const { appointments } = useScheduling()
  const { doctors, convenios } = useRegisters()
  const today = format(new Date(), 'yyyy-MM-dd')
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd')
  const [startDate, setStartDate] = useState(thirtyDaysAgo)
  const [endDate, setEndDate] = useState(today)
  const [doctorFilter, setDoctorFilter] = useState('all')
  const [convenioFilter, setConvenioFilter] = useState('all')

  const absentees = useMemo(() => {
    return appointments.filter(a => {
      if (a.status !== 'absent') return false
      if (a.date < startDate || a.date > endDate) return false
      if (doctorFilter !== 'all' && a.doctorId !== doctorFilter) return false
      if (convenioFilter !== 'all' && a.convenioId !== convenioFilter) return false
      return true
    })
  }, [appointments, startDate, endDate, doctorFilter, convenioFilter])

  const { visibleItems, totalItems, hasMore, showMore, showAll, remainingCount } = usePaginatedList(absentees, 10)

  const estimatedLoss = absentees.length * 180

  const activeDoctors = doctors.filter(d => d.isActive)
  const activeConvenios = convenios.filter(c => c.isActive)

  const clearFilters = () => {
    setDoctorFilter('all')
    setConvenioFilter('all')
    setStartDate(thirtyDaysAgo)
    setEndDate(today)
  }

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
        {activeDoctors.length > 0 && (
          <select value={doctorFilter} onChange={e => setDoctorFilter(e.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
            <option value="all">Todos os médicos</option>
            {activeDoctors.map(d => <option key={d.id} value={d.id}>{d.fullName}</option>)}
          </select>
        )}
        {activeConvenios.length > 0 && (
          <select value={convenioFilter} onChange={e => setConvenioFilter(e.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
            <option value="all">Todos os convênios</option>
            {activeConvenios.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
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

      {absentees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <span className="text-4xl">✅</span>
          <h3 className="text-lg font-bold text-foreground">Nenhum faltoso registrado</h3>
          <p className="text-sm text-muted-foreground">no período selecionado</p>
          {(doctorFilter !== 'all' || convenioFilter !== 'all') && (
            <button onClick={clearFilters} className="text-sm text-primary hover:underline font-medium">Limpar filtros</button>
          )}
        </div>
      ) : (
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
                {visibleItems.map(apt => (
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
              </tbody>
            </table>
          </div>
          {hasMore && (
            <div className="border-t border-border px-4 py-3 flex items-center justify-between bg-muted/30">
              <span className="text-sm text-muted-foreground">Exibindo {visibleItems.length} de {totalItems}</span>
              <div className="flex gap-2">
                <button onClick={showMore} className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                  Mostrar mais {Math.min(10, remainingCount)}
                </button>
                {remainingCount > 10 && (
                  <button onClick={showAll} className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Ver todos ({totalItems})
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
