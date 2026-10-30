import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { resolveCompanyId } from '@/utils/companyId';
import { Image as ImageIcon, Loader2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Graphic {
  id: string;
  label: string | null;
  item_code: string;
  image_format: string;
  image_base64: string;
  equipment_id: string | null;
  created_at: string;
}

const graphicChannel = (graphic: Graphic) => {
  const source = `${graphic.item_code} ${graphic.label || ''}`.toUpperCase();
  if (source.includes('WBC')) return 'WBC';
  if (source.includes('RBC')) return 'RBC';
  if (source.includes('PLT')) return 'PLT';
  return String(graphic.item_code || '').toUpperCase();
};

const mimeFor = (format: string) => {
  const f = String(format || '').toUpperCase();
  if (f === 'JPG') return 'image/jpeg';
  return `image/${f.toLowerCase()}`;
};

const dataUrl = (g: Graphic) => `data:${mimeFor(g.image_format)};base64,${g.image_base64}`;

const horarioGrafico = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
};

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.5;

export const InstrumentGraphicsSection = ({ protocol, orderId, equipmentId, expanded = false }: { protocol?: string | null; orderId?: string | null; equipmentId?: string; expanded?: boolean }) => {
  const { user } = useAuth();
  const companyId = resolveCompanyId(user?.companyId);
  const [graphics, setGraphics] = useState<Graphic[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Graphic | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setGraphics([]);
    if (!companyId || (!protocol && !orderId)) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      let query = supabase
        .from('lab_result_graphics' as any)
        .select('id, label, item_code, image_format, image_base64, equipment_id, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);
      query = orderId ? query.eq('order_id', orderId) : query.eq('protocol', protocol as string);
      const { data } = await query;
      if (!cancelled) {
        // Um gráfico por tipo: mantém somente o mais recente de cada item_code/equipamento
        const normalizeEquipment = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '');
        const rows = ((data as any as Graphic[]) || []).filter((g) => !equipmentId || normalizeEquipment(g.equipment_id || '') === normalizeEquipment(equipmentId));
        const seen = new Set<string>();
        const unique = rows.filter((g) => {
          const key = `${String(g.equipment_id || '').toUpperCase()}|${graphicChannel(g)}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setGraphics(expanded ? unique.filter((g) => ['WBC', 'RBC', 'PLT'].includes(graphicChannel(g))).sort((a, b) => ['WBC', 'RBC', 'PLT'].indexOf(graphicChannel(a)) - ['WBC', 'RBC', 'PLT'].indexOf(graphicChannel(b))) : unique);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [companyId, protocol, orderId, equipmentId, expanded]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando gráficos do equipamento...
      </div>
    );
  }

  if (graphics.length === 0) return expanded ? <p className="text-xs text-muted-foreground">Nenhum histograma recebido deste equipamento para este pedido.</p> : null;

  const abrir = (g: Graphic) => {
    setZoom(1);
    setPreview(g);
  };

  return (
    <div className={expanded ? "space-y-3" : "rounded-lg border border-border bg-muted/40 p-4 space-y-3"}>
      <div className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-indigo-500" />
        <span className="text-[11px] font-black uppercase tracking-wide text-indigo-700">
          Gráficos do Equipamento ({graphics.length})
        </span>
        <span className="text-[10px] font-medium text-muted-foreground">clique para ampliar</span>
      </div>
      <div className={expanded ? "grid grid-cols-1 gap-3 md:grid-cols-3" : "flex flex-wrap gap-3"}>
        {graphics.map((g) => (
          <Button variant="outline"
            key={g.id}
            type="button"
            onClick={() => abrir(g)}
            aria-label={`Ampliar gráfico ${g.label || graphicChannel(g)}`}
            className={`group relative block h-auto overflow-hidden rounded border border-border bg-background p-0 ${expanded ? "w-full shadow-sm" : "w-28"}`}
            title={g.label || g.item_code}
          >
            <img
              src={dataUrl(g)}
              alt={g.label || `Gráfico ${g.item_code}`}
              className={expanded ? "h-36 w-full bg-background object-contain p-2" : "h-20 w-full bg-background object-contain"}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-foreground/0 transition-colors group-hover:bg-foreground/10">
              <ZoomIn className="h-5 w-5 text-background opacity-0 drop-shadow group-hover:opacity-100" />
            </div>
            <div className="flex items-center justify-between border-t border-border px-2 py-1.5 text-[10px] font-bold text-foreground">
              <span>{graphicChannel(g)}</span>
              <span className="truncate pl-2 font-normal text-muted-foreground">{g.label || g.item_code}</span>
            </div>
          </Button>
        ))}
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogPortal>
          {/* Camada acima da tela de digitação (z-[100]) para o gráfico aparecer na frente */}
          <DialogOverlay className="z-[200] bg-black/80" />
          <DialogContent
            className="z-[210] flex max-h-[92vh] w-[96vw] max-w-[1500px] flex-col gap-0 overflow-hidden p-0 sm:rounded-lg"
            aria-describedby={undefined}
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border bg-background px-4 py-3 pr-12">
              <div className="min-w-0">
                <DialogTitle className="truncate text-sm font-black uppercase tracking-wide">
                  {preview?.label || `Gráfico ${preview?.item_code}`}
                </DialogTitle>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {preview ? graphicChannel(preview) : ''}
                  {preview?.equipment_id ? ` · ${preview.equipment_id}` : ''}
                  {preview?.created_at ? ` · ${horarioGrafico(preview.created_at)}` : ''}
                </p>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto bg-slate-950 p-3">
              {preview && (
                <img
                  src={dataUrl(preview)}
                  alt={preview.label || `Gráfico ${preview.item_code}`}
                  className={cn(
                    'mx-auto block',
                    zoom === 1 ? 'max-h-[70vh] w-auto max-w-full object-contain' : 'max-w-none object-contain',
                  )}
                  style={zoom === 1 ? undefined : { width: `${zoom * 100}%` }}
                />
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background px-4 py-3">
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  disabled={zoom <= ZOOM_MIN}
                  onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}
                >
                  <ZoomOut className="h-3.5 w-3.5" /> Reduzir
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  disabled={zoom >= ZOOM_MAX}
                  onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}
                >
                  <ZoomIn className="h-3.5 w-3.5" /> Ampliar
                </Button>
                <span className="ml-2 w-12 text-[11px] font-bold tabular-nums text-muted-foreground">
                  {Math.round(zoom * 100)}%
                </span>
              </div>
              <DialogClose asChild>
                <Button variant="outline" className="h-9 gap-2 border-slate-300 text-xs font-black uppercase tracking-wide">
                  <X className="h-4 w-4" /> Fechar
                </Button>
              </DialogClose>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  );
};
