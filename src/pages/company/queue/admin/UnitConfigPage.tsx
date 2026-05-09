import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, GripVertical, Copy, Eye, EyeOff, RefreshCw, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { useQueueSystem } from '@/context/QueueSystemContext'
import { useAuth } from '@/context/AuthContext'
import type { QueueLine, Guiche, Totem } from '@/types/queue-system.types'

const DEMO_COMPANY_ID = 'comp_001'

export default function UnitConfigPage() {
  const { unitId } = useParams<{ unitId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    state, dispatch, getUnitQueues, getUnitGuiches, getUnitTotems,
    addTotemDB, updateTotemDB, removeTotemDB,
    addQueueLineDB, updateQueueLineDB, removeQueueLineDB,
    addGuicheDB, updateGuicheDB, removeGuicheDB,
  } = useQueueSystem()

  const isDemoCompany = user?.companyId === DEMO_COMPANY_ID
  const companyId = user?.companyId || ''

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
  const [qTotemId, setQTotemId] = useState('')
  const [qHasPreferential, setQHasPreferential] = useState(false)
  const [qHasPreferential80, setQHasPreferential80] = useState(false)
  const [qAllowTotemChoice, setQAllowTotemChoice] = useState(false)

  // Guiche modal
  const [guicheModal, setGuicheModal] = useState<Guiche | null | 'new'>(null)
  const [gName, setGName] = useState('')
  const [gType, setGType] = useState<'external' | 'internal'>('external')

  // Totem modal
  const [totemModal, setTotemModal] = useState<Totem | null | 'new'>(null)
  const [tName, setTName] = useState('')
  const [tSlug, setTSlug] = useState('')
  const [tUsername, setTUsername] = useState('')
  const [tPassword, setTPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  const [saving, setSaving] = useState(false)

  const availableForLink = queues.filter(q => {
    if (queueModal === 'new') return q.queueType === 'single'
    if (queueModal && typeof queueModal === 'object') return q.id !== queueModal.id && q.queueType === 'single'
    return false
  })

  const openQueueModal = (q: QueueLine | 'new') => {
    if (q === 'new') {
      setQName(''); setQPrefix(''); setQPrefixAlt(''); setQType('external'); setQCategory('attendance')
      setQColor('#e0e0e0'); setQShowOnTotem(true); setQQueueType('single'); setQLinkedIds([])
      setQTotemId(''); setQHasPreferential(false); setQHasPreferential80(false); setQAllowTotemChoice(false)
    } else {
      setQName(q.name); setQPrefix(q.prefix); setQPrefixAlt(q.prefixAlt || ''); setQType(q.type); setQCategory(q.category)
      setQColor(q.color || '#e0e0e0'); setQShowOnTotem(q.showOnTotem); setQQueueType(q.queueType); setQLinkedIds([...q.linkedQueueIds])
      setQTotemId(q.totemId || ''); setQHasPreferential(q.hasPreferential); setQHasPreferential80(q.hasPreferential80); setQAllowTotemChoice(q.allowTotemChoice)
    }
    setQueueModal(q)
  }

  const saveQueue = async () => {
    if (!qName.trim() || !qPrefix.trim() || saving) return
    setSaving(true)
    const base = {
      name: qName, prefix: qPrefix, prefixAlt: qPrefixAlt || undefined, type: qType, category: qCategory,
      color: qColor, showOnTotem: qShowOnTotem, queueType: qQueueType, linkedQueueIds: qQueueType === 'block' ? qLinkedIds : [],
      totemId: qTotemId || undefined, hasPreferential: qHasPreferential, hasPreferential80: qHasPreferential80, allowTotemChoice: qAllowTotemChoice,
    }
    if (isDemoCompany) {
      if (queueModal === 'new') {
        dispatch({ type: 'ADD_QUEUE_LINE', payload: { id: `ql_${Date.now()}`, unitId: unitId!, isActive: true, order: queues.length + 1, ...base } })
        toast.success('Fila criada')
      } else if (queueModal) {
        dispatch({ type: 'UPDATE_QUEUE_LINE', payload: { ...queueModal, ...base } })
        toast.success('Fila atualizada')
      }
    } else {
      if (queueModal === 'new') {
        const ql = await addQueueLineDB({ unitId: unitId!, order: queues.length + 1, companyId, ...base })
        if (ql) toast.success('Fila criada')
      } else if (queueModal) {
        const ok = await updateQueueLineDB({ ...queueModal, ...base })
        if (ok) toast.success('Fila atualizada')
      }
    }
    setSaving(false)
    setQueueModal(null)
  }

  const addLinkedQueue = (id: string) => { if (!qLinkedIds.includes(id)) setQLinkedIds([...qLinkedIds, id]) }
  const removeLinkedQueue = (id: string) => setQLinkedIds(qLinkedIds.filter(x => x !== id))

  const openGuicheModal = (g: Guiche | 'new') => {
    if (g === 'new') { setGName(''); setGType('external') }
    else { setGName(g.name); setGType(g.type) }
    setGuicheModal(g)
  }

  const saveGuiche = async () => {
    if (!gName.trim() || saving) return
    setSaving(true)
    if (isDemoCompany) {
      if (guicheModal === 'new') {
        dispatch({ type: 'ADD_GUICHE', payload: { id: `g_${Date.now()}`, unitId: unitId!, name: gName, type: gType, isActive: true } })
        toast.success('Guichê criado')
      } else if (guicheModal) {
        dispatch({ type: 'UPDATE_GUICHE', payload: { ...guicheModal, name: gName, type: gType } })
        toast.success('Guichê atualizado')
      }
    } else {
      if (guicheModal === 'new') {
        const g = await addGuicheDB(unitId!, gName, gType, companyId)
        if (g) toast.success('Guichê criado')
      } else if (guicheModal) {
        const ok = await updateGuicheDB(guicheModal.id, gName, gType)
        if (ok) toast.success('Guichê atualizado')
      }
    }
    setSaving(false)
    setGuicheModal(null)
  }

  const slugify = (str: string) =>
    str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
       .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)

  const randomToken = (len: number) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    let out = ''
    const arr = new Uint32Array(len)
    crypto.getRandomValues(arr)
    for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length]
    return out
  }

  const openTotemModal = (t: Totem | 'new') => {
    setShowPwd(false)
    if (t === 'new') {
      const auto = `totem-${randomToken(6).toLowerCase()}`
      setTName('')
      setTSlug(auto)
      setTUsername(`totem_${randomToken(4).toLowerCase()}`)
      setTPassword(randomToken(8))
    } else {
      setTName(t.name)
      setTSlug(t.slug || `totem-${t.id.slice(0, 8)}`)
      setTUsername(t.accessUsername || '')
      setTPassword(t.accessPassword || '')
    }
    setTotemModal(t)
  }

  const generateCredentials = () => {
    setTUsername(`totem_${randomToken(4).toLowerCase()}`)
    setTPassword(randomToken(8))
    setShowPwd(true)
    toast.success('Novas credenciais geradas')
  }

  const totemUrl = (slug: string) => `${window.location.origin}/totem/${slug || ''}`

  const copyToClipboard = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); toast.success(`${label} copiado`) }
    catch { toast.error('Não foi possível copiar') }
  }

  const saveTotem = async () => {
    if (!tName.trim() || saving) return
    const slug = slugify(tSlug) || `totem-${randomToken(6).toLowerCase()}`
    setSaving(true)
    const extra = { slug, accessUsername: tUsername.trim() || undefined, accessPassword: tPassword.trim() || undefined }
    if (isDemoCompany) {
      if (totemModal === 'new') {
        dispatch({ type: 'ADD_TOTEM', payload: { id: `tot_${Date.now()}`, unitId: unitId!, name: tName, isActive: true, ...extra } })
        toast.success('Totem criado')
      } else if (totemModal) {
        dispatch({ type: 'UPDATE_TOTEM', payload: { ...totemModal, name: tName, ...extra } })
        toast.success('Totem atualizado')
      }
    } else {
      if (totemModal === 'new') {
        const t = await addTotemDB(unitId!, tName, companyId, extra)
        if (t) toast.success('Totem criado')
      } else if (totemModal) {
        const ok = await updateTotemDB(totemModal.id, tName, extra)
        if (ok) toast.success('Totem atualizado')
      }
    }
    setSaving(false)
    setTotemModal(null)
  }

  const handleRemoveQueue = async (id: string) => {
    if (isDemoCompany) { dispatch({ type: 'REMOVE_QUEUE_LINE', payload: id }); toast.success('Removido') }
    else { const ok = await removeQueueLineDB(id); if (ok) toast.success('Removido') }
  }
  const handleRemoveGuiche = async (id: string) => {
    if (isDemoCompany) { dispatch({ type: 'REMOVE_GUICHE', payload: id }); toast.success('Removido') }
    else { const ok = await removeGuicheDB(id); if (ok) toast.success('Removido') }
  }
  const handleRemoveTotem = async (id: string) => {
    if (isDemoCompany) { dispatch({ type: 'REMOVE_TOTEM', payload: id }); toast.success('Removido') }
    else { const ok = await removeTotemDB(id); if (ok) toast.success('Removido') }
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
                <button onClick={() => handleRemoveTotem(t.id)} className="p-1.5 hover:bg-background rounded" aria-label="Remover totem" title="Remover"><Trash2 className="h-4 w-4 text-muted-foreground" /></button>
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
                  <button onClick={() => handleRemoveQueue(q.id)} className="p-1.5 hover:bg-background rounded" aria-label="Remover fila" title="Remover"><Trash2 className="h-4 w-4 text-muted-foreground" /></button>
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
                <button onClick={() => handleRemoveGuiche(g.id)} className="p-1.5 hover:bg-background rounded" aria-label="Remover guichê" title="Remover"><Trash2 className="h-4 w-4 text-muted-foreground" /></button>
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

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Nome</label>
              <input type="text" value={qName} onChange={e => setQName(e.target.value)} placeholder="Ex: Atendimento"
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>

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

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Totem</label>
              <select value={qTotemId} onChange={e => setQTotemId(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
                <option value="">Selecionar</option>
                {totems.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={qShowOnTotem} onChange={e => setQShowOnTotem(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-green-500" />
              <span className="text-sm font-medium text-foreground">Exibir no totem</span>
            </label>

            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={qHasPreferential} onChange={e => setQHasPreferential(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-green-500" />
                <span className="text-sm font-medium text-foreground">Fila preferencial</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={qHasPreferential80} onChange={e => setQHasPreferential80(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-green-500" />
                <span className="text-sm font-medium text-foreground">Fila preferencial 80+</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={qAllowTotemChoice} onChange={e => setQAllowTotemChoice(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-green-500" />
                <span className="text-sm font-medium text-foreground">Permitir escolha entre atendimento normal ou preferencial no totem</span>
              </label>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setQueueModal(null)} className="rounded-lg border border-input px-4 py-2.5 text-sm font-medium hover:bg-muted">Cancelar</button>
              <button onClick={saveQueue} disabled={saving} className="rounded-lg bg-green-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
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
              <button onClick={saveGuiche} disabled={saving} className="rounded-lg bg-green-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Totem Modal */}
      {totemModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setTotemModal(null)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card border border-border p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-foreground">{totemModal === 'new' ? 'Adicionar Totem' : 'Editar Totem'}</h3>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Nome *</label>
              <input type="text" value={tName} onChange={e => setTName(e.target.value)} placeholder="Ex.: Totem Recepção"
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Identificador da URL (slug)</label>
              <input type="text" value={tSlug} onChange={e => setTSlug(e.target.value)} placeholder="ex: totem-recepcao"
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
              <p className="text-[11px] text-muted-foreground">Apenas letras minúsculas, números e hífens.</p>
            </div>

            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Link de acesso do Totem</span>
                <a href={totemUrl(tSlug)} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                  Abrir <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="flex gap-2">
                <input readOnly value={totemUrl(tSlug)}
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono text-foreground" />
                <button type="button" onClick={() => copyToClipboard(totemUrl(tSlug), 'Link')}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90">
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">Use este link no equipamento (totem, recepção, sala de procedimento ou painel médico).</p>
            </div>

            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Credenciais de acesso</span>
                <button type="button" onClick={generateCredentials}
                  className="inline-flex items-center gap-1 rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-semibold hover:bg-muted">
                  <RefreshCw className="h-3.5 w-3.5" /> Gerar
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Usuário</label>
                <div className="flex gap-2">
                  <input type="text" value={tUsername} onChange={e => setTUsername(e.target.value)}
                    className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
                  <button type="button" onClick={() => copyToClipboard(tUsername, 'Usuário')}
                    className="rounded-lg border border-input bg-background px-2.5 hover:bg-muted" aria-label="Copiar usuário">
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Senha</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input type={showPwd ? 'text' : 'password'} value={tPassword} onChange={e => setTPassword(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-9 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
                    <button type="button" onClick={() => setShowPwd(s => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Mostrar senha">
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <button type="button" onClick={() => copyToClipboard(tPassword, 'Senha')}
                    className="rounded-lg border border-input bg-background px-2.5 hover:bg-muted" aria-label="Copiar senha">
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">Remova a senha (deixe em branco) para liberar chamada por recepção, médicos ou sala de procedimento sem login.</p>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setTotemModal(null)} className="rounded-lg border border-input px-4 py-2.5 text-sm font-medium hover:bg-muted">Cancelar</button>
              <button onClick={saveTotem} disabled={saving} className="rounded-lg bg-green-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
