import { useLocation, useNavigate } from 'react-router-dom'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import PartnersListPage from './PartnersListPage'
import { PartnerOrdersTable } from '@/components/lab/portals/partners/PartnerOrdersTable'

export default function PartnersHubPage() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const tab = pathname.endsWith('/pedidos') ? 'pedidos' : 'parceiros'

  return (
    <div className="space-y-5">
      <Tabs
        value={tab}
        onValueChange={v => navigate(v === 'pedidos' ? '/app/portais/parceiros/pedidos' : '/app/portais/parceiros')}
      >
        <TabsList className="flex-wrap">
          <TabsTrigger value="parceiros">Parceiros</TabsTrigger>
          <TabsTrigger value="pedidos">Pedidos Recebidos</TabsTrigger>
        </TabsList>

        <TabsContent value="parceiros" className="mt-5">
          <PartnersListPage />
        </TabsContent>

        <TabsContent value="pedidos" className="mt-5 space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pedidos Recebidos</h1>
            <p className="text-sm text-muted-foreground">Requisições enviadas pelos parceiros via API e o resultado do processamento.</p>
          </div>
          <PartnerOrdersTable />
        </TabsContent>
      </Tabs>
    </div>
  )
}
