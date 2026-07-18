import { useState } from 'react'
import { 
  FileBarChart, 
  Calendar, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

export default function LabStockReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios de Estoque</h1>
          <p className="text-muted-foreground">Análise de consumo, previsão de compras e custos</p>
        </div>
        <Button className="gap-2" variant="outline">
          <FileSpreadsheet className="h-4 w-4 text-green-600" />
          Exportar Excel
        </Button>
      </div>

      <Tabs defaultValue="previsao" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto p-1">
          <TabsTrigger value="previsao" className="py-2">Previsão de Compras</TabsTrigger>
          <TabsTrigger value="planejado" className="py-2">Planejado vs Real</TabsTrigger>
          <TabsTrigger value="precos" className="py-2">Histórico de Preços</TabsTrigger>
          <TabsTrigger value="perdas" className="py-2">Relatório de Perdas</TabsTrigger>
        </TabsList>

        <TabsContent value="previsao" className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Sugestão de Compra</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ 12.450,00</div>
                <p className="text-xs text-muted-foreground mt-1">Valor estimado para reposição mensal</p>
              </CardContent>
            </Card>
            <Card className="bg-destructive/5 border-destructive/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Itens em Falta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">8</div>
                <p className="text-xs text-muted-foreground mt-1">Reposição imediata necessária</p>
              </CardContent>
            </Card>
            <Card className="bg-green-500/5 border-green-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Autonomia Média</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">22 dias</div>
                <p className="text-xs text-muted-foreground mt-1">Baseado no consumo médio diário</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Previsão para os Próximos 30 Dias</CardTitle>
              <CardDescription>Baseado no histórico de consumo e agenda de exames</CardDescription>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Consumo/Dia</TableHead>
                  <TableHead>Estoque Atual</TableHead>
                  <TableHead>Dias Restantes</TableHead>
                  <TableHead>Sugestão de Compra</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Seringa 5mL</TableCell>
                  <TableCell>15 un/dia</TableCell>
                  <TableCell>45 unidades</TableCell>
                  <TableCell className="text-destructive font-bold">3 dias</TableCell>
                  <TableCell>
                    <Badge variant="destructive">⚠️ URGENTE: 450 un</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8">Comprar</Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Tubo EDTA 4mL</TableCell>
                  <TableCell>8 un/dia</TableCell>
                  <TableCell>230 unidades</TableCell>
                  <TableCell>28 dias</TableCell>
                  <TableCell>Comprar: 240 un</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8">Comprar</Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Reagente Glicose</TableCell>
                  <TableCell>0,5 cx/dia</TableCell>
                  <TableCell>12 caixas</TableCell>
                  <TableCell>24 dias</TableCell>
                  <TableCell>Comprar: 15 cx</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8">Comprar</Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="planejado" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Consumo Planejado vs Real</CardTitle>
              <CardDescription>Período: Junho/2026</CardDescription>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Planejado</TableHead>
                  <TableHead>Real</TableHead>
                  <TableHead>Diferença</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Tubo EDTA 4mL</TableCell>
                  <TableCell>200 tubos</TableCell>
                  <TableCell>240 tubos</TableCell>
                  <TableCell className="text-destructive font-bold">+40 (+20%)</TableCell>
                  <TableCell><Badge variant="outline" className="border-warning text-warning">⚠️ Atenção</Badge></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Reagente Glicose</TableCell>
                  <TableCell>8 caixas</TableCell>
                  <TableCell>11 caixas</TableCell>
                  <TableCell className="text-destructive font-bold">+3 (+38%)</TableCell>
                  <TableCell><Badge variant="destructive">🔴 Investigar</Badge></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="precos" className="mt-6">
          <Card><CardContent className="p-8 text-center text-muted-foreground">Histórico de evolução de preços por item e fornecedor.</CardContent></Card>
        </TabsContent>
        <TabsContent value="perdas" className="mt-6">
          <Card><CardContent className="p-8 text-center text-muted-foreground">Relatório de perdas por validade ou avaria.</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
