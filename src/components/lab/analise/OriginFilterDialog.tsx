import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

export interface OriginFilterOption {
  id: string;
  name: string;
}

interface OriginFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opções especiais (ex.: Apoio integração/manual), mostradas no topo. */
  specialOptions: OriginFilterOption[];
  origins: OriginFilterOption[];
  selected: string[];
  onApply: (ids: string[]) => void;
}

const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function OriginFilterDialog({ open, onOpenChange, specialOptions, origins, selected, onApply }: OriginFilterDialogProps) {
  const [draft, setDraft] = useState<string[]>(selected);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) {
      setDraft(selected);
      setQuery('');
    }
  }, [open, selected]);

  const sortedOrigins = useMemo(
    () => [...origins].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [origins],
  );

  const q = normalize(query.trim());
  const visibleSpecial = q ? specialOptions.filter(o => normalize(o.name).includes(q)) : specialOptions;
  const visibleOrigins = q ? sortedOrigins.filter(o => normalize(o.name).includes(q)) : sortedOrigins;
  const visibleIds = [...visibleSpecial, ...visibleOrigins].map(o => o.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => draft.includes(id));

  const toggle = (id: string, checked: boolean) =>
    setDraft(prev => (checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter(x => x !== id)));

  const toggleAllVisible = () =>
    setDraft(prev =>
      allVisibleSelected ? prev.filter(id => !visibleIds.includes(id)) : Array.from(new Set([...prev, ...visibleIds])),
    );

  const renderOption = (o: OriginFilterOption) => (
    <label
      key={o.id}
      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-muted"
    >
      <Checkbox checked={draft.includes(o.id)} onCheckedChange={c => toggle(o.id, c === true)} />
      <span className="truncate">{o.name}</span>
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Filtrar por Origem</DialogTitle>
          <DialogDescription>Marque as origens que deseja ver. Nenhuma marcada = todas.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar origem..."
            className="pl-9"
          />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{draft.length} selecionada(s)</span>
          <div className="flex gap-3">
            <button type="button" className="font-semibold text-primary hover:underline disabled:opacity-50" onClick={toggleAllVisible} disabled={visibleIds.length === 0}>
              {allVisibleSelected ? 'Desmarcar exibidas' : 'Marcar exibidas'}
            </button>
            <button type="button" className="font-semibold text-destructive hover:underline disabled:opacity-50" onClick={() => setDraft([])} disabled={draft.length === 0}>
              Limpar
            </button>
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto rounded-md border p-1">
          {visibleSpecial.length > 0 && (
            <>
              <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase text-muted-foreground">Apoio</p>
              {visibleSpecial.map(renderOption)}
            </>
          )}
          {visibleOrigins.length > 0 && (
            <>
              <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase text-muted-foreground">Origens</p>
              {visibleOrigins.map(renderOption)}
            </>
          )}
          {visibleSpecial.length === 0 && visibleOrigins.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhuma origem encontrada.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => {
              onApply(draft);
              onOpenChange(false);
            }}
          >
            Aplicar filtro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
