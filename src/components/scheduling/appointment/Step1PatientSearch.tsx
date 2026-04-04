import { useState, useMemo } from 'react'
import { X, Search, UserPlus } from 'lucide-react'
import { MOCK_PATIENTS, MOCK_APPOINTMENTS } from '@/mocks/scheduling.mock'
import type { SchedulingPatient } from '@/types/scheduling.types'
import { format, differenceInYears } from 'date-fns'

interface Props {
  onSelect: (patient: SchedulingPatient) => void
  onCreateNew: () => void
}

export function Step1PatientSearch({ onSelect, onCreateNew }: Props) {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    if (query.length < 3) return []
    const q = query.toLowerCase()
    return MOCK_PATIENTS.filter(p =>
      p.fullName.toLowerCase().includes(q) ||
      (p.cpf && p.cpf.includes(q)) ||
      p.motherName.toLowerCase().includes(q)
    ).slice(0, 5)
  }, [query])

  const getAge = (bd: string) => differenceInYears(new Date(), new Date(bd))

  const getLastAppointment = (patientId: string) => {
    const apts = MOCK_APPOINTMENTS
      .filter(a => a.patientId === patientId && a.status === 'completed')
      .sort((a, b) => b.date.localeCompare(a.date))
    return apts[0] || null
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-foreground">Identificação do Paciente</h3>
        <p className="text-sm text-muted-foreground">Busque por nome, CPF ou nome da mãe</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Busque por nome, CPF ou nome da mãe..."
          className="w-full rounded-xl border-2 border-input bg-background pl-10 pr-4 py-3 text-sm font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          autoFocus
        />
      </div>

      {query.length >= 3 && results.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Nenhum paciente encontrado com estes dados</p>
          <button onClick={onCreateNew}
            className="inline-flex items-center gap-2 rounded-lg gradient-bg px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity">
            <UserPlus className="h-4 w-4" /> Cadastrar novo paciente
          </button>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map(p => {
            const last = getLastAppointment(p.id)
            return (
              <div key={p.id} className="rounded-xl border border-border p-4 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => onSelect(p)}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-foreground">{p.fullName}</p>
                    <p className="text-sm text-muted-foreground">{getAge(p.birthDate)} anos · Nasc. {format(new Date(p.birthDate), 'dd/MM/yyyy')}</p>
                    {p.cpf && <p className="text-xs text-muted-foreground">CPF: {p.cpf}</p>}
                    <p className="text-xs text-muted-foreground">📞 {p.phone1}</p>
                    {last && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Último atendimento: {format(new Date(last.date), 'dd/MM/yyyy')} · {last.doctorName}
                      </p>
                    )}
                  </div>
                  <button className="rounded-lg gradient-bg px-3 py-1.5 text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    Selecionar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
