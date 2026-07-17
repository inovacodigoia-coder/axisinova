import { Building2, Palette, DoorOpen, Bell, Printer, Volume2, MapPin, Settings2, Beaker } from 'lucide-react'

const CARDS = [
  { key: 'dados', label: 'Dados da Empresa', desc: 'Razão social, CNPJ, contato', icon: Building2, path: '/app/configuracoes/dados' },
  { key: 'visual', label: 'Visual', desc: 'Cores, logo e personalização', icon: Palette, path: '/app/configuracoes/visual' },
  { key: 'rooms', label: 'Salas e Setores', desc: 'Consultórios e salas de exame', icon: DoorOpen, path: '/app/configuracoes/salas' },
  { key: 'notifications', label: 'Notificações', desc: 'E-mail, WhatsApp e alertas', icon: Bell, path: '/app/configuracoes/notificacoes' },
  { key: 'printer', label: 'Impressora', desc: 'Térmica de senhas', icon: Printer, path: '/app/configuracoes/impressora' },
  { key: 'voice', label: 'Voz e Chamada', desc: 'Síntese de voz para senhas', icon: Volume2, path: '/app/configuracoes/voz' },
  { key: 'establishments', label: 'Estab. e Unidades', desc: 'Filiais e unidades', icon: MapPin, path: '/app/configuracoes/estabelecimentos' },
  { key: 'admin-panel', label: 'Painel Administrativo', desc: 'Unidades, filas e guichês', icon: Settings2, path: '/app/filas/admin/unidades' },
  { key: 'lab-settings', label: 'Config. Laboratório', desc: 'Assinaturas, etiquetas, parâmetros', icon: Beaker, path: '/app/configuracoes/laboratorio' },
]

export default function CompanySettingsPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Configurações gerais da empresa</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {CARDS.map(card => (
          <button key={card.key} onClick={() => navigate(card.path)}
            className="rounded-2xl border border-border bg-card p-6 text-left hover:border-primary/30 hover:shadow-lg transition-all group">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
              <card.icon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-sm font-bold text-foreground">{card.label}</h3>
            <p className="text-xs text-muted-foreground mt-1">{card.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
