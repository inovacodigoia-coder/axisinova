import { useState } from 'react';
import { 
  Users, Building2, Stethoscope, User, History, 
  Plus, Search, MoreHorizontal, Eye, Edit, Trash2,
  CheckCircle2, PauseCircle, Mail, ExternalLink, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { ExternalAccess, PortalType } from '@/types/lab.types';

const MOCK_ACCESS: ExternalAccess[] = [
  {
    id: '1',
    name: 'Lab Diagnósticos Ltda',
    type: 'parceiro',
    email: 'contato@labdiag.com',
    lastAccess: '2026-07-15T10:30:00Z',
    status: 'active',
    companyId: 'comp_001',
    partnerType: 'laboratorio',
    cnpj: '00.000.000/0001-91',
    responsibleName: 'Dr. Silva',
    permissions: ['create_attendance', 'view_results', 'print_reports']
  },
  {
    id: '2',
    name: 'Clínica São Lucas',
    type: 'parceiro',
    email: 'adm@saolucas.com',
    lastAccess: '2026-07-10T14:20:00Z',
    status: 'active',
    companyId: 'comp_001',
    partnerType: 'posto_coleta',
    cnpj: '11.111.111/0001-22',
    responsibleName: 'Dra. Costa',
    permissions: ['view_results', 'print_reports']
  },
  {
    id: '3',
    name: 'Hospital Regional',
    type: 'parceiro',
    email: 'diretoria@hregional.com',
    status: 'inactive',
    companyId: 'comp_001',
    partnerType: 'hospital',
    cnpj: '22.222.222/0001-33',
    responsibleName: 'Adm. Lima',
    permissions: ['view_results']
  },
  {
    id: '4',
    name: 'Ipanguaçu',
    type: 'local',
    email: 'ipanguacu@lab.com',
    status: 'active',
    companyId: 'comp_001',
    responsibleName: 'Dr. Almir',
    permissions: ['view_results', 'print_reports']
  },
  {
    id: '5',
    name: 'Dr. Carlos Lima',
    type: 'medico',
    email: 'dr.lima@email.com',
    lastAccess: '2026-07-14T09:00:00Z',
    status: 'active',
    companyId: 'comp_001',
    crm: '12345/RN',
    specialty: 'Cardiologia',
    permissions: ['view_results', 'critical_alerts', 'print_reports']
  }
];

export default function ExternalPortalsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [accessList, setAccessList] = useState<ExternalAccess[]>(MOCK_ACCESS);

  const filteredList = accessList.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string) => {
    toast.success('Acesso removido com sucesso');
    setAccessList(prev => prev.filter(item => item.id !== id));
  };

  const handleStatusToggle = (id: string) => {
    setAccessList(prev => prev.map(item => {
      if (item.id === id) {
        const newStatus = item.status === 'active' ? 'inactive' : 'active';
        toast.info(`Acesso ${newStatus === 'active' ? 'ativado' : 'desativado'}`);
        return { ...item, status: newStatus as 'active' | 'inactive' };
      }
      return item;
    }));
  };

  const renderTable = (type: PortalType | 'logs') => {
    if (type === 'logs') {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-card">
          <History className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
          <h3 className="text-lg font-medium">Logs de Acesso</h3>
          <p className="text-muted-foreground max-w-sm mx-auto mt-2">
            O histórico detalhado de acessos externos está sendo processado.
          </p>
        </div>
      );
    }

    const items = filteredList.filter(item => item.type === type);

    return (
      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{type === 'medico' ? 'Médico' : 'Nome'}</TableHead>
              {type === 'parceiro' && <TableHead>Tipo</TableHead>}
              {type === 'medico' && <TableHead>CRM / Esp.</TableHead>}
              <TableHead>E-mail</TableHead>
              <TableHead>Último Acesso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{item.name}</span>
                      {item.cnpj && <span className="text-[10px] text-muted-foreground">{item.cnpj}</span>}
                    </div>
                  </TableCell>
                  {type === 'parceiro' && (
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {item.partnerType?.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                  )}
                  {type === 'medico' && (
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{item.crm}</span>
                        <span className="text-[10px] text-muted-foreground">{item.specialty}</span>
                      </div>
                    </TableCell>
                  )}
                  <TableCell>{item.email}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {item.lastAccess ? new Date(item.lastAccess).toLocaleString('pt-BR') : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.status === 'active' ? 'success' : 'secondary'} className="gap-1">
                      {item.status === 'active' ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          Ativo
                        </>
                      ) : (
                        <>
                          <PauseCircle className="h-3 w-3" />
                          Inativo
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" /> Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusToggle(item.id)}>
                          {item.status === 'active' ? (
                            <><PauseCircle className="mr-2 h-4 w-4" /> Desativar</>
                          ) : (
                            <><CheckCircle2 className="mr-2 h-4 w-4" /> Ativar</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portais Externos</h1>
          <p className="text-muted-foreground">Gerencie os acessos de parceiros, locais e médicos.</p>
        </div>
        <Button className="gradient-bg border-none gap-2">
          <Plus className="h-4 w-4" /> Novo Acesso
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar acesso..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Tabs defaultValue="parceiros" className="w-full">
        <TabsList className="bg-muted w-full sm:w-auto overflow-x-auto justify-start h-auto p-1">
          <TabsTrigger value="parceiros" className="gap-2 px-4 py-2">
            <Building2 className="h-4 w-4" /> Parceiros
          </TabsTrigger>
          <TabsTrigger value="locais" className="gap-2 px-4 py-2">
            <Users className="h-4 w-4" /> Locais
          </TabsTrigger>
          <TabsTrigger value="medicos" className="gap-2 px-4 py-2">
            <Stethoscope className="h-4 w-4" /> Médicos
          </TabsTrigger>
          <TabsTrigger value="pacientes" className="gap-2 px-4 py-2">
            <User className="h-4 w-4" /> Pacientes
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2 px-4 py-2">
            <History className="h-4 w-4" /> Logs
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="parceiros">
            {renderTable('parceiro')}
          </TabsContent>
          <TabsContent value="locais">
            {renderTable('local')}
          </TabsContent>
          <TabsContent value="medicos">
            {renderTable('medico')}
          </TabsContent>
          <TabsContent value="pacientes">
            <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-card">
              <User className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <h3 className="text-lg font-medium">Gestão de Pacientes</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                A configuração de resultados online é feita diretamente no cadastro de cada paciente.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.href='/app/cadastros/pacientes'}>
                Ir para Pacientes
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="logs">
            {renderTable('logs')}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}