import { useEffect, useRef, useState } from 'react'
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Patient, PatientListFilters, Gender, BloodType, PatientStatus } from '@/types/patient.types'
import { GENDER_LABELS, STATUS_LABELS, STATUS_COLORS } from '@/types/patient.types'
import { calculateAge, formatPhoneDisplay, maskCPFPrivate, maskCardPrivate } from '@/utils/patient.validators'

interface Props {
  value: string
  onChange: (v: string) => void
  results: Patient[]
  onSelect: (p: Patient) => void
  filters: PatientListFilters
  onFiltersChange: (f: PatientListFilters) => void
  convenios?: { id: string; name: string }[]
}

export function PatientSearchBar({ value, onChange, results, onSelect, filters, onFiltersChange, convenios = [] }: Props) {
  const [showResults, setShowResults] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), 400)
    return () => clearTimeout(t)
  }, [value])

  useEffect(() => {
    setShowResults(debouncedValue.trim().length >= 2)
  }, [debouncedValue])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const top = results.slice(0, 6)

  return (
    <div className="space-y-3" ref={containerRef}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => debouncedValue.trim().length >= 2 && setShowResults(true)}
          placeholder="Busque por nome, CPF, RG, nome da mãe, telefone ou carteirinha..."
          className="h-12 w-full rounded-xl border border-input bg-card pl-12 pr-12 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          aria-label="Buscar paciente"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-muted"
            aria-label="Limpar busca"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}

        {showResults && (
          <div className="absolute z-30 left-0 right-0 mt-2 max-h-[420px] overflow-y-auto rounded-xl border border-border bg-popover shadow-xl">
            {top.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nenhum paciente encontrado para "{value}"
              </div>
            ) : (
              top.map(p => (
                <button
                  key={p.id}
                  onClick={() => { onSelect(p); setShowResults(false) }}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full gradient-bg text-white text-sm font-bold">
                    {p.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-foreground truncate">{p.fullName}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        {calculateAge(p.birthDate) !== undefined && (
                          <span className="text-xs text-muted-foreground">{calculateAge(p.birthDate)} anos</span>
                        )}
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', STATUS_COLORS[p.status])}>
                          {STATUS_LABELS[p.status]}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      CPF: {maskCPFPrivate(p.cpf)} · {formatPhoneDisplay(p.phone1)}
                    </p>
                    {p.convenios[0] && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {p.convenios[0].convenioName} · Cartão: {maskCardPrivate(p.convenios[0].cardNumber)}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Toggle de busca avançada */}
      <button
        onClick={() => setShowAdvanced(s => !s)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
      >
        Busca Avançada {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {showAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 rounded-xl border border-border bg-muted/30 p-4">
          <FieldDate
            label="Nascimento (de)" value={filters.birthDateFrom || ''}
            onChange={v => onFiltersChange({ ...filters, birthDateFrom: v || undefined })}
          />
          <FieldDate
            label="Nascimento (até)" value={filters.birthDateTo || ''}
            onChange={v => onFiltersChange({ ...filters, birthDateTo: v || undefined })}
          />
          <FieldSelect
            label="Gênero"
            value={filters.gender?.[0] || ''}
            onChange={v => onFiltersChange({ ...filters, gender: v ? [v as Gender] : undefined })}
            options={[{ value: '', label: 'Todos' }, ...Object.entries(GENDER_LABELS).map(([value, label]) => ({ value, label }))]}
          />
          <FieldSelect
            label="Status"
            value={filters.status?.[0] || ''}
            onChange={v => onFiltersChange({ ...filters, status: v ? [v as PatientStatus] : undefined })}
            options={[{ value: '', label: 'Todos' }, ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))]}
          />
          {convenios.length > 0 && (
            <FieldSelect
              label="Convênio"
              value={filters.convenioIds?.[0] || ''}
              onChange={v => onFiltersChange({ ...filters, convenioIds: v ? [v] : undefined })}
              options={[{ value: '', label: 'Todos' }, ...convenios.map(c => ({ value: c.id, label: c.name }))]}
            />
          )}
          <FieldInput
            label="Cidade" value={filters.city || ''}
            onChange={v => onFiltersChange({ ...filters, city: v || undefined })}
          />
          <FieldSelect
            label="Tipo sanguíneo"
            value={filters.bloodType || ''}
            onChange={v => onFiltersChange({ ...filters, bloodType: (v || undefined) as BloodType | undefined })}
            options={[{ value: '', label: 'Todos' }, ...['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => ({ value: b, label: b }))]}
          />
          <label className="flex items-end gap-2 pb-2 text-xs">
            <input
              type="checkbox" checked={!!filters.hasAllergy}
              onChange={e => onFiltersChange({ ...filters, hasAllergy: e.target.checked || undefined })}
              className="h-4 w-4 rounded border-input"
            />
            <span className="font-medium text-foreground">Apenas com alergia registrada</span>
          </label>
        </div>
      )}
    </div>
  )
}

function FieldInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40" />
    </div>
  )
}
function FieldSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
function FieldDate({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
      <input type="date" value={value} onChange={e => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40" />
    </div>
  )
}
