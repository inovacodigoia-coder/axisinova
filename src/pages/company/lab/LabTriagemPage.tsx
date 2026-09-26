import { Card } from '@/components/ui/card'
import { Construction, Lock } from 'lucide-react'
import { useTriagemPermissions } from '@/hooks/useTriagem'

export default function LabTriagemPage() {
  const { algum } = useTriagemPermissions()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Triagem Lab</h1>
        <p className="text-sm text-muted-foreground">Triagem de amostras recebidas das unidades de coleta (não é a triagem de paciente).</p>
      </div>
      <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
        {algum ? <Construction className="h-10 w-10 text-primary" /> : <Lock className="h-10 w-10 text-muted-foreground" />}
        <p className="text-lg font-semibold">{algum ? 'Em construção' : 'Sem permissão'}</p>
        <p className="max-w-md text-sm text-muted-foreground">
          {algum ? 'As telas de malote e triagem chegam nas próximas etapas. Os cadastros já estão em Configurações do Laboratório › Unidades e Rotas.'
                 : 'Peça ao administrador uma permissão do grupo "Triagem Lab" em Perfis de Acesso.'}
        </p>
      </Card>
    </div>
  )
}
