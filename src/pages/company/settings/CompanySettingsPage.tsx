import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Building2, Palette, Bell, MapPin, Save, Monitor, Tablet, Copy, ExternalLink, QrCode } from 'lucide-react'
import { toast } from 'sonner'
import { useCompanyBranding } from '@/hooks/useCompanyBranding'

const TABS = [
  { key: 'company', label: 'Dados da Empresa', icon: Building2 },
  { key: 'visual', label: 'Personalização Visual', icon: Palette },
  { key: 'notifications', label: 'Notificações', icon: Bell },
  { key: 'establishments', label: 'Estabelecimentos', icon: MapPin },
  { key: 'totem', label: 'Totem de Autoatendimento', icon: Tablet },
  { key: 'panels', label: 'Painéis de TV', icon: Monitor },
]

export default function CompanySettingsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('company')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Configurações gerais da empresa</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        <div className="space-y-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${activeTab === t.key ? 'gradient-bg text-white' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          {activeTab === 'company' && <CompanyDataTab />}
          {activeTab === 'visual' && <VisualTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'establishments' && <EstablishmentsTab />}
          {activeTab === 'totem' && <TotemTab />}
          {activeTab === 'panels' && <PanelsTab />}
        </div>
      </div>
    </div>
  )
}

function CompanyDataTab() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Dados da Empresa</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="text-sm font-medium">Razão Social</label><input defaultValue="Clínica Vida & Saúde LTDA" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
        <div><label className="text-sm font-medium">Nome Fantasia</label><input defaultValue="Clínica Vida & Saúde" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
        <div><label className="text-sm font-medium">CNPJ</label><input defaultValue="12.345.678/0001-95" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
        <div><label className="text-sm font-medium">Telefone</label><input defaultValue="(11) 3456-7890" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
        <div><label className="text-sm font-medium">E-mail</label><input defaultValue="contato@vidaesaude.com.br" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
        <div><label className="text-sm font-medium">Website</label><input defaultValue="https://vidaesaude.com.br" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
      </div>
      <div className="flex justify-end pt-4">
        <button onClick={() => toast.success('Dados salvos')} className="gradient-bg rounded-lg px-6 py-2 text-sm font-semibold text-white flex items-center gap-2"><Save className="h-4 w-4" /> Salvar Alterações</button>
      </div>
    </div>
  )
}

function VisualTab() {
  const { accentColor, saveAccentColor } = useCompanyBranding()
  const [color, setColor] = useState(accentColor)

  const handleSave = () => {
    saveAccentColor(color)
    toast.success('Personalização salva e aplicada!')
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Personalização Visual</h3>
      <p className="text-sm text-muted-foreground">A cor de destaque será aplicada em botões, links e elementos de destaque em todo o sistema.</p>
      <div>
        <label className="text-sm font-medium">Cor de destaque da empresa</label>
        <div className="flex items-center gap-3 mt-2">
          <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-10 w-14 rounded border border-input cursor-pointer" />
          <span className="text-sm font-mono text-muted-foreground">{color}</span>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-border p-4">
        <p className="text-xs text-muted-foreground mb-3">Preview</p>
        <div className="flex items-center gap-4">
          <div className="h-8 w-20 rounded" style={{ background: color }} />
          <span className="text-sm font-medium" style={{ color }}>Texto em destaque</span>
          <button className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: color }}>Botão</button>
        </div>
      </div>
      <div className="flex justify-end pt-4">
        <button onClick={handleSave} className="gradient-bg rounded-lg px-6 py-2 text-sm font-semibold text-white flex items-center gap-2">
          <Save className="h-4 w-4" /> Salvar
        </button>
      </div>
    </div>
  )
}

function NotificationsTab() {
  const events = ['Novo agendamento', 'Cancelamento', 'Paciente faltoso', 'Guia com pendência', 'Faturamento gerado']
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Notificações</h3>
      <div className="space-y-3">
        {events.map(ev => (
          <div key={ev} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <span className="text-sm text-foreground">{ev}</span>
            <select className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm">
              <option>E-mail</option>
              <option>WhatsApp</option>
              <option>Ambos</option>
              <option>Nenhum</option>
            </select>
          </div>
        ))}
      </div>
      <div className="flex justify-end pt-4">
        <button onClick={() => toast.success('Notificações salvas')} className="gradient-bg rounded-lg px-6 py-2 text-sm font-semibold text-white">Salvar</button>
      </div>
    </div>
  )
}

