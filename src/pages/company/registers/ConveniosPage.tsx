import { useState } from 'react'
import { useRegisters } from '@/context/RegistersContext'
import { useCompanyContext } from '@/context/CompanyContext'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import { EmptyState } from '@/components/feedback/EmptyState'
import { Plus, Search, MoreVertical, Edit, Trash2, Paperclip } from 'lucide-react'
import type { Convenio } from '@/types/registers.types'
import { CONVENIO_TYPE_LABELS, CONVENIO_TYPE_COLORS } from '@/types/registers.types'
import { toast } from 'sonner'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AttachmentsModal } from '@/components/registers/AttachmentsModal'

export default function ConveniosPage() {
  const { canAccess } = useCompanyContext()
  const { convenios, addConvenio, updateConvenio, removeConvenio, getDoctorsForConvenio, isDemo } = useRegisters()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Convenio | null>(null)
  const [showAttachments, setShowAttachments] = useState<Convenio | null>(null)

  const filtered = convenios.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.ansCode?.includes(search)) return false
    return true
  })

  const { visibleItems, totalItems, hasMore, visibleCount, showMore, showAll, remainingCount } = usePaginatedList(filtered)

  const isEmpty = convenios.length === 0

  return (
    <div className="space-y-6">
      {isEmpty ? (
        <>
          <div className="flex items-center justify-between">
            <div><h1 className="text-2xl font-bold text-foreground">Convênios</h1><p className="text-sm text-muted-foreground">Cadastro e regras de documentos por convênio</p></div>
          </div>
          <EmptyState
            icon={<span className="text-4xl">🏥</span>}
            title="Nenhum convênio cadastrado"
            description="Cadastre os convênios que sua clínica atende para começar a usar o sistema"
            action={canAccess('registers', 'create') ? <button onClick={() => setShowForm(true)} className="gradient-bg rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90 flex items-center gap-2"><Plus className="h-4 w-4" /> Cadastrar Primeiro Convênio</button> : undefined}
          />
        </>
      ) : (
        <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Convênios <span className="text-muted-foreground text-lg font-normal">({convenios.length})</span></h1>
          <p className="text-sm text-muted-foreground">Cadastro e regras de documentos por convênio</p>
        </div>
        {canAccess('registers', 'create') && (
          <button onClick={() => { setEditing(null); setShowForm(true) }} className="gradient-bg rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Novo Convênio
          </button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou código ANS..." className="w-full rounded-lg border border-input bg-background pl-9 pr-4 py-2 text-sm" />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Código ANS</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Operadora</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Médicos</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Anexos</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map(c => {
                const docCount = getDoctorsForConvenio(c.id).length
                return (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                    <td className="px-4 py-3 font-mono text-sm">{c.ansCode || '—'}</td>
                    <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${CONVENIO_TYPE_COLORS[c.type]}`}>{CONVENIO_TYPE_LABELS[c.type]}</span></td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{docCount} médicos</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{c.attachmentRules.length} regras</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${c.isActive ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' : 'bg-muted text-muted-foreground'}`}>
                        {c.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="rounded p-1 hover:bg-muted"><MoreVertical className="h-4 w-4 text-muted-foreground" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditing(c); setShowForm(true) }}><Edit className="h-4 w-4 mr-2" /> Editar dados</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setShowAttachments(c)}><Paperclip className="h-4 w-4 mr-2" /> Configurar Anexos</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => { updateConvenio({ ...c, isActive: !c.isActive }); toast.success(c.isActive ? 'Convênio inativado' : 'Convênio ativado') }}>
                            {c.isActive ? '🔴 Inativar' : '✅ Ativar'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            if (isDemo && docCount > 0) { toast.error('Convênio vinculado a médicos, não pode ser excluído'); return }
                            removeConvenio(c.id); toast.success('Convênio excluído')
                          }} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Excluir</DropdownMenuItem>
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
        <ConvenioFormModal
          convenio={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSave={(c) => {
            if (editing) updateConvenio(c)
            else addConvenio(c)
            setShowForm(false); setEditing(null)
            toast.success(editing ? 'Convênio atualizado' : 'Convênio cadastrado')
          }}
        />
      )}

      {showAttachments && (
        <AttachmentsModal
          title={showAttachments.name}
          entityId={showAttachments.id}
          rules={showAttachments.attachmentRules}
          onClose={() => setShowAttachments(null)}
          onSave={(rules) => {
            updateConvenio({ ...showAttachments, attachmentRules: rules })
            setShowAttachments(null)
            toast.success('Regras de anexo atualizadas!')
          }}
        />
      )}
    </div>
  )
}

// ─── Convenio Form Modal ──────────────────────────────────────
function ConvenioFormModal({ convenio, onClose, onSave }: { convenio: Convenio | null; onClose: () => void; onSave: (c: Convenio) => void }) {
  const [name, setName] = useState(convenio?.name || '')
  const [ansCode, setAnsCode] = useState(convenio?.ansCode || '')
  const [operator, setOperator] = useState(convenio?.operator || '')
  const [type, setType] = useState<Convenio['type']>(convenio?.type || 'health_plan')
  const [cnpj, setCnpj] = useState(convenio?.cnpj || '')
  const [authPhone, setAuthPhone] = useState(convenio?.authPhone || '')
  const [email, setEmail] = useState(convenio?.email || '')
  const [observations, setObservations] = useState(convenio?.observations || '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-[600px] max-h-[85vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <h2 className="text-lg font-bold">{convenio ? 'Editar Convênio' : 'Novo Convênio'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div><label className="text-sm font-medium">Nome do convênio *</label><input value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium">Código ANS</label><input value={ansCode} onChange={e => setAnsCode(e.target.value)} maxLength={6} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="6 dígitos" /></div>
            <div><label className="text-sm font-medium">Operadora</label><input value={operator} onChange={e => setOperator(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Ex: AMIL, UNIMED" /></div>
            <div>
              <label className="text-sm font-medium">Tipo *</label>
              <select value={type} onChange={e => setType(e.target.value as Convenio['type'])} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="health_plan">Plano de Saúde</option>
                <option value="private">Particular</option>
                <option value="sus">SUS</option>
                <option value="other">Outro</option>
              </select>
            </div>
          </div>
          <div><label className="text-sm font-medium">CNPJ da operadora</label><input value={cnpj} onChange={e => setCnpj(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium">Telefone de autorização</label><input value={authPhone} onChange={e => setAuthPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium">E-mail</label><input value={email} onChange={e => setEmail(e.target.value)} type="email" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
          </div>
          <div><label className="text-sm font-medium">Observações</label><textarea value={observations} onChange={e => setObservations(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-border bg-card px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted">Cancelar</button>
          <button onClick={() => {
            if (!name) { toast.error('Nome é obrigatório'); return }
            onSave({
              id: convenio?.id || `conv_${Date.now()}`, companyId: convenio?.companyId || '', name, ansCode, operator, type, cnpj, authPhone, email, observations,
              attachmentRules: convenio?.attachmentRules || [], isActive: convenio?.isActive ?? true, createdAt: convenio?.createdAt || new Date().toISOString(),
            })
          }} className="gradient-bg rounded-lg px-6 py-2 text-sm font-semibold text-white">Salvar</button>
        </div>
      </div>
    </div>
  )
}
