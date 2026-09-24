import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * Cancela o exame no apoio quando o exame do pedido é cancelado.
 * - aguardando/em remessa: cancela direto
 * - já transmitido: pergunta se deve cancelar também no apoio (modo manual gera tarefa no Kanban)
 * Retorna false se o usuário desistir do cancelamento.
 */
export function useApoioCancelamento() {
  const [pergunta, setPergunta] = useState<{ apoio: string } | null>(null);
  const resolver = useRef<((v: boolean | null) => void) | null>(null);

  const perguntar = (apoio: string) => new Promise<boolean | null>((res) => { resolver.current = res; setPergunta({ apoio }); });
  const responder = (v: boolean | null) => { setPergunta(null); resolver.current?.(v); resolver.current = null; };

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
    const resp = await perguntar(r.apoio_nome);
    if (resp === null) return false;
    const { data: d2, error: e2 } = await call(resp);
    if (e2) { toast.error('Não foi possível marcar o cancelamento no apoio.'); return true; }
    const r2: any = d2;
    if (r2?.resultado === 'marcado') {
      if (r2.tarefa_criada) toast.success(`Tarefa "Cancelar no portal do ${r2.apoio_nome}" criada no Kanban.`);
      else if (r2.sem_quadro) toast.warning(`Marcado para cancelar no ${r2.apoio_nome}. Nenhum quadro Kanban encontrado para criar a tarefa.`);
      else toast.success(`Marcado para cancelar no ${r2.apoio_nome}.`);
    }
    return true;
  }, []);

  const dialog = (
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
  );

  return { cancelarNoApoio, dialog };
}
