import { useState } from 'react'
import { 
  Package, 
  Search, 
  Plus, 
  Filter, 
  MoreHorizontal, 
  History,
  AlertCircle,
  CheckCircle2,
  ShoppingCart
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

const MOCK_ITEMS = [
  { 
    id: 1, 
    nome: 'Seringa 5mL', 
    codigo: 'SER-5ML', 
    categoria: 'Descartável', 
    estoqueMin: '100 un', 
    estoqueAtual: '45 un', 
    status: 'crítico' 
  },
  { 
    id: 2, 
    nome: 'Tubo EDTA 4mL', 
    codigo: 'TUB-EDTA', 
    categoria: 'Descartável', 
    estoqueMin: '200 un', 
    estoqueAtual: '230 un', 
    status: 'normal' 
  },
  { 
    id: 3, 
    nome: 'Reagente Glicose', 
    codigo: 'REA-GL', 
    categoria: 'Reagente', 
    estoqueMin: '5 cx', 
    estoqueAtual: '8 cx', 
    status: 'atenção' 
  },
  { 
    id: 4, 
    nome: 'Luva de Procedimento M', 
    codigo: 'LUV-M', 
    categoria: 'EPI', 
    estoqueMin: '50 cx', 
    estoqueAtual: '0 cx', 
    status: 'sem-estoque' 
  },
]

export default function LabStockItemsPage() {
  const [searchTerm, setSearchTerm] = useState('')

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'crítico':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Crítico</Badge>
      case 'atenção':
        return <Badge className="bg-warning text-warning-foreground hover:bg-warning/80 gap-1"><AlertCircle className="h-3 w-3" /> Atenção</Badge>
      case 'normal':
        return <Badge className="bg-green-500 text-white hover:bg-green-600 gap-1"><CheckCircle2 className="h-3 w-3" /> Normal</Badge>
      case 'sem-estoque':
        return <Badge variant="secondary" className="bg-black text-white hover:bg-black/80 gap-1">Sem estoque</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Itens de Estoque</h1>
          <p className="text-muted-foreground">Gerencie reagentes, descartáveis e insumos</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Item
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="search">Busca</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nome, código ou fabricante..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="w-full lg:w-48 space-y-1.5">
              <Label>Categoria</Label>
              <Select defaultValue="todos">
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="reagentes">Reagentes</SelectItem>
                  <SelectItem value="descartaveis">Descartáveis</SelectItem>
                  <SelectItem value="epi">EPI</SelectItem>
                  <SelectItem value="limpeza">Limpeza</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full lg:w-48 space-y-1.5">
              <Label>Tipo de estoque</Label>
              <Select defaultValue="todos">
                <SelectTrigger>
                  <SelectValue placeholder="Estoque" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="geral">Estoque Geral</SelectItem>
                  <SelectItem value="geladeira">Geladeira Bioq.</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-6 pb-2">
              <div className="flex items-center space-x-2">
                <Switch id="critical-only" />
                <Label htmlFor="critical-only" className="text-xs">Apenas críticos</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="show-inactive" />
                <Label htmlFor="show-inactive" className="text-xs">Mostrar inativos</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Estoque Mín.</TableHead>
              <TableHead>Estoque Atual</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_ITEMS.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.nome}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{item.codigo}</TableCell>
                <TableCell>
                  <Badge variant="outline">{item.categoria}</Badge>
                </TableCell>
                <TableCell>{item.estoqueMin}</TableCell>
                <TableCell>{item.estoqueAtual}</TableCell>
                <TableCell>{getStatusBadge(item.status)}</TableCell>
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
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem>Visualizar Detalhes</DropdownMenuItem>
                        <DropdownMenuItem>Editar Item</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-primary gap-2">
                          <ShoppingCart className="h-4 w-4" />
                          Gerar Pedido
                        </DropdownMenuItem>
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
