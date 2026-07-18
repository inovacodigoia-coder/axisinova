import { useState } from 'react'
import { 
  Package, 
  Search, 
  Filter, 
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  History,
  MoreHorizontal
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const MOCK_LOTS = [
  { 
    id: 1, 
    lote: 'L2025-001', 
    item: 'Reagente Glicose', 
    fornecedor: 'Lab Diagnósticos', 
    entrada: '01/01/2025', 
    validade: '30/08/2026', 
    qtd: '12 cx', 
    status: 'vencendo' 
  },
  { 
    id: 2, 
    lote: 'L2025-009', 
    item: 'Tubo EDTA 4mL', 
    fornecedor: 'Lab Suprimentos', 
    entrada: '16/07/2026', 
    validade: '30/12/2026', 
    qtd: '500 un', 
    status: 'normal' 
  },
  { 
    id: 3, 
    lote: 'L2025-003', 
    item: 'Tiras Urina', 
    fornecedor: 'Diag Tech', 
    entrada: '15/03/2025', 
    validade: '15/08/2026', 
    qtd: '3 cx', 
    status: 'urgente' 
  },
]

export default function LabStockLotsPage() {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'urgente':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Urgente</Badge>
      case 'vencendo':
        return <Badge className="bg-warning text-warning-foreground hover:bg-warning/80 gap-1"><Clock className="h-3 w-3" /> Vencendo</Badge>
      case 'normal':
        return <Badge className="bg-green-500 text-white hover:bg-green-600 gap-1"><CheckCircle2 className="h-3 w-3" /> Normal</Badge>
      case 'vencido':
        return <Badge variant="secondary" className="bg-black text-white hover:bg-black/80">Vencido</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lotes de Estoque</h1>
          <p className="text-muted-foreground">Controle de validade e rastreabilidade dos insumos</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-end">
            <div className="space-y-1.5">
              <Label>Item</Label>
              <Select defaultValue="todos">
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os itens</SelectItem>
                  <SelectItem value="glicose">Reagente Glicose</SelectItem>
                  <SelectItem value="tubo">Tubo EDTA 4mL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fornecedor</Label>
              <Select defaultValue="todos">
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os fornecedores</SelectItem>
                  <SelectItem value="lab-diag">Lab Diagnósticos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Validade</Label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Período de validade" className="pl-8" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 pb-2">
              <div className="flex items-center space-x-2">
                <Switch id="expiring-soon" />
                <Label htmlFor="expiring-soon" className="text-xs">Vencendo em 30 dias</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="show-empty" />
                <Label htmlFor="show-empty" className="text-xs">Mostrar lotes zerados</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lote</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Qtd Atual</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_LOTS.map((lot) => (
              <TableRow key={lot.id}>
                <TableCell className="font-bold">{lot.lote}</TableCell>
                <TableCell>{lot.item}</TableCell>
                <TableCell className="text-sm">{lot.fornecedor}</TableCell>
                <TableCell className="text-sm">{lot.entrada}</TableCell>
                <TableCell className={cn(
                  "text-sm font-medium",
                  lot.status === 'urgente' && "text-destructive",
                  lot.status === 'vencendo' && "text-warning"
                )}>
                  {lot.validade}
                </TableCell>
                <TableCell className="font-medium">{lot.qtd}</TableCell>
                <TableCell>{getStatusBadge(lot.status)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <History className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Ver Detalhes</DropdownMenuItem>
                        <DropdownMenuItem>Imprimir Etiqueta</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Inativar Lote</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
