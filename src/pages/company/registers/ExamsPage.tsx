import { useState } from 'react'
import { MOCK_EXAMS } from '@/mocks/company.mock'
import { useCompanyContext } from '@/context/CompanyContext'
import { DataTable } from '@/components/ui/DataTable'
import { Plus, Search, Edit } from 'lucide-react'
import type { Exam } from '@/types/registers.types'
import { EXAM_TYPES, SPECIALTIES } from '@/types/registers.types'
import { toast } from 'sonner'

const TYPE_MAP = Object.fromEntries(EXAM_TYPES.map(t => [t.value, t.label]))

export default function ExamsPage() {
  const { canAccess } = useCompanyContext()
  const [exams, setExams] = useState(MOCK_EXAMS)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Exam | null>(null)

  const filtered = exams.filter(e => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.tussCode.includes(search)) return false
    if (typeFilter && e.type !== typeFilter) return false
    return true
  })

  const columns = [
    { key: 'tussCode', label: 'Código TUSS', sortable: true, render: (e: Exam) => <span className="font-mono text-sm">{e.tussCode}</span> },
    { key: 'name', label: 'Nome', sortable: true, render: (e: Exam) => <span className="font-medium text-foreground">{e.name}</span> },
    { key: 'type', label: 'Tipo', render: (e: Exam) => <span className="text-sm">{TYPE_MAP[e.type]}</span> },
    { key: 'specialty', label: 'Especialidade', render: (e: Exam) => <span className="text-sm text-muted-foreground">{e.specialty || '—'}</span> },
    { key: 'duration', label: 'Duração', render: (e: Exam) => <span className="text-sm">{e.duration ? `${e.duration} min` : '—'}</span> },
    { key: 'isActive', label: 'Status', render: (e: Exam) => (
      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${e.isActive ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' : 'bg-muted text-muted-foreground'}`}>
        {e.isActive ? 'Ativo' : 'Inativo'}
      </span>
    )},
    { key: 'actions', label: '', render: (e: Exam) => (
      <button onClick={() => { setEditing(e); setShowForm(true) }} className="rounded p-1 hover:bg-muted"><Edit className="h-4 w-4 text-muted-foreground" /></button>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Exames e Procedimentos</h1>
          <p className="text-sm text-muted-foreground">Catálogo TUSS de exames e procedimentos</p>
        </div>
        {canAccess('registers', 'create') && (
          <button onClick={() => { setEditing(null); setShowForm(true) }} className="gradient-bg rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Novo Item
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou código TUSS..." className="w-full rounded-lg border border-input bg-background pl-9 pr-4 py-2 text-sm" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option value="">Todos os tipos</option>
          {EXAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <DataTable data={filtered} columns={columns} />

      {showForm && (
        <ExamFormModal exam={editing} onClose={() => { setShowForm(false); setEditing(null) }} onSave={(e) => {
          if (editing) setExams(prev => prev.map(x => x.id === e.id ? e : x))
          else setExams(prev => [...prev, e])
          setShowForm(false); setEditing(null)
          toast.success(editing ? 'Exame atualizado' : 'Exame cadastrado')
        }} />
      )}
    </div>
  )
}

function ExamFormModal({ exam, onClose, onSave }: { exam: Exam | null; onClose: () => void; onSave: (e: Exam) => void }) {
  const [tussCode, setTussCode] = useState(exam?.tussCode || '')
  const [name, setName] = useState(exam?.name || '')
  const [type, setType] = useState<Exam['type']>(exam?.type || 'lab')
  const [specialty, setSpecialty] = useState(exam?.specialty || '')
  const [duration, setDuration] = useState(exam?.duration || 30)
  const [preparation, setPreparation] = useState(exam?.preparation || '')
  const [resultDays, setResultDays] = useState(exam?.resultDays || 1)
  const [requiresAuth, setRequiresAuth] = useState(exam?.requiresAuth || false)
  const [authInstructions, setAuthInstructions] = useState(exam?.authInstructions || '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-[600px] max-h-[85vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <h2 className="text-lg font-bold">{exam ? 'Editar Exame' : 'Novo Exame'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium">Código TUSS *</label><input value={tussCode} onChange={e => setTussCode(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium">Nome *</label><input value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Tipo *</label>
              <select value={type} onChange={e => setType(e.target.value as Exam['type'])} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                {EXAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Especialidade</label>
              <select value={specialty} onChange={e => setSpecialty(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium">Duração (min)</label><input type="number" value={duration} onChange={e => setDuration(+e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium">Prazo resultado (dias)</label><input type="number" value={resultDays} onChange={e => setResultDays(+e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
          </div>
          <div><label className="text-sm font-medium">Preparo do paciente</label><textarea value={preparation} onChange={e => setPreparation(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={requiresAuth} onChange={e => setRequiresAuth(e.target.checked)} className="accent-primary" /> Requer autorização prévia
          </label>
          {requiresAuth && (
            <div><label className="text-sm font-medium">Instruções de autorização</label><textarea value={authInstructions} onChange={e => setAuthInstructions(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
          )}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-border bg-card px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted">Cancelar</button>
          <button onClick={() => {
            if (!tussCode || !name) { toast.error('Preencha os campos obrigatórios'); return }
            onSave({ id: exam?.id || `ex_${Date.now()}`, tussCode, name, type, specialty, duration, preparation, resultDays, requiresAuth, authInstructions, isActive: true, companyId: 'comp_001' })
          }} className="gradient-bg rounded-lg px-6 py-2 text-sm font-semibold text-white">Salvar</button>
        </div>
      </div>
    </div>
  )
}
