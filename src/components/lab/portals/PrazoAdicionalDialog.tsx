import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import type { ExternalAccessRecord } from '@/hooks/useExternalAccesses';

const TIPOS: Record<string, string> = { parceiro: 'Parceiro', local: 'Local', medico: 'Médico' };
const semAcento = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

interface Props {
  access: ExternalAccessRecord | null;
  accesses: ExternalAccessRecord[];
  onOpenChange: (o: boolean) => void;
  onSave: (ids: string[], dias: number) => Promise<number>;
}

export function PrazoAdicionalDialog({ access, accesses, onOpenChange, onSave }: Props) {
  const [dias, setDias] = useState('0');
  const [modo, setModo] = useState<'um' | 'varios'>('um');
  const [selected, setSelected] = useState<string[]>([]);
  const [busca, setBusca] = useState('');
  const [saving, setSaving] = useState(false);

  const elegiveis = useMemo(
    () => accesses.filter(a => a.type in TIPOS).sort((a, b) =>
      (TIPOS[a.type] + a.name).localeCompare(TIPOS[b.type] + b.name, 'pt-BR')),
    [accesses],
  );
  const exibidos = useMemo(() => {
    const t = semAcento(busca.trim());
    return t ? elegiveis.filter(a => semAcento(a.name).includes(t)) : elegiveis;
  }, [elegiveis, busca]);

  useEffect(() => {
    if (!access) return;
    setDias(String(access.prazo_dias_adicionais ?? 0));
    setModo('um');
    setSelected([access.id]);
    setBusca('');
  }, [access]);

  const n = Number(dias);
  const valido = dias.trim() !== '' && Number.isInteger(n) && n >= 0 && n <= 365;
  const ids = modo === 'um' && access ? [access.id] : selected;
  const todosMarcados = elegiveis.length > 0 && selected.length === elegiveis.length;

  const toggle = (id: string) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const salvar = async () => {
    if (!valido || ids.length === 0) return;
    setSaving(true);
    try {
      await onSave(ids, n);
      toast.success(n === 0
        ? 'Prazo adicional removido'
        : `+${n} ${n === 1 ? 'dia' : 'dias'} no prazo de ${ids.length} ${ids.length === 1 ? 'acesso' : 'acessos'}`);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar o prazo adicional');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!access} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CalendarPlus className="h-5 w-5" /> Prazo adicional de resultado</DialogTitle>
          <DialogDescription>
            Os dias informados são somados ao prazo de cada exame. Ex.: exame com prazo de 1 dia + 2 dias = 3 dias.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="prazo-dias">Dias a mais</Label>
            <div className="flex items-center gap-2">
              <Input id="prazo-dias" type="number" min={0} max={365} step={1} className="w-28"
                value={dias} onChange={(e) => setDias(e.target.value)} />
              <span className="text-sm text-muted-foreground">{n === 1 ? 'dia' : 'dias'} (0 remove o adicional)</span>
            </div>
            {!valido && <p className="text-xs text-destructive">Informe um número inteiro de 0 a 365.</p>}
          </div>

          <RadioGroup value={modo} onValueChange={(v) => setModo(v as 'um' | 'varios')} className="gap-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <RadioGroupItem value="um" /> Somente <span className="font-medium">{access?.name}</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <RadioGroupItem value="varios" /> Escolher vários ou aplicar para todos
            </label>
          </RadioGroup>

          {modo === 'varios' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-8" placeholder="Buscar acesso..." value={busca} onChange={(e) => setBusca(e.target.value)} />
                </div>
                <Button type="button" variant="outline" size="sm"
                  onClick={() => setSelected(todosMarcados ? [] : elegiveis.map(a => a.id))}>
                  {todosMarcados ? 'Desmarcar todos' : 'Marcar todos'}
                </Button>
              </div>
              <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
                {exibidos.length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">Nenhum acesso encontrado.</p>
                ) : exibidos.map(a => (
                  <label key={a.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-muted/50">
                    <Checkbox checked={selected.includes(a.id)} onCheckedChange={() => toggle(a.id)} />
                    <span className="flex-1 truncate">{a.name}</span>
                    <Badge variant="outline" className="text-[10px]">{TIPOS[a.type]}</Badge>
                    <span className="w-14 text-right text-xs text-muted-foreground">
                      {a.prazo_dias_adicionais ? `+${a.prazo_dias_adicionais}d` : '—'}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{selected.length} de {elegiveis.length} selecionados</p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Vale para os pedidos novos dessa origem ou desse médico. Pedidos já cadastrados não mudam.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving || !valido || ids.length === 0}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
