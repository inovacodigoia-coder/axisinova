import { SearchInput } from '@/components/ui/SearchInput'
import { MOCK_DOCTORS, MOCK_CONVENIOS } from '@/mocks/company.mock'
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { SchedulingAppointment } from '@/types/scheduling.types'

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
  const selectedDoctor = MOCK_DOCTORS.find(d => d.id === doctorFilter)
  const convenios = doctorFilter === 'all'
    ? MOCK_CONVENIOS.filter(c => c.isActive)
    : MOCK_CONVENIOS.filter(c => c.isActive && (selectedDoctor?.enabledConvenios?.includes(c.id) ?? true))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <select value={doctorFilter} onChange={e => onDoctorFilterChange(e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm min-w-[200px]">
          <option value="all">Todos os médicos</option>
          {MOCK_DOCTORS.filter(d => d.isActive).map(d => (
            <option key={d.id} value={d.id}>{d.fullName}</option>
          ))}
        </select>

        <select value={typeFilter} onChange={e => onTypeFilterChange(e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="all">Todos os tipos</option>
          <option value="consultation">Consultas</option>
          <option value="exam">Exames</option>
          <option value="procedure">Procedimentos</option>
        </select>

        <select value={convenioFilter} onChange={e => onConvenioFilterChange(e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="all">Todos os convênios</option>
          {convenios.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
          <span className="font-medium text-foreground">{todayCount.total} pacientes</span>
          <span>·</span>
          <span>{todayCount.consultations} consultas</span>
          <span>·</span>
          <span>{todayCount.exams} exames</span>
          <span>·</span>
          <span>{todayCount.procedures} procedimentos</span>
        </div>
      </div>
    </div>
  )
}
