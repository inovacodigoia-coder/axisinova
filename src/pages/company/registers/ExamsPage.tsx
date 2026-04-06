import { useState } from 'react'
import { useRegisters } from '@/context/RegistersContext'
import { useCompanyContext } from '@/context/CompanyContext'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import { EmptyState } from '@/components/feedback/EmptyState'
import { Plus, Search, MoreVertical, Edit, Trash2, ClipboardList } from 'lucide-react'
import type { Exam } from '@/types/registers.types'
import { toast } from 'sonner'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export default function ExamsPage() {
  const { canAccess } = useCompanyContext()
  const { exams, specialties, addExam, updateExam, removeExam, getSpecialtyName } = useRegisters()
  const [search, setSearch] = useState('')
  const [specFilter, setSpecFilter] = useState('')
  const [authFilter, setAuthFilter] = useState<'' | 'yes' | 'no'>('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Exam | null>(null)

  const filtered = exams.filter(e => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.tussCode?.includes(search)) return false
    if (specFilter && e.specialtyId !== specFilter) return false
    if (authFilter === 'yes' && !e.requiresAuthorization) return false
    if (authFilter === 'no' && e.requiresAuthorization) return false
    return true
  })

  const { visibleItems, totalItems, hasMore, visibleCount, showMore, showAll, remainingCount } = usePaginatedList(filtered)

  if (exams.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-foreground">Exames</h1><p className="text-sm text-muted-foreground">Catálogo de exames da clínica</p></div>
        </div>
        <EmptyState
          icon={<span className="text-4xl">🔬</span>}
          title="Nenhum exame cadastrado"
          description="Cadastre os exames disponíveis na sua clínica"
          action={canAccess('registers', 'create') ? <button onClick={() => setShowForm(true)} className="gradient-bg rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90 flex items-center gap-2"><Plus className="h-4 w-4" /> Cadastrar Primeiro Exame</button> : undefined}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Exames <span className="text-muted-foreground text-lg font-normal">({exams.length})</span></h1>
          <p className="text-sm text-muted-foreground">Catálogo de exames da clínica</p>
        </div>
        {canAccess('registers', 'create') && (
          <button onClick={() => { setEditing(null); setShowForm(true) }} className="gradient-bg rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Novo Exame
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou código TUSS..." className="w-full rounded-lg border border-input bg-background pl-9 pr-4 py-2 text-sm" />
        </div>
        <select value={specFilter} onChange={e => setSpecFilter(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option value="">Todas especialidades</option>
          {specialties.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={authFilter} onChange={e => setAuthFilter(e.target.value as any)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option value="">Autorização: Todos</option>
          <option value="yes">Exige autorização</option>
          <option value="no">Não exige</option>
        </select>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Código TUSS</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Especialidade</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Preparo</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Prazo Result.</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Autorização</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map(e => (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{e.name}</td>
                  <td className="px-4 py-3 font-mono text-sm">{e.tussCode || '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{e.specialtyId ? getSpecialtyName(e.specialtyId) : '—'}</td>
                  <td className="px-4 py-3">
                    {e.preparationInstructions ? (
                      <Tooltip>
                        <TooltipTrigger><ClipboardList className="h-4 w-4 text-primary" /></TooltipTrigger>
                        <TooltipContent className="max-w-xs">{e.preparationInstructions}</TooltipContent>
                      </Tooltip>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm">{e.resultDeadlineDays ? `${e.resultDeadlineDays} dias` : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${e.requiresAuthorization ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground'}`}>
                      {e.requiresAuthorization ? 'Exige' : 'Não exige'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${e.isActive ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' : 'bg-muted text-muted-foreground'}`}>
                      {e.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="rounded p-1 hover:bg-muted"><MoreVertical className="h-4 w-4 text-muted-foreground" /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditing(e); setShowForm(true) }}><Edit className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { updateExam({ ...e, isActive: !e.isActive }); toast.success(e.isActive ? 'Exame inativado' : 'Exame ativado') }}>
                          {e.isActive ? '🔴 Inativar' : '✅ Ativar'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { removeExam(e.id); toast.success('Exame excluído') }} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {hasMore && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-xs text-muted-foreground">Exibindo {visibleCount} de {totalItems}</span>
            <div className="flex gap-2">
              <button onClick={showMore} className="rounded-lg border border-input px-3 py-1.5 text-xs hover:bg-muted">Mostrar mais {Math.min(10, remainingCount)}</button>
              <button onClick={showAll} className="rounded-lg border border-input px-3 py-1.5 text-xs hover:bg-muted">Mostrar todos ({totalItems})</button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <ExamFormModal
          exam={editing}
          specialties={specialties}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSave={(e) => {
            if (editing) updateExam(e)
            else addExam(e)
            setShowForm(false); setEditing(null)
            toast.success(editing ? 'Exame atualizado' : 'Exame cadastrado')
          }}
        />
      )}
    </div>
  )
}

// ─── Exam Form Modal ─────────────────────────────────────────
function ExamFormModal({ exam, specialties, onClose, onSave }: {
  exam: Exam | null
  specialties: import('@/types/registers.types').Specialty[]
  onClose: () => void
  onSave: (e: Exam) => void
}) {
  const [name, setName] = useState(exam?.name || '')
  const [tussCode, setTussCode] = useState(exam?.tussCode || '')
  const [specialtyId, setSpecialtyId] = useState(exam?.specialtyId || '')
  const [duration, setDuration] = useState(exam?.estimatedDurationMinutes || 30)
  const [preparation, setPreparation] = useState(exam?.preparationInstructions || '')
  const [resultDays, setResultDays] = useState(exam?.resultDeadlineDays || 0)
  const [requiresAuth, setRequiresAuth] = useState(exam?.requiresAuthorization || false)
  const [authInstructions, setAuthInstructions] = useState(exam?.authorizationInstructions || '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-[600px] max-h-[85vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <h2 className="text-lg font-bold">{exam ? 'Editar Exame' : 'Novo Exame'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div><label className="text-sm font-medium">Nome do exame *</label><input value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium">Código TUSS</label><input value={tussCode} onChange={e => setTussCode(e.target.value)} maxLength={10} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="10 dígitos" /></div>
            <div>
              <label className="text-sm font-medium">Especialidade</label>
              <select value={specialtyId} onChange={e => setSpecialtyId(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="">Não se aplica</option>
                {specialties.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium">Duração estimada (min)</label><input type="number" value={duration} onChange={e => setDuration(+e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium">Prazo resultado (dias úteis)</label><input type="number" value={resultDays} onChange={e => setResultDays(+e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
          </div>
          <div><label className="text-sm font-medium">Instrução de preparo</label><textarea value={preparation} onChange={e => setPreparation(e.target.value)} rows={2} placeholder="Orientações enviadas ao paciente (ex: jejum, preparo intestinal)" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input type="checkbox" checked={requiresAuth} onChange={e => setRequiresAuth(e.target.checked)} className="accent-primary" /> Requer autorização prévia
          </label>
          {requiresAuth && (
            <div><label className="text-sm font-medium">Instruções para autorização</label><textarea value={authInstructions} onChange={e => setAuthInstructions(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
          )}
        </div>
        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-border bg-card px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted">Cancelar</button>
          <button onClick={() => {
            if (!name) { toast.error('Nome é obrigatório'); return }
            onSave({
              id: exam?.id || `ex_${Date.now()}`, companyId: exam?.companyId || '', name, tussCode: tussCode || undefined,
              specialtyId: specialtyId || undefined, estimatedDurationMinutes: duration || undefined,
              preparationInstructions: preparation || undefined, resultDeadlineDays: resultDays || undefined,
              requiresAuthorization: requiresAuth, authorizationInstructions: requiresAuth ? authInstructions : undefined,
              isActive: exam?.isActive ?? true, createdAt: exam?.createdAt || new Date().toISOString(),
            })
          }} className="gradient-bg rounded-lg px-6 py-2 text-sm font-semibold text-white">Salvar</button>
        </div>
      </div>
    </div>
  )
}
