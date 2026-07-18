import { useState } from 'react'
import { 
  BarChart3, 
  Download, 
  Calendar,
  Pill,
  ShieldAlert,
  Clock,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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

export default function LabPharmacyReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios da Farmácia</h1>
          <p className="text-muted-foreground">Indicadores de dispensação, consumo e controle sanitário</p>
        </div>
        <Button className="gap-2" variant="outline">
          <FileSpreadsheet className="h-4 w-4 text-green-600" />
          Exportar Relatórios
        </Button>
      </div>

      <Tabs defaultValue="dispensacoes" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto p-1">
          <TabsTrigger value="dispensacoes" className="py-2">Dispensações</TabsTrigger>
          <TabsTrigger value="consumo" className="py-2">Consumo</TabsTrigger>
          <TabsTrigger value="controlados" className="py-2">Controlados (SNGPC)</TabsTrigger>
          <TabsTrigger value="vencimentos" className="py-2">Vencimentos</TabsTrigger>
        </TabsList>

        <TabsContent value="dispensacoes" className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
             <Card>
               <CardHeader className="pb-2">
                 <CardTitle className="text-sm font-medium">Taxa de Cobertura</CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="text-2xl font-bold text-green-600">94.2%</div>
                 <p className="text-xs text-muted-foreground mt-1">Prescrito vs Dispensado</p>
               </CardContent>
             </Card>
             <Card>
               <CardHeader className="pb-2">
                 <CardTitle className="text-sm font-medium">Ticket Médio Prescrição</CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="text-2xl font-bold">R$ 145,30</div>
                 <p className="text-xs text-muted-foreground mt-1">Custo médio por paciente/dia</p>
               </CardContent>
             </Card>
             <Card>
               <CardHeader className="pb-2">
                 <CardTitle className="text-sm font-medium">Dispensações Manuais</CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="text-2xl font-bold text-warning">12%</div>
                 <p className="text-xs text-muted-foreground mt-1">Fora do fluxo de prontuário</p>
               </CardContent>
             </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Dispensações por Setor</CardTitle>
              <CardDescription>Resumo de consumo hospitalar por ala</CardDescription>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Setor / Ala</TableHead>
                  <TableHead>Prescrições</TableHead>
                  <TableHead>Itens Dispensados</TableHead>
                  <TableHead>Custo Estimado</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">UTI Adulto</TableCell>
                  <TableCell>45</TableCell>
                  <TableCell>342</TableCell>
                  <TableCell>R$ 4.560,00</TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="sm">Ver Detalhes</Button></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Ala B - Internação</TableCell>
                  <TableCell>78</TableCell>
                  <TableCell>210</TableCell>
                  <TableCell>R$ 2.100,00</TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="sm">Ver Detalhes</Button></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="controlados" className="mt-6 space-y-6">
           <Card className="border-yellow-200 bg-yellow-50/50">
             <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="h-5 w-5 text-yellow-600" />
                  <p className="text-sm text-yellow-800 font-medium">Controle SNGPC: Relatório mensal pronto para validação farmacêutica.</p>
                </div>
                <Button size="sm" variant="outline" className="border-yellow-300 text-yellow-800 hover:bg-yellow-100">Gerar XML SNGPC</Button>
             </CardContent>
           </Card>
           
           <Card>
             <CardHeader>
               <CardTitle>Balanço Diário de Psicotrópicos</CardTitle>
               <CardDescription>Reconciliação obrigatória de estoque</CardDescription>
             </CardHeader>
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Medicamento</TableHead>
                   <TableHead>Lote</TableHead>
                   <TableHead>Entrada</TableHead>
                   <TableHead>Saída</TableHead>
                   <TableHead>Saldo Atual</TableHead>
                   <TableHead>Status</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 <TableRow>
                   <TableCell className="font-medium">Diazepam 5mg</TableCell>
                   <TableCell className="text-xs font-mono">L2025-002</TableCell>
                   <TableCell>0</TableCell>
                   <TableCell>7</TableCell>
                   <TableCell>120</TableCell>
                   <TableCell><Badge className="bg-green-500 text-white">Conciliado</Badge></TableCell>
                 </TableRow>
               </TableBody>
             </Table>
           </Card>
        </TabsContent>

        <TabsContent value="consumo" className="mt-6">
           <Card><CardContent className="p-8 text-center text-muted-foreground">Ranking de medicamentos mais consumidos e curva ABC.</CardContent></Card>
        </TabsContent>
        <TabsContent value="vencimentos" className="mt-6">
           <Card><CardContent className="p-8 text-center text-muted-foreground">Listagem de medicamentos com validade próxima.</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
