import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { resolveCompanyId } from '@/utils/companyId';
import { Image as ImageIcon, Loader2, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Graphic {
  id: string;
  label: string | null;
  item_code: string;
  image_format: string;
  image_base64: string;
  equipment_id: string | null;
  created_at: string;
}

const mimeFor = (format: string) => {
  const f = String(format || '').toUpperCase();
  if (f === 'JPG') return 'image/jpeg';
  return `image/${f.toLowerCase()}`;
};

export const InstrumentGraphicsSection = ({ protocol, equipmentId, expanded = false }: { protocol?: string | null; equipmentId?: string; expanded?: boolean }) => {
  const { user } = useAuth();
  const companyId = resolveCompanyId(user?.companyId);
  const [graphics, setGraphics] = useState<Graphic[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Graphic | null>(null);

  useEffect(() => {
    setGraphics([]);
    if (!companyId || !protocol) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('lab_result_graphics' as any)
        .select('id, label, item_code, image_format, image_base64, equipment_id, created_at')
        .eq('company_id', companyId)
        .eq('protocol', protocol)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!cancelled) {
        // Um gráfico por tipo: mantém somente o mais recente de cada item_code/equipamento
        const normalizeEquipment = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '');
        const rows = ((data as any as Graphic[]) || []).filter((g) => !equipmentId || normalizeEquipment(g.equipment_id || '') === normalizeEquipment(equipmentId));
        const seen = new Set<string>();
        const unique = rows.filter((g) => {
          const key = `${String(g.equipment_id || '').toUpperCase()}|${String(g.item_code || '').toUpperCase()}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setGraphics(expanded ? unique.filter((g) => ['WBC', 'RBC', 'PLT'].includes(g.item_code.toUpperCase())).sort((a, b) => ['WBC', 'RBC', 'PLT'].indexOf(a.item_code.toUpperCase()) - ['WBC', 'RBC', 'PLT'].indexOf(b.item_code.toUpperCase())) : unique);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [companyId, protocol, equipmentId, expanded]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando gráficos do equipamento...
      </div>
    );
  }

  if (graphics.length === 0) return expanded ? <p className="text-xs text-muted-foreground">Nenhum histograma recebido deste equipamento para este pedido.</p> : null;

  return (
    <div className={expanded ? "space-y-3" : "rounded-lg border border-border bg-muted/40 p-4 space-y-3"}>
      <div className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-indigo-500" />
        <span className="text-[11px] font-black uppercase tracking-wide text-indigo-700">
          Gráficos do Equipamento ({graphics.length})
        </span>
      </div>
      <div className={expanded ? "grid grid-cols-1 gap-4 md:grid-cols-3" : "flex flex-wrap gap-3"}>
        {graphics.map((g) => (
          <Button variant="outline"
            key={g.id}
            type="button"
            onClick={() => setPreview(g)}
            className={`group relative block h-auto p-0 rounded border border-border bg-background overflow-hidden ${expanded ? "w-full" : "w-28"}`}
            title={g.label || g.item_code}
          >
            <img
              src={`data:${mimeFor(g.image_format)};base64,${g.image_base64}`}
              alt={g.label || `Gráfico ${g.item_code}`}
              className={expanded ? "w-full h-44 object-contain bg-background" : "w-full h-20 object-contain bg-background"}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 drop-shadow" />
            </div>
            <div className="px-1.5 py-1 text-[9px] font-bold text-slate-600 truncate border-t border-slate-100">
              {g.label || g.item_code}
            </div>
          </Button>
        ))}
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {preview?.label || `Gráfico ${preview?.item_code}`}
              {preview?.equipment_id && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">({preview.equipment_id})</span>
              )}
            </DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="flex items-center justify-center bg-white rounded-lg border p-2">
              <img
                src={`data:${mimeFor(preview.image_format)};base64,${preview.image_base64}`}
                alt={preview.label || `Gráfico ${preview.item_code}`}
                className="max-h-[70vh] object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
