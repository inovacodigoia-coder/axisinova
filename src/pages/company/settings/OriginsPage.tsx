import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, Building2, Search, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useCompanyContext } from '@/context/CompanyContext';
import type { Origin, Establishment } from '@/types/company-portal.types';

export default function OriginsPage() {
  const { user } = useAuth();
  const { refreshOrigins } = useCompanyContext();
  const [origins, setOrigins] = useState<any[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrigin, setEditingOrigin] = useState<Origin | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    internal_code: '',
    establishment_id: ''
  });

  const loadData = async () => {
    setIsLoading(true);
    
    const [originsRes, establishmentsRes] = await Promise.all([
      (supabase as any).from('origins').select('*, establishments(name)').order('name'),
      (supabase as any).from('establishments').select('*').order('name')
    ]);

    if (originsRes.error) toast.error('Erro ao carregar origens');
    else setOrigins(originsRes.data || []);

    if (establishmentsRes.error) toast.error('Erro ao carregar unidades');
    else setEstablishments(establishmentsRes.data || []);
    
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (origin?: Origin) => {
    if (origin) {
      setEditingOrigin(origin);
      setFormData({
        name: origin.name,
        internal_code: origin.internal_code || '',
        establishment_id: origin.establishment_id
      });
    } else {
      setEditingOrigin(null);
      setFormData({ 
        name: '', 
        internal_code: '', 
        establishment_id: establishments.find(e => e.is_main_branch)?.id || establishments[0]?.id || ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.establishment_id) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    const payload = {
      ...formData,
      company_id: user?.companyId
    };

    let error;
    if (editingOrigin) {
      const { error: err } = await (supabase as any)
        .from('origins')
        .update(payload)
        .eq('id', editingOrigin.id);
      error = err;
    } else {
      const { error: err } = await (supabase as any)
        .from('origins')
        .insert([payload]);
      error = err;
    }

    if (error) {
      toast.error('Erro ao salvar origem');
    } else {
      toast.success(editingOrigin ? 'Atualizado com sucesso' : 'Criado com sucesso');
      setIsModalOpen(false);
      loadData();
      refreshOrigins();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any)
      .from('origins')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir');
    } else {
      toast.success('Excluído com sucesso');
      loadData();
      refreshOrigins();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Origens de Atendimento</h1>
          <p className="text-muted-foreground">Gerencie as origens vinculadas às suas unidades</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gradient-bg text-white gap-2">
          <Plus className="h-4 w-4" /> Nova Origem
        </Button>
      </div>

      <Card className="overflow-hidden border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cód. Interno</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome da Origem</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Unidade / Estabelecimento</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
                </td>
              </tr>
            ) : origins.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground italic">
                  Nenhuma origem cadastrada.
                </td>
              </tr>
            ) : (
              origins.map((origin) => (
                <tr key={origin.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground font-mono">
                      <Hash className="h-3 w-3" />
                      {origin.internal_code || '---'}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground uppercase">{origin.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      {origin.establishments?.name || 'Não vinculado'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" onClick={() => handleOpenModal(origin)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 hover:text-destructive" 
                        onClick={() => handleDelete(origin.id)}
                        disabled={origin.name.toUpperCase().includes('MATRIZ')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOrigin ? 'Editar Origem' : 'Nova Origem'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="origin_name">Nome da Origem</Label>
              <Input
                id="origin_name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Recepção Central"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="internal_code">Código Interno</Label>
                <Input
                  id="internal_code"
                  value={formData.internal_code}
                  onChange={e => setFormData({ ...formData, internal_code: e.target.value })}
                  placeholder="Ex: 001"
                />
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select 
                  value={formData.establishment_id} 
                  onValueChange={val => setFormData({ ...formData, establishment_id: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {establishments.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="gradient-bg text-white">Salvar Origem</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
