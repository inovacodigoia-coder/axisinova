import { useMemo, useState } from 'react';
import {
  Users, Building2, Stethoscope, User, History,
  Plus, Search, MoreHorizontal, Eye, Trash2, KeyRound,
  CheckCircle2, PauseCircle, Copy, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
import {
  useExternalAccesses, buildPortalUrl,
  type ExternalAccessRecord, type ExternalAccessType,
} from '@/hooks/useExternalAccesses';
import { NewAccessModal } from '@/components/lab/portals/NewAccessModal';
import { AccessCredentialsModal } from '@/components/lab/portals/AccessCredentialsModal';

export default function ExternalPortalsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<ExternalAccessType | 'logs'>('parceiro');
  const [newOpen, setNewOpen] = useState(false);
  const [credentialsFor, setCredentialsFor] = useState<ExternalAccessRecord | null>(null);
  const [credentialsIsNew, setCredentialsIsNew] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const {
    accesses, loading, companyId,
    createAccess, regenerateCredentials, deleteAccess, toggleStatus,
  } = useExternalAccesses();

  const filteredList = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return accesses;
    return accesses.filter((item) =>
      item.name.toLowerCase().includes(term) ||
      (item.email || '').toLowerCase().includes(term) ||
      item.access_code.includes(term)
    );
  }, [accesses, searchTerm]);

  const handleDelete = async (id: string) => {
    try {
      await deleteAccess(id);
      toast.success('Acesso removido com sucesso');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao remover acesso');
    }
  };

  const handleStatusToggle = async (item: ExternalAccessRecord) => {
    try {
      const next = await toggleStatus(item.id, item.status);
      toast.info(`Acesso ${next === 'active' ? 'ativado' : 'desativado'}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao alterar status');
    }
  };

  const openCredentials = (item: ExternalAccessRecord, isNew = false) => {
    setCredentialsFor(item);
    setCredentialsIsNew(isNew);
  };

  const handleRegenerate = async (id: string) => {
    const record = await regenerateCredentials(id);
    setCredentialsFor(record);
    return record;
  };

  const copyLink = async (item: ExternalAccessRecord) => {
    if (item.status === 'inactive') {
      toast.warning('Acesso inativo — reative para gerar link');
      return;
    }
    await navigator.clipboard.writeText(buildPortalUrl(item.access_code));
    toast.success('Link copiado');
  };

  const renderAccessCell = (item: ExternalAccessRecord) => {
    if (item.status === 'inactive') {
      return <span className="text-xs text-muted-foreground">Inativo</span>;
    }
    const isRevealed = revealed[item.id];
    return (
      <div className="flex items-center gap-1">
        <span className="font-mono text-sm">
          {isRevealed ? item.access_code : `••• ${item.access_code.slice(-3)}`}
        </span>
        <Button
          variant="ghost" size="icon" className="h-7 w-7"
          aria-label="Revelar código"
          onClick={() => setRevealed((p) => ({ ...p, [item.id]: !p[item.id] }))}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Copiar link" onClick={() => copyLink(item)}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  };

  const renderTable = (type: ExternalAccessType | 'logs') => {
    if (type === 'logs') {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-card">
          <History className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
          <h3 className="text-lg font-medium">Logs de Acesso</h3>
          <p className="text-muted-foreground max-w-sm mx-auto mt-2">
            O histórico de logins e visualizações do portal será exibido aqui a partir do primeiro acesso externo.
          </p>
        </div>
      );
    }

    const items = filteredList.filter(item => item.type === type);

    return (
      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{type === 'medico' ? 'Médico' : 'Nome'}</TableHead>
              {type === 'parceiro' && <TableHead>Tipo</TableHead>}
              {type === 'medico' && <TableHead>CRM / Esp.</TableHead>}
              <TableHead>E-mail</TableHead>
              <TableHead>Acesso</TableHead>
              <TableHead>Último Acesso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</span>
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
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
                        {item.partner_type?.replace('_', ' ') || '—'}
                      </Badge>
                    </TableCell>
                  )}
                  {type === 'medico' && (
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{item.crm || '—'}</span>
                        <span className="text-[10px] text-muted-foreground">{item.specialty}</span>
                      </div>
                    </TableCell>
                  )}
                  <TableCell>{item.email || '—'}</TableCell>
                  <TableCell>{renderAccessCell(item)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {item.last_access_at ? new Date(item.last_access_at).toLocaleString('pt-BR') : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.status === 'active' ? 'default' : 'secondary'} className={cn("gap-1", item.status === 'active' && "bg-green-500 hover:bg-green-600 text-white")}>
                      {item.status === 'active' ? (
                        <><CheckCircle2 className="h-3 w-3" /> Ativo</>
                      ) : (
                        <><PauseCircle className="h-3 w-3" /> Inativo</>
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
                        <DropdownMenuItem onClick={() => openCredentials(item)}>
                          <KeyRound className="mr-2 h-4 w-4" /> Ver Acesso
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusToggle(item)}>
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
          <p className="text-muted-foreground">Gerencie os acessos de parceiros, locais, médicos e pacientes.</p>
        </div>
        <Button className="gradient-bg border-none gap-2" onClick={() => setNewOpen(true)}>
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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ExternalAccessType | 'logs')} className="w-full">
        <TabsList className="bg-muted w-full sm:w-auto overflow-x-auto justify-start h-auto p-1">
          <TabsTrigger value="parceiro" className="gap-2 px-4 py-2">
            <Building2 className="h-4 w-4" /> Parceiros
          </TabsTrigger>
          <TabsTrigger value="local" className="gap-2 px-4 py-2">
            <Users className="h-4 w-4" /> Locais
          </TabsTrigger>
          <TabsTrigger value="medico" className="gap-2 px-4 py-2">
            <Stethoscope className="h-4 w-4" /> Médicos
          </TabsTrigger>
          <TabsTrigger value="paciente" className="gap-2 px-4 py-2">
            <User className="h-4 w-4" /> Pacientes
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2 px-4 py-2">
            <History className="h-4 w-4" /> Logs
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="parceiro">{renderTable('parceiro')}</TabsContent>
          <TabsContent value="local">{renderTable('local')}</TabsContent>
          <TabsContent value="medico">{renderTable('medico')}</TabsContent>
          <TabsContent value="paciente">{renderTable('paciente')}</TabsContent>
          <TabsContent value="logs">{renderTable('logs')}</TabsContent>
        </div>
      </Tabs>

      <NewAccessModal
        open={newOpen}
        onOpenChange={setNewOpen}
        defaultType={activeTab === 'logs' ? 'parceiro' : activeTab}
        companyId={companyId}
        onCreate={createAccess}
        onCreated={(record) => openCredentials(record, true)}
      />

      <AccessCredentialsModal
        open={!!credentialsFor}
        onOpenChange={(o) => { if (!o) setCredentialsFor(null); }}
        access={credentialsFor}
        isNew={credentialsIsNew}
        onRegenerate={handleRegenerate}
      />
    </div>
  );
}
