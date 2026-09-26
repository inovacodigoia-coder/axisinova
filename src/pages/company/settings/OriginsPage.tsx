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

const PAPEIS = [
  { k: 'papel_coleta', label: 'Coleta', curto: 'Coleta', desc: 'Posto/unidade que coleta' },
  { k: 'papel_laboratorio', label: 'Laboratório que analisa', curto: 'Laboratório', desc: 'Recebe malote e faz a triagem' },
  { k: 'papel_coleta_externa', label: 'Coleta externa', curto: 'Coleta externa', desc: 'Domiciliar/empresas; o coletor sai dela' },
  { k: 'papel_hospital', label: 'Hospital / Pronto-socorro', curto: 'Hospital/PS', desc: 'Amostras de internados/urgência' },
] as const;

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
    establishment_id: '',
    papel_coleta: true,
    papel_laboratorio: false,
    papel_coleta_externa: false,
    papel_hospital: false,
    laboratorio_destino_id: '' as string,
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
        establishment_id: origin.establishment_id,
        papel_coleta: (origin as any).papel_coleta ?? true,
        papel_laboratorio: (origin as any).papel_laboratorio ?? false,
        papel_coleta_externa: (origin as any).papel_coleta_externa ?? false,
        papel_hospital: (origin as any).papel_hospital ?? false,
        laboratorio_destino_id: (origin as any).laboratorio_destino_id || '',
      });
    } else {
      setEditingOrigin(null);
      setFormData({ 
        name: '', 
        internal_code: '', 
        establishment_id: establishments.find(e => e.is_main_branch)?.id || establishments[0]?.id || '',
        papel_coleta: true, papel_laboratorio: false, papel_coleta_externa: false, papel_hospital: false,
        laboratorio_destino_id: origins.find(o => o.internal_code === '00')?.id || '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.establishment_id) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    if (!formData.papel_coleta && !formData.papel_laboratorio && !formData.papel_coleta_externa && !formData.papel_hospital) {
      toast.error('Marque pelo menos um papel da unidade');
      return;
    }
    if (formData.papel_laboratorio && formData.laboratorio_destino_id && formData.laboratorio_destino_id === editingOrigin?.id) {
      toast.error('A unidade não pode ser o próprio laboratório de destino');
      return;
    }

    const payload = {
      ...formData,
      laboratorio_destino_id: formData.laboratorio_destino_id || null,
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
      toast.error(/permiss|laborat|própri/i.test(error.message || '') ? error.message : 'Erro ao salvar origem');
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
      toast.error(error.code === '23503' ? 'Esta origem está em uso (destino de outra unidade, rota ou atendimentos) e não pode ser excluída.' : 'Erro ao excluir');
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
          <p className="text-muted-foreground">Gerencie as origens (unidades) e os papéis de cada uma na coleta e na Triagem Lab</p>
          {origins.length === 1 && <p className="mt-1 text-xs text-muted-foreground">Empresa sem filial: a matriz é unidade de Coleta e Laboratório ao mesmo tempo, sem transporte.</p>}
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
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Papéis</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Lab. de destino</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
                </td>
              </tr>
            ) : origins.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground italic">
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
                    <div className="flex flex-wrap gap-1">
                      {PAPEIS.filter(p => origin[p.k]).map(p => (
                        <span key={p.k} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{p.curto}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {origins.length === 1 ? <span className="text-[11px] italic">Sem transporte</span>
                      : origin.papel_coleta && !origin.papel_laboratorio
                        ? (origins.find(o => o.id === origin.laboratorio_destino_id)?.name || <span className="text-[11px] text-warning">Definir</span>)
                        : '—'}
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
            <div className="space-y-2 rounded-lg border border-border p-3">
              <Label>Papéis da unidade</Label>
              <div className="grid grid-cols-2 gap-2">
                {PAPEIS.map(p => (
                  <label key={p.k} className="flex items-start gap-2 text-sm cursor-pointer">
                    <input type="checkbox" className="accent-primary mt-1" checked={(formData as any)[p.k]} onChange={e => setFormData({ ...formData, [p.k]: e.target.checked })} />
                    <span><span className="block font-medium">{p.label}</span><span className="block text-[11px] text-muted-foreground">{p.desc}</span></span>
                  </label>
                ))}
              </div>
              {formData.papel_coleta && !formData.papel_laboratorio && (
                <div className="space-y-1 pt-2">
                  <Label>Laboratório de destino padrão</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={formData.laboratorio_destino_id} onChange={e => setFormData({ ...formData, laboratorio_destino_id: e.target.value })}>
                    <option value="">Não definido</option>
                    {origins.filter(o => o.papel_laboratorio && o.id !== editingOrigin?.id).map(o => <option key={o.id} value={o.id}>{o.internal_code ? `${o.internal_code} · ` : ''}{o.name}</option>)}
                  </select>
                  <p className="text-[11px] text-muted-foreground">Para onde vão os malotes desta unidade.</p>
                </div>
              )}
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
