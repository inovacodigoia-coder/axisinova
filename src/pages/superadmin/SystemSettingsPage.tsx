import { useState } from 'react'

export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState('general')

  const tabs = [
    { id: 'general', label: 'Geral' },
    { id: 'customization', label: 'Personalização' },
    { id: 'emails', label: 'E-mails Transacionais' },
    { id: 'maintenance', label: 'Manutenção' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Configurações Globais</h1>

      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
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
      </div>
    </div>
  )
}
