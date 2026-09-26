import { useCallback, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CancelarPardiniDialog, type ItemCancelavel } from '@/components/apoio/remessa/CancelarPardiniDialog';

/**
 * Cancela o exame no apoio quando o exame do pedido é cancelado.
 * - aguardando/em remessa: cancela direto
 * - já transmitido (modo automático): abre o MESMO quadro do botão "Cancelar no Pardini"
 *   (motivo obrigatório + destino), com o exame já marcado. O quadro cuida de tudo.
 * - já transmitido em apoio de modo manual: pergunta e gera a tarefa no Kanban (sem chamada ao apoio).
 * Retorna true quando quem chamou deve seguir cancelando o exame localmente.
 */
export function useApoioCancelamento() {
  const [pergunta, setPergunta] = useState<{ apoio: string } | null>(null);
  const resolver = useRef<((v: boolean | null) => void) | null>(null);
  const [quadro, setQuadro] = useState<ItemCancelavel | null>(null);
  const resolverQuadro = useRef<((v: boolean) => void) | null>(null);
  const resultadoQuadro = useRef(false);

  const perguntar = (apoio: string) => new Promise<boolean | null>((res) => { resolver.current = res; setPergunta({ apoio }); });
  const responder = (v: boolean | null) => { setPergunta(null); resolver.current?.(v); resolver.current = null; };

  const abrirQuadro = async (pedidoId: string, examId: string): Promise<boolean> => {
    const { data: pe } = await supabase.from('apoio_pedido_exame' as any)
      .select('id, recipiente_id, cod_ped_lab').eq('pedido_id', pedidoId).eq('exame_id', examId)
      .neq('status', 'cancelado').order('created_at', { ascending: false }).limit(1).maybeSingle();
    const row: any = pe;
    if (!row) { toast.error('Não encontrei o exame no apoio.'); return false; }
    const [{ data: ao }, { data: ex }, { data: rec }] = await Promise.all([
      supabase.from('attendance_orders' as any).select('patient_name, order_number').eq('id', pedidoId).maybeSingle(),
      supabase.from('exams' as any).select('name').eq('id', examId).maybeSingle(),
      row.recipiente_id
        ? supabase.from('apoio_recipiente' as any).select('cod_bar_apoio').eq('id', row.recipiente_id).maybeSingle()
        : Promise.resolve({ data: null } as any),
    ]);
    resultadoQuadro.current = false;
    return new Promise<boolean>((res) => {
      resolverQuadro.current = res;
      setQuadro({
        id: row.id, paciente: (ao as any)?.patient_name || '—', order_number: (ao as any)?.order_number || row.cod_ped_lab || '—',
        exame: (ex as any)?.name || '—', tubo: (rec as any)?.cod_bar_apoio || '',
      });
    });
  };
  const fecharQuadro = () => { setQuadro(null); resolverQuadro.current?.(resultadoQuadro.current); resolverQuadro.current = null; };

  const cancelarNoApoio = useCallback(async (pedidoId?: string, examId?: string, motivo?: string): Promise<boolean> => {
    if (!pedidoId || !examId) return true;
    const call = (flag: boolean | null) => supabase.rpc('apoio_cancelar_pedido_exame' as any, {
      _pedido: pedidoId, _exam: examId, _motivo: motivo || null, _cancelar_no_apoio: flag,
    } as any);
    const { data, error } = await call(null);
    if (error) { console.warn('apoio_cancelar_pedido_exame', error); return true; }
    const r: any = data;
    if (r?.resultado === 'cancelado') toast.info(`Exame retirado da fila do ${r.apoio_nome}.`);
    if (r?.resultado !== 'confirmar') return true;
    if (r.modo !== 'manual') return abrirQuadro(pedidoId, examId);
    const resp = await perguntar(r.apoio_nome);
    if (resp === null) return false;
    const { data: d2, error: e2 } = await call(resp);
    if (e2) { toast.error('Não foi possível marcar o cancelamento no apoio.'); return true; }
    const r2: any = d2;
    if (r2?.resultado === 'marcado') {
      if (r2.tarefa_criada) toast.success(`Ação "Cancelar no portal do ${r2.apoio_nome}" criada em Exceções › Ação manual pendente, no Kanban Apoio.`);
      else toast.success(`Marcado para cancelar no ${r2.apoio_nome}.`);
    }
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const itensQuadro = useMemo(() => (quadro ? [quadro] : []), [quadro]);
  const marcadosQuadro = useMemo(() => (quadro ? [quadro.id] : []), [quadro]);

  const dialog = (
    <>
      <AlertDialog open={!!pergunta} onOpenChange={(o) => { if (!o) responder(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exame já enviado ao {pergunta?.apoio}</AlertDialogTitle>
            <AlertDialogDescription>Este exame já foi enviado ao {pergunta?.apoio}. Cancelar também no {pergunta?.apoio}?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => responder(null)}>Voltar</AlertDialogCancel>
            <AlertDialogAction className="bg-secondary text-secondary-foreground hover:bg-secondary/80" onClick={() => responder(false)}>Não, só aqui</AlertDialogAction>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => responder(true)}>Sim, cancelar no apoio</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <CancelarPardiniDialog
        open={!!quadro} itens={itensQuadro} marcados={marcadosQuadro}
        onClose={fecharQuadro} onDone={() => {}}
        onFinish={({ resultados, destino }) => {
          // Só segue cancelando localmente quando o Pardini confirmou e o destino é o atendimento.
          resultadoQuadro.current = destino === 'atendimento' && resultados.some(x => x.resultado === 'cancelado');
        }}
      />
    </>
  );

  return { cancelarNoApoio, dialog };
}
