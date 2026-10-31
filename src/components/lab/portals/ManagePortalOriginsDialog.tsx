import { useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Search } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyContext } from '@/context/CompanyContext';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ExternalAccessRecord } from '@/hooks/useExternalAccesses';

interface Origin { id: string; name: string; internal_code: string | null }
interface Props {
  open: boolean; onOpenChange: (open: boolean) => void; companyId: string | null;
  accesses: ExternalAccessRecord[]; canEdit: boolean; onEditAccess: (access: ExternalAccessRecord) => void;
}

export function ManagePortalOriginsDialog({ open, onOpenChange, companyId, accesses, canEdit, onEditAccess }: Props) {
  const { refreshOrigins } = useCompanyContext();
  const [origins, setOrigins] = useState<Origin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Origin | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open || !companyId) return;
    let cancelled = false;
    setSearch(''); setEditing(null); setLoading(true); setError(false); setOrigins([]);
    supabase.from('origins').select('id, name, internal_code').eq('company_id', companyId).order('name')
      .then(({ data, error: err }) => {
        if (cancelled) return;
        setOrigins(data || []); setError(!!err); setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, companyId]);
  const term = search.trim().toLowerCase();
  const visibleOrigins = useMemo(() => origins.filter(o => `${o.name} ${o.internal_code || ''}`.toLowerCase().includes(term)), [origins, term]);
  const visibleAccesses = useMemo(() => accesses.filter(a => {
    const linked = origins.filter(o => a.origin_id === o.id || a.partner_origin_ids?.includes(o.id));
    return `${a.name} ${linked.map(o => `${o.name} ${o.internal_code || ''}`).join(' ')}`.toLowerCase().includes(term);
  }), [accesses, origins, term]);
  const save = async () => {
    if (!editing || !canEdit || name.trim().length < 2) return;
    setSaving(true);
    try {
      const { error: err } = await supabase.rpc('portal_origem_editar', { p_origem_id: editing.id, p_nome: name.trim(), p_codigo: code.trim() });
      if (err) throw err;
      setOrigins(prev => prev.map(o => o.id === editing.id ? { ...o, name: name.trim().toUpperCase(), internal_code: code.trim() || null } : o));
      setEditing(null); toast.success('Origem atualizada');
      await refreshOrigins();
    } catch (err) { toast.error(err instanceof Error ? err.message : (err as { message?: string })?.message || 'Falha ao salvar origem'); }
    finally { setSaving(false); }
  };
  return <Dialog open={open} onOpenChange={o => { if (!saving) onOpenChange(o); }}>
    <DialogContent className="flex w-[calc(100%-2rem)] max-w-[640px] max-h-[85vh] flex-col overflow-hidden">
      <DialogHeader><DialogTitle>Todos os portais e origens</DialogTitle></DialogHeader>
      {editing ? <>
        <div className="space-y-4 overflow-y-auto">
          <div className="space-y-2"><Label htmlFor="portal-origin-name">Nome da origem *</Label><Input id="portal-origin-name" value={name} disabled={saving} onChange={e => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="portal-origin-code">Código da origem</Label><Input id="portal-origin-code" value={code} disabled={saving} onChange={e => setCode(e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="outline" disabled={saving} onClick={() => setEditing(null)}>Voltar</Button><Button disabled={saving || name.trim().length < 2} onClick={save}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar origem</Button></DialogFooter>
      </> : <>
        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" aria-label="Buscar portal ou origem" placeholder="Buscar portal, origem ou código..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Tabs defaultValue="portais" className="min-h-0 flex flex-col">
          <TabsList className="self-start"><TabsTrigger value="portais">Portais ({accesses.length})</TabsTrigger><TabsTrigger value="origens">Origens ({origins.length})</TabsTrigger></TabsList>
          <TabsContent value="portais" className="max-h-[48vh] overflow-y-auto divide-y border rounded-md">
            {visibleAccesses.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nenhum portal encontrado.</p>}
            {visibleAccesses.map(a => <div key={a.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{a.name}</p><p className="text-xs text-muted-foreground capitalize">{a.type === 'local' ? 'Local' : a.type === 'parceiro' ? 'Parceiro' : a.type === 'medico' ? 'Médico' : 'Paciente'} · {a.status === 'active' ? 'Ativo' : 'Inativo'}</p>
                <p className="break-words text-xs text-muted-foreground">{origins.filter(o => a.origin_id === o.id || a.partner_origin_ids?.includes(o.id)).map(o => `${o.name}${o.internal_code ? ` · ${o.internal_code}` : ''}`).join(' / ')}</p>
              </div>
              {canEdit && <Button size="icon" variant="ghost" aria-label={`Editar acesso ${a.name}`} title="Editar acesso" onClick={() => { onOpenChange(false); onEditAccess(a); }}><Pencil className="h-4 w-4" /></Button>}
            </div>)}
          </TabsContent>
          <TabsContent value="origens" className="max-h-[48vh] overflow-y-auto divide-y border rounded-md">
            {loading ? <p className="p-6 text-center text-sm text-muted-foreground">Carregando...</p> : error ? <p className="p-6 text-center text-sm text-destructive">Falha ao carregar origens. Feche e tente novamente.</p> : visibleOrigins.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma origem encontrada.</p>}
            {visibleOrigins.map(o => <div key={o.id} className="flex items-center gap-3 p-3"><div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{o.name}</p><p className="text-xs text-muted-foreground">Código: {o.internal_code || '—'}</p></div>{canEdit && <Button size="icon" variant="ghost" aria-label={`Editar origem ${o.name}`} title="Editar origem" onClick={() => { setEditing(o); setName(o.name); setCode(o.internal_code || ''); }}><Pencil className="h-4 w-4" /></Button>}</div>)}
          </TabsContent>
        </Tabs>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button></DialogFooter>
      </>}
    </DialogContent>
  </Dialog>;
}