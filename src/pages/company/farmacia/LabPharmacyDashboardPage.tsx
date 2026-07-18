import { useState } from 'react'
import { 
  Pill, 
  ClipboardList, 
  AlertTriangle, 
  Clock, 
  Search,
  CheckCircle2,
  ArrowRight,
  User,
  History
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

const PENDING_PRESCRIPTIONS = [
  { id: 'RX-001', paciente: 'João da Silva', leito: '05', medico: 'Dr. Lima', itens: 3, urgencia: 'normal' },
  { id: 'RX-003', paciente: 'Carlos Souza', leito: '12', medico: 'Dr. Melo', itens: 1, urgencia: 'urgente' },
  { id: 'RX-004', paciente: 'Ana Oliveira', leito: '08', medico: 'Dra. Paula', itens: 4, urgencia: 'normal' },
]

export default function LabPharmacyDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Farmácia Hospitalar</h1>
          <p className="text-muted-foreground">quinta-feira, 16 de julho de 2026</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <History className="h-4 w-4" />
            Histórico
          </Button>
          <Button className="gap-2">
            <Pill className="h-4 w-4" />
            Nova Prescrição Manual
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dispensações Hoje</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">124</div>
            <p className="text-xs text-muted-foreground">+12% em relação a ontem</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prescrições Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">18</div>
            <p className="text-xs text-muted-foreground">Aguardando separação</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medicamentos em Falta</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">3</div>
            <p className="text-xs text-muted-foreground">Reposição urgente necessária</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Psicotrópicos Disp.</CardTitle>
            <ClipboardList className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">Hoje com registro SNGPC</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-destructive/10 p-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="font-bold text-destructive">⚠️ 3 medicamentos abaixo do estoque mínimo</p>
              <p className="text-sm text-destructive/80">
                Amoxicilina 500mg · Metformina 850mg · Omeprazol 20mg
              </p>
            </div>
          </div>
          <Button variant="link" className="text-destructive font-bold h-auto p-0 underline decoration-2">
            Ver estoque crítico →
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-7">
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Prescrições Pendentes</CardTitle>
            <CardDescription>Fila de dispensação hospitalar</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Médico</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PENDING_PRESCRIPTIONS.map((pres) => (
                  <TableRow key={pres.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{pres.paciente}</span>
                        <span className="text-xs text-muted-foreground">Leito {pres.leito} • {pres.itens} itens</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{pres.medico}</TableCell>
                    <TableCell>
                      {pres.urgencia === 'urgente' ? (
                        <Badge variant="destructive" className="animate-pulse">URGENTE</Badge>
                      ) : (
                        <Badge variant="outline">Pendente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" className="gap-2">
                        <Pill className="h-3 w-3" />
                        Dispensar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button variant="ghost" className="w-full mt-4 text-xs" size="sm">
              Ver todas as prescrições
              <ArrowRight className="ml-2 h-3 w-3" />
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Acesso Rápido</CardTitle>
            <CardDescription>Operações comuns da farmácia</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2">
            <Button variant="outline" className="justify-start gap-3 h-12">
              <Search className="h-4 w-4" />
              Consultar Medicamento
            </Button>
            <Button variant="outline" className="justify-start gap-3 h-12">
              <ClipboardList className="h-4 w-4" />
              Relatório SNGPC
            </Button>
            <Button variant="outline" className="justify-start gap-3 h-12">
              <User className="h-4 w-4" />
              Dispensação Manual
            </Button>
            <Button variant="outline" className="justify-start gap-3 h-12">
              <History className="h-4 w-4" />
              Conciliação de Estoque
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