function EstablishmentsTab() {
  const [establishments] = useState([
    { id: '1', name: 'Unidade Centro', cnpj: '12.345.678/0001-95', city: 'São Paulo' },
    { id: '2', name: 'Unidade Alphaville', cnpj: '12.345.678/0002-76', city: 'Barueri' },
  ])
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Estabelecimentos</h3>
        <button className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted">+ Adicionar Unidade</button>
      </div>
      <div className="space-y-2">
        {establishments.map(e => (
          <div key={e.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3 hover:bg-muted/50 transition-colors">
            <div>
              <p className="text-sm font-medium text-foreground">{e.name}</p>
              <p className="text-xs text-muted-foreground">{e.cnpj} · {e.city}</p>
            </div>
            <button className="text-xs text-primary hover:underline">Editar</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function LinkCard({ label, description, url, icon: Icon }: { label: string; description: string; url: string; icon: any }) {
  const fullUrl = `${window.location.origin}${url}`

  const copyUrl = () => {
    navigator.clipboard.writeText(fullUrl)
    toast.success('Link copiado!')
  }

  const openUrl = () => {
    window.open(fullUrl, '_blank')
  }

  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-muted p-2">
        <code className="flex-1 text-xs text-muted-foreground truncate">{fullUrl}</code>
        <button onClick={copyUrl} className="rounded-md p-1.5 hover:bg-background transition-colors" title="Copiar link">
          <Copy className="h-4 w-4 text-muted-foreground" />
        </button>
        <button onClick={openUrl} className="rounded-md p-1.5 hover:bg-background transition-colors" title="Abrir em nova aba">
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}

function TotemTab() {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Totem de Autoatendimento</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Configure o totem de autoatendimento para que os pacientes possam fazer check-in e emitir senhas de forma autônoma.
        </p>
      </div>

      <LinkCard
        label="Link do Totem"
        description="Use este link no tablet ou computador em modo quiosque"
        url="/totem"
        icon={Tablet}
      />

      <div className="rounded-xl border border-border p-4 space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Como configurar</h4>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>Abra o link acima em um tablet ou computador com tela touch</li>
          <li>Coloque o navegador em <strong className="text-foreground">modo tela cheia</strong> (F11)</li>
          <li>O totem permite busca por nome ou CPF e emissão de senhas</li>
          <li>Categorias de senha: Preferencial, Normal, Exame, Procedimento e Retorno</li>
        </ol>
      </div>

      <div className="rounded-xl border border-border p-4 space-y-2">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <QrCode className="h-4 w-4" /> Dica
        </h4>
        <p className="text-sm text-muted-foreground">
          Para segurança, o acesso administrativo no totem pode ser feito com múltiplos toques no logotipo da empresa.
        </p>
      </div>
    </div>
  )
}

function PanelsTab() {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Painéis de TV</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Configure os painéis para exibição em TVs na sala de espera e consultórios.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <LinkCard
          label="Painel de Chamada"
          description="TV da sala de espera — exibe senhas chamadas"
          url="/painel-chamada"
          icon={Monitor}
        />

        <LinkCard
          label="Painel Médico"
          description="TV do consultório — exibe fila do médico"
          url="/painel-medico"
          icon={Monitor}
        />
      </div>

      <div className="rounded-xl border border-border p-4 space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Como configurar</h4>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>Conecte um computador, Chromecast ou Smart TV à TV desejada</li>
          <li>Abra o link do painel correspondente no navegador</li>
          <li>Coloque em <strong className="text-foreground">modo tela cheia</strong> (F11)</li>
          <li>O painel atualiza automaticamente em tempo real</li>
        </ol>
      </div>

      <div className="rounded-xl border border-border p-4 space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Resolução recomendada</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-muted p-3">
            <p className="font-medium text-foreground">Painel de Chamada</p>
            <p className="text-xs text-muted-foreground">1920×1080 (landscape)</p>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <p className="font-medium text-foreground">Totem</p>
            <p className="text-xs text-muted-foreground">768×1024 (portrait)</p>
          </div>
        </div>
      </div>
    </div>
  )
}
