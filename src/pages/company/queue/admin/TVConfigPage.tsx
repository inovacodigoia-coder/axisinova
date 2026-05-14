import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, Eye, EyeOff, Copy, RefreshCw, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useQueueSystem } from '@/context/QueueSystemContext'
import { useAuth } from '@/context/AuthContext'
import type { TV, MediaAttachment } from '@/types/queue-system.types'

const DEMO_COMPANY_ID = 'comp_001'

export default function TVConfigPage() {
  const { unitId } = useParams<{ unitId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { state, dispatch, getUnitTVs, addTVDB, updateTVDB, removeTVDB } = useQueueSystem()

  const isDemoCompany = user?.companyId === DEMO_COMPANY_ID
  const companyId = user?.companyId || ''

  const unit = state.units.find(u => u.id === unitId)
  const tvs = getUnitTVs(unitId || '')
  const [selectedTvId, setSelectedTvId] = useState(tvs[0]?.id || '')
  const [tab, setTab] = useState<'attachments' | 'tvs'>('attachments')
  const [showTVModal, setShowTVModal] = useState(false)
  const [editTV, setEditTV] = useState<TV | null>(null)
  const [saving, setSaving] = useState(false)

  // TV form
  const [tvName, setTvName] = useState('')
  const [tvVoice, setTvVoice] = useState<'feminine' | 'masculine'>('feminine')
  const [tvSize, setTvSize] = useState<'small' | 'medium' | 'large' | 'extra_large'>('medium')
  const [tvDeviceCount, setTvDeviceCount] = useState(1)

  const selectedTv = tvs.find(t => t.id === selectedTvId)

  const openTVModal = (tv: TV | null) => {
    setEditTV(tv)
    setTvName(tv?.name || '')
    setTvVoice(tv?.voiceType || 'feminine')
    setTvSize(tv?.screenSize || 'medium')
    setTvDeviceCount(tv?.deviceCount || 1)
    setShowTVModal(true)
  }

  const saveTV = async () => {
    if (!tvName.trim() || saving) return
    setSaving(true)
    if (isDemoCompany) {
      if (editTV) {
        dispatch({ type: 'UPDATE_TV', payload: { ...editTV, name: tvName, voiceType: tvVoice, screenSize: tvSize, deviceCount: tvDeviceCount } })
        toast.success('TV atualizada')
      } else {
        const newTv: TV = {
          id: `tv_${Date.now()}`, unitId: unitId!, name: tvName, voiceType: tvVoice, screenSize: tvSize,
          deviceCount: tvDeviceCount, mediaMode: 'without_media', mediaAttachments: [], isActive: true,
        }
        dispatch({ type: 'ADD_TV', payload: newTv })
        toast.success('TV criada')
      }
    } else {
      if (editTV) {
        const ok = await updateTVDB({ ...editTV, name: tvName, voiceType: tvVoice, screenSize: tvSize, deviceCount: tvDeviceCount })
        if (ok) toast.success('TV atualizada')
      } else {
        const tv = await addTVDB({ unitId: unitId!, name: tvName, voiceType: tvVoice, screenSize: tvSize, deviceCount: tvDeviceCount, mediaMode: 'without_media', companyId })
        if (tv) { toast.success('TV criada'); setSelectedTvId(tv.id) }
      }
    }
    setSaving(false)
    setShowTVModal(false)
  }

  const handleRemoveTV = async (id: string) => {
    if (isDemoCompany) {
      dispatch({ type: 'REMOVE_TV', payload: id })
      toast.success('TV removida')
    } else {
      const ok = await removeTVDB(id)
      if (ok) toast.success('TV removida')
    }
  }

  const removeMedia = (attachmentId: string) => {
    if (!selectedTvId) return
    dispatch({ type: 'REMOVE_MEDIA', payload: { tvId: selectedTvId, attachmentId } })
    toast.success('Anexo removido')
  }

  const addMockMedia = () => {
    if (!selectedTvId) return
    const att: MediaAttachment = {
      id: `ma_${Date.now()}`, tvId: selectedTvId, name: `Mídia ${Date.now()}.mp4`,
      type: 'video', durationSeconds: 30, fileUrl: '#', createdAt: new Date().toISOString(),
    }
    dispatch({ type: 'ADD_MEDIA', payload: { tvId: selectedTvId, attachment: att } })
    toast.success('Anexo adicionado')
  }

  if (!unit) return <p className="text-muted-foreground">Unidade não encontrada</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button onClick={() => navigate(`/app/filas/admin/unidades/${unitId}`)} className="flex items-center gap-2 rounded-lg bg-[hsl(222,70%,35%)] text-white px-4 py-2 text-sm font-semibold">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <h1 className="text-lg font-bold text-foreground">Unidade Selecionada: {unit.name}</h1>
        <div />
      </div>

      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-foreground">Tela da TV</label>
        <select value={selectedTvId} onChange={e => setSelectedTvId(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          {tvs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          {!tvs.length && <option value="">Nenhuma TV</option>}
        </select>
      </div>

      {selectedTv && (
        <div className="rounded-xl bg-[hsl(220,26%,14%)] p-6 text-white">
          <p className="text-sm text-white/50 mb-2">Chame rápido</p>
          <div className="flex gap-4">
            <div className="flex-1 rounded-lg bg-white/5 p-6 text-center">
              <p className="text-xs text-white/40 mb-2">Ficha:</p>
              <p className="text-3xl font-black">A5</p>
              <p className="text-xs text-white/50 mt-2">Dirija-se ao:</p>
              <p className="text-sm font-bold text-primary">Guichê 01</p>
            </div>
            <div className="w-40 space-y-2">
              {['A1', 'A2'].map(c => (
                <div key={c} className="rounded-lg bg-white/5 p-3 text-center">
                  <p className="text-xs text-white/40">Ficha: {c}</p>
                  <p className="text-xs text-white/50">Guichê 04</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1 rounded-lg border border-border p-0.5 w-fit">
        <button onClick={() => setTab('attachments')} className={cn('rounded-md px-4 py-1.5 text-sm font-medium transition-colors', tab === 'attachments' ? 'bg-[hsl(222,70%,35%)] text-white' : 'text-muted-foreground hover:bg-muted')}>
          Configurar Anexos
        </button>
        <button onClick={() => setTab('tvs')} className={cn('rounded-md px-4 py-1.5 text-sm font-medium transition-colors', tab === 'tvs' ? 'bg-[hsl(222,70%,35%)] text-white' : 'text-muted-foreground hover:bg-muted')}>
          Configurar TVs
        </button>
      </div>

      {tab === 'attachments' && selectedTv && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={addMockMedia} className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600">
              <Plus className="h-4 w-4" /> Adicionar Anexo
            </button>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tempo</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground w-20">Visualizar</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground w-20">Remover</th>
                </tr>
              </thead>
              <tbody>
                {selectedTv.mediaAttachments.map(m => (
                  <tr key={m.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 text-foreground">{m.name}</td>
                    <td className="px-4 py-3 text-foreground">{m.type}</td>
                    <td className="px-4 py-3 text-foreground">{m.durationSeconds} segundos</td>
                    <td className="px-4 py-3 text-center"><button className="text-muted-foreground hover:text-foreground"><Eye className="h-4 w-4 mx-auto" /></button></td>
                    <td className="px-4 py-3 text-center"><button onClick={() => removeMedia(m.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4 mx-auto" /></button></td>
                  </tr>
                ))}
                {!selectedTv.mediaAttachments.length && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Nenhum anexo de mídia</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'tvs' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => openTVModal(null)} className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600">
              <Plus className="h-4 w-4" /> Adicionar TV
            </button>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Voz</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground w-20">Editar</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground w-20">Remover</th>
                </tr>
              </thead>
              <tbody>
                {tvs.map(t => (
                  <tr key={t.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 text-foreground">{t.name}</td>
                    <td className="px-4 py-3 text-foreground capitalize">{t.voiceType === 'feminine' ? 'Feminina' : 'Masculina'}</td>
                    <td className="px-4 py-3 text-center"><button onClick={() => openTVModal(t)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4 mx-auto" /></button></td>
                    <td className="px-4 py-3 text-center"><button onClick={() => handleRemoveTV(t.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4 mx-auto" /></button></td>
                  </tr>
                ))}
                {!tvs.length && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Nenhuma TV cadastrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showTVModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowTVModal(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 space-y-4">
            <h3 className="text-lg font-bold text-foreground">{editTV ? 'Editar TV' : 'Cadastrar TV'}</h3>
            <div className="space-y-3">
              <div className="space-y-1"><label className="text-sm font-medium">Nome *</label><input type="text" value={tvName} onChange={e => setTvName(e.target.value)} placeholder="Digite o nome..." className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div className="space-y-1"><label className="text-sm font-medium">Tipo de voz</label><select value={tvVoice} onChange={e => setTvVoice(e.target.value as 'feminine'|'masculine')} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"><option value="feminine">Feminina</option><option value="masculine">Masculina</option></select></div>
              <div className="space-y-1"><label className="text-sm font-medium">Tamanho da TV</label><select value={tvSize} onChange={e => setTvSize(e.target.value as any)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"><option value="small">Pequena</option><option value="medium">Médio</option><option value="large">Grande</option><option value="extra_large">Extra Grande</option></select></div>
              <div className="space-y-1"><label className="text-sm font-medium">Número de dispositivos</label><input type="number" min={1} value={tvDeviceCount} onChange={e => setTvDeviceCount(Number(e.target.value))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowTVModal(false)} className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted">Cancelar</button>
              <button onClick={saveTV} disabled={saving} className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
