import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { StockItem } from '@/lib/almoxarifado'
export function MaterialCostDialog({item,onClose,onSaved}:{item:StockItem|null;onClose:()=>void;onSaved:()=>void}) {
  const [cost,setCost]=useState(''),[fraction,setFraction]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const [history,setHistory]=useState<{id:string;valor_anterior:number|null;valor_novo:number|null;usuario_id:string|null;ocorrido_em:string}[]>([])
  useEffect(()=>{
    setCost(item?.custo_unitario==null?'':String(item.custo_unitario));setFraction(item?.permite_fracao||false);setError('');setHistory([])
    if(item) void supabase.from('almox_custo_historico').select('*').eq('item_id',item.id).order('ocorrido_em',{ascending:false}).then(({data})=>setHistory(data||[]))
  },[item])
  return <Dialog open={!!item} onOpenChange={v=>!busy&&!v&&onClose()}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Custo e unidade · {item?.nome}</DialogTitle></DialogHeader><Label htmlFor="material-cost">Custo unitário (R$)</Label><Input id="material-cost" type="number" min="0" step="0.0001" value={cost} onChange={e=>setCost(e.target.value)} /><Label className="flex items-center gap-2"><Checkbox checked={fraction} onCheckedChange={v=>setFraction(v===true)} />Permitir quantidade fracionada</Label>{error&&<p className="text-sm text-destructive">{error}</p>}<div className="space-y-2"><h4 className="text-sm font-semibold">Histórico de custo</h4>{history.map(h=><p key={h.id} className="text-xs text-muted-foreground">{new Date(h.ocorrido_em).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})} · {h.valor_anterior??'Sem valor'} → {h.valor_novo??'Sem valor'} · {h.usuario_id||'Sistema'}</p>)}</div><DialogFooter><Button variant="outline" disabled={busy} onClick={onClose}>Cancelar</Button><Button disabled={busy} onClick={async()=>{if(!item||busy)return;const value=cost.trim()===''?null:Number(cost);if(value!=null&&(!Number.isFinite(value)||value<0)){setError('Custo inválido');return}setBusy(true);const {error:e}=await supabase.rpc('almox_material_configurar',{_item:item.id,_custo:value as unknown as number,_fracao:fraction});setBusy(false);if(e)setError(e.message);else{onSaved();onClose()}}}>Salvar</Button></DialogFooter></DialogContent></Dialog>
}