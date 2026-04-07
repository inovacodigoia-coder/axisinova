import { useState } from 'react'
import { Plus, Copy, ExternalLink, Settings, Trash2, Monitor, Tablet } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { TotemConfig, TVConfig } from '@/types/totem-tv.types'

const STORAGE_TOTEMS = 'axis_totems'
const STORAGE_TVS = 'axis_tvs'

function loadTotems(): TotemConfig[] {
  const raw = localStorage.getItem(STORAGE_TOTEMS)
  if (!raw) return [
    { id: 'totem_1', companyId: 'comp_001', name: 'Totem Entrada Principal', location: 'Recepção 1', isActive: true, slug: 'entrada-principal', allowedTicketTypes: ['SP', 'SN', 'EX', 'PR', 'RE'], welcomeMessage: 'Bem-vindo à {clinic_name}!', primaryColor: '#00D4FF', backgroundColor: '#0F1117', showEstimatedWait: true, allowSearchByName: true, allowSearchByCPF: true, allowSearchByBirthDate: false, printerEnabled: false, createdAt: new Date().toISOString() }
  ]
  return JSON.parse(raw)
}

function loadTVs(): TVConfig[] {
  const raw = localStorage.getItem(STORAGE_TVS)
  if (!raw) return [
    { id: 'tv_1', companyId: 'comp_001', name: 'TV Sala de Espera', location: 'Sala de Espera Principal', isActive: true, slug: 'sala-espera', displayTicketTypes: ['SP', 'SN', 'EX', 'PR', 'RE'], showDoctorName: true, showRoomName: true, showQueueList: true, maxQueueVisible: 5, showClock: true, showLogo: true, primaryColor: '#00D4FF', backgroundColor: '#0F1117', voiceEnabled: true, createdAt: new Date().toISOString() }
  ]
  return JSON.parse(raw)
}

