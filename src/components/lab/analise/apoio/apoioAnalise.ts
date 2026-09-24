import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Formato esperado de apoio_resultado_versao.conteudo
 * - integração: { analitos: [{ chave, nome, valor, unidade, referencia }], metodo, nota, observacao, interpretacao, comentario_patologista }
 * - manual:     { valores: { <parametro_id>: valor }, nota }
 */
export interface ApoioEstado {
  id: string; pedido_id: string; exame_id: string; status: string; apoio_id: string; apoio_nome: string;
  manual: boolean; modo: string; prazo: string | null; exige_pdf: boolean; depara_id: string | null; modelo_mudou: boolean;
  liberado_apoio_em: string | null;
  versao: null | { id: string; origem: 'integracao' | 'manual'; situacao: string; conteudo: any; retificacao: string | null;
    digitado_por: string | null; conferido_por: string | null; ciente_em: string | null; executor_informado: string | null; created_at: string };
  anterior: null | { id: string; origem: string; conteudo: any; created_at: string };
  outra: null | { id: string; origem: string; conteudo: any; digitado_por: string | null };
  analitos: { chave: string; nome_apoio: string | null; parametro_id: string | null; ignorar: boolean; casas_decimais: number | null }[];
  faltam: string[];
  docs: { id: string; tipo: string; path: string; origem: string | null }[];
}

export const AGUARDANDO = ['aguardando_remessa', 'em_remessa', 'transmitido', 'recebido_apoio', 'em_analise', 'pendencia_tecnica', 'erro_transmissao'];

export const ehRetificado = (e?: ApoioEstado) => !!e?.versao && !['', 'N', '0'].includes(String(e.versao.retificacao || ''));
export const temIntegracao = (e?: ApoioEstado) => e?.versao?.origem === 'integracao';
export const temPdf = (e?: ApoioEstado) => !!e?.docs.some(d => d.tipo === 'laudo_pdf' || d.tipo === 'anexo_manual');

/** Digitação liberada: modo manual e sem resultado da integração */
export const apoioEditavel = (e?: ApoioEstado) => !!e && e.manual && !temIntegracao(e) && !['importado', 'importado_com_pendencia', 'liberado_local'].includes(e.status);

export function formatarCasas(valor: string, casas?: number | null) {
  if (casas == null || valor === '') return valor;
  const n = Number(String(valor).replace(',', '.'));
  if (!isFinite(n)) return valor;
  return n.toFixed(casas).replace('.', ',');
}

export function bloqueiosApoio(e?: ApoioEstado): string[] {
  if (!e) return [];
  const b: string[] = [];
  if (temIntegracao(e) && e.faltam.length) b.push(`Faltam ${e.faltam.length} parâmetros sem mapeamento`);
  if (temIntegracao(e) && e.modelo_mudou) b.push('Modelo do apoio mudou: revise o De/Para deste exame');
  if (e.versao?.situacao === 'divergente') b.push('Resultado divergente: escolha uma versão');
  if (e.versao?.situacao === 'incompleto') b.push('Resultado do apoio incompleto: preencha ou justifique na tarefa do Kanban');
  if (ehRetificado(e) && !e.versao?.ciente_em) b.push('Confirme a retificação do apoio');
  if (e.exige_pdf && !temPdf(e)) b.push('Este exame exige o PDF do laudo do apoio');
  if (!e.versao && !apoioEditavel(e)) b.push(`Aguardando resultado do ${e.apoio_nome}`);
  return b;
}

export function notaDoApoio(c: any) {
  if (!c) return '';
  return [
    c.metodo && `Método: ${c.metodo}`, c.nota, c.observacao, c.interpretacao && `Interpretação: ${c.interpretacao}`,
    c.comentario_patologista && `Comentário do patologista: ${c.comentario_patologista}`,
  ].filter(Boolean).join(' · ');
}

export function useApoioAnalise(pedidoIds: string[]) {
  const [lista, setLista] = useState<ApoioEstado[]>([]);
  const key = useMemo(() => Array.from(new Set(pedidoIds.filter(Boolean))).sort().join(','), [pedidoIds]);
  const recarregar = useCallback(async () => {
    if (!key) { setLista([]); return; }
    const { data, error } = await supabase.rpc('apoio_analise_estado' as any, { _pedidos: key.split(',') });
    if (error) return;
    const l: ApoioEstado[] = (data as any) || [];
    // Casas decimais: De/Para (se preenchido) -> máscara do parâmetro -> valor como veio
    const pids = Array.from(new Set(l.flatMap(e => (e.analitos || []).map(a => a.parametro_id).filter(Boolean)))) as string[];
    if (pids.length) {
      const { data: ps } = await (supabase as any).from('lab_exam_parameters').select('id, casas_decimais').in('id', pids);
      const mask: Record<string, number | null> = {};
      (ps || []).forEach((p: any) => { mask[p.id] = p.casas_decimais; });
      l.forEach(e => (e.analitos || []).forEach(a => { if (a.casas_decimais == null && a.parametro_id) a.casas_decimais = mask[a.parametro_id] ?? null; }));
    }
    setLista(l);
  }, [key]);
  useEffect(() => { recarregar(); }, [recarregar]);
  const porExame = useMemo(() => {
    const m: Record<string, ApoioEstado> = {};
    lista.forEach(e => { m[`${e.pedido_id}:${e.exame_id}`] = e; });
    return m;
  }, [lista]);
  return { porExame, recarregar };
}
