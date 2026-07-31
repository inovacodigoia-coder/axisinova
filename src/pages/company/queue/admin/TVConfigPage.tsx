import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, Eye, EyeOff, Copy, RefreshCw, ExternalLink, Upload, X, Monitor, MonitorOff } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useQueueSystem } from '@/context/QueueSystemContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import type { TV, MediaAttachment } from '@/types/queue-system.types'

const DEMO_COMPANY_ID = 'comp_001'

function TVScreenPreview({ tv }: { tv: TV }) {
  const firstMedia = tv.mediaAttachments[0]
  const withMedia = tv.mediaMode === 'with_media'

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Preview · {withMedia ? 'Com Mídia' : 'Sem Mídia'}
      </p>
      <div className="overflow-hidden rounded-lg border border-border bg-background shadow-md">
        <div className="bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">Chame rápido</div>
        <div className="grid aspect-[16/7] grid-cols-[1fr_0.72fr] gap-2 bg-muted p-2 sm:grid-cols-[1fr_1.05fr_0.72fr]">
          {withMedia && (
            <div className="relative hidden overflow-hidden rounded-md bg-primary/20 sm:block">
              {firstMedia ? (
                firstMedia.type === 'video' ? (
                  <video src={firstMedia.fileUrl} className="h-full w-full object-cover" muted playsInline />
                ) : (
                  <img src={firstMedia.fileUrl} alt={firstMedia.name} className="h-full w-full object-cover" />
                )
              ) : (
                <div className="flex h-full items-center justify-center text-xs font-medium text-muted-foreground">Imagem</div>
              )}
            </div>
          )}

          <div className={cn('flex flex-col items-center justify-center rounded-md bg-primary/20 text-center text-foreground', !withMedia && 'sm:col-span-2')}>
            <p className="text-xs">Ficha:</p>
            <p className="text-2xl font-semibold leading-tight">A5</p>
            <p className="mt-1 text-xs">Dirija-se ao:</p>
            <p className="text-sm font-medium">Guichê 01</p>
          </div>

          <div className="grid gap-1.5">
            {['A1', 'A2', 'A3', 'A4'].map(code => (
              <div key={code} className="flex flex-col items-center justify-center rounded-md bg-primary px-2 py-1 text-center text-primary-foreground">
                <p className="text-[10px] font-bold leading-none">Ficha: {code}</p>
                <p className="text-[9px] font-semibold leading-tight">Guichê 04</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

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
  const [tvSlug, setTvSlug] = useState('')
  const [tvUsername, setTvUsername] = useState('')
  const [tvPassword, setTvPassword] = useState('')
  const [showTvPwd, setShowTvPwd] = useState(false)

  const selectedTv = tvs.find(t => t.id === selectedTvId)

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

  const tvUrl = (slug: string) => `${window.location.origin}/painel/${slug || ''}`

  const copyToClipboard = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); toast.success(`${label} copiado`) }
    catch { toast.error('Não foi possível copiar') }
  }

  const generateTvCredentials = () => {
    setTvUsername(`tv_${randomToken(4).toLowerCase()}`)
    setTvPassword(randomToken(8))
    setShowTvPwd(true)
    toast.success('Novas credenciais geradas')
  }

  const openTVModal = (tv: TV | null) => {
    setEditTV(tv)
    setShowTvPwd(false)
    setTvName(tv?.name || '')
    setTvVoice(tv?.voiceType || 'feminine')
    setTvSize(tv?.screenSize || 'medium')
    setTvDeviceCount(tv?.deviceCount || 1)
    if (tv) {
      setTvSlug(tv.slug || `tv-${tv.id.slice(0, 8)}`)
      setTvUsername(tv.accessUsername || `tv_${randomToken(4).toLowerCase()}`)
      setTvPassword(tv.accessPassword || randomToken(8))
    } else {
      setTvSlug(`tv-${randomToken(6).toLowerCase()}`)
      setTvUsername(`tv_${randomToken(4).toLowerCase()}`)
      setTvPassword(randomToken(8))
    }
    setShowTVModal(true)
  }

  const saveTV = async () => {
    if (!tvName.trim() || saving) return
    setSaving(true)
    const slug = slugify(tvSlug) || `tv-${randomToken(6).toLowerCase()}`
    const extra = {
      slug,
      accessUsername: tvUsername.trim() || undefined,
      accessPassword: tvPassword.trim() || undefined,
    }
    if (isDemoCompany) {
      if (editTV) {
        dispatch({ type: 'UPDATE_TV', payload: { ...editTV, name: tvName, voiceType: tvVoice, screenSize: tvSize, deviceCount: tvDeviceCount, ...extra } })
        toast.success('TV atualizada')
      } else {
        const newTv: TV = {
          id: `tv_${Date.now()}`, unitId: unitId!, name: tvName, voiceType: tvVoice, screenSize: tvSize,
          deviceCount: tvDeviceCount, mediaMode: 'without_media', mediaAttachments: [], isActive: true, ...extra,
        }
        dispatch({ type: 'ADD_TV', payload: newTv })
        toast.success('TV criada')
      }
    } else {
      if (editTV) {
        const ok = await updateTVDB({ ...editTV, name: tvName, voiceType: tvVoice, screenSize: tvSize, deviceCount: tvDeviceCount, ...extra })
        if (ok) toast.success('TV atualizada')
      } else {
        const tv = await addTVDB({ unitId: unitId!, name: tvName, voiceType: tvVoice, screenSize: tvSize, deviceCount: tvDeviceCount, mediaMode: 'without_media', companyId, ...extra })
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

  const [showMediaModal, setShowMediaModal] = useState(false)
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaName, setMediaName] = useState('')
  const [mediaDuration, setMediaDuration] = useState(15)
  const [uploadingMedia, setUploadingMedia] = useState(false)

  const persistTvMedia = async (tv: TV, list: MediaAttachment[]) => {
    if (isDemoCompany) return
    const { error } = await supabase.from('queue_tvs' as never).update({ media_attachments: list } as never).eq('id', tv.id)
    if (error) throw error
  }

  const removeMedia = async (attachmentId: string) => {
    if (!selectedTv) return
    const next = selectedTv.mediaAttachments.filter(m => m.id !== attachmentId)
    dispatch({ type: 'UPDATE_TV', payload: { ...selectedTv, mediaAttachments: next } })
    await persistTvMedia(selectedTv, next)
    toast.success('Anexo removido')
  }

  const openMediaModal = () => {
    setMediaFile(null); setMediaName(''); setMediaDuration(15); setShowMediaModal(true)
  }

  const saveMediaUpload = async () => {
    if (!selectedTv || !mediaFile) { toast.error('Selecione um arquivo'); return }
    setUploadingMedia(true)
    try {
      const ext = mediaFile.name.split('.').pop() || 'bin'
      const path = `${companyId}/${selectedTv.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('tv-media').upload(path, mediaFile, { upsert: false, contentType: mediaFile.type })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('tv-media').getPublicUrl(path)
      const att: MediaAttachment = {
        id: `ma_${Date.now()}`, tvId: selectedTv.id,
        name: mediaName.trim() || mediaFile.name,
        type: mediaFile.type.startsWith('video') ? 'video' : 'image',
        durationSeconds: Number(mediaDuration) || 15,
        fileUrl: pub.publicUrl, createdAt: new Date().toISOString(),
      }
      const next = [...selectedTv.mediaAttachments, att]
      dispatch({ type: 'UPDATE_TV', payload: { ...selectedTv, mediaAttachments: next } })
      await persistTvMedia(selectedTv, next)
      toast.success('Anexo cadastrado')
      setShowMediaModal(false)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'erro desconhecido'
      console.error(e); toast.error('Falha no upload: ' + message)
    } finally {
      setUploadingMedia(false)
    }
  }

  const toggleMediaMode = async () => {
    if (!selectedTv) return
    const mode = selectedTv.mediaMode === 'with_media' ? 'without_media' : 'with_media'
    const updated = { ...selectedTv, mediaMode: mode as 'with_media' | 'without_media' }
    if (isDemoCompany) {
      dispatch({ type: 'UPDATE_TV', payload: updated })
    } else {
      await updateTVDB(updated)
    }
    toast.success(mode === 'with_media' ? 'TV agora exibe mídia' : 'TV agora exibe somente chamadas')
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

      <div className="flex items-center gap-4 flex-wrap">
        <label className="text-sm font-medium text-foreground">Tela da TV</label>
        <select value={selectedTvId} onChange={e => setSelectedTvId(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          {tvs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          {!tvs.length && <option value="">Nenhuma TV</option>}
        </select>
        {selectedTv && (
          <div className="flex items-center gap-2 ml-2">
            <span className="text-xs text-muted-foreground">Modo:</span>
            <button onClick={toggleMediaMode} className={cn('inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
              selectedTv.mediaMode === 'with_media' ? 'border-primary bg-primary/10 text-primary' : 'border-input text-muted-foreground hover:bg-muted')}>
              {selectedTv.mediaMode === 'with_media' ? <Monitor className="h-3.5 w-3.5" /> : <MonitorOff className="h-3.5 w-3.5" />}
              {selectedTv.mediaMode === 'with_media' ? 'Com Mídia' : 'Sem Mídia'}
            </button>
          </div>
        )}
      </div>

      {selectedTv && <TVScreenPreview tv={selectedTv} />}

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
            <button onClick={openMediaModal} className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowTVModal(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card border border-border p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-foreground">{editTV ? 'Editar TV' : 'Cadastrar TV'}</h3>

            <div className="space-y-3">
              <div className="space-y-1"><label className="text-sm font-medium">Nome *</label><input type="text" value={tvName} onChange={e => setTvName(e.target.value)} placeholder="Digite o nome..." className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div className="space-y-1"><label className="text-sm font-medium">Tipo de voz</label><select value={tvVoice} onChange={e => setTvVoice(e.target.value as 'feminine'|'masculine')} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"><option value="feminine">Feminina</option><option value="masculine">Masculina</option></select></div>
              <div className="space-y-1"><label className="text-sm font-medium">Tamanho da TV</label><select value={tvSize} onChange={e => setTvSize(e.target.value as TV['screenSize'])} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"><option value="small">Pequena</option><option value="medium">Médio</option><option value="large">Grande</option><option value="extra_large">Extra Grande</option></select></div>
              <div className="space-y-1"><label className="text-sm font-medium">Número de dispositivos</label><input type="number" min={1} value={tvDeviceCount} onChange={e => setTvDeviceCount(Number(e.target.value))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Identificador da URL (slug)</label>
              <input type="text" value={tvSlug} onChange={e => setTvSlug(e.target.value)} placeholder="ex: tv-recepcao"
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
              <p className="text-[11px] text-muted-foreground">Apenas letras minúsculas, números e hífens.</p>
            </div>

            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Link de acesso da TV</span>
                <a href={tvUrl(tvSlug)} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1 bg-primary/10 px-2 py-1 rounded">
                  Abrir Link Público <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="flex gap-2">
                <input readOnly value={tvUrl(tvSlug)}
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono text-foreground" />
                <button type="button" onClick={() => copyToClipboard(tvUrl(tvSlug), 'Link')}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90">
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">Use este link no painel/TV de chamadas.</p>
            </div>

            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Credenciais de acesso</span>
                <button type="button" onClick={generateTvCredentials}
                  className="inline-flex items-center gap-1 rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-semibold hover:bg-muted">
                  <RefreshCw className="h-3.5 w-3.5" /> Gerar aleatório
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">Digite manualmente ou gere automaticamente o login e a senha desta TV.</p>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Usuário</label>
                <div className="flex gap-2">
                  <input type="text" value={tvUsername} onChange={e => setTvUsername(e.target.value)}
                    className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
                  <button type="button" onClick={() => copyToClipboard(tvUsername, 'Usuário')}
                    className="rounded-lg border border-input bg-background px-2.5 hover:bg-muted" aria-label="Copiar usuário">
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Senha</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input type={showTvPwd ? 'text' : 'password'} value={tvPassword} onChange={e => setTvPassword(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-9 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
                    <button type="button" onClick={() => setShowTvPwd(s => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Mostrar senha">
                      {showTvPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <button type="button" onClick={() => copyToClipboard(tvPassword, 'Senha')}
                    className="rounded-lg border border-input bg-background px-2.5 hover:bg-muted" aria-label="Copiar senha">
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">Deixe em branco para liberar o painel sem login.</p>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowTVModal(false)} className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted">Cancelar</button>
              <button onClick={saveTV} disabled={saving} className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMediaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !uploadingMedia && setShowMediaModal(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card border border-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Cadastrar Anexo</h3>
              <button onClick={() => !uploadingMedia && setShowMediaModal(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Arquivo (imagem ou vídeo) *</label>
              <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input bg-background px-4 py-6 cursor-pointer hover:bg-muted/40 transition-colors">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground text-center">
                  {mediaFile ? mediaFile.name : 'Clique para selecionar (JPG, PNG, MP4...)'}
                </span>
                <input type="file" accept="image/*,video/*" className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0] || null
                    setMediaFile(f)
                    if (f && !mediaName) setMediaName(f.name.replace(/\.[^.]+$/, ''))
                  }} />
              </label>
              {mediaFile && (
                <p className="text-[11px] text-muted-foreground">
                  {(mediaFile.size / (1024 * 1024)).toFixed(2)} MB · {mediaFile.type || 'desconhecido'}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Nome do anexo</label>
              <input type="text" value={mediaName} onChange={e => setMediaName(e.target.value)} placeholder="Ex: Promoção check-up"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Duração (segundos)</label>
              <input type="number" min={1} max={300} value={mediaDuration} onChange={e => setMediaDuration(Number(e.target.value))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <p className="text-[11px] text-muted-foreground">Tempo de exibição na TV antes de passar ao próximo anexo.</p>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowMediaModal(false)} disabled={uploadingMedia} className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50">Cancelar</button>
              <button onClick={saveMediaUpload} disabled={uploadingMedia || !mediaFile} className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50">
                {uploadingMedia ? 'Enviando...' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
