import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ExternalLink, FileText, Loader2, Paperclip, RefreshCw, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type ApoioEstado, apoioEditavel, ehRetificado, temIntegracao, temPdf } from './apoioAnalise';

const fmtDH = (d?: string | null) => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
const fmtD = (d?: string | null) => d ? d.slice(0, 10).split('-').reverse().slice(0, 2).join('/') : '—';
const err = (e: any) => e?.message || String(e);

function valoresTexto(c: any, nomeParam: (id: string) => string) {
  if (!c) return [] as [string, string][];
  if (Array.isArray(c.analitos)) return c.analitos.map((a: any) => [a.nome || a.chave, `${a.valor ?? ''} ${a.unidade ?? ''}`.trim()] as [string, string]);
  return Object.entries(c.valores || {}).map(([k, v]) => [nomeParam(k), String(v)] as [string, string]);
}

export function ApoioSelo({ e }: { e: ApoioEstado }) {
  const origem = e.versao ? (e.versao.origem === 'manual' ? 'Manual' : 'Integração') : (e.manual ? 'Manual' : 'Integração');
  return (
    <Badge variant="outline" className="h-5 gap-1 border-border bg-card text-[9px] font-black uppercase text-foreground">
      <Truck className="h-3 w-3" /> Apoio: {e.apoio_nome} · {origem}{e.liberado_apoio_em ? ` · liberado ${fmtDH(e.liberado_apoio_em)}` : ''}
    </Badge>
  );
}

