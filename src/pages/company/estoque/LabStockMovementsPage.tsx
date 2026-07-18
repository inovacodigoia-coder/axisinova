import { useState } from 'react'
import { 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw, 
  History,
  FileText,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

export default function LabStockMovementsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Movimentações de Estoque</h1>
          <p className="text-muted-foreground">Registro de entradas, saídas e ajustes de materiais</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Registrar Entrada
          </Button>
          <Button className="gap-2">
            <ArrowDownRight className="h-4 w-4" />
            Registrar Saída
          </Button>
        </div>
      </div>

      <Tabs defaultValue="entradas" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto p-1 gap-1">
          <TabsTrigger value="entradas" className="gap-2">
            <ArrowUpRight className="h-4 w-4" />
            Entradas
          </TabsTrigger>
          <TabsTrigger value="saidas" className="gap-2">
            <ArrowDownRight className="h-4 w-4" />
            Saídas
          </TabsTrigger>
          <TabsTrigger value="transferencias" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Transf.
          </TabsTrigger>
          <TabsTrigger value="ajustes" className="gap-2">
            <Plus className="h-4 w-4 rotate-45" />
            Ajustes
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entradas" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Entradas Registradas</CardTitle>
                <CardDescription>Materiais recebidos de fornecedores</CardDescription>
              </div>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por NF ou fornecedor" className="pl-8" />
              </div>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>NF</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Recebido por</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>16/07/2026</TableCell>
                  <TableCell className="font-medium">Lab Suprimentos Ltda</TableCell>
                  <TableCell>NF-2025-00891</TableCell>
                  <TableCell>2 itens</TableCell>
                  <TableCell>R$ 1.090,00</TableCell>
                  <TableCell>Alexsandro</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Visualizar</Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>12/07/2026</TableCell>
                  <TableCell className="font-medium">Diagnósticos Tech</TableCell>
                  <TableCell>NF-2025-00750</TableCell>
                  <TableCell>5 itens</TableCell>
                  <TableCell>R$ 2.450,00</TableCell>
                  <TableCell>Alexsandro</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Visualizar</Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="saidas" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Saídas e Pedidos Internos</CardTitle>
              <CardDescription>Materiais distribuídos para os setores</CardDescription>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Setor Destino</TableHead>
                  <TableHead>Tipo de Saída</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>16/07/2026</TableCell>
                  <TableCell className="font-medium">Bioquímica</TableCell>
                  <TableCell>Pedido Interno</TableCell>
                  <TableCell>Alexsandro</TableCell>
                  <TableCell>
                    <Badge className="bg-green-500 text-white gap-1"><CheckCircle2 className="h-3 w-3" /> Entregue</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Detalhes</Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>16/07/2026</TableCell>
                  <TableCell className="font-medium">Hematologia</TableCell>
                  <TableCell>Consumo Direto</TableCell>
                  <TableCell>Técnico A</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1"><AlertCircle className="h-3 w-3" /> Pendente</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Detalhes</Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        
        {/* Placeholder contents for other tabs */}
        <TabsContent value="transferencias" className="mt-4">
          <Card><CardContent className="p-8 text-center text-muted-foreground">Funcionalidade de Transferências em breve.</CardContent></Card>
        </TabsContent>
        <TabsContent value="ajustes" className="mt-4">
          <Card><CardContent className="p-8 text-center text-muted-foreground">Funcionalidade de Ajustes de Inventário em breve.</CardContent></Card>
        </TabsContent>
        <TabsContent value="historico" className="mt-4">
          <Card><CardContent className="p-8 text-center text-muted-foreground">Histórico unificado de todas as movimentações.</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
