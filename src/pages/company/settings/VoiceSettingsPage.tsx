import { useVoiceCall } from '@/hooks/useVoiceCall'
import { Save, Volume2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

const TEMPLATE_VARS = [
  { key: '{ticket}', label: 'Senha' },
  { key: '{name}', label: 'Nome' },
  { key: '{social_name}', label: 'Nome Social' },
  { key: '{room}', label: 'Sala' },
  { key: '{doctor}', label: 'Médico' },
  { key: '{type}', label: 'Tipo' },
]

export default function VoiceSettingsPage() {
  const { config, saveConfig, testVoice, isSupported } = useVoiceCall()

  if (!isSupported) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Configuração de Voz</h1>
        <div className="rounded-xl border border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5 p-6 flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-[hsl(var(--warning))]" />
          <div>
            <p className="font-semibold text-foreground">Seu navegador não suporta síntese de voz</p>
            <p className="text-sm text-muted-foreground mt-1">Recomendamos Chrome ou Edge para utilizar a chamada por voz.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuração de Voz</h1>
        <p className="text-sm text-muted-foreground">Configure a chamada de pacientes por voz</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* General */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Configurações Gerais</h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`w-10 h-5 rounded-full transition-colors flex items-center ${config.enabled ? 'bg-primary justify-end' : 'bg-muted justify-start'}`}>
              <div className="h-4 w-4 rounded-full bg-white shadow mx-0.5" />
            </div>
            <input type="checkbox" checked={config.enabled} onChange={e => saveConfig({ enabled: e.target.checked })} className="sr-only" />
            <span className="text-sm font-medium text-foreground">Habilitar chamada por voz</span>
          </label>
          <div>
            <label className="text-sm font-medium">Idioma</label>
            <select value={config.language} onChange={e => saveConfig({ language: e.target.value as 'pt-BR' | 'pt-PT' })}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="pt-BR">Português Brasil</option>
              <option value="pt-PT">Português Portugal</option>
            </select>
          </div>
        </div>

        {/* Voice params */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Parâmetros de Voz</h3>
          <div>
            <div className="flex justify-between text-sm"><span>Velocidade</span><span className="text-muted-foreground">{config.rate.toFixed(1)}x</span></div>
            <input type="range" min="0.5" max="2" step="0.1" value={config.rate} onChange={e => saveConfig({ rate: Number(e.target.value) })}
              className="w-full mt-1 accent-[hsl(var(--primary))]" />
            <div className="flex justify-between text-[10px] text-muted-foreground"><span>Lento</span><span>Normal</span><span>Rápido</span></div>
          </div>
          <div>
            <div className="flex justify-between text-sm"><span>Tom</span><span className="text-muted-foreground">{config.pitch.toFixed(1)}</span></div>
            <input type="range" min="0.5" max="2" step="0.1" value={config.pitch} onChange={e => saveConfig({ pitch: Number(e.target.value) })}
              className="w-full mt-1 accent-[hsl(var(--primary))]" />
          </div>
          <div>
            <div className="flex justify-between text-sm"><span>Volume</span><span className="text-muted-foreground">{Math.round(config.volume * 100)}%</span></div>
            <input type="range" min="0" max="1" step="0.05" value={config.volume} onChange={e => saveConfig({ volume: Number(e.target.value) })}
              className="w-full mt-1 accent-[hsl(var(--primary))]" />
          </div>
          <button onClick={testVoice} className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted flex items-center gap-2">
            <Volume2 className="h-4 w-4" /> 🔊 Testar voz
          </button>
        </div>

        {/* Template */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Template da Chamada</h3>
          <div className="flex flex-wrap gap-1 mb-2">
            {TEMPLATE_VARS.map(v => (
              <button key={v.key} onClick={() => saveConfig({ callTemplate: config.callTemplate + ' ' + v.key })}
                className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium hover:bg-primary/20">
                {v.key} ({v.label})
              </button>
            ))}
          </div>
          <textarea value={config.callTemplate} onChange={e => saveConfig({ callTemplate: e.target.value })} rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none" />
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-[10px] font-medium text-muted-foreground mb-1">Preview com dados de exemplo:</p>
            <p className="text-sm text-foreground">{config.callTemplate.replace('{ticket}', 'SP 001').replace('{name}', 'João da Silva').replace('{social_name}', 'João').replace('{room}', 'Consultório 1').replace('{doctor}', 'Dr. Carlos Lima').replace('{type}', 'Consulta')}</p>
          </div>
        </div>

        {/* Social name */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Nome Social</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={config.useSocialName} onChange={e => saveConfig({ useSocialName: e.target.checked })} className="rounded border-input" />
            <span className="text-sm text-foreground">Usar nome social quando disponível</span>
          </label>
          {config.useSocialName && (
            <p className="text-xs text-primary bg-primary/5 rounded-lg p-2">
              ℹ️ Pacientes com nome social cadastrado serão chamados pelo nome social tanto na voz quanto no painel de TV.
            </p>
          )}
        </div>

        {/* Repetitions */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Repetições</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Repetir chamada (vezes)</label>
              <input type="number" min={1} max={5} value={config.callRepetitions} onChange={e => saveConfig({ callRepetitions: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Intervalo (segundos)</label>
              <input type="number" min={1} max={10} value={config.intervalBetweenRepetitions} onChange={e => saveConfig({ intervalBetweenRepetitions: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={() => toast.success('Configurações de voz salvas!')} className="gradient-bg rounded-xl px-6 py-2.5 text-sm font-semibold text-white flex items-center gap-2">
            <Save className="h-4 w-4" /> Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
