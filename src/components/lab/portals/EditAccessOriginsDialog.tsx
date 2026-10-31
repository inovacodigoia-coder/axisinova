import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { ExternalAccessRecord } from '@/hooks/useExternalAccesses';

interface Props {
  access: ExternalAccessRecord | null;
  companyId: string | null;
  onOpenChange: (o: boolean) => void;
  onSave: (id: string, patch: { name: string; partner_origin_ids?: string[]; origin_id?: string | null }) => Promise<unknown>;
}

interface Origem { id: string; name: string; internal_code: string | null }

export function EditAccessOriginsDialog({ access, companyId, onOpenChange, onSave }: Props) {
  const [origens, setOrigens] = useState<Origem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [busca, setBusca] = useState('');
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const multi = access?.type === 'parceiro';
  const hasOrigins = multi || access?.type === 'local';

  useEffect(() => {
    if (!access || !companyId) return;
    let cancelled = false;
    setName(access.name);
    setBusca('');
    setSelected(multi ? [...(access.partner_origin_ids || [])] : access.origin_id ? [access.origin_id] : []);
    if (!hasOrigins) return;
    setLoading(true);
    supabase.from('origins').select('id, name, internal_code')
      .eq('company_id', companyId).order('name')
      .then(({ data, error }) => {
        if (cancelled) return;
        setOrigens(data || []);
        setLoading(false);
        if (error) toast.error('Falha ao carregar origens');
      });
    return () => { cancelled = true; };
  }, [access, companyId, multi, hasOrigins]);

  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return t ? origens.filter((o) => o.name.toLowerCase().includes(t) || (o.internal_code || '').toLowerCase().includes(t)) : origens;
  }, [origens, busca]);

  const toggle = (id: string) => {
    if (multi) setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    else setSelected([id]);
  };

  const salvar = async () => {
    if (!access || name.trim().length < 2 || (hasOrigins && selected.length === 0)) return;
    setSaving(true);
    try {
      await onSave(access.id, { name: name.trim(), ...(hasOrigins ? multi ? { partner_origin_ids: selected } : { origin_id: selected[0] } : {}) });
      toast.success('Acesso atualizado');
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!access} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar acesso</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="edit-access-name">Nome exibido *</Label>
          <Input id="edit-access-name" value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />
        </div>
        {hasOrigins && <><Label>{multi ? 'Origens do parceiro *' : 'Origem / Unidade *'}</Label><div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar origem..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1 border rounded-md p-2 max-h-[45vh]">
          {loading ? <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p> : lista.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhuma origem encontrada</p>}
          {lista.map((o) => (
            <label key={o.id} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted cursor-pointer">
              <Checkbox disabled={saving || loading} checked={selected.includes(o.id)} onCheckedChange={() => toggle(o.id)} />
              <span className="text-sm font-medium flex-1 truncate">{o.name}</span>
              {o.internal_code && <span className="text-xs text-muted-foreground">{o.internal_code}</span>}
            </label>
          ))}
        </div></>}
        <DialogFooter>
          {hasOrigins && <span className="text-xs text-muted-foreground mr-auto self-center">{selected.length} selecionada(s)</span>}
          <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving || name.trim().length < 2 || (hasOrigins && (loading || selected.length === 0))}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
