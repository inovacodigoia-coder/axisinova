import { 
  Users, Search, Calendar, FileText, Download, Printer, 
  Activity, AlertCircle, Clock, CheckCircle2, ChevronRight,
  Filter, TrendingUp, User
} from 'lucide-react';
import PortalLayout from '@/layouts/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

export default function DoctorPortalPage() {
  return (
    <PortalLayout portalName="Portal do Médico" userName="Dr. Carlos Lima">
      <div className="flex flex-col gap-8">
        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" /> Resultados Disponíveis
              </CardDescription>
              <CardTitle className="text-3xl font-bold">42</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" /> Em Processamento
              </CardDescription>
              <CardTitle className="text-3xl font-bold">15</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-red-200 bg-red-50/30">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-red-600 font-bold">
                <AlertCircle className="h-4 w-4" /> Valores Críticos
              </CardDescription>
              <CardTitle className="text-3xl font-bold text-red-600">03</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Patient List */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Meus Pacientes — Resultados Recentes
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar paciente..." className="pl-9 w-[250px]" />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-md border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Exames</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span>JOÃO DA SILVA</span>
                        <span className="text-[10px] text-muted-foreground">CPF: 000.***.***-00</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>16/07/2026</TableCell>
                  <TableCell>4 exames</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">Disponível</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><FileText className="mr-2 h-4 w-4" /> Ver Laudo</DropdownMenuItem>
                        <DropdownMenuItem><TrendingUp className="mr-2 h-4 w-4" /> Evolutivo</DropdownMenuItem>
                        <DropdownMenuItem><Printer className="mr-2 h-4 w-4" /> Imprimir</DropdownMenuItem>
                        <DropdownMenuItem><Download className="mr-2 h-4 w-4" /> Download PDF</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                <TableRow className="bg-red-50/50">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                        <AlertCircle className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span>MARIA COSTA</span>
                        <span className="text-[10px] text-red-600 font-bold">VALOR CRÍTICO</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>16/07/2026</TableCell>
                  <TableCell>2 exames</TableCell>
                  <TableCell>
                    <Badge className="bg-red-500 hover:bg-red-600 text-white border-none">Disponível</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">Visualizar</Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span>CARLOS LIMA</span>
                        <span className="text-[10px] text-muted-foreground">CPF: 111.***.***-11</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>15/07/2026</TableCell>
                  <TableCell>3 exames</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200">Em processamento</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" disabled><Clock className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}