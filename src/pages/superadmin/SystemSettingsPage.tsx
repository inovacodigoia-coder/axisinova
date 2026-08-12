import { useEffect, useState } from 'react'
import { Plus, Trash2, Save, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchDevAccessConfig,
  loadDevAccessConfig,
  saveDevAccessConfig,
  type DevAccessCredential,
} from '@/utils/devAccessConfig'

export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState('general')
  const [devConfig, setDevConfig] = useState(() => loadDevAccessConfig())
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [savingDev, setSavingDev] = useState(false)

  useEffect(() => {
    fetchDevAccessConfig().then(setDevConfig)
  }, [])


  const tabs = [
    { id: 'general', label: 'Geral' },
    { id: 'customization', label: 'Personalização' },
    { id: 'emails', label: 'E-mails Transacionais' },
    { id: 'maintenance', label: 'Manutenção' },
    { id: 'dev-access', label: 'Acessos de Teste' },
  ]

  const updateCredential = (id: string, patch: Partial<DevAccessCredential>) => {
    setDevConfig((prev) => ({
      ...prev,
      credentials: prev.credentials.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }))
  }

  const removeCredential = (id: string) => {
    setDevConfig((prev) => ({ ...prev, credentials: prev.credentials.filter((c) => c.id !== id) }))
  }

  const addCredential = () => {
    setDevConfig((prev) => ({
      ...prev,
      credentials: [
        ...prev.credentials,
        { id: `cred_${Date.now()}`, label: 'Novo acesso', email: '', password: '' },
      ],
    }))
  }

  const saveDev = async () => {
    const invalid = devConfig.credentials.find((c) => !c.label.trim() || !c.email.trim() || !c.password)
    if (invalid) {
      toast.error('Preencha rótulo, e-mail e senha em todos os acessos')
      return
    }
    setSavingDev(true)
    try {
      await saveDevAccessConfig(devConfig)
      toast.success('Acessos de teste salvos para todos os ambientes')
    } catch {
      toast.error('Não foi possível salvar. Verifique se você é super admin.')
    } finally {
      setSavingDev(false)
    }
  }


  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Configurações Globais</h1>

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        {activeTab === 'general' && (
          <div className="space-y-5 max-w-lg">
            {[
              { label: 'Nome da plataforma', defaultValue: 'Axis Inova', type: 'text' },
              { label: 'URL base', defaultValue: 'https://app.axisinova.com.br', type: 'url' },
              { label: 'E-mail de suporte', defaultValue: 'suporte@axisinova.com.br', type: 'email' },
              { label: 'WhatsApp de suporte', defaultValue: '(11) 99999-0000', type: 'tel' },
            ].map((f) => (
              <div key={f.label}>
                <label className="text-sm font-medium text-foreground">{f.label}</label>
                <input type={f.type} defaultValue={f.defaultValue} className="mt-1 flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
            ))}
            <button className="gradient-bg rounded-lg px-6 py-2.5 text-sm font-semibold text-white hover:brightness-110 active:scale-[0.97] transition-all">Salvar</button>
          </div>
        )}

        {activeTab === 'customization' && (
          <div className="space-y-5 max-w-lg">
            <p className="text-sm text-muted-foreground">Personalize a aparência da plataforma.</p>
            <div>
              <label className="text-sm font-medium">Cor primária</label>
              <div className="mt-1 flex items-center gap-2">
                <input type="color" defaultValue="#00D4FF" className="h-10 w-10 rounded border-0 cursor-pointer" />
                <input type="text" defaultValue="#00D4FF" className="flex h-10 w-32 rounded-lg border border-input bg-background px-3 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Cor secundária</label>
              <div className="mt-1 flex items-center gap-2">
                <input type="color" defaultValue="#7B2FF7" className="h-10 w-10 rounded border-0 cursor-pointer" />
                <input type="text" defaultValue="#7B2FF7" className="flex h-10 w-32 rounded-lg border border-input bg-background px-3 text-sm" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'emails' && (
          <div className="space-y-4 max-w-lg">
            {['Boas-vindas', 'Ativação de conta', 'Recuperação de senha', 'Fatura gerada', 'Pagamento confirmado', 'Conta suspensa'].map((type) => (
              <label key={type} className="flex items-center justify-between">
                <span className="text-sm">{type}</span>
                <input type="checkbox" defaultChecked className="h-5 w-10 rounded-full accent-[hsl(var(--primary))]" />
              </label>
            ))}
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="space-y-5 max-w-lg">
            <label className="flex items-center justify-between">
              <span className="text-sm font-medium">Modo manutenção global</span>
              <input type="checkbox" className="h-5 w-10 rounded-full accent-[hsl(var(--primary))]" />
            </label>
            <div>
              <label className="text-sm font-medium">Mensagem de manutenção</label>
              <textarea rows={3} defaultValue="O sistema está em manutenção programada. Voltaremos em breve." className="mt-1 flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <button className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white hover:bg-destructive/90 active:scale-[0.97] transition-all">
              Forçar logout de todos
            </button>
          </div>
        )}

        {activeTab === 'dev-access' && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-base font-semibold text-foreground">Painel "Acessos para teste" na tela de login</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Ative ou desative o card flutuante na tela de login e gerencie as credenciais exibidas.
                </p>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <span className="text-sm font-medium">{devConfig.enabled ? 'Ativado' : 'Desativado'}</span>
                <input
                  type="checkbox"
                  checked={devConfig.enabled}
                  onChange={async (e) => {
                    const next = { ...devConfig, enabled: e.target.checked }
                    setDevConfig(next)
                    try {
                      await saveDevAccessConfig(next)
                      toast.success(next.enabled ? 'Painel ativado na tela de login' : 'Painel desativado na tela de login')
                    } catch {
                      toast.error('Não foi possível salvar. Verifique se você é super admin.')
                    }
                  }}
                  className="h-5 w-10 rounded-full accent-[hsl(var(--primary))]"
                />

              </label>
            </div>

            <div className="space-y-3">
              {devConfig.credentials.map((cred) => (
                <div key={cred.id} className="rounded-xl border border-border bg-background p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Rótulo</label>
                      <input
                        value={cred.label}
                        onChange={(e) => updateCredential(cred.id, { label: e.target.value })}
                        className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase">E-mail</label>
                      <input
                        type="email"
                        value={cred.email}
                        onChange={(e) => updateCredential(cred.id, { email: e.target.value })}
                        className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Senha</label>
                      <div className="relative mt-1">
                        <input
                          type={revealed[cred.id] ? 'text' : 'password'}
                          value={cred.password}
                          onChange={(e) => updateCredential(cred.id, { password: e.target.value })}
                          className="h-10 w-full rounded-lg border border-input bg-background pl-3 pr-9 text-sm font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setRevealed((r) => ({ ...r, [cred.id]: !r[cred.id] }))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {revealed[cred.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => removeCredential(cred.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remover
                    </button>
                  </div>
                </div>
              ))}

              {devConfig.credentials.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-xl">
                  Nenhum acesso de teste cadastrado.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={addCredential}
                className="inline-flex items-center gap-2 rounded-lg border border-primary/40 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
              >
                <Plus className="h-4 w-4" /> Adicionar acesso
              </button>
              <button
                onClick={saveDev}
                className="gradient-bg inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold text-white hover:brightness-110 active:scale-[0.97] transition-all"
              >
                <Save className="h-4 w-4" /> Salvar acessos
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
