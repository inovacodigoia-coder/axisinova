import { useState } from 'react'
import { useRegisters } from '@/context/RegistersContext'
import { useCompanyContext } from '@/context/CompanyContext'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import { EmptyState } from '@/components/feedback/EmptyState'
import { Plus, Search, MoreVertical, Edit, Trash2 } from 'lucide-react'
import type { Procedure } from '@/types/registers.types'
import { PROCEDURE_TYPES, ANESTHESIA_TYPES } from '@/types/registers.types'
import { toast } from 'sonner'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const TYPE_MAP = Object.fromEntries(PROCEDURE_TYPES.map(t => [t.value, t]))

export default function ProceduresPage() {
  const { canAccess } = useCompanyContext()
  const { procedures, specialties, addProcedure, updateProcedure, removeProcedure, getSpecialtyName } = useRegisters()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Procedure | null>(null)

  const filtered = procedures.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.tussCode?.includes(search)) return false
    return true
  })

  const { visibleItems, totalItems, hasMore, visibleCount, showMore, showAll, remainingCount } = usePaginatedList(filtered)

  const isEmpty = procedures.length === 0

  return (
    <div className="space-y-6">
      {isEmpty ? (
        <>
          <div className="flex items-center justify-between">
            <div><h1 className="text-2xl font-bold text-foreground">Procedimentos</h1><p className="text-sm text-muted-foreground">Catálogo de procedimentos da clínica</p></div>
          </div>
          <EmptyState
            icon={<span className="text-4xl">⚕️</span>}
            title="Nenhum procedimento cadastrado"
            description="Cadastre os procedimentos realizados na sua clínica"
            action={canAccess('registers', 'create') ? <button onClick={() => setShowForm(true)} className="gradient-bg rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90 flex items-center gap-2"><Plus className="h-4 w-4" /> Cadastrar Primeiro Procedimento</button> : undefined}
          />
        </>
      ) : (
        <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Procedimentos <span className="text-muted-foreground text-lg font-normal">({procedures.length})</span></h1>
          <p className="text-sm text-muted-foreground">Catálogo de procedimentos</p>
        </div>
        {canAccess('registers', 'create') && (
          <button onClick={() => { setEditing(null); setShowForm(true) }} className="gradient-bg rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Novo Procedimento
          </button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou código TUSS..." className="w-full rounded-lg border border-input bg-background pl-9 pr-4 py-2 text-sm" />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Código TUSS</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Especialidade</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Duração</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Anestesia</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map(p => {
                const typeInfo = TYPE_MAP[p.type]
                return (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                    <td className="px-4 py-3 font-mono text-sm">{p.tussCode || '—'}</td>
                    <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${typeInfo?.color || ''}`}>{typeInfo?.label || p.type}</span></td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{p.specialtyId ? getSpecialtyName(p.specialtyId) : '—'}</td>
                    <td className="px-4 py-3 text-sm">{p.estimatedDurationMinutes ? `${p.estimatedDurationMinutes} min` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${p.requiresAnesthesia ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground'}`}>
                        {p.requiresAnesthesia ? (p.anesthesiaType || 'Sim') : 'Não'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${p.isActive ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' : 'bg-muted text-muted-foreground'}`}>
                        {p.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="rounded p-1 hover:bg-muted"><MoreVertical className="h-4 w-4 text-muted-foreground" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditing(p); setShowForm(true) }}><Edit className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { updateProcedure({ ...p, isActive: !p.isActive }); toast.success(p.isActive ? 'Inativado' : 'Ativado') }}>
                            {p.isActive ? '🔴 Inativar' : '✅ Ativar'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => { removeProcedure(p.id); toast.success('Procedimento excluído') }} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
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
      </>
      )}

      {showForm && (
        <ProcedureFormModal
          procedure={editing}
          specialties={specialties}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSave={(p) => {
            if (editing) updateProcedure(p)
            else addProcedure(p)
            setShowForm(false); setEditing(null)
            toast.success(editing ? 'Procedimento atualizado' : 'Procedimento cadastrado')
          }}
        />
      )}
    </div>
  )
}

// ─── Procedure Form Modal ────────────────────────────────────
function ProcedureFormModal({ procedure, specialties, onClose, onSave }: {
  procedure: Procedure | null
  specialties: import('@/types/registers.types').Specialty[]
  onClose: () => void
  onSave: (p: Procedure) => void
}) {
  const [name, setName] = useState(procedure?.name || '')
  const [tussCode, setTussCode] = useState(procedure?.tussCode || '')
  const [type, setType] = useState<Procedure['type']>(procedure?.type || 'clinical')
  const [specialtyId, setSpecialtyId] = useState(procedure?.specialtyId || '')
  const [duration, setDuration] = useState(procedure?.estimatedDurationMinutes || 30)
  const [requiresAuth, setRequiresAuth] = useState(procedure?.requiresAuthorization || false)
  const [authInstructions, setAuthInstructions] = useState(procedure?.authorizationInstructions || '')
  const [requiresAnesthesia, setRequiresAnesthesia] = useState(procedure?.requiresAnesthesia || false)
  const [anesthesiaType, setAnesthesiaType] = useState(procedure?.anesthesiaType || '')
  const [preOp, setPreOp] = useState(procedure?.preOperativeInstructions || '')
  const [postOp, setPostOp] = useState(procedure?.postOperativeInstructions || '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-[600px] max-h-[85vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <h2 className="text-lg font-bold">{procedure ? 'Editar Procedimento' : 'Novo Procedimento'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div><label className="text-sm font-medium">Nome do procedimento *</label><input value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium">Código TUSS</label><input value={tussCode} onChange={e => setTussCode(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
            <div>
              <label className="text-sm font-medium">Tipo *</label>
              <select value={type} onChange={e => setType(e.target.value as Procedure['type'])} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                {PROCEDURE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Especialidade</label>
              <select value={specialtyId} onChange={e => setSpecialtyId(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="">Não se aplica</option>
                {specialties.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div><label className="text-sm font-medium">Duração estimada (min)</label><input type="number" value={duration} onChange={e => setDuration(+e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input type="checkbox" checked={requiresAnesthesia} onChange={e => setRequiresAnesthesia(e.target.checked)} className="accent-primary" /> Requer anestesia
          </label>
          {requiresAnesthesia && (
            <div>
              <label className="text-sm font-medium">Tipo de anestesia</label>
              <select value={anesthesiaType} onChange={e => setAnesthesiaType(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                {ANESTHESIA_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input type="checkbox" checked={requiresAuth} onChange={e => setRequiresAuth(e.target.checked)} className="accent-primary" /> Requer autorização prévia
          </label>
          {requiresAuth && (
            <div><label className="text-sm font-medium">Instruções para autorização</label><textarea value={authInstructions} onChange={e => setAuthInstructions(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
          )}
          <div><label className="text-sm font-medium">Instruções pré-operatórias</label><textarea value={preOp} onChange={e => setPreOp(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
          <div><label className="text-sm font-medium">Instruções pós-operatórias</label><textarea value={postOp} onChange={e => setPostOp(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-border bg-card px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted">Cancelar</button>
          <button onClick={() => {
            if (!name) { toast.error('Nome é obrigatório'); return }
            onSave({
              id: procedure?.id || `proc_${Date.now()}`, companyId: procedure?.companyId || '', name,
              tussCode: tussCode || undefined, type, specialtyId: specialtyId || undefined,
              estimatedDurationMinutes: duration || undefined,
              requiresAuthorization: requiresAuth, authorizationInstructions: requiresAuth ? authInstructions : undefined,
              requiresAnesthesia, anesthesiaType: requiresAnesthesia ? anesthesiaType : undefined,
              preOperativeInstructions: preOp || undefined, postOperativeInstructions: postOp || undefined,
              isActive: procedure?.isActive ?? true, createdAt: procedure?.createdAt || new Date().toISOString(),
            })
          }} className="gradient-bg rounded-lg px-6 py-2 text-sm font-semibold text-white">Salvar</button>
        </div>
      </div>
    </div>
  )
}
