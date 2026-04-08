import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { useQueueSystem } from '@/context/QueueSystemContext'
import type { QueueLine, Guiche, Totem } from '@/types/queue-system.types'

export default function UnitConfigPage() {
  const { unitId } = useParams<{ unitId: string }>()
  const navigate = useNavigate()
  const { state, dispatch, getUnitQueues, getUnitGuiches, getUnitTotems } = useQueueSystem()

  const unit = state.units.find(u => u.id === unitId)
  const queues = getUnitQueues(unitId || '')
  const guiches = getUnitGuiches(unitId || '')
  const totems = getUnitTotems(unitId || '')

  // Queue modal
  const [queueModal, setQueueModal] = useState<QueueLine | null | 'new'>(null)
  const [qName, setQName] = useState('')
  const [qPrefix, setQPrefix] = useState('')
  const [qPrefixAlt, setQPrefixAlt] = useState('')
  const [qType, setQType] = useState<'external' | 'internal'>('external')
  const [qCategory, setQCategory] = useState<'attendance' | 'collect'>('attendance')
  const [qColor, setQColor] = useState('#e0e0e0')
  const [qShowOnTotem, setQShowOnTotem] = useState(true)
  const [qQueueType, setQQueueType] = useState<'single' | 'block'>('single')
  const [qLinkedIds, setQLinkedIds] = useState<string[]>([])

  // Guiche modal
  const [guicheModal, setGuicheModal] = useState<Guiche | null | 'new'>(null)
  const [gName, setGName] = useState('')
  const [gType, setGType] = useState<'external' | 'internal'>('external')

  // Totem modal
  const [totemModal, setTotemModal] = useState<Totem | null | 'new'>(null)
  const [tName, setTName] = useState('')

  // Available queues for linking (same unit, excluding current)
  const availableForLink = queues.filter(q => {
    if (queueModal === 'new') return q.queueType === 'single'
    if (queueModal && typeof queueModal === 'object') return q.id !== queueModal.id && q.queueType === 'single'
    return false
  })

  const openQueueModal = (q: QueueLine | 'new') => {
    if (q === 'new') {
      setQName(''); setQPrefix(''); setQPrefixAlt(''); setQType('external'); setQCategory('attendance')
      setQColor('#e0e0e0'); setQShowOnTotem(true); setQQueueType('single'); setQLinkedIds([])
    } else {
      setQName(q.name); setQPrefix(q.prefix); setQPrefixAlt(q.prefixAlt || ''); setQType(q.type); setQCategory(q.category)
      setQColor(q.color || '#e0e0e0'); setQShowOnTotem(q.showOnTotem); setQQueueType(q.queueType); setQLinkedIds([...q.linkedQueueIds])
    }
    setQueueModal(q)
  }

  const saveQueue = () => {
    if (!qName.trim() || !qPrefix.trim()) return
    const base = {
      name: qName, prefix: qPrefix, prefixAlt: qPrefixAlt || undefined, type: qType, category: qCategory,
      color: qColor, showOnTotem: qShowOnTotem, queueType: qQueueType, linkedQueueIds: qQueueType === 'block' ? qLinkedIds : [],
    }
    if (queueModal === 'new') {
      dispatch({ type: 'ADD_QUEUE_LINE', payload: { id: `ql_${Date.now()}`, unitId: unitId!, isActive: true, order: queues.length + 1, ...base } })
      toast.success('Fila criada')
    } else if (queueModal) {
      dispatch({ type: 'UPDATE_QUEUE_LINE', payload: { ...queueModal, ...base } })
      toast.success('Fila atualizada')
    }
    setQueueModal(null)
  }

  const addLinkedQueue = (id: string) => { if (!qLinkedIds.includes(id)) setQLinkedIds([...qLinkedIds, id]) }
  const removeLinkedQueue = (id: string) => setQLinkedIds(qLinkedIds.filter(x => x !== id))

  const openGuicheModal = (g: Guiche | 'new') => {
    if (g === 'new') { setGName(''); setGType('external') }
    else { setGName(g.name); setGType(g.type) }
    setGuicheModal(g)
  }

  const saveGuiche = () => {
    if (!gName.trim()) return
    if (guicheModal === 'new') {
      dispatch({ type: 'ADD_GUICHE', payload: { id: `g_${Date.now()}`, unitId: unitId!, name: gName, type: gType, isActive: true } })
      toast.success('Guichê criado')
    } else if (guicheModal) {
      dispatch({ type: 'UPDATE_GUICHE', payload: { ...guicheModal, name: gName, type: gType } })
      toast.success('Guichê atualizado')
    }
    setGuicheModal(null)
  }

  const openTotemModal = (t: Totem | 'new') => {
    if (t === 'new') setTName('')
    else setTName(t.name)
    setTotemModal(t)
  }

  const saveTotem = () => {
    if (!tName.trim()) return
    if (totemModal === 'new') {
      dispatch({ type: 'ADD_TOTEM', payload: { id: `tot_${Date.now()}`, unitId: unitId!, name: tName, isActive: true } })
      toast.success('Totem criado')
    } else if (totemModal) {
      dispatch({ type: 'UPDATE_TOTEM', payload: { ...totemModal, name: tName } })
      toast.success('Totem atualizado')
    }
    setTotemModal(null)
  }

  const displayLabel = (q: QueueLine) => {
    const suffix = q.type === 'external' ? 'Externo' : 'Interno'
    return `${q.name} (${q.prefix}) - ${suffix}`
  }

  const displayGuicheLabel = (g: Guiche) => {
    const suffix = g.type === 'external' ? 'Externo' : 'Interno'
    return `${g.name} - ${suffix}`
  }

  if (!unit) return <p className="text-muted-foreground">Unidade não encontrada</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button onClick={() => navigate('/app/filas/admin/unidades')} className="flex items-center gap-2 rounded-lg bg-[hsl(222,70%,35%)] text-white px-4 py-2 text-sm font-semibold hover:bg-[hsl(222,70%,30%)]" aria-label="Voltar">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <h1 className="text-lg font-bold text-foreground">Unidade Selecionada: {unit.name}</h1>
        <button onClick={() => navigate(`/app/filas/admin/unidades/${unitId}/tvs`)} className="rounded-lg bg-green-500 text-white px-4 py-2 text-sm font-semibold hover:bg-green-600">
          Configurar TVs
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Totems */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Totens ({totems.length})</h3>
            <button onClick={() => openTotemModal('new')} className="flex items-center gap-1 rounded-md bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600" aria-label="Adicionar totem">
              <Plus className="h-3 w-3" /> Adicionar
            </button>
          </div>
          {totems.map(t => (
            <div key={t.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
              <span className="text-sm text-foreground font-medium">{t.name}</span>
              <div className="flex gap-1">
                <button onClick={() => openTotemModal(t)} className="p-1.5 hover:bg-background rounded" aria-label="Editar totem" title="Editar"><Pencil className="h-4 w-4 text-muted-foreground" /></button>
                <button onClick={() => { dispatch({ type: 'REMOVE_TOTEM', payload: t.id }); toast.success('Removido') }} className="p-1.5 hover:bg-background rounded" aria-label="Remover totem" title="Remover"><Trash2 className="h-4 w-4 text-muted-foreground" /></button>
              </div>
            </div>
          ))}
          {!totems.length && <p className="text-xs text-muted-foreground py-4 text-center">Nenhum totem cadastrado</p>}
        </div>

        {/* Queues */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Filas ({queues.length})</h3>
            <button onClick={() => openQueueModal('new')} className="flex items-center gap-1 rounded-md bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600" aria-label="Adicionar fila">
              <Plus className="h-3 w-3" /> Adicionar
            </button>
          </div>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {queues.sort((a, b) => a.order - b.order).map(q => (
              <div key={q.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <span className="text-sm text-foreground font-medium">{displayLabel(q)}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openQueueModal(q)} className="p-1.5 hover:bg-background rounded" aria-label="Editar fila" title="Editar"><Pencil className="h-4 w-4 text-muted-foreground" /></button>
                  <button onClick={() => { dispatch({ type: 'REMOVE_QUEUE_LINE', payload: q.id }); toast.success('Removido') }} className="p-1.5 hover:bg-background rounded" aria-label="Remover fila" title="Remover"><Trash2 className="h-4 w-4 text-muted-foreground" /></button>
                </div>
              </div>
            ))}
          </div>
          {!queues.length && <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma fila cadastrada</p>}
        </div>

        {/* Guiches */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Guichês ({guiches.length})</h3>
            <button onClick={() => openGuicheModal('new')} className="flex items-center gap-1 rounded-md bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600" aria-label="Adicionar guichê">
              <Plus className="h-3 w-3" /> Adicionar
            </button>
          </div>
          {guiches.map(g => (
            <div key={g.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
              <span className="text-sm text-foreground font-medium">{displayGuicheLabel(g)}</span>
              <div className="flex gap-1">
                <button onClick={() => openGuicheModal(g)} className="p-1.5 hover:bg-background rounded" aria-label="Editar guichê" title="Editar"><Pencil className="h-4 w-4 text-muted-foreground" /></button>
                <button onClick={() => { dispatch({ type: 'REMOVE_GUICHE', payload: g.id }); toast.success('Removido') }} className="p-1.5 hover:bg-background rounded" aria-label="Remover guichê" title="Remover"><Trash2 className="h-4 w-4 text-muted-foreground" /></button>
              </div>
            </div>
          ))}
          {!guiches.length && <p className="text-xs text-muted-foreground py-4 text-center">Nenhum guichê cadastrado</p>}
        </div>
      </div>

      {/* ====== Queue Modal ====== */}
      {queueModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setQueueModal(null)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card border border-border p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-foreground">{queueModal === 'new' ? 'Adicionar Fila' : 'Editar Fila'}</h3>

            {/* Nome */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Nome</label>
              <input type="text" value={qName} onChange={e => setQName(e.target.value)} placeholder="Ex: Atendimento"
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>

            {/* Tipo da fila + Cor */}
            <div className="flex gap-4 items-end">
              <div className="flex-1 space-y-1">
                <label className="text-sm font-medium text-foreground">Tipo da fila</label>
                <select value={qQueueType} onChange={e => setQQueueType(e.target.value as 'single' | 'block')}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
                  <option value="single">Simples</option>
                  <option value="block">Bloco</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Cor da ficha</label>
                <input type="color" value={qColor} onChange={e => setQColor(e.target.value)}
                  className="h-10 w-10 rounded border border-input cursor-pointer bg-transparent" />
              </div>
            </div>

            {/* Linked queues (only for block type) */}
            {qQueueType === 'block' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Filas vinculadas ao bloco</label>
                <div className="space-y-1">
                  {qLinkedIds.map(lid => {
                    const linked = queues.find(q => q.id === lid)
                    return (
                      <div key={lid} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                          <span className="text-sm text-foreground">{linked?.name || lid}</span>
                        </div>
                        <button onClick={() => removeLinkedQueue(lid)} className="p-1 hover:bg-background rounded" aria-label="Remover fila vinculada">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </button>
                      </div>
                    )
                  })}
                </div>
                {availableForLink.filter(q => !qLinkedIds.includes(q.id)).length > 0 && (
                  <select onChange={e => { if (e.target.value) { addLinkedQueue(e.target.value); e.target.value = '' } }}
                    className="w-full rounded-lg bg-green-500 text-white px-3 py-2.5 text-sm font-semibold cursor-pointer">
                    <option value="">Adicionar filas</option>
                    {availableForLink.filter(q => !qLinkedIds.includes(q.id)).map(q => (
                      <option key={q.id} value={q.id}>{q.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Prefixes */}
            <div className="flex gap-4">
              <div className="flex-1 space-y-1">
                <label className="text-sm font-medium text-foreground">Prefixo ({qName || 'Principal'})</label>
                <input type="text" value={qPrefix} onChange={e => setQPrefix(e.target.value.toUpperCase().slice(0, 3))} maxLength={3}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              {qQueueType === 'block' && (
                <div className="flex-1 space-y-1">
                  <label className="text-sm font-medium text-foreground">Prefixo (Preferencial 80+)</label>
                  <input type="text" value={qPrefixAlt} onChange={e => setQPrefixAlt(e.target.value.toUpperCase().slice(0, 3))} maxLength={3}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              )}
            </div>

            {/* Tipo Externo/Interno */}
            <div className="flex gap-4">
              <div className="flex-1 space-y-1">
                <label className="text-sm font-medium text-foreground">Tipo</label>
                <select value={qType} onChange={e => setQType(e.target.value as 'external' | 'internal')}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
                  <option value="external">Externo</option>
                  <option value="internal">Interno</option>
                </select>
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-sm font-medium text-foreground">Categoria</label>
                <select value={qCategory} onChange={e => setQCategory(e.target.value as 'attendance' | 'collect')}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
                  <option value="attendance">Atendimento</option>
                  <option value="collect">Coleta</option>
                </select>
              </div>
            </div>

            {/* Exibir no totem */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={qShowOnTotem} onChange={e => setQShowOnTotem(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-green-500" />
              <span className="text-sm font-medium text-foreground">Exibir no totem</span>
            </label>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setQueueModal(null)} className="rounded-lg border border-input px-4 py-2.5 text-sm font-medium hover:bg-muted">Cancelar</button>
              <button onClick={saveQueue} className="rounded-lg bg-green-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-600">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Guiche Modal */}
      {guicheModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setGuicheModal(null)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 space-y-4">
            <h3 className="text-lg font-bold text-foreground">{guicheModal === 'new' ? 'Adicionar Guichê' : 'Editar Guichê'}</h3>
            <div className="space-y-3">
              <div className="space-y-1"><label className="text-sm font-medium text-foreground">Nome *</label><input type="text" value={gName} onChange={e => setGName(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div className="space-y-1"><label className="text-sm font-medium text-foreground">Tipo</label><select value={gType} onChange={e => setGType(e.target.value as 'external' | 'internal')} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"><option value="external">Externo</option><option value="internal">Interno</option></select></div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setGuicheModal(null)} className="rounded-lg border border-input px-4 py-2.5 text-sm font-medium hover:bg-muted">Cancelar</button>
              <button onClick={saveGuiche} className="rounded-lg bg-green-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-600">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Totem Modal */}
      {totemModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setTotemModal(null)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 space-y-4">
            <h3 className="text-lg font-bold text-foreground">{totemModal === 'new' ? 'Adicionar Totem' : 'Editar Totem'}</h3>
            <div className="space-y-1"><label className="text-sm font-medium text-foreground">Nome *</label><input type="text" value={tName} onChange={e => setTName(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setTotemModal(null)} className="rounded-lg border border-input px-4 py-2.5 text-sm font-medium hover:bg-muted">Cancelar</button>
              <button onClick={saveTotem} className="rounded-lg bg-green-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-600">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
