import { 
  ClipboardList, FlaskConical, CheckCircle2, RefreshCcw, Search, 
  ArrowRight, FileText, Printer, Download, Package, Info, 
  TrendingUp, Activity, AlertTriangle, UserCheck
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function PartnerPortalPage() {
  return (
    <PortalLayout portalName="Portal de Parceiros" userName="Lab Diagnósticos Ltda">
      <div className="flex flex-col gap-8">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Atendimentos Abertos</p>
                  <h3 className="text-2xl font-bold mt-1">12</h3>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <ClipboardList className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Em Processamento</p>
                  <h3 className="text-2xl font-bold mt-1">34</h3>
                </div>
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                  <FlaskConical className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500 animate-pulse">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Resultados Prontos</p>
                  <h3 className="text-2xl font-bold mt-1">08</h3>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recoletas Pendentes</p>
                  <h3 className="text-2xl font-bold mt-1">02</h3>
                </div>
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <RefreshCcw className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Button className="gradient-bg border-none gap-2">
            <PlusIcon className="h-4 w-4" /> Novo Atendimento
          </Button>
          <Button variant="outline" className="gap-2">
            <Package className="h-4 w-4" /> Enviar Lote de Amostras
          </Button>
          <Button variant="outline" className="gap-2">
            <Search className="h-4 w-4" /> Consultar Catálogo
          </Button>
        </div>

        <Tabs defaultValue="recent" className="w-full">
          <TabsList className="bg-muted w-full sm:w-auto h-auto p-1">
            <TabsTrigger value="recent" className="gap-2 px-4 py-2">
              <Activity className="h-4 w-4" /> Atendimentos Recentes
            </TabsTrigger>
            <TabsTrigger value="catalog" className="gap-2 px-4 py-2">
              <ClipboardList className="h-4 w-4" /> Catálogo de Exames
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recent" className="mt-6 space-y-4">
            <div className="flex items-center gap-2 max-w-sm">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Protocolo ou nome do paciente..." />
            </div>

            <div className="rounded-md border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead>Protocolo</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Exames</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                    </TableCell>
                    <TableCell className="font-mono text-xs">20260716-360-80</TableCell>
                    <TableCell className="font-medium">JOÃO DA SILVA</TableCell>
                    <TableCell>4</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-green-600 bg-green-50">Resultado disponível</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" title="Imprimir Laudo"><Printer className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" title="Baixar PDF"><Download className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div className="h-3 w-3 rounded-full bg-blue-500" />
                    </TableCell>
                    <TableCell className="font-mono text-xs">20260715-756-75</TableCell>
                    <TableCell className="font-medium">FRANCISCO RUBIAN</TableCell>
                    <TableCell>3</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-blue-600 bg-blue-50">Em processamento</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" disabled><Info className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div className="h-3 w-3 rounded-full bg-orange-500" />
                    </TableCell>
                    <TableCell className="font-mono text-xs">20260714-123-01</TableCell>
                    <TableCell className="font-medium">MARIA CLARA</TableCell>
                    <TableCell>2</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-orange-600 bg-orange-50">Aguardando recoleta</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost"><AlertTriangle className="h-4 w-4 text-orange-500" /></Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="catalog" className="mt-6">
            <div className="rounded-md border bg-card p-8 text-center text-muted-foreground">
              Catálogo de exames acordados com a empresa parceira.
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PortalLayout>
  );
}

function PlusIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}