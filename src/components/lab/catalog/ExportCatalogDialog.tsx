import { useEffect, useMemo, useState } from 'react';
import { Download, Loader2, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface ExportCatalogExam {
  id: string;
  code: string;
  name: string;
  workbenchId?: string;
  workbench: string;
  status: string;
}

interface ExportCatalogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exams: ExportCatalogExam[];
  workbenches: { id: string; name: string }[];
  exporting: boolean;
  onExport: (ids: string[]) => void;
}

const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function ExportCatalogDialog({ open, onOpenChange, exams, workbenches, exporting, onExport }: ExportCatalogDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [workbench, setWorkbench] = useState('all');

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setQuery('');
      setWorkbench('all');
    }
  }, [open]);

  const sorted = useMemo(() => [...exams].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), [exams]);

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return sorted.filter(e =>
      (workbench === 'all' || e.workbenchId === workbench) &&
      (!q || normalize(e.name).includes(q) || normalize(e.code).includes(q)),
    );
  }, [sorted, query, workbench]);

  const allSelected = exams.length > 0 && selected.size === exams.length;
  const someSelected = selected.size > 0 && !allSelected;
  const allVisibleSelected = visible.length > 0 && visible.every(e => selected.has(e.id));
  const isFiltered = visible.length !== exams.length;

  const toggle = (id: string, checked: boolean) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });

  const toggleAll = (checked: boolean) => setSelected(checked ? new Set(exams.map(e => e.id)) : new Set());

  const toggleVisible = () =>
    setSelected(prev => {
      const next = new Set(prev);
      visible.forEach(e => (allVisibleSelected ? next.delete(e.id) : next.add(e.id)));
      return next;
    });

  return (
    <Dialog open={open} onOpenChange={o => !exporting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Exportar Catálogo</DialogTitle>
          <DialogDescription>Marque os exames que vão para a planilha (catálogo, parâmetros e faixas de referência).</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por nome ou código..."
              className="pl-9"
            />
          </div>
          <Select value={workbench} onValueChange={setWorkbench}>
            <SelectTrigger className="sm:w-52"><SelectValue placeholder="Bancada" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as bancadas</SelectItem>
              {workbenches.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2">
          <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
            <Checkbox
              checked={allSelected ? true : someSelected ? 'indeterminate' : false}
              onCheckedChange={c => toggleAll(c === true)}
              disabled={exams.length === 0}
            />
            Marcar todos ({exams.length})
          </label>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{selected.size} selecionado(s)</span>
            {isFiltered && (
              <button type="button" className="font-semibold text-primary hover:underline disabled:opacity-50" onClick={toggleVisible} disabled={visible.length === 0}>
                {allVisibleSelected ? 'Desmarcar exibidos' : `Marcar exibidos (${visible.length})`}
              </button>
            )}
            <button type="button" className="font-semibold text-destructive hover:underline disabled:opacity-50" onClick={() => setSelected(new Set())} disabled={selected.size === 0}>
              Limpar
            </button>
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto rounded-md border p-1">
          {visible.map(e => (
            <label key={e.id} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-muted">
              <Checkbox checked={selected.has(e.id)} onCheckedChange={c => toggle(e.id, c === true)} />
              <span className="flex-1 truncate font-medium">{e.name}</span>
              <Badge variant="outline" className="font-mono text-[10px]">{e.code}</Badge>
              <span className="hidden w-32 truncate text-xs text-muted-foreground sm:block">{e.workbench}</span>
              {e.status !== 'active' && <Badge variant="secondary" className="text-[10px]">Inativo</Badge>}
            </label>
          ))}
          {visible.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhum exame encontrado.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={exporting}>Cancelar</Button>
          <Button onClick={() => onExport(Array.from(selected))} disabled={selected.size === 0 || exporting} className="gap-2">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exportar {selected.size > 0 ? `${selected.size} exame(s)` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
