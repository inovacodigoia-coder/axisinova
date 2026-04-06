import { useState } from 'react'
import { useRegisters } from '@/context/RegistersContext'
import { useCompanyContext } from '@/context/CompanyContext'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import { EmptyState } from '@/components/feedback/EmptyState'
import { Plus, Search, Edit, MoreVertical, Lock, Unlock, Trash2, Settings } from 'lucide-react'
import type { Doctor } from '@/types/registers.types'
import { UF_LIST, BLOCK_REASONS } from '@/types/registers.types'
import { toast } from 'sonner'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export default function DoctorsPage() {
  const { canAccess } = useCompanyContext()
  const { doctors, specialties, convenios, addDoctor, updateDoctor, removeDoctor, getSpecialtyName, isDemo } = useRegisters()
  const [search, setSearch] = useState('')
  const [specFilter, setSpecFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'blocked' | 'inactive'>('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Doctor | null>(null)
  const [showBlock, setShowBlock] = useState<Doctor | null>(null)
  const [showDeleteBlock, setShowDeleteBlock] = useState<Doctor | null>(null)
  const [showSpecialties, setShowSpecialties] = useState(false)

  const filtered = doctors.filter(d => {
    if (search && !d.fullName.toLowerCase().includes(search.toLowerCase()) && !d.crm.includes(search)) return false
    if (specFilter && !d.specialtyIds.includes(specFilter)) return false
    if (statusFilter === 'active' && (!d.isActive || d.isBlocked)) return false
    if (statusFilter === 'blocked' && !d.isBlocked) return false
    if (statusFilter === 'inactive' && d.isActive) return false
    return true
  })

  const { visibleItems, totalItems, hasMore, visibleCount, showMore, showAll, remainingCount } = usePaginatedList(filtered)

  if (doctors.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-foreground">Médicos</h1><p className="text-sm text-muted-foreground">Gestão de profissionais médicos</p></div>
        </div>
        <EmptyState
          icon={<span className="text-4xl">👨‍⚕️</span>}
          title="Nenhum médico cadastrado ainda"
          description="Cadastre o primeiro médico para começar a usar o agendamento"
          action={canAccess('registers', 'create') ? <button onClick={() => setShowForm(true)} className="gradient-bg rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90 flex items-center gap-2"><Plus className="h-4 w-4" /> Cadastrar Primeiro Médico</button> : undefined}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Médicos <span className="text-muted-foreground text-lg font-normal">({doctors.length} cadastrados)</span></h1>
          <p className="text-sm text-muted-foreground">Gestão de profissionais médicos</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSpecialties(true)} className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium hover:bg-muted flex items-center gap-2">
            <Settings className="h-4 w-4" /> Gerenciar Especialidades
          </button>
          {canAccess('registers', 'create') && (
            <button onClick={() => { setEditing(null); setShowForm(true) }} className="gradient-bg rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90 flex items-center gap-2">
              <Plus className="h-4 w-4" /> Novo Médico
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou CRM..." className="w-full rounded-lg border border-input bg-background pl-9 pr-4 py-2 text-sm" />
        </div>
        <select value={specFilter} onChange={e => setSpecFilter(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option value="">Todas especialidades</option>
          {specialties.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option value="">Todos status</option>
          <option value="active">Ativos</option>
          <option value="blocked">Bloqueados</option>
          <option value="inactive">Inativos</option>
        </select>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Foto</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">CRM</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Especialidades</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Convênios</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map(d => {
                const specNames = d.specialtyIds.map(id => getSpecialtyName(id)).filter(Boolean)
                return (
                  <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="h-9 w-9 rounded-full gradient-bg flex items-center justify-center text-xs font-bold text-white">
                        {d.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{d.fullName}</td>
                    <td className="px-4 py-3 font-mono text-sm">{d.crm}/{d.crmState}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {specNames.slice(0, 2).map(name => (
                          <span key={name} className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">{name}</span>
                        ))}
                        {specNames.length > 2 && <span className="text-[10px] text-muted-foreground">+{specNames.length - 2} mais</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{d.enabledConvenioIds.length} convênios</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        d.isBlocked ? 'bg-destructive/10 text-destructive'
                        : d.isActive ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]'
                        : 'bg-muted text-muted-foreground'
                      }`}>
                        {d.isBlocked ? 'Bloqueado' : d.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="rounded p-1 hover:bg-muted"><MoreVertical className="h-4 w-4 text-muted-foreground" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditing(d); setShowForm(true) }}>
                            <Edit className="h-4 w-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          {d.isBlocked ? (
                            <DropdownMenuItem onClick={() => { updateDoctor({ ...d, isBlocked: false, blockedReason: undefined, blockedAt: undefined }); toast.success('Médico desbloqueado') }}>
                              <Unlock className="h-4 w-4 mr-2" /> Desbloquear
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => setShowBlock(d)}>
                              <Lock className="h-4 w-4 mr-2" /> Bloquear
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setShowDeleteBlock(d)} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir
                          </DropdownMenuItem>
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
            <span className="text-xs text-muted-foreground">Exibindo {visibleCount} de {totalItems} médicos</span>
            <div className="flex gap-2">
              <button onClick={showMore} className="rounded-lg border border-input px-3 py-1.5 text-xs hover:bg-muted">Mostrar mais {Math.min(10, remainingCount)}</button>
              <button onClick={showAll} className="rounded-lg border border-input px-3 py-1.5 text-xs hover:bg-muted">Mostrar todos ({totalItems})</button>
            </div>
          </div>
        )}
      </div>

      {/* Doctor Form Modal */}
      {showForm && (
        <DoctorFormModal
          doctor={editing}
          specialties={specialties}
          convenios={convenios}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSave={(d) => {
            if (editing) updateDoctor(d)
            else addDoctor(d)
            setShowForm(false); setEditing(null)
            toast.success(editing ? 'Médico atualizado' : 'Médico cadastrado')
          }}
        />
      )}

      {/* Block Modal */}
      {showBlock && (
        <DoctorBlockModal
          doctor={showBlock}
          onClose={() => setShowBlock(null)}
          onConfirm={(reason, notes) => {
            updateDoctor({ ...showBlock, isBlocked: true, blockedReason: reason, blockedAt: new Date().toISOString() })
            setShowBlock(null)
            toast.success('Médico bloqueado')
          }}
        />
      )}

      {/* Delete Blocked Modal */}
      {showDeleteBlock && (
        <DoctorDeleteBlockedModal
          doctor={showDeleteBlock}
          isDemo={isDemo}
          onClose={() => setShowDeleteBlock(null)}
          onEdit={() => { setEditing(showDeleteBlock); setShowForm(true); setShowDeleteBlock(null) }}
          onBlock={() => { setShowBlock(showDeleteBlock); setShowDeleteBlock(null) }}
          onConfirmDelete={() => { removeDoctor(showDeleteBlock.id); setShowDeleteBlock(null); toast.success('Médico excluído') }}
        />
      )}

      {/* Specialties Modal */}
      {showSpecialties && (
        <SpecialtyListModal onClose={() => setShowSpecialties(false)} />
      )}
    </div>
  )
}

// ─── Doctor Form Modal ─────────────────────────────────────────
function DoctorFormModal({ doctor, specialties, convenios, onClose, onSave }: {
  doctor: Doctor | null
  specialties: import('@/types/registers.types').Specialty[]
  convenios: import('@/types/registers.types').Convenio[]
  onClose: () => void
  onSave: (d: Doctor) => void
}) {
  const [name, setName] = useState(doctor?.fullName || '')
  const [crm, setCrm] = useState(doctor?.crm || '')
  const [crmState, setCrmState] = useState(doctor?.crmState || 'SP')
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>(doctor?.specialtyIds || [])
  const [phone, setPhone] = useState(doctor?.phone || '')
  const [email, setEmail] = useState(doctor?.email || '')
  const [enabledConvenios, setEnabledConvenios] = useState<Set<string>>(new Set(doctor?.enabledConvenioIds || []))
  const [duration, setDuration] = useState(doctor?.scheduleConfig?.consultationDuration || 30)
  const [interval, setIntervalMin] = useState(doctor?.scheduleConfig?.intervalBetween || 10)
  const [activeTab, setActiveTab] = useState('dados')
  const [allConvenios, setAllConvenios] = useState(false)

  const toggleConv = (id: string) => {
    const next = new Set(enabledConvenios)
    next.has(id) ? next.delete(id) : next.add(id)
    setEnabledConvenios(next)
  }

  const toggleSpec = (id: string) => {
    setSelectedSpecs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleSave = () => {
    if (!name || !crm || selectedSpecs.length === 0) { toast.error('Preencha os campos obrigatórios'); return }
    onSave({
      id: doctor?.id || `doc_${Date.now()}`,
      companyId: doctor?.companyId || '',
      fullName: name, crm, crmState,
      specialtyIds: selectedSpecs,
      phone, email,
      enabledConvenioIds: Array.from(enabledConvenios),
      isActive: doctor?.isActive ?? true,
      isBlocked: doctor?.isBlocked ?? false,
      scheduleConfig: { consultationDuration: duration, intervalBetween: interval, workDays: doctor?.scheduleConfig?.workDays || [] },
      createdAt: doctor?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-[700px] max-h-[85vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <h2 className="text-lg font-bold">{doctor ? 'Editar Médico' : 'Novo Médico'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        <div className="border-b border-border">
          <div className="flex gap-1 px-6">
            {[{ key: 'dados', label: 'Dados Profissionais' }, { key: 'convenios', label: 'Convênios' }, { key: 'agenda', label: 'Agenda' }].map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-4">
          {activeTab === 'dados' && (
            <>
              <div><label className="text-sm font-medium">Nome completo *</label><input value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">CRM *</label><input value={crm} onChange={e => setCrm(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
                <div>
                  <label className="text-sm font-medium">Estado (UF) *</label>
                  <select value={crmState} onChange={e => setCrmState(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                    {UF_LIST.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Especialidades *</label>
                <div className="mt-1 flex flex-wrap gap-1 mb-2">
                  {selectedSpecs.map(id => {
                    const spec = specialties.find(s => s.id === id)
                    return spec ? (
                      <span key={id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs">
                        {spec.name}
                        <button onClick={() => toggleSpec(id)} className="hover:text-destructive">×</button>
                      </span>
                    ) : null
                  })}
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto border border-input rounded-lg p-2">
                  {specialties.filter(s => s.isActive && !selectedSpecs.includes(s.id)).map(s => (
                    <button key={s.id} onClick={() => toggleSpec(s.id)} className="w-full text-left px-2 py-1 text-sm hover:bg-muted rounded">
                      + {s.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">Telefone</label><input value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="(XX) XXXXX-XXXX" /></div>
                <div><label className="text-sm font-medium">E-mail profissional</label><input value={email} onChange={e => setEmail(e.target.value)} type="email" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
              </div>
            </>
          )}
          {activeTab === 'convenios' && (
            <>
              {convenios.length === 0 ? (
                <div className="bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/30 rounded-lg p-4 text-sm text-[hsl(var(--warning))]">
                  ⚠️ Nenhum convênio cadastrado ainda. Vá em Cadastros → Convênios para cadastrar os convênios antes de configurar o médico.
                </div>
              ) : (
                <>
                  <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                    ℹ️ Selecione os convênios que este médico atende. Apenas estes convênios aparecerão no agendamento quando este médico for selecionado.
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input type="checkbox" checked={allConvenios} onChange={e => {
                      setAllConvenios(e.target.checked)
                      if (e.target.checked) setEnabledConvenios(new Set(convenios.map(c => c.id)))
                      else setEnabledConvenios(new Set())
                    }} className="accent-primary" />
                    Habilitar todos os convênios
                  </label>
                  <div className="space-y-1">
                    {convenios.filter(c => c.isActive).map(c => (
                      <label key={c.id} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted cursor-pointer">
                        <input type="checkbox" checked={enabledConvenios.has(c.id)} onChange={() => toggleConv(c.id)} className="accent-primary" />
                        {c.name}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {c.type === 'health_plan' ? 'Plano' : c.type === 'private' ? 'Particular' : c.type === 'sus' ? 'SUS' : 'Outro'}
                        </span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
          {activeTab === 'agenda' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Duração da consulta *</label>
                  <select value={duration} onChange={e => setDuration(+e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                    {[15, 20, 30, 45, 60].map(m => <option key={m} value={m}>{m} min</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Intervalo entre consultas</label>
                  <select value={interval} onChange={e => setIntervalMin(+e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                    {[0, 5, 10, 15].map(m => <option key={m} value={m}>{m} min</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Dias da semana</label>
                {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((dayName, idx) => {
                  const wd = doctor?.scheduleConfig?.workDays?.find(w => w.day === idx)
                  return (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                      <input type="checkbox" defaultChecked={wd?.isActive ?? (idx >= 1 && idx <= 5)} className="accent-primary" />
                      <span className="w-20">{dayName}</span>
                      <input type="time" defaultValue={wd?.startTime ?? '08:00'} className="rounded border border-input bg-background px-2 py-1 text-xs" />
                      <span className="text-muted-foreground">até</span>
                      <input type="time" defaultValue={wd?.endTime ?? '18:00'} className="rounded border border-input bg-background px-2 py-1 text-xs" />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-border bg-card px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted">Cancelar</button>
          <button onClick={handleSave} className="gradient-bg rounded-lg px-6 py-2 text-sm font-semibold text-white">Salvar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Block Modal ──────────────────────────────────────────────
function DoctorBlockModal({ doctor, onClose, onConfirm }: { doctor: Doctor; onClose: () => void; onConfirm: (reason: string, notes: string) => void }) {
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-[500px] rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2"><Lock className="h-5 w-5" /> Bloquear Médico</h2>
        <p className="text-sm text-muted-foreground">{doctor.fullName} será bloqueado no sistema.</p>
        <div className="bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/30 rounded-lg p-3 text-xs text-[hsl(var(--warning))]">
          ⚠️ Agendamentos futuros NÃO serão cancelados automaticamente. Você precisará tratá-los manualmente após o bloqueio.
        </div>
        <div>
          <label className="text-sm font-medium">Motivo do bloqueio *</label>
          <select value={reason} onChange={e => setReason(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
            <option value="">Selecione...</option>
            {BLOCK_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Observações</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted">Cancelar</button>
          <button onClick={() => { if (!reason) { toast.error('Selecione o motivo'); return }; onConfirm(reason, notes) }} className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 flex items-center gap-2">
            <Lock className="h-4 w-4" /> Confirmar Bloqueio
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Blocked Modal ─────────────────────────────────────
function DoctorDeleteBlockedModal({ doctor, isDemo, onClose, onEdit, onBlock, onConfirmDelete }: {
  doctor: Doctor; isDemo: boolean; onClose: () => void; onEdit: () => void; onBlock: () => void; onConfirmDelete: () => void
}) {
  const [confirmName, setConfirmName] = useState('')

  if (!isDemo) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
        <div onClick={e => e.stopPropagation()} className="w-full max-w-[500px] rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-[hsl(var(--warning))]">⚠️ Confirmar exclusão</h2>
          <p className="text-sm text-muted-foreground">Nenhum registro vinculado encontrado. Você pode excluir este médico.</p>
          <div>
            <label className="text-sm font-medium">Digite o nome do médico para confirmar:</label>
            <input value={confirmName} onChange={e => setConfirmName(e.target.value)} placeholder={doctor.fullName} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted">Cancelar</button>
            <button disabled={confirmName !== doctor.fullName} onClick={onConfirmDelete} className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50">
              Confirmar Exclusão
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-[550px] rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-[hsl(var(--warning))]">⚠️ Não é possível excluir este médico</h2>
        <p className="text-sm text-muted-foreground">{doctor.fullName} possui registros vinculados no sistema que impedem a exclusão.</p>
        <div className="border border-border rounded-lg divide-y divide-border">
          <div className="flex items-center justify-between px-4 py-2 text-sm"><span>📅 Agendamentos</span><span className="text-muted-foreground">registros vinculados</span></div>
          <div className="flex items-center justify-between px-4 py-2 text-sm"><span>📋 Prontuários</span><span className="text-muted-foreground">registros vinculados</span></div>
          <div className="flex items-center justify-between px-4 py-2 text-sm"><span>💳 Guias TISS</span><span className="text-muted-foreground">registros vinculados</span></div>
        </div>
        <p className="text-xs text-muted-foreground">Para preservar o histórico dos pacientes, médicos com registros não podem ser excluídos.</p>
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-medium">O que você pode fazer:</p>
          <p>● Bloquear o médico (impede novos agendamentos)</p>
          <p>● Editar os dados do cadastro</p>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onEdit} className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted flex items-center gap-2"><Edit className="h-4 w-4" /> Editar</button>
          <button onClick={onBlock} className="rounded-lg bg-destructive/10 text-destructive px-4 py-2 text-sm font-medium flex items-center gap-2"><Lock className="h-4 w-4" /> Bloquear</button>
          <button onClick={onClose} className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted">Fechar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Specialty List Modal ─────────────────────────────────────
function SpecialtyListModal({ onClose }: { onClose: () => void }) {
  const { specialties, addSpecialty, updateSpecialty, removeSpecialty, getDoctorsForSpecialty } = useRegisters()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleAdd = () => {
    if (!newName.trim()) { toast.error('Nome é obrigatório'); return }
    addSpecialty({ id: `spec_${Date.now()}`, name: newName.trim(), companyId: '', isActive: true, createdAt: new Date().toISOString() })
    setNewName(''); setShowAdd(false)
    toast.success('Especialidade cadastrada')
  }

  const handleDelete = (id: string) => {
    const linked = getDoctorsForSpecialty(id)
    if (linked.length > 0) { toast.error(`${linked.length} médico(s) usam esta especialidade`); return }
    removeSpecialty(id)
    toast.success('Especialidade removida')
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-[500px] max-h-[70vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <h2 className="text-lg font-bold">Especialidades Cadastradas</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAdd(!showAdd)} className="gradient-bg rounded-lg px-3 py-1.5 text-xs font-semibold text-white"><Plus className="h-3 w-3 inline mr-1" /> Nova</button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
          </div>
        </div>
        <div className="p-4 space-y-2">
          {showAdd && (
            <div className="flex gap-2 mb-3">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome da especialidade" className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" onKeyDown={e => e.key === 'Enter' && handleAdd()} />
              <button onClick={handleAdd} className="gradient-bg rounded-lg px-3 py-2 text-xs font-semibold text-white">Salvar</button>
            </div>
          )}
          {specialties.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhuma especialidade cadastrada. Adicione especialidades para organizar seus médicos.</p>
          )}
          {specialties.map(s => {
            const docCount = getDoctorsForSpecialty(s.id).length
            return (
              <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                {editingId === s.id ? (
                  <>
                    <input value={editName} onChange={e => setEditName(e.target.value)} className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm" />
                    <button onClick={() => { updateSpecialty({ ...s, name: editName }); setEditingId(null); toast.success('Atualizado') }} className="text-xs text-primary">Salvar</button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-muted-foreground">Cancelar</button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{docCount} médico(s)</span>
                    <button onClick={() => { setEditingId(s.id); setEditName(s.name) }} className="rounded p-1 hover:bg-muted"><Edit className="h-3 w-3" /></button>
                    <button onClick={() => handleDelete(s.id)} className="rounded p-1 hover:bg-muted text-destructive"><Trash2 className="h-3 w-3" /></button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
