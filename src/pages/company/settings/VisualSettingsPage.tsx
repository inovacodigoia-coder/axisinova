import { useState, useEffect } from 'react'
import { Save, RotateCcw, Check } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import {
  BrandingTheme,
  DEFAULT_THEME,
  THEME_PRESETS,
  applyBranding,
  themeFromRow,
  themeToRow,
} from '@/lib/branding'

const SIDEBAR_PRESETS = [
  { label: 'Escuro padrão', color: '#1E293B' },
  { label: 'Preto', color: '#0F1117' },
  { label: 'Azul marinho', color: '#1A1F3D' },
  { label: 'Grafite', color: '#2D2D2D' },
  { label: 'Verde escuro', color: '#1A2E2A' },
  { label: 'Roxo escuro', color: '#2D1B4E' },
  { label: 'Azul petróleo', color: '#1B3A4B' },
  { label: 'Cinza escuro', color: '#374151' },
]

const BACKGROUND_PRESETS = [
  { label: 'Cinza claro', color: '#F5F7FA' },
  { label: 'Branco', color: '#FFFFFF' },
  { label: 'Areia', color: '#FAF8F5' },
  { label: 'Azul gelo', color: '#F1F5F9' },
  { label: 'Verde suave', color: '#F3F7F5' },
  { label: 'Lavanda', color: '#F7F5FC' },
  { label: 'Grafite claro', color: '#EDEFF2' },
  { label: 'Escuro', color: '#0F172A' },
]

function ColorField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground">{label}</label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <div className="flex items-center gap-3 mt-2">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-10 w-14 rounded-lg border border-input cursor-pointer bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono w-28"
        />
      </div>
    </div>
  )
}

