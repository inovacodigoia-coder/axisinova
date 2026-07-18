import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  CheckCircle2,
  XCircle,
  PieChart,
  Target
} from 'lucide-react';

const MOCK_CENTERS = [
  { id: 1, name: 'Almoxarifado', code: 'ALM', description: 'Compras de insumos', status: 'Ativo' },
  { id: 2, name: 'Administrativo', code: 'ADM', description: 'Despesas gerais', status: 'Ativo' },
  { id: 3, name: 'Bioquímica', code: 'BIO', description: 'Setor técnico bioquímica', status: 'Ativo' },
  { id: 4, name: 'Hematologia', code: 'HEM', description: 'Setor técnico hematologia', status: 'Ativo' },
  { id: 5, name: 'Manutenção', code: 'MNT', description: 'Manutenção predial', status: 'Ativo' },
  { id: 6, name: 'TI', code: 'TI', description: 'Tecnologia da informação', status: 'Ativo' },
];

export default function LabCostCentersPage() {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Centros de Custo</h1>
          <p className="text-sm text-muted-foreground">Estruture sua gestão financeira por setores e unidades de negócio.</p>
        </div>
        <Button className="gradient-bg gap-2">
          <Plus className="h-4 w-4" /> Novo Centro de Custo
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input 
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20" 
            placeholder="Buscar centro de custo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Descrição</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {MOCK_CENTERS.map((center) => (
                    <tr key={center.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-4 font-bold">{center.name}</td>
                      <td className="px-4 py-4 font-mono text-xs">{center.code}</td>
                      <td className="px-4 py-4 text-muted-foreground">{center.description}</td>
                      <td className="px-4 py-4">
                        <Badge variant={center.status === 'Ativo' ? 'default' : 'secondary'} className={center.status === 'Ativo' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                          {center.status === 'Ativo' ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                          {center.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              <h3 className="font-bold">Distribuição de Despesas</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Bioquímica', value: 45, color: 'bg-blue-500' },
                { label: 'Administrativo', value: 25, color: 'bg-purple-500' },
                { label: 'TI', value: 15, color: 'bg-emerald-500' },
                { label: 'Outros', value: 15, color: 'bg-amber-500' },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-bold">{item.value}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 bg-primary/5 border-primary/20 space-y-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <h3 className="font-bold">Orçamento por Setor</h3>
            </div>
            <p className="text-xs text-muted-foreground italic">Em breve: Defina metas de gastos mensais para cada centro de custo e receba alertas de excesso.</p>
            <Button variant="outline" className="w-full text-xs h-8 border-primary/20 hover:bg-primary/10 text-primary">Configurar Metas</Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
