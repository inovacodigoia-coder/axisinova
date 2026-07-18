import { useState } from 'react'
import { 
  Warehouse, 
  Search, 
  Plus, 
  Filter, 
  MoreHorizontal, 
  History,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Pill,
  ShieldAlert
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
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const MOCK_PHARMACY_STOCK = [
  { 
    id: 1, 
    medicamento: 'Amoxicilina 500mg', 
    lote: 'L2025-005', 
    fabricacao: '01/2025', 
    validade: '12/2027', 
    qtd: '45 caps',
    localizacao: 'Prateleira A3',
    status: 'crítico'
  },
  { 
    id: 2, 
    medicamento: 'Diazepam 5mg', 
    lote: 'L2025-002', 
    fabricacao: '06/2024', 
    validade: '06/2026', 
    qtd: '120 comp',
    localizacao: 'Cofre Controlados',
    status: 'normal'
  },
]

export default function LabPharmacyStockPage() {
  const [searchTerm, setSearchTerm] = useState('')

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'crítico':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Crítico</Badge>
      case 'normal':
        return <Badge className="bg-green-500 text-white hover:bg-green-600 gap-1"><CheckCircle2 className="h-3 w-3" /> Normal</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Estoque da Farmácia</h1>
          <p className="text-muted-foreground">Controle físico e validade de medicamentos hospitalares</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" className="gap-2">
             <History className="h-4 w-4" />
             Histórico de Lotes
           </Button>
           <Button className="gap-2">
             <Plus className="h-4 w-4" />
             Entrada de Medicamentos
           </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="search">Busca</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Medicamento, lote ou princípio..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Localização</Label>
              <Select defaultValue="todos">
                <SelectTrigger>
                  <SelectValue placeholder="Localização" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="prateleira-a3">Prateleira A3</SelectItem>
                  <SelectItem value="cofre">Cofre Controlados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status Validade</Label>
              <Select defaultValue="todos">
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="vencendo">Vencendo em 30 dias</SelectItem>
                  <SelectItem value="vencido">Vencidos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pb-2">
               <Button variant="outline" className="w-full gap-2">
                 <Filter className="h-4 w-4" />
                 Filtros Avançados
               </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Medicamento</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead>Fabricação / Validade</TableHead>
              <TableHead>Qtd Atual</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_PHARMACY_STOCK.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.medicamento}</TableCell>
                <TableCell className="font-mono text-xs font-bold">{item.lote}</TableCell>
                <TableCell>
                  <div className="text-xs">
                    <div>Fab: {item.fabricacao}</div>
                    <div className={cn(
                      "font-medium",
                      item.validade.includes('2025') ? "text-warning" : "text-muted-foreground"
                    )}>Val: {item.validade}</div>
                  </div>
                </TableCell>
                <TableCell className="font-bold">{item.qtd}</TableCell>
                <TableCell>
                   <div className="flex items-center gap-1.5 text-xs">
                      <Warehouse className="h-3 w-3 text-muted-foreground" />
                      {item.localizacao}
                   </div>
                </TableCell>
                <TableCell>{getStatusBadge(item.status)}</TableCell>
                <TableCell className="text-right">
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Ver Movimentação</DropdownMenuItem>
                      <DropdownMenuItem>Imprimir Etiqueta</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Ajuste de Estoque</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
