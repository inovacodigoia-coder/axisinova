import { SearchInput } from '@/components/ui/SearchInput'
import { useRegisters } from '@/context/RegistersContext'
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useMemo } from 'react'
import { DependencyAlert } from '@/components/scheduling/empty-states/DependencyAlert'

export type ViewMode = 'day' | 'week' | 'month'

interface Props {
  selectedDate: Date
  onDateChange: (date: Date) => void
  doctorFilter: string
  onDoctorFilterChange: (id: string) => void
  typeFilter: string
  onTypeFilterChange: (t: string) => void
  convenioFilter: string
  onConvenioFilterChange: (id: string) => void
  search: string
  onSearchChange: (s: string) => void
  viewMode: ViewMode
  onViewModeChange: (v: ViewMode) => void
  todayCount: { total: number; consultations: number; exams: number; procedures: number }
}

export function AgendaFilters({
  selectedDate, onDateChange, doctorFilter, onDoctorFilterChange,
  typeFilter, onTypeFilterChange, convenioFilter, onConvenioFilterChange,
  search, onSearchChange, viewMode, onViewModeChange, todayCount
}: Props) {
  const { doctors, convenios, exams, procedures } = useRegisters()

  const activeDoctors = useMemo(() => doctors.filter(d => d.isActive && !d.isBlocked), [doctors])
  const selectedDoctor = doctors.find(d => d.id === doctorFilter)

  const filteredConvenios = useMemo(() => {
    if (doctorFilter === 'all') return convenios.filter(c => c.isActive)
    if (!selectedDoctor) return convenios.filter(c => c.isActive)
    return convenios.filter(c => c.isActive && selectedDoctor.enabledConvenioIds.includes(c.id))
  }, [doctorFilter, selectedDoctor, convenios])

  const hasExams = exams.filter(e => e.isActive).length > 0
  const hasProcedures = procedures.filter(p => p.isActive).length > 0

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {activeDoctors.length === 0 ? (
          <DependencyAlert
            icon="⚠️"
            message="Nenhum médico ativo. Cadastre médicos em Cadastros → Médicos"
            actionLabel="Cadastrar Médico"
            actionRoute="/app/cadastros/medicos"
          />
        ) : (
          <select value={doctorFilter} onChange={e => onDoctorFilterChange(e.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm min-w-[200px]">
            {activeDoctors.length >= 2 && <option value="all">Todos os médicos</option>}
            {activeDoctors.map(d => (
              <option key={d.id} value={d.id}>{d.fullName}</option>
            ))}
          </select>
        )}

        <select value={typeFilter} onChange={e => onTypeFilterChange(e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="all">Todos os tipos</option>
          <option value="consultation">Consultas</option>
          <option value="exam" disabled={!hasExams}>{hasExams ? 'Exames' : 'Exames (nenhum cadastrado)'}</option>
          <option value="procedure" disabled={!hasProcedures}>{hasProcedures ? 'Procedimentos' : 'Procedimentos (nenhum cadastrado)'}</option>
        </select>

        <select value={convenioFilter} onChange={e => onConvenioFilterChange(e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="all">Todos os convênios</option>
          {filteredConvenios.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <div className="flex items-center gap-1 rounded-lg border border-input bg-background">
          <button onClick={() => onDateChange(addDays(selectedDate, -1))} className="p-2 hover:bg-muted rounded-l-lg transition-colors">
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <button onClick={() => onDateChange(new Date())} className="px-3 py-2 text-sm font-medium hover:bg-muted transition-colors">
            Hoje
          </button>
          <span className="px-2 text-sm font-semibold text-foreground min-w-[180px] text-center">
            {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </span>
          <button onClick={() => onDateChange(addDays(selectedDate, 1))} className="p-2 hover:bg-muted rounded-r-lg transition-colors">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex rounded-lg border border-input overflow-hidden">
          {(['day', 'week', 'month'] as ViewMode[]).map(v => (
            <button key={v} onClick={() => onViewModeChange(v)}
              className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === v ? 'gradient-bg text-white' : 'bg-background text-foreground hover:bg-muted'}`}>
              {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-64">
          <SearchInput value={search} onChange={onSearchChange} placeholder="Buscar paciente..." />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalIcon className="h-4 w-4" />
          <span className="font-medium text-foreground">
            {todayCount.total === 0 ? 'Nenhum paciente agendado hoje' : `${todayCount.total} pacientes`}
          </span>
          {todayCount.total > 0 && (
            <>
              <span>·</span>
              <span>{todayCount.consultations} consultas</span>
              <span>·</span>
              <span>{todayCount.exams} exames</span>
              <span>·</span>
              <span>{todayCount.procedures} procedimentos</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
