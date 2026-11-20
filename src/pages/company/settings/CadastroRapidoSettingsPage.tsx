import { Keyboard } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { CadastroRapidoSwitch } from '@/components/superadmin/CadastroRapidoSwitch'

export default function CadastroRapidoSettingsPage() {
  const { user } = useAuth()
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Keyboard className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cadastro rápido de exames</h1>
          <p className="text-sm text-muted-foreground">Somente o administrador da empresa pode ligar ou desligar.</p>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        {user?.companyId ? <CadastroRapidoSwitch companyId={user.companyId} /> : <p className="text-sm text-muted-foreground">Empresa não identificada.</p>}
        <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
          <li><b>Enter</b> ou <b>Insert</b> na etapa Guias e Procedimentos abre a busca de exames.</li>
          <li>Digite sigla, código ou nome; <b>↑/↓</b> escolhem; <b>Enter</b> seleciona e <b>Enter</b> de novo inclui.</li>
          <li>A janela continua aberta para o próximo exame; <b>Esc</b> fecha.</li>
        </ul>
      </div>
    </div>
  )
}