export default function TotemTVSettingsPage() {
  const [tab, setTab] = useState<'totems' | 'tvs'>('totems')
  const [totems, setTotems] = useState<TotemConfig[]>(loadTotems)
  const [tvs, setTVs] = useState<TVConfig[]>(loadTVs)
  const [showTotemForm, setShowTotemForm] = useState(false)
  const [showTVForm, setShowTVForm] = useState(false)

  const saveTotems = (t: TotemConfig[]) => { setTotems(t); localStorage.setItem(STORAGE_TOTEMS, JSON.stringify(t)) }
  const saveTVs = (t: TVConfig[]) => { setTVs(t); localStorage.setItem(STORAGE_TVS, JSON.stringify(t)) }

  const addTotem = () => {
    const t: TotemConfig = {
      id: `totem_${Date.now()}`, companyId: 'comp_001', name: 'Novo Totem', location: '', isActive: true,
      slug: `totem-${Date.now()}`, allowedTicketTypes: ['SP', 'SN', 'EX', 'PR'],
      welcomeMessage: 'Bem-vindo!', primaryColor: '#00D4FF', backgroundColor: '#0F1117',
      showEstimatedWait: true, allowSearchByName: true, allowSearchByCPF: true,
      allowSearchByBirthDate: false, printerEnabled: false, createdAt: new Date().toISOString()
    }
    saveTotems([...totems, t])
    toast.success('Totem criado')
  }

  const addTV = () => {
    const t: TVConfig = {
      id: `tv_${Date.now()}`, companyId: 'comp_001', name: 'Novo Painel', location: '', isActive: true,
      slug: `painel-${Date.now()}`, displayTicketTypes: ['SP', 'SN', 'EX', 'PR', 'RE'],
      showDoctorName: true, showRoomName: true, showQueueList: true, maxQueueVisible: 5,
      showClock: true, showLogo: true, primaryColor: '#00D4FF', backgroundColor: '#0F1117',
      voiceEnabled: false, createdAt: new Date().toISOString()
    }
    saveTVs([...tvs, t])
    toast.success('Painel criado')
  }

  const copyUrl = (path: string) => {
    navigator.clipboard.writeText(`${window.location.origin}${path}`)
    toast.success('Link copiado!')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Totem e Painéis de TV</h1>
        <p className="text-sm text-muted-foreground">Configure dispositivos de autoatendimento e painéis de chamada</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-card p-1 w-fit">
        <button onClick={() => setTab('totems')} className={cn('rounded-lg px-4 py-2 text-sm font-medium transition-all', tab === 'totems' ? 'gradient-bg text-white' : 'text-muted-foreground hover:bg-muted')}>
          <Tablet className="h-4 w-4 inline mr-1.5" />Totens ({totems.length})
        </button>
        <button onClick={() => setTab('tvs')} className={cn('rounded-lg px-4 py-2 text-sm font-medium transition-all', tab === 'tvs' ? 'gradient-bg text-white' : 'text-muted-foreground hover:bg-muted')}>
          <Monitor className="h-4 w-4 inline mr-1.5" />Painéis de TV ({tvs.length})
        </button>
      </div>

      {tab === 'totems' && (
        <div className="space-y-4">
          <button onClick={addTotem} className="gradient-bg rounded-xl px-4 py-2.5 text-sm font-semibold text-white flex items-center gap-2">
            <Plus className="h-4 w-4" /> Novo Totem
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {totems.map(t => (
              <div key={t.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tablet className="h-5 w-5 text-primary" />
                    <span className="text-sm font-bold text-foreground">{t.name}</span>
                  </div>
                  <span className={cn('text-[10px] font-bold rounded-full px-2 py-0.5', t.isActive ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' : 'bg-muted text-muted-foreground')}>
                    {t.isActive ? '● Ativo' : '○ Inativo'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Localização: {t.location || 'Não definida'}</p>
                <div className="flex items-center gap-2 rounded-lg bg-muted p-2">
                  <code className="flex-1 text-[10px] text-muted-foreground truncate">/totem/{t.slug}</code>
                  <button onClick={() => copyUrl(`/totem/${t.slug}`)} className="p-1 hover:bg-background rounded"><Copy className="h-3.5 w-3.5 text-muted-foreground" /></button>
                  <button onClick={() => window.open(`/totem/${t.slug}`, '_blank')} className="p-1 hover:bg-background rounded"><ExternalLink className="h-3.5 w-3.5 text-muted-foreground" /></button>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {t.allowedTicketTypes.map(tt => (
                    <span key={tt} className="text-[9px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">{tt}</span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { saveTotems(totems.filter(x => x.id !== t.id)); toast.success('Totem removido') }}
                    className="rounded-lg border border-input px-2.5 py-1.5 text-[10px] font-medium hover:bg-muted flex items-center gap-1 text-destructive">
                    <Trash2 className="h-3 w-3" /> Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'tvs' && (
        <div className="space-y-4">
          <button onClick={addTV} className="gradient-bg rounded-xl px-4 py-2.5 text-sm font-semibold text-white flex items-center gap-2">
            <Plus className="h-4 w-4" /> Novo Painel de TV
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tvs.map(t => (
              <div key={t.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-primary" />
                    <span className="text-sm font-bold text-foreground">{t.name}</span>
                  </div>
                  <span className={cn('text-[10px] font-bold rounded-full px-2 py-0.5', t.isActive ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' : 'bg-muted text-muted-foreground')}>
                    {t.isActive ? '● Ativo' : '○ Inativo'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Localização: {t.location || 'Não definida'}</p>
                <div className="flex items-center gap-2 rounded-lg bg-muted p-2">
                  <code className="flex-1 text-[10px] text-muted-foreground truncate">/painel/{t.slug}</code>
                  <button onClick={() => copyUrl(`/painel/${t.slug}`)} className="p-1 hover:bg-background rounded"><Copy className="h-3.5 w-3.5 text-muted-foreground" /></button>
                  <button onClick={() => window.open(`/painel/${t.slug}`, '_blank')} className="p-1 hover:bg-background rounded"><ExternalLink className="h-3.5 w-3.5 text-muted-foreground" /></button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { saveTVs(tvs.filter(x => x.id !== t.id)); toast.success('Painel removido') }}
                    className="rounded-lg border border-input px-2.5 py-1.5 text-[10px] font-medium hover:bg-muted flex items-center gap-1 text-destructive">
                    <Trash2 className="h-3 w-3" /> Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
