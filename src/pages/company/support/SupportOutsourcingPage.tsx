import { Truck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/feedback/EmptyState'

export default function SupportOutsourcingPage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">Terceirização</h1>
        <Badge className="gradient-bg text-white">Em desenvolvimento</Badge>
      </div>
      <div className="rounded-xl border bg-card">
        <EmptyState
          icon={<Truck className="h-10 w-10" />}
          title="Módulo em desenvolvimento"
          description="A gestão de terceirização de exames será liberada em uma próxima etapa."
        />
      </div>
    </div>
  )
}
