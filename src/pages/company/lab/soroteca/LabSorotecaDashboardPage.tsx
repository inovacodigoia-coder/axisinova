import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Beaker, Package, AlertTriangle, ArrowRight, Plus } from 'lucide-react'

export default function LabSorotecaDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Soroteca</h1>
          <p className="text-muted-foreground">Controle de armazenamento e rastreamento de amostras</p>
        </div>
        <Button>+ Registrar Descarte Manual</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Amostras Armazenadas</CardTitle>
            <Beaker className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.248</div>
            <p className="text-xs text-muted-foreground">Total ativo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vencendo em 7 dias</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <p className="text-xs text-muted-foreground">Requer descarte urgente</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vencendo em 30 dias</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">312</div>
            <p className="text-xs text-muted-foreground">Planejar descarte</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Descartadas este mês</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">645</div>
            <p className="text-xs text-muted-foreground">Volume de resíduos</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg bg-red-50 p-4 flex items-center justify-between border border-red-100">
        <div className="flex items-center gap-3 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">🔴 89 amostras com validade vencida ou vencendo em menos de 7 dias.</span>
        </div>
        <Button variant="destructive" size="sm">Iniciar descarte em lote <ArrowRight className="ml-2 h-4 w-4" /></Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>GELADEIRA 01 — Bioquímica (73%)</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center border-2 border-dashed border-muted">
            Mapa visual do grid (em desenvolvimento)
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>FREEZER 01 — Coagulação (45%)</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center border-2 border-dashed border-muted">
            Mapa visual do grid (em desenvolvimento)
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
