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

  const [queueModal, setQueueModal] = useState<QueueLine | null | 'new'>(null)
  const [guicheModal, setGuicheModal] = useState<Guiche | null | 'new'>(null)
  const [totemModal, setTotemModal] = useState<Totem | null | 'new'>(null)

  // Queue form state
  const [qName, setQName] = useState('')
  const [qPrefix, setQPrefix] = useState('')
  const [qType, setQType] = useState<'external' | 'internal'>('external')
  const [qCategory, setQCategory] = useState<'attendance' | 'collect'>('attendance')

  // Guiche form state
  const [gName, setGName] = useState('')
  const [gType, setGType] = useState<'external' | 'internal'>('external')

  // Totem form state
  const [tName, setTName] = useState('')

  const openQueueModal = (q: QueueLine | 'new') => {
    if (q === 'new') { setQName(''); setQPrefix(''); setQType('external'); setQCategory('attendance') }
    else { setQName(q.name); setQPrefix(q.prefix); setQType(q.type); setQCategory(q.category) }
    setQueueModal(q)
  }

  const saveQueue = () => {
    if (!qName.trim() || !qPrefix.trim()) return
    if (queueModal === 'new') {
      dispatch({ type: 'ADD_QUEUE_LINE', payload: { id: `ql_${Date.now()}`, unitId: unitId!, name: qName, prefix: qPrefix, type: qType, category: qCategory, isActive: true, order: queues.length + 1 } })
      toast.success('Fila criada')
    } else if (queueModal) {
      dispatch({ type: 'UPDATE_QUEUE_LINE', payload: { ...queueModal, name: qName, prefix: qPrefix, type: qType, category: qCategory } })
      toast.success('Fila atualizada')
    }
    setQueueModal(null)
  }

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

  if (!unit) return <p className="text-muted-foreground">Unidade não encontrada</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button onClick={() => navigate('/app/filas/admin/unidades')} className="flex items-center gap-2 rounded-lg bg-[hsl(222,70%,35%)] text-white px-4 py-2 text-sm font-semibold hover:bg-[hsl(222,70%,30%)]">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <h1 className="text-lg font-bold text-foreground">Unidade Selecionada: {unit.name}</h1>
        <button onClick={() => navigate(`/app/filas/admin/unidades/${unitId}/tvs`)} className="rounded-lg bg-[hsl(222,70%,35%)] text-white px-4 py-2 text-sm font-semibold hover:bg-[hsl(222,70%,30%)]">
          Configurar TVs
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Totems */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Totens ({totems.length})</h3>
            <button onClick={() => openTotemModal('new')} className="flex items-center gap-1 rounded-md bg-green-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-600">
              <Plus className="h-3 w-3" /> Adicionar
            </button>
          </div>
          {totems.map(t => (
            <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm text-foreground">{t.name}</span>
              <div className="flex gap-1">
                <button onClick={() => openTotemModal(t)} className="p-1 hover:bg-muted rounded"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                <button onClick={() => { dispatch({ type: 'REMOVE_TOTEM', payload: t.id }); toast.success('Removido') }} className="p-1 hover:bg-muted rounded"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
              </div>
            </div>
          ))}
          {!totems.length && <p className="text-xs text-muted-foreground">Nenhum totem</p>}
        </div>

        {/* Queues */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Filas ({queues.length})</h3>
            <button onClick={() => openQueueModal('new')} className="flex items-center gap-1 rounded-md bg-green-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-600">
              <Plus className="h-3 w-3" /> Adicionar
            </button>
          </div>
          {queues.sort((a, b) => a.order - b.order).map(q => (
            <div key={q.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-2">
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground cursor-grab" />
                <span className="text-sm text-foreground">{q.name}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openQueueModal(q)} className="p-1 hover:bg-muted rounded"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                <button onClick={() => { dispatch({ type: 'REMOVE_QUEUE_LINE', payload: q.id }); toast.success('Removido') }} className="p-1 hover:bg-muted rounded"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
              </div>
            </div>
          ))}
          {!queues.length && <p className="text-xs text-muted-foreground">Nenhuma fila</p>}
        </div>

        {/* Guiches */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Guichês ({guiches.length})</h3>
            <button onClick={() => openGuicheModal('new')} className="flex items-center gap-1 rounded-md bg-green-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-600">
              <Plus className="h-3 w-3" /> Adicionar
            </button>
          </div>
          {guiches.map(g => (
            <div key={g.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm text-foreground">{g.name}</span>
              <div className="flex gap-1">
                <button onClick={() => openGuicheModal(g)} className="p-1 hover:bg-muted rounded"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                <button onClick={() => { dispatch({ type: 'REMOVE_GUICHE', payload: g.id }); toast.success('Removido') }} className="p-1 hover:bg-muted rounded"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
              </div>
            </div>
          ))}
          {!guiches.length && <p className="text-xs text-muted-foreground">Nenhum guichê</p>}
        </div>
      </div>

      {/* Queue Modal */}
      {queueModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setQueueModal(null)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 space-y-4">
            <h3 className="text-lg font-bold text-foreground">{queueModal === 'new' ? 'Adicionar Fila' : 'Editar Fila'}</h3>
            <div className="space-y-3">
              <div className="space-y-1"><label className="text-sm font-medium">Nome *</label><input type="text" value={qName} onChange={e => setQName(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div className="space-y-1"><label className="text-sm font-medium">Prefixo *</label><input type="text" value={qPrefix} onChange={e => setQPrefix(e.target.value.toUpperCase().slice(0,2))} maxLength={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div className="space-y-1"><label className="text-sm font-medium">Tipo</label><select value={qType} onChange={e => setQType(e.target.value as 'external'|'internal')} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"><option value="external">Externo</option><option value="internal">Interno</option></select></div>
              <div className="space-y-1"><label className="text-sm font-medium">Categoria</label><select value={qCategory} onChange={e => setQCategory(e.target.value as 'attendance'|'collect')} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"><option value="attendance">Atendimento</option><option value="collect">Coleta</option></select></div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setQueueModal(null)} className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted">Cancelar</button>
              <button onClick={saveQueue} className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600">Salvar</button>
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
              <div className="space-y-1"><label className="text-sm font-medium">Nome *</label><input type="text" value={gName} onChange={e => setGName(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div className="space-y-1"><label className="text-sm font-medium">Tipo</label><select value={gType} onChange={e => setGType(e.target.value as 'external'|'internal')} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"><option value="external">Externo</option><option value="internal">Interno</option></select></div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setGuicheModal(null)} className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted">Cancelar</button>
              <button onClick={saveGuiche} className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Totem Modal */}
      {totemModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setTotemModal(null)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 space-y-4">
            <h3 className="text-lg font-bold text-foreground">{totemModal === 'new' ? 'Adicionar Totem' : 'Editar Totem'}</h3>
            <div className="space-y-1"><label className="text-sm font-medium">Nome *</label><input type="text" value={tName} onChange={e => setTName(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setTotemModal(null)} className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted">Cancelar</button>
              <button onClick={saveTotem} className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
