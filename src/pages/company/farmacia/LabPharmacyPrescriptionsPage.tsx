import { useState } from 'react'
import { 
  ClipboardList, 
  Search, 
  Plus, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Pill,
  User,
  MoreHorizontal,
  ExternalLink
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

const MOCK_PRESCRIPTIONS = [
  { 
    id: 'RX-001', 
    paciente: 'João da Silva', 
    medico: 'Dr. Lima', 
    data: '16/07 10:30', 
    itens: '3 med', 
    status: 'pendente',
    urgencia: 'normal'
  },
  { 
    id: 'RX-002', 
    paciente: 'Maria Costa', 
    medico: 'Dra. Paula', 
    data: '16/07 09:15', 
    itens: '2 med', 
    status: 'dispensado',
    urgencia: 'normal'
  },
  { 
    id: 'RX-003', 
    paciente: 'Carlos Souza', 
    medico: 'Dr. Melo', 
    data: '16/07 11:00', 
    itens: '1 med', 
    status: 'pendente',
    urgencia: 'urgente'
  },
]

export default function LabPharmacyPrescriptionsPage() {
  const [searchTerm, setSearchTerm] = useState('')

  const getStatusBadge = (status: string, urgencia?: string) => {
    if (urgencia === 'urgente' && status === 'pendente') {
      return <Badge variant="destructive" className="animate-pulse gap-1"><AlertTriangle className="h-3 w-3" /> URGENTE</Badge>
    }
    switch (status) {
      case 'pendente':
        return <Badge variant="outline" className="gap-1 text-warning border-warning"><Clock className="h-3 w-3" /> Pendente</Badge>
      case 'dispensado':
        return <Badge className="bg-green-500 text-white gap-1"><CheckCircle2 className="h-3 w-3" /> Dispensado</Badge>
      case 'cancelado':
        return <Badge variant="secondary">Cancelado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Prescrições</h1>
          <p className="text-muted-foreground">Fila de dispensação e histórico de prescrições hospitalares</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Prescrição Manual
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
                  placeholder="Paciente, prontuário ou prescrição..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select defaultValue="todos">
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="dispensado">Dispensado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Médico</Label>
              <Select defaultValue="todos">
                <SelectTrigger>
                  <SelectValue placeholder="Médico" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os médicos</SelectItem>
                  <SelectItem value="lima">Dr. Lima</SelectItem>
                  <SelectItem value="paula">Dra. Paula</SelectItem>
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
              <TableHead># Prescrição</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Médico</TableHead>
              <TableHead>Data / Hora</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_PRESCRIPTIONS.map((pres) => (
              <TableRow key={pres.id}>
                <TableCell className="font-mono text-xs font-bold">{pres.id}</TableCell>
                <TableCell>
                   <div className="flex items-center gap-2">
                     <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                       <User className="h-4 w-4 text-muted-foreground" />
                     </div>
                     <span className="font-medium">{pres.paciente}</span>
                   </div>
                </TableCell>
                <TableCell className="text-sm">{pres.medico}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{pres.data}</TableCell>
                <TableCell className="text-sm font-medium">{pres.itens}</TableCell>
                <TableCell>{getStatusBadge(pres.status, pres.urgencia)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button size="sm" className="h-8 gap-1 bg-primary/90">
                      <Pill className="h-3.5 w-3.5" />
                      Dispensar
                    </Button>
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
