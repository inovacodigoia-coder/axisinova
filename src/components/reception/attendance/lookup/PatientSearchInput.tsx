import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { usePatients } from '@/hooks/usePatients'
import { useAttendanceSearch } from '@/hooks/useAttendanceSearch'
import { PatientResultCard } from './PatientResultCard'
import type { Patient } from '@/types/patient.types'

interface Props { onSelect: (patient: Patient) => void }

export function PatientSearchInput({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const { patients } = usePatients()
  // Cadastros desativados/bloqueados não aparecem no cadastro de atendimento
  const activePatients = useMemo(() => patients.filter(p => p.status === 'active'), [patients])
  const results = useAttendanceSearch(debounced, activePatients)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 400)
    return () => clearTimeout(id)
  }, [query])

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Busque por nome, CPF, nome da mãe ou número do pedido..."
          className="w-full h-[52px] rounded-lg border border-border bg-background pl-12 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {debounced.length < 2 ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground space-y-1">
          <div className="font-medium text-foreground">💡 Exemplos de busca:</div>
          <div>"João Silva" → por nome</div>
          <div>"012.345.678-90" → por CPF</div>
          <div>"Maria da Silva" → por nome da mãe</div>
          <div>"ATD-2025-000089" → por número do pedido</div>
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
          Nenhum resultado encontrado para "{debounced}"
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {results.map((r, i) => r.patient && (
            <button key={i} onClick={() => onSelect(r.patient!)} className="w-full text-left">
              <PatientResultCard patient={r.patient} compact />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
