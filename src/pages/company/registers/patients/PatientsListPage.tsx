import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Upload, LayoutGrid, List as ListIcon, Users } from 'lucide-react'
import { GradientButton } from '@/components/ui/GradientButton'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { usePatients } from '@/hooks/usePatients'
import { PatientSearchBar } from '@/components/patients/list/PatientSearchBar'
import { PatientFilters } from '@/components/patients/list/PatientFilters'
import { PatientTable } from '@/components/patients/list/PatientTable'
import { PatientCard } from '@/components/patients/list/PatientCard'
import { QuickViewDrawer } from '@/components/patients/list/QuickViewDrawer'
import type { Patient } from '@/types/patient.types'
import { cn } from '@/lib/utils'

type ViewMode = 'list' | 'grid'

export default function PatientsListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { patients, filtered, loading, filters, setFilters, updateFilter, clearFilters } = usePatients()

  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    (localStorage.getItem('patients:viewMode') as ViewMode) || 'list'
  )
  useEffect(() => { localStorage.setItem('patients:viewMode', viewMode) }, [viewMode])

  const [convenios, setConvenios] = useState<{ id: string; name: string }[]>([])
  useEffect(() => {
    if (!user?.companyId) return
    supabase.from('convenios').select('id,name').eq('company_id', user.companyId).eq('is_active', true)
      .then(({ data }) => setConvenios((data || []).map(c => ({ id: c.id, name: c.name }))))
  }, [user?.companyId])

  const [quickPatient, setQuickPatient] = useState<Patient | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  useEffect(() => { setPage(1) }, [filtered.length, pageSize])

  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize])
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))

  const goNew = () => navigate('/app/cadastros/pacientes/novo')
  const goImport = () => navigate('/app/cadastros/pacientes/importar')
  const goView = (p: Patient) => navigate(`/app/cadastros/pacientes/${p.id}`)
  const goEdit = (p: Patient) => navigate(`/app/cadastros/pacientes/${p.id}/editar`)
  const goSchedule = (p: Patient) => navigate(`/app/agendamento?patientId=${p.id}`)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pacientes</h1>
          <p className="text-sm text-muted-foreground">
            {patients.length} {patients.length === 1 ? 'paciente cadastrado' : 'pacientes cadastrados'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-input bg-card p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={cn('inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors',
                viewMode === 'list' ? 'gradient-bg text-white shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              aria-label="Modo lista"
            >
              <ListIcon className="h-3.5 w-3.5" /> Lista
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn('inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors',
                viewMode === 'grid' ? 'gradient-bg text-white shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              aria-label="Modo grade"
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Grade
            </button>
          </div>
          <button
            onClick={goImport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <Upload className="h-4 w-4" /> Importar Lista
          </button>
          <GradientButton onClick={goNew}>
            <Plus className="h-4 w-4 mr-1.5" /> Novo Paciente
          </GradientButton>
        </div>
      </div>

      {/* Search */}
      <PatientSearchBar
        value={filters.search || ''}
        onChange={v => updateFilter('search', v || undefined)}
        results={filtered}
        onSelect={p => setQuickPatient(p)}
        filters={filters}
        onFiltersChange={setFilters}
        convenios={convenios}
      />

      {/* Body */}
      <div className="flex flex-col lg:flex-row gap-5">
        <PatientFilters
          patients={patients}
          filters={filters}
          onChange={setFilters}
          convenios={convenios}
          onClear={clearFilters}
        />

        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
              Carregando pacientes...
            </div>
          ) : patients.length === 0 ? (
            <EmptyState onAdd={goNew} onImport={goImport} />
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
              Nenhum paciente encontrado com os filtros atuais.
            </div>
          ) : viewMode === 'list' ? (
            <PatientTable patients={paged} onView={goView} onEdit={goEdit} onQuickView={p => setQuickPatient(p)} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {paged.map(p => (
                <PatientCard key={p.id} patient={p}
                  onView={() => goView(p)}
                  onEdit={() => goEdit(p)}
                  onClick={() => setQuickPatient(p)}
                />
              ))}
            </div>
          )}

          {/* Paginação */}
          {filtered.length > 0 && (
            <div className="mt-4 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Por página:</span>
                <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))}
                  className="rounded-md border border-input bg-background px-2 py-1 text-xs">
                  {[25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} de {filtered.length}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="rounded-md border border-input bg-background px-2.5 py-1 disabled:opacity-40 hover:bg-muted">
                    Anterior
                  </button>
                  <span className="px-2 font-semibold text-foreground">{page} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="rounded-md border border-input bg-background px-2.5 py-1 disabled:opacity-40 hover:bg-muted">
                    Próxima
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <QuickViewDrawer
        patient={quickPatient}
        onClose={() => setQuickPatient(null)}
        onView={p => { setQuickPatient(null); goView(p) }}
        onEdit={p => { setQuickPatient(null); goEdit(p) }}
        onSchedule={p => { setQuickPatient(null); goSchedule(p) }}
      />
    </div>
  )
}

function EmptyState({ onAdd, onImport }: { onAdd: () => void; onImport: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-12 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <Users className="h-7 w-7 text-primary" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-1">Nenhum paciente cadastrado</h3>
      <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
        Cadastre seu primeiro paciente ou importe uma lista existente para começar.
      </p>
      <div className="flex items-center justify-center gap-2">
        <button onClick={onImport}
          className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted">
          <Upload className="h-4 w-4" /> Importar
        </button>
        <GradientButton onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1.5" /> Cadastrar paciente
        </GradientButton>
      </div>
    </div>
  )
}
