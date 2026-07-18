import { useState } from 'react'
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Building2, 
  Mail, 
  Phone, 
  User,
  CheckCircle2,
  XCircle
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"

const MOCK_SUPPLIERS = [
  { 
    id: 1, 
    razaoSocial: 'Lab Suprimentos Ltda', 
    cnpj: '00.000.000/0001-00', 
    contato: 'João Silva', 
    telefone: '(84) 3333-0000', 
    email: 'joao@labsuprimentos.com.br',
    status: 'ativo' 
  },
  { 
    id: 2, 
    razaoSocial: 'Diagnósticos Tech', 
    cnpj: '11.111.111/0001-11', 
    contato: 'Maria Costa', 
    telefone: '(84) 4444-0000', 
    email: 'vendas@diagtech.com',
    status: 'ativo' 
  },
  { 
    id: 3, 
    razaoSocial: 'Medline Distribuidora', 
    cnpj: '22.222.222/0001-22', 
    contato: 'Carlos Oliveira', 
    telefone: '(11) 5555-1111', 
    email: 'contato@medline.com.br',
    status: 'inativo' 
  },
]

export default function LabStockSuppliersPage() {
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fornecedores</h1>
          <p className="text-muted-foreground">Gestão de parceiros e fornecedores de insumos</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Fornecedor
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="search">Busca</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Razão social, nome fantasia ou CNPJ..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fornecedor</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Contato Principal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_SUPPLIERS.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{supplier.razaoSocial}</span>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {supplier.email}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm font-mono">{supplier.cnpj}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-sm">
                      <User className="h-3 w-3 text-muted-foreground" />
                      {supplier.contato}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                      <Phone className="h-3 w-3" />
                      {supplier.telefone}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {supplier.status === 'ativo' ? (
                    <Badge className="bg-green-500 text-white gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Ativo
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <XCircle className="h-3 w-3" /> Inativo
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Editar Fornecedor</DropdownMenuItem>
                      <DropdownMenuItem>Ver Histórico de Compras</DropdownMenuItem>
                      <DropdownMenuItem className={supplier.status === 'ativo' ? 'text-destructive' : 'text-green-500'}>
                        {supplier.status === 'ativo' ? 'Inativar' : 'Reativar'}
                      </DropdownMenuItem>
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
