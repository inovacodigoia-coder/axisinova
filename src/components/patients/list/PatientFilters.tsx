import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Patient, PatientListFilters, PatientStatus, Gender } from '@/types/patient.types'
import { GENDER_LABELS, STATUS_LABELS } from '@/types/patient.types'

interface Props {
  patients: Patient[]
  filters: PatientListFilters
  onChange: (f: PatientListFilters) => void
  convenios?: { id: string; name: string }[]
  onClear: () => void
}

const AGE_RANGES = ['0-12', '13-17', '18-30', '31-45', '46-60', '60+']
const ATTENDANCE_RANGES = [
  { v: 'week', l: 'Esta semana' },
  { v: 'month', l: 'Este mês' },
  { v: '3months', l: 'Últimos 3 meses' },
  { v: '6months', l: 'Mais de 6 meses' },
  { v: 'never', l: 'Nunca atendido' },
]

export function PatientFilters({ patients, filters, onChange, convenios = [], onClear }: Props) {
  const counts = useMemo(() => {
    const byStatus: Record<string, number> = {}
    const byGender: Record<string, number> = {}
    const byConvenio: Record<string, number> = {}
    patients.forEach(p => {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1
      byGender[p.gender] = (byGender[p.gender] || 0) + 1
      p.convenios.forEach(c => { byConvenio[c.convenioId] = (byConvenio[c.convenioId] || 0) + 1 })
    })
    return { byStatus, byGender, byConvenio }
  }, [patients])

  const toggleArray = <T extends string>(arr: T[] | undefined, value: T): T[] | undefined => {
    const cur = arr || []
    const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value]
    return next.length === 0 ? undefined : next
  }

  return (
    <aside className="w-full lg:w-[240px] shrink-0">
      <div className="sticky top-20 space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Filtros</p>
          <button onClick={onClear} className="text-[11px] font-medium text-primary hover:underline inline-flex items-center gap-1">
            <X className="h-3 w-3" /> Limpar
          </button>
        </div>

        <Section title="Status">
          {(['active', 'inactive', 'blocked'] as PatientStatus[]).map(s => (
            <CheckRow
              key={s}
              label={STATUS_LABELS[s]}
              count={counts.byStatus[s] || 0}
              checked={filters.status?.includes(s) || false}
              onChange={() => onChange({ ...filters, status: toggleArray(filters.status, s) })}
            />
          ))}
        </Section>

        {convenios.length > 0 && (
          <Section title="Convênio">
            {convenios.map(c => (
              <CheckRow
                key={c.id}
                label={c.name}
                count={counts.byConvenio[c.id] || 0}
                checked={filters.convenioIds?.includes(c.id) || false}
                onChange={() => onChange({ ...filters, convenioIds: toggleArray(filters.convenioIds, c.id) })}
              />
            ))}
          </Section>
        )}

        <Section title="Gênero">
          {(['male', 'female', 'other'] as Gender[]).map(g => (
            <CheckRow
              key={g}
              label={GENDER_LABELS[g]}
              count={counts.byGender[g] || 0}
              checked={filters.gender?.includes(g) || false}
              onChange={() => onChange({ ...filters, gender: toggleArray(filters.gender, g) })}
            />
          ))}
        </Section>

        <Section title="Faixa etária">
          {AGE_RANGES.map(r => (
            <CheckRow
              key={r}
              label={r === '60+' ? '60 anos ou mais' : `${r} anos`}
              checked={filters.ageRanges?.includes(r) || false}
              onChange={() => onChange({ ...filters, ageRanges: toggleArray(filters.ageRanges, r) })}
            />
          ))}
        </Section>

        <Section title="Último atendimento">
          {ATTENDANCE_RANGES.map(r => (
            <RadioRow
              key={r.v}
              label={r.l}
              checked={filters.lastAttendance === r.v}
              onChange={() => onChange({ ...filters, lastAttendance: filters.lastAttendance === r.v ? undefined : r.v })}
            />
          ))}
        </Section>
      </div>
    </aside>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between px-3 py-2 hover:bg-muted/50">
        <span className="text-[12px] font-bold uppercase tracking-wider text-foreground">{title}</span>
        {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      {open && <div className="px-3 pb-2 space-y-1.5">{children}</div>}
    </div>
  )
}

function CheckRow({ label, count, checked, onChange }: { label: string; count?: number; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center justify-between gap-2 cursor-pointer text-[13px] hover:bg-muted/30 rounded px-1.5 py-1">
      <span className="flex items-center gap-2">
        <input type="checkbox" checked={checked} onChange={onChange} className="h-3.5 w-3.5 rounded border-input" />
        <span className={cn('text-foreground', checked && 'font-semibold')}>{label}</span>
      </span>
      {count !== undefined && (
        <span className="text-[10px] font-bold text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 min-w-[20px] text-center">{count}</span>
      )}
    </label>
  )
}
function RadioRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-[13px] hover:bg-muted/30 rounded px-1.5 py-1">
      <input type="radio" checked={checked} onChange={onChange} className="h-3.5 w-3.5" />
      <span className={cn('text-foreground', checked && 'font-semibold')}>{label}</span>
    </label>
  )
}
