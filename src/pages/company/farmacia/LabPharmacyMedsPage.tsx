import { useState } from 'react'
import { 
  Pill, 
  Search, 
  Plus, 
  Filter, 
  MoreHorizontal, 
  AlertCircle,
  CheckCircle2,
  FileText,
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

const MOCK_MEDS = [
  { 
    id: 1, 
    nome: 'Amoxicilina 500mg', 
    principio: 'Amoxicilina', 
    forma: 'Cápsula', 
    concentracao: '500mg', 
    controlado: null,
    estoque: '45 un', 
    status: 'crítico' 
  },
  { 
    id: 2, 
    nome: 'Diazepam 5mg', 
    principio: 'Diazepam', 
    forma: 'Comprimido', 
    concentracao: '5mg', 
    controlado: 'B1',
    estoque: '120 un', 
    status: 'normal' 
  },
  { 
    id: 3, 
    nome: 'Dipirona 500mg', 
    principio: 'Dipirona sódica', 
    forma: 'Comprimido', 
    concentracao: '500mg', 
    controlado: null,
    estoque: '800 un', 
    status: 'normal' 
  },
]

export default function LabPharmacyMedsPage() {
  const [searchTerm, setSearchTerm] = useState('')

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'crítico':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Crítico</Badge>
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
          <h1 className="text-2xl font-bold tracking-tight">Medicamentos</h1>
          <p className="text-muted-foreground">Gestão do catálogo de medicamentos hospitalares</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Medicamento
        </Button>
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
                  placeholder="Nome, princípio ativo ou código..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select defaultValue="todos">
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="antibiotico">Antibiótico</SelectItem>
                  <SelectItem value="analgesico">Analgésico</SelectItem>
                  <SelectItem value="psicotropico">Psicotrópico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-6 pb-2 lg:col-span-2">
              <div className="flex items-center space-x-2">
                <Switch id="controlled-only" />
                <Label htmlFor="controlled-only" className="text-xs">Apenas controlados</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="critical-stock" />
                <Label htmlFor="critical-stock" className="text-xs">Estoque crítico</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Princípio Ativo</TableHead>
              <TableHead>Forma / Conc.</TableHead>
              <TableHead>Controlado</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_MEDS.map((med) => (
              <TableRow key={med.id}>
                <TableCell className="font-medium">{med.nome}</TableCell>
                <TableCell className="text-sm">{med.principio}</TableCell>
                <TableCell>
                  <div className="text-xs">
                    <div>{med.forma}</div>
                    <div className="text-muted-foreground">{med.concentracao}</div>
                  </div>
                </TableCell>
                <TableCell>
                  {med.controlado ? (
                    <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800 border-yellow-200">
                      <ShieldAlert className="h-3 w-3" /> {med.controlado}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">{med.estoque}</TableCell>
                <TableCell>{getStatusBadge(med.status)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuItem className="gap-2"><FileText className="h-4 w-4" /> Ver Ficha</DropdownMenuItem>
                      <DropdownMenuItem className="gap-2"><Pill className="h-4 w-4" /> Editar</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">Inativar</DropdownMenuItem>
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