export default function VisualSettingsPage() {
  const { user } = useAuth()
  const companyId = user?.companyId

  const [theme, setTheme] = useState<BrandingTheme>(DEFAULT_THEME)
  const [loaded, setLoaded] = useState(false)

  const set = <K extends keyof BrandingTheme>(key: K, value: BrandingTheme[K]) =>
    setTheme(prev => ({ ...prev, [key]: value }))

  useEffect(() => {
    if (!companyId) return
    const load = async () => {
      const { data } = await supabase
        .from('company_branding')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle() as any
      if (data) {
        const t = themeFromRow(data)
        setTheme(t)
        applyBranding(t)
        setBrandName(data.brand_name || '')
        setLogoUrl(data.logo_url || '')
      }
      setLoaded(true)
    }
    load()
  }, [companyId])

  useEffect(() => {
    if (loaded) applyBranding(theme)
  }, [theme, loaded])

  const persist = async (t: BrandingTheme, identity?: { brand_name: string | null; logo_url: string | null }) => {
    if (!companyId) return true
    const { error } = await supabase.from('company_branding').upsert(
      {
        company_id: companyId,
        ...themeToRow(t),
        ...(identity ?? { brand_name: brandName.trim() || null, logo_url: logoUrl || null }),
      } as any,
      { onConflict: 'company_id' }
    )
    if (error) {
      console.error(error)
      return false
    }
    return true
  }

  const handleLogoUpload = async (file: File) => {
    if (!companyId) return
    if (!file.type.startsWith('image/')) return toast.error('Selecione um arquivo de imagem')
    if (file.size > 2 * 1024 * 1024) return toast.error('A imagem deve ter no máximo 2MB')
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'png'
      const path = `${companyId}/branding/logo-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('company-assets').upload(path, file, { upsert: true, contentType: file.type })
      if (error) throw error
      const { data } = supabase.storage.from('company-assets').getPublicUrl(path)
      setLogoUrl(data.publicUrl)
      toast.success('Logo enviada! Clique em salvar para aplicar.')
    } catch (e: any) {
      console.error(e)
      toast.error('Erro ao enviar a logo')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    const ok = await persist(theme)
    if (!ok) return toast.error('Erro ao salvar personalização')
    applyBranding(theme)
    window.dispatchEvent(new CustomEvent('company-branding-updated', {
      detail: { brandName: brandName.trim() || null, logoUrl: logoUrl || null },
    }))
    toast.success('Personalização visual salva e aplicada!')
  }

  const handleReset = async () => {
    setTheme(DEFAULT_THEME)
    applyBranding(DEFAULT_THEME)
    await persist(DEFAULT_THEME)
    toast.success('Cores restauradas ao padrão')
  }

  const activePreset = THEME_PRESETS.find(
    p => JSON.stringify(p.theme) === JSON.stringify(theme)
  )?.name

  const displayName = brandName.trim() || 'AxisInova'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Personalização Visual</h1>
        <p className="text-sm text-muted-foreground">Customize as cores e a identidade visual do sistema</p>
      </div>

      {/* Identity: logo + name */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Identidade da Empresa</h3>
          <p className="text-xs text-muted-foreground">Logo e nome exibidos acima do menu lateral</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Logo</label>
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl overflow-hidden border border-border"
                style={{ background: theme.sidebar }}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo da empresa" className="h-full w-full object-contain" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-white/40" />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted flex items-center gap-2 disabled:opacity-60"
                >
                  <Upload className="h-4 w-4" /> {uploading ? 'Enviando...' : 'Enviar logo'}
                </button>
                {logoUrl && (
                  <button
                    onClick={() => setLogoUrl('')}
                    className="rounded-lg border border-input px-3 py-2 text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" /> Remover
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) handleLogoUpload(f)
                  e.target.value = ''
                }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">PNG ou SVG com fundo transparente, até 2MB.</p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Nome exibido</label>
            <input
              type="text"
              value={brandName}
              maxLength={40}
              placeholder="AxisInova"
              onChange={e => setBrandName(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
            <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: theme.sidebar }}>
              {logoUrl && <img src={logoUrl} alt="" className="h-7 w-7 rounded object-contain" />}
              <span className="text-lg font-bold text-white truncate">{displayName}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Deixe em branco para usar “AxisInova”.</p>
          </div>
        </div>
      </div>


      {/* Ready-made themes */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Temas Prontos</h3>
          <p className="text-xs text-muted-foreground">Aplique um conjunto de cores completo com um clique e ajuste depois</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {THEME_PRESETS.map(p => (
            <button
              key={p.name}
              onClick={() => setTheme(p.theme)}
              className={`text-left rounded-xl border p-3 transition-all hover:shadow-md ${
                activePreset === p.name ? 'border-primary ring-2 ring-primary/20' : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{p.name}</span>
                {activePreset === p.name && <Check className="h-4 w-4 text-primary" />}
              </div>
              <p className="text-[11px] text-muted-foreground mb-2">{p.description}</p>
              <div className="flex gap-1">
                {[p.theme.background, p.theme.sidebar, p.theme.primary, p.theme.secondary, p.theme.border].map((c, i) => (
                  <span key={i} className="h-6 flex-1 rounded" style={{ background: c }} />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <h3 className="text-lg font-semibold text-foreground">Cores do Sistema</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <ColorField label="Cor Primária" value={theme.primary} onChange={v => set('primary', v)} />
              <ColorField label="Cor Secundária" value={theme.secondary} onChange={v => set('secondary', v)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Gradiente Resultante</label>
              <div
                className="mt-2 h-16 rounded-xl"
                style={{ background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)` }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <h3 className="text-lg font-semibold text-foreground">Fundo e Superfícies</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <ColorField label="Cor de Fundo" hint="Fundo geral das telas" value={theme.background} onChange={v => set('background', v)} />
              <ColorField label="Cor dos Cartões" hint="Cards, modais e painéis" value={theme.card} onChange={v => set('card', v)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Presets de fundo</label>
              <div className="grid grid-cols-4 gap-2">
                {BACKGROUND_PRESETS.map(p => (
                  <button key={p.color} onClick={() => set('background', p.color)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all hover:scale-105 ${theme.background === p.color ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}>
                    <div className="h-8 w-full rounded-lg border border-border" style={{ background: p.color }} />
                    <span className="text-[10px] text-muted-foreground leading-tight text-center">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <h3 className="text-lg font-semibold text-foreground">Textos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <ColorField label="Texto Principal" hint="Títulos e conteúdo" value={theme.text} onChange={v => set('text', v)} />
              <ColorField label="Texto Secundário" hint="Descrições e legendas" value={theme.mutedText} onChange={v => set('mutedText', v)} />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <h3 className="text-lg font-semibold text-foreground">Bordas, Campos e Foco</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <ColorField label="Cor das Bordas" value={theme.border} onChange={v => set('border', v)} />
              <ColorField label="Fundo dos Campos" value={theme.inputBg} onChange={v => set('inputBg', v)} />
              <ColorField label="Cor do Foco (Input com foco)" hint="Anel destacado ao focar campos" value={theme.ring} onChange={v => set('ring', v)} />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <h3 className="text-lg font-semibold text-foreground">Botões e Status</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <ColorField label="Texto dos Botões" value={theme.buttonText} onChange={v => set('buttonText', v)} />
              <ColorField label="Sucesso" value={theme.success} onChange={v => set('success', v)} />
              <ColorField label="Alerta" value={theme.warning} onChange={v => set('warning', v)} />
              <ColorField label="Erro" value={theme.error} onChange={v => set('error', v)} />
            </div>
          </div>

          {/* Sidebar color */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <h3 className="text-lg font-semibold text-foreground">Cor do Menu Lateral</h3>
            <ColorField label="Cor de fundo" value={theme.sidebar} onChange={v => set('sidebar', v)} />
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Presets</label>
              <div className="grid grid-cols-4 gap-2">
                {SIDEBAR_PRESETS.map(p => (
                  <button key={p.color} onClick={() => set('sidebar', p.color)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all hover:scale-105 ${theme.sidebar === p.color ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}>
                    <div className="h-8 w-full rounded-lg" style={{ background: p.color }} />
                    <span className="text-[10px] text-muted-foreground leading-tight text-center">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleReset} className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted flex items-center gap-2">
              <RotateCcw className="h-4 w-4" /> Restaurar padrão
            </button>
            <button onClick={handleSave} className="gradient-bg rounded-lg px-6 py-2 text-sm font-semibold text-white flex items-center gap-2 hover:opacity-90">
              <Save className="h-4 w-4" /> Salvar configurações
            </button>
          </div>
        </div>

        {/* Live Preview */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden sticky top-24 h-fit">
          <div className="p-4 border-b border-border bg-muted/30">
            <h4 className="text-sm font-bold text-foreground">PREVIEW EM TEMPO REAL</h4>
          </div>
          <div className="p-6">
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
              <div className="grid grid-cols-[60px_1fr] min-h-[18rem]">
                <div className="p-2 space-y-2" style={{ background: theme.sidebar }}>
                  <div className="h-8 w-8 rounded-lg mx-auto" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }} />
                  <div className="space-y-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-6 w-full rounded"
                        style={i === 1 ? { background: `${theme.primary}33` } : { background: '#ffffff15' }} />
                    ))}
                  </div>
                </div>
                <div className="p-4 space-y-3" style={{ background: theme.background }}>
                  <div className="rounded-xl p-3 space-y-3" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                    <p className="text-sm font-bold" style={{ color: theme.text }}>Título do cartão</p>
                    <p className="text-xs" style={{ color: theme.mutedText }}>Texto secundário de apoio</p>
                    <div className="flex gap-2">
                      <button className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                        style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, color: theme.buttonText }}>
                        Botão Primário
                      </button>
                      <button className="rounded-lg border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: theme.primary, color: theme.primary }}>
                        Botão Outline
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: `${theme.success}20`, color: theme.success }}>Sucesso</span>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: `${theme.warning}20`, color: theme.warning }}>Alerta</span>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: `${theme.error}20`, color: theme.error }}>Erro</span>
                    </div>
                    <div className="rounded-lg p-2" style={{ background: theme.inputBg, border: `1px solid ${theme.border}` }}>
                      <p className="text-xs" style={{ color: theme.mutedText }}>Input normal</p>
                    </div>
                    <div className="rounded-lg p-2" style={{ background: theme.inputBg, border: `1px solid ${theme.ring}`, boxShadow: `0 0 0 3px ${theme.ring}40` }}>
                      <p className="text-xs" style={{ color: theme.text }}>Input com foco</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