export function ApoioExamBlock({ e, companyId, executor, onExecutor, nomeParam, onChanged, metodo, onMetodo }: {
  e: ApoioEstado; companyId: string; executor: string; onExecutor: (v: string) => void
  metodo?: string; onMetodo?: (v: string) => void
  nomeParam: (id: string) => string; onChanged: () => void
}) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [tela, setTela] = useState<string | null>(null);
  const [escolha, setEscolha] = useState<{ usar: 'integracao' | 'manual'; motivo: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    e.docs.forEach(async d => {
      if (urls[d.id]) return;
      const { data } = await supabase.storage.from('apoio-documentos').createSignedUrl(d.path, 600);
      if (data?.signedUrl) setUrls(u => ({ ...u, [d.id]: data.signedUrl }));
    });
  }, [e.docs]); // eslint-disable-line

  const rpc = async (fn: string, args: any, ok: string) => {
    const { error } = await supabase.rpc(fn as any, args);
    if (error) { toast.error(err(error)); return false; }
    toast.success(ok); onChanged(); return true;
  };

  const anexar = async (f?: File | null) => {
    if (!f) return;
    if (f.type !== 'application/pdf') return toast.error('Envie um arquivo PDF');
    setEnviando(true);
    const path = `${companyId}/resultados/${e.id}/${Date.now()}-${f.name.replace(/[^\w.-]/g, '_')}`;
    const { error } = await supabase.storage.from('apoio-documentos').upload(path, f, { contentType: 'application/pdf' });
    if (error) { setEnviando(false); return toast.error(err(error)); }
    await rpc('apoio_analise_anexar_pdf', { _pe: e.id, _path: path }, 'PDF anexado');
    setEnviando(false);
  };

  const integ = temIntegracao(e);
  const aguardando = !e.versao && !apoioEditavel(e);
  const manualDigitando = apoioEditavel(e);
  const pdfs = e.docs.filter(d => d.tipo !== 'grafico');
  const graficos = e.docs.filter(d => d.tipo === 'grafico');

  const cv = e.versao?.conteudo || {};
  const metodoRec = (cv.metodo || '').trim();
  const formatoRec = cv.codigo_formato || '';
  const metodoAntes = (e.anterior?.conteudo?.metodo || '').trim();
  const metodoMudou = ehRetificado(e) && !!e.anterior && metodoAntes !== metodoRec;

  return (
    <div className="space-y-3">
      {e.versao && (formatoRec || metodoRec) && (
        <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs">
          <span className="font-bold">{[formatoRec && `Formato ${formatoRec}`, metodoRec].filter(Boolean).join(' · ')}</span>
        </div>
      )}
      {metodoMudou && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          <p className="font-black">Método alterado pelo apoio</p>
          <p>Antes: {metodoAntes || '—'} → Agora: <b>{metodoRec || '—'}</b></p>
        </div>
      )}
      {aguardando && (
        <div className="rounded-lg border border-border bg-muted p-3 text-xs font-bold uppercase text-muted-foreground">
          Aguardando resultado do {e.apoio_nome} (prazo {fmtD(e.prazo)})
        </div>
      )}
      {manualDigitando && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">
          <span className="font-bold">Resultado digitado manualmente: anexe o PDF do portal{e.exige_pdf ? ' (obrigatório para este exame)' : ''}.</span>
          <Button size="sm" variant="outline" className="h-7 text-[10px]" disabled={enviando} onClick={() => fileRef.current?.click()}>
            {enviando ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Paperclip className="mr-1 h-3 w-3" />}Anexar PDF
          </Button>
          <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={ev => { anexar(ev.target.files?.[0]); ev.target.value = ''; }} />
        </div>
      )}

      {manualDigitando && onMetodo && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold">Método (opcional):</span>
          <Input className="h-8 max-w-md text-xs" placeholder="Método informado pelo apoio" value={metodo || ''} onChange={ev => onMetodo(ev.target.value)} />
        </div>
      )}

      {integ && e.faltam.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertTriangle className="h-4 w-4" /><span className="font-bold">Faltam {e.faltam.length} parâmetros sem mapeamento ({e.faltam.join(', ')})</span>
          <a className="inline-flex items-center gap-1 underline" target="_blank" rel="noreferrer" href={`/app/apoio/terceirizacao?aba=exames&depara=${e.depara_id || ''}`}>Mapear agora <ExternalLink className="h-3 w-3" /></a>
          <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={onChanged}><RefreshCw className="mr-1 h-3 w-3" />Reprocessar</Button>
        </div>
      )}
      {integ && e.modelo_mudou && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertTriangle className="h-4 w-4" /><span className="font-bold">Modelo do apoio mudou. Revise o De/Para deste exame</span>
          <a className="inline-flex items-center gap-1 underline" target="_blank" rel="noreferrer" href={`/app/apoio/terceirizacao?aba=exames&depara=${e.depara_id || ''}`}>Abrir De/Para <ExternalLink className="h-3 w-3" /></a>
          <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={onChanged}><RefreshCw className="mr-1 h-3 w-3" />Reprocessar</Button>
        </div>
      )}
      {e.versao?.situacao === 'divergente' && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs">
          <p className="mb-2 font-bold text-destructive">Resultado divergente entre o digitado e a integração</p>
          <div className="grid grid-cols-2 gap-3">
            {[e.versao, e.outra].filter(Boolean).map((v: any) => (
              <div key={v.id} className="rounded border border-border bg-card p-2">
                <p className="mb-1 font-bold uppercase">{v.origem === 'manual' ? 'Digitado' : 'Integração'}</p>
                {valoresTexto(v.conteudo, nomeParam).map(([k, val]) => <p key={k}>{k}: <b>{val}</b></p>)}
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => setEscolha({ usar: 'integracao', motivo: '' })}>Usar o da integração</Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => setEscolha({ usar: 'manual', motivo: '' })}>Usar o digitado</Button>
          </div>
        </div>
      )}
      {ehRetificado(e) && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs">
          <p className="mb-2 font-bold text-destructive">Resultado retificado pelo {e.apoio_nome}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded border border-border bg-card p-2"><p className="mb-1 font-bold uppercase">Antes</p>
              {valoresTexto(e.anterior?.conteudo, nomeParam).map(([k, v]) => <p key={k}>{k}: {v}</p>)}{!e.anterior && <p>—</p>}</div>
            <div className="rounded border border-destructive/40 bg-card p-2"><p className="mb-1 font-bold uppercase">Depois</p>
              {valoresTexto(e.versao?.conteudo, nomeParam).map(([k, v]) => {
                const antes = valoresTexto(e.anterior?.conteudo, nomeParam).find(x => x[0] === k)?.[1];
                return <p key={k} className={antes !== v ? 'font-black text-destructive' : ''}>{k}: {v}</p>;
              })}</div>
          </div>
          <label className="mt-2 flex items-center gap-2 font-bold">
            <Checkbox checked={!!e.versao?.ciente_em} disabled={!!e.versao?.ciente_em}
              onCheckedChange={c => c && rpc('apoio_analise_ciente_retificacao', { _pe: e.id }, 'Retificação confirmada')} />
            Confirmo a retificação
          </label>
        </div>
      )}

      {(pdfs.length > 0 || graficos.length > 0 || e.exige_pdf) && (
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="mb-2 text-[10px] font-black uppercase text-muted-foreground">Documentos do apoio</p>
          <div className="flex flex-wrap gap-3">
            {[...pdfs, ...graficos].map(d => (
              <button key={d.id} type="button" onClick={() => urls[d.id] && setTela(urls[d.id])}
                className="flex h-40 w-32 flex-col overflow-hidden rounded border border-border bg-muted text-left hover:border-primary">
                {urls[d.id] ? (d.tipo === 'grafico' ? <img src={urls[d.id]} alt="Gráfico do apoio" className="h-full w-full object-contain" />
                  : <iframe title="PDF do apoio" src={`${urls[d.id]}#toolbar=0&view=FitH`} className="pointer-events-none h-full w-full" />)
                  : <FileText className="m-auto h-8 w-8 text-muted-foreground" />}
                <span className="truncate px-1 text-[9px] font-bold uppercase">{d.tipo === 'grafico' ? 'Gráfico' : 'Laudo PDF'}</span>
              </button>
            ))}
            {e.exige_pdf && !temPdf(e) && <p className="text-xs font-bold text-destructive">PDF do laudo ainda não disponível.</p>}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-bold">Exame realizado por: {e.apoio_nome}</span>
        <Input className="h-8 max-w-xs text-xs" placeholder="Executor informado no laudo do apoio (opcional)" value={executor} onChange={ev => onExecutor(ev.target.value)} />
      </div>

      <Dialog open={!!tela} onOpenChange={o => !o && setTela(null)}>
        <DialogContent className="z-[300] h-[90vh] max-w-5xl p-2">{tela && <iframe title="Documento do apoio" src={tela} className="h-full w-full" />}</DialogContent>
      </Dialog>
      <Dialog open={!!escolha} onOpenChange={o => !o && setEscolha(null)}>
        <DialogContent className="z-[300]">
          <DialogHeader><DialogTitle>{escolha?.usar === 'integracao' ? 'Usar o resultado da integração' : 'Usar o resultado digitado'}</DialogTitle></DialogHeader>
          <Textarea placeholder="Motivo*" value={escolha?.motivo || ''} onChange={ev => setEscolha(s => s && { ...s, motivo: ev.target.value })} />
          <DialogFooter><Button variant="outline" onClick={() => setEscolha(null)}>Voltar</Button>
            <Button disabled={(escolha?.motivo.trim().length || 0) < 3} onClick={async () => {
              if (escolha && await rpc('apoio_analise_resolver_divergencia', { _pe: e.id, _usar: escolha.usar, _motivo: escolha.motivo }, 'Versão escolhida')) setEscolha(null);
            }}>Confirmar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
