import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  FileText, 
  Send, 
  Trash2,
  Calendar,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download
} from 'lucide-react';

const MOCK_LOTES = [
  { id: 'LOTE-2025-001', convenio: 'Unimed', competencia: 'Jan/2025', guides: 47, value: 28450, status: 'Pago' },
  { id: 'LOTE-2025-002', convenio: 'Hapvida', competencia: 'Jan/2025', guides: 23, value: 12800, status: 'Enviado' },
  { id: 'LOTE-2025-003', convenio: 'Unimed', competencia: 'Fev/2025', guides: 35, value: 19200, status: 'Aberto' },
];

export default function LabBillingTissPage() {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Faturamento de Convênios (TISS)</h1>
          <p className="text-sm text-muted-foreground">Geração de lotes, arquivos XML TISS e controle de faturas.</p>
        </div>
        <Button className="gradient-bg gap-2">
          <Plus className="h-4 w-4" /> Gerar Nova Fatura
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input 
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20" 
            placeholder="Buscar por lote ou convênio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="h-4 w-4" /> Competência
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" /> Status
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
              <tr>
                <th className="px-4 py-3">Nº Lote</th>
                <th className="px-4 py-3">Convênio</th>
                <th className="px-4 py-3">Competência</th>
                <th className="px-4 py-3 text-center">Guias</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {MOCK_LOTES.map((lote) => (
                <tr key={lote.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-4 py-4 font-mono font-bold text-xs">{lote.id}</td>
                  <td className="px-4 py-4">{lote.convenio}</td>
                  <td className="px-4 py-4 text-muted-foreground">{lote.competencia}</td>
                  <td className="px-4 py-4 text-center">{lote.guides}</td>
                  <td className="px-4 py-4 font-bold">R$ {lote.value.toLocaleString()}</td>
                  <td className="px-4 py-4">
                    <Badge variant="outline" className={
                      lote.status === 'Pago' ? 'border-emerald-500 text-emerald-600 bg-emerald-50' :
                      lote.status === 'Enviado' ? 'border-blue-500 text-blue-600 bg-blue-50' :
                      'border-amber-500 text-amber-600 bg-amber-50'
                    }>
                      {lote.status === 'Pago' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {lote.status === 'Enviado' && <Send className="h-3 w-3 mr-1" />}
                      {lote.status === 'Aberto' && <Clock className="h-3 w-3 mr-1" />}
                      {lote.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Ver Detalhes" className="h-8 w-8 text-primary">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {lote.status === 'Aberto' && (
                        <>
                          <Button variant="ghost" size="icon" title="Adicionar Guias" className="h-8 w-8 text-emerald-600">
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Fechar e Enviar" className="h-8 w-8 text-blue-600">
                            <Send className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {lote.status === 'Pago' && (
                        <Button variant="ghost" size="icon" title="Ver Relatório" className="h-8 w-8 text-muted-foreground">
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                      {lote.status === 'Aberto' && (
                        <Button variant="ghost" size="icon" title="Excluir Lote" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
        <div className="text-sm">
          <p className="font-bold text-amber-800">Atenção ao fechamento</p>
          <p className="text-amber-700">A competência de Março/2025 possui 12 guias pendentes de autorização que ainda não foram faturadas.</p>
          <Button variant="link" size="sm" className="p-0 h-auto text-amber-800 font-bold underline">Visualizar guias pendentes</Button>
        </div>
      </div>
    </div>
  );
}
