import { useState, useEffect } from 'react'
import { Save, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

const DEFAULT_PRIMARY = '#00D4FF'
const DEFAULT_SECONDARY = '#7B2FF7'
const STORAGE_PRIMARY = 'axis_visual_primary'
const STORAGE_SECONDARY = 'axis_visual_secondary'

function applyColors(primary: string, secondary: string) {
  const root = document.documentElement
  root.style.setProperty('--color-primary-hex', primary)
  root.style.setProperty('--color-secondary-hex', secondary)
  root.style.setProperty('--gradient-main', `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`)
  // Also update company accent for branding
  root.style.setProperty('--company-accent-hex', primary)
}

function loadSavedColors(): { primary: string; secondary: string } {
  const primary = localStorage.getItem(STORAGE_PRIMARY) || DEFAULT_PRIMARY
  const secondary = localStorage.getItem(STORAGE_SECONDARY) || DEFAULT_SECONDARY
  return { primary, secondary }
}

export default function VisualSettingsPage() {
  const saved = loadSavedColors()
  const [primary, setPrimary] = useState(saved.primary)
  const [secondary, setSecondary] = useState(saved.secondary)

  // Apply in real-time as user changes
  useEffect(() => {
    applyColors(primary, secondary)
  }, [primary, secondary])

  const handleSave = () => {
    localStorage.setItem(STORAGE_PRIMARY, primary)
    localStorage.setItem(STORAGE_SECONDARY, secondary)
    applyColors(primary, secondary)
    toast.success('Personalização visual salva e aplicada!')
  }

  const handleReset = () => {
    setPrimary(DEFAULT_PRIMARY)
    setSecondary(DEFAULT_SECONDARY)
    localStorage.removeItem(STORAGE_PRIMARY)
    localStorage.removeItem(STORAGE_SECONDARY)
    applyColors(DEFAULT_PRIMARY, DEFAULT_SECONDARY)
    toast.success('Cores restauradas ao padrão')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Personalização Visual</h1>
        <p className="text-sm text-muted-foreground">Customize as cores e a identidade visual do sistema</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <h3 className="text-lg font-semibold text-foreground">Cores do Sistema</h3>

            <div>
              <label className="text-sm font-medium text-foreground">Cor Primária</label>
              <div className="flex items-center gap-3 mt-2">
                <input type="color" value={primary} onChange={e => setPrimary(e.target.value)}
                  className="h-12 w-16 rounded-lg border border-input cursor-pointer" />
                <input type="text" value={primary} onChange={e => setPrimary(e.target.value)}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono w-28" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Cor Secundária</label>
              <div className="flex items-center gap-3 mt-2">
                <input type="color" value={secondary} onChange={e => setSecondary(e.target.value)}
                  className="h-12 w-16 rounded-lg border border-input cursor-pointer" />
                <input type="text" value={secondary} onChange={e => setSecondary(e.target.value)}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono w-28" />
              </div>
            </div>

            {/* Gradient preview */}
            <div>
              <label className="text-sm font-medium text-foreground">Gradiente Resultante</label>
              <div className="mt-2 h-16 rounded-xl" style={{ background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)` }} />
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
        </div>

        {/* Live Preview */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <h4 className="text-sm font-bold text-foreground">PREVIEW EM TEMPO REAL</h4>
          </div>
          <div className="p-6">
            <div className="rounded-xl border border-border overflow-hidden">
              {/* Mini sidebar + content */}
              <div className="grid grid-cols-[60px_1fr] h-64">
                {/* Sidebar */}
                <div className="bg-[hsl(220,26%,14%)] p-2 space-y-2">
                  <div className="h-8 w-8 rounded-lg mx-auto" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }} />
                  <div className="space-y-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`h-6 w-full rounded ${i === 1 ? 'opacity-100' : 'opacity-30'}`}
                        style={i === 1 ? { background: `${primary}20` } : { background: '#ffffff15' }} />
                    ))}
                  </div>
                </div>
                {/* Content */}
                <div className="bg-background p-4 space-y-3">
                  <div className="h-4 rounded" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})`, width: '60%' }} />
                  <div className="flex gap-2">
                    <button className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
                      Botão Primário
                    </button>
                    <button className="rounded-lg border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: primary, color: primary }}>
                      Botão Outline
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: `${primary}15`, color: primary }}>
                      Badge ativo
                    </span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: `${secondary}15`, color: secondary }}>
                      Badge secundário
                    </span>
                  </div>
                  <div className="rounded-lg border border-border p-2 focus-within:ring-2" style={{ borderColor: `${primary}50` }}>
                    <p className="text-xs text-muted-foreground">Input com foco</p>
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
