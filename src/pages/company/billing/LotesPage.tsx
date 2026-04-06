import { useNavigate } from 'react-router-dom'
import { Plus, Package } from 'lucide-react'
import { GradientButton } from '@/components/ui/GradientButton'
import { toast } from 'sonner'

const LOTE_STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: 'Aberto', cls: 'bg-blue-100 text-blue-800' },
  closed: { label: 'Fechado', cls: 'bg-yellow-100 text-yellow-800' },
  submitted: { label: 'Enviado', cls: 'bg-purple-100 text-purple-800' },
  processing: { label: 'Em Processamento', cls: 'bg-sky-100 text-sky-800' },
  finished: { label: 'Finalizado', cls: 'bg-green-100 text-green-800' },
}

export default function LotesPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lotes de Cobrança</h1>
          <p className="text-sm text-muted-foreground">Gerencie os lotes de faturamento</p>
        </div>
        <GradientButton><Plus className="h-4 w-4 mr-2" /> Novo Lote</GradientButton>
      </div>

      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum lote criado</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Os lotes de cobrança serão criados aqui conforme as guias de faturamento forem geradas e agrupadas para envio aos convênios.
        </p>
        <GradientButton><Plus className="h-4 w-4 mr-2" /> Criar Primeiro Lote</GradientButton>
      </div>
    </div>
  )
}
