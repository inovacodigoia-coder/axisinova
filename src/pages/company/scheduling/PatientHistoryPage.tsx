import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useScheduling } from '@/context/SchedulingContext'
import { useRegisters } from '@/context/RegistersContext'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import { STATUS_CONFIG, APPOINTMENT_TYPE_CONFIG } from '@/types/scheduling.types'
import { differenceInYears, format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Search } from 'lucide-react'
import { SearchInput } from '@/components/ui/SearchInput'

export default function PatientHistoryPage() {
  const [searchParams] = useSearchParams()
  const patientIdParam = searchParams.get('id')
  const [search, setSearch] = useState('')
  const [selectedPatientId, setSelectedPatientId] = useState(patientIdParam || '')
  const { patients, appointments } = useScheduling()
  const { convenios } = useRegisters()

  const patient = patients.find(p => p.id === selectedPatientId)

  const history = useMemo(() => {
    if (!selectedPatientId) return []
    return appointments
      .filter(a => a.patientId === selectedPatientId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
  }, [selectedPatientId, appointments])

  const { visibleItems, totalItems, hasMore, showMore, showAll, remainingCount } = usePaginatedList(history, 10)

  const searchResults = useMemo(() => {
    if (search.length < 2) return []
    return patients.filter(p => p.fullName.toLowerCase().includes(search.toLowerCase())).slice(0, 5)
  }, [search, patients])

  const stats = useMemo(() => ({
    total: history.length,
    consultations: history.filter(a => a.type === 'consultation').length,
    exams: history.filter(a => a.type === 'exam').length,
    lastVisit: history.find(a => a.status === 'completed')?.date || null,
    nextAppt: history.filter(a => a.date >= new Date().toISOString().split('T')[0] && !['cancelled', 'absent'].includes(a.status)).sort((a, b) => a.date.localeCompare(b.date))[0]?.date || null,
  }), [history])

  const getConvenioName = (id?: string) => {
    if (!id) return ''
    return convenios.find(c => c.id === id)?.name || ''
  }

  if (patients.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Histórico do Paciente</h1>
          <p className="text-sm text-muted-foreground">Linha do tempo completa de atendimentos</p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <Search className="h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-bold text-foreground">Nenhum paciente cadastrado</h3>
          <p className="text-sm text-muted-foreground">Cadastre pacientes pelo módulo de agendamento.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Histórico do Paciente</h1>
        <p className="text-sm text-muted-foreground">Linha do tempo completa de atendimentos</p>
      </div>

      {!patient && (
        <div className="max-w-md space-y-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar paciente por nome..." />
          {searchResults.map(p => (
            <button key={p.id} onClick={() => { setSelectedPatientId(p.id); setSearch('') }}
              className="w-full text-left rounded-xl border border-border p-3 hover:border-primary/50 hover:shadow-sm transition-all">
              <p className="font-medium text-foreground">{p.fullName}</p>
              <p className="text-xs text-muted-foreground">{differenceInYears(new Date(), new Date(p.birthDate))} anos · {p.phone1}</p>
            </button>
          ))}
        </div>
      )}

      {patient && (
        <>
          <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
            <div className="h-14 w-14 rounded-full gradient-bg flex items-center justify-center text-xl font-bold text-white">
              {patient.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground">{patient.fullName}</h2>
              <p className="text-sm text-muted-foreground">
                {differenceInYears(new Date(), new Date(patient.birthDate))} anos
                {patient.cpf ? ` · CPF: ${patient.cpf}` : ''}
                {patient.convenioId ? ` · ${getConvenioName(patient.convenioId)}` : ''}
              </p>
              <p className="text-xs text-muted-foreground">📞 {patient.phone1}{patient.phone2 ? ` · ${patient.phone2}` : ''}</p>
            </div>
            <button onClick={() => setSelectedPatientId('')} className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
              Trocar paciente
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Total', value: stats.total },
              { label: 'Consultas', value: stats.consultations },
              { label: 'Exames', value: stats.exams },
              { label: 'Último', value: stats.lastVisit ? format(new Date(stats.lastVisit), 'dd/MM/yy') : '-' },
              { label: 'Próximo', value: stats.nextAppt ? format(new Date(stats.nextAppt), 'dd/MM/yy') : '-' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-3 text-center">
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-0 relative">
            <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />
            {visibleItems.map(apt => {
              const cfg = STATUS_CONFIG[apt.status]
              const typeCfg = APPOINTMENT_TYPE_CONFIG[apt.type]
              return (
                <div key={apt.id} className="relative pl-10 pb-4">
                  <div className={cn('absolute left-[14px] top-1 h-3 w-3 rounded-full border-2 border-card', cfg.bg)}
                    style={{ backgroundColor: apt.status === 'completed' ? '#718096' : apt.status === 'absent' ? '#E53E3E' : apt.status === 'confirmed' ? '#38A169' : '#3B82F6' }} />
                  <div className="rounded-xl border border-border bg-card p-3 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{format(new Date(apt.date), 'dd/MM/yyyy')} às {apt.time}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', cfg.bg, cfg.color)}>{cfg.label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {typeCfg.icon} {typeCfg.label} · {apt.doctorName} · {apt.convenioName}
                    </p>
                    {apt.examName && <p className="text-xs text-muted-foreground">{apt.examName}</p>}
                    {apt.observations && <p className="text-xs text-muted-foreground mt-1">📝 {apt.observations}</p>}
                  </div>
                </div>
              )
            })}
            {history.length === 0 && <p className="text-center text-muted-foreground py-8">Este paciente não possui atendimentos registrados ainda.</p>}
          </div>

          {hasMore && (
            <div className="flex items-center justify-between px-1">
              <span className="text-sm text-muted-foreground">Exibindo {visibleItems.length} de {totalItems}</span>
              <div className="flex gap-2">
                <button onClick={showMore} className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                  Carregar mais {Math.min(10, remainingCount)} atendimentos
                </button>
                {remainingCount > 10 && (
                  <button onClick={showAll} className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                    Ver todos ({totalItems})
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
