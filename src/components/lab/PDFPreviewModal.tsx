import React from 'react';
import { createPortal } from 'react-dom';
import { Button } from "@/components/ui/button";
import { FileText, Download, X, Printer, ZoomIn, ZoomOut, Maximize2, Minimize2, Share2, Mail, Pencil, Save, RotateCcw, Bold, Italic, Underline as UnderlineIcon } from 'lucide-react';

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import LaudoDocument from './LaudoDocument';
import { LabAttendanceOrder } from '@/types/lab.types';
import { useLabSettings } from '@/hooks/useLabSettings';
import { useExamReportConfig } from '@/hooks/useExamReportConfig';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ServidorImpressaoStatus } from '@/components/print/ServidorImpressaoStatus';
import { servidorImpressaoAtivo, imprimirDireto, TIPOS_DOCUMENTO } from '@/lib/impressaoLocal';
import { gerarPdfElementos } from '@/lib/labelPdf';


interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Partial<LabAttendanceOrder>;
  onDownload: () => void;
  onPrint?: () => void;
  onEmail?: () => void;
  onShare?: () => void;
  hideEditLaudo?: boolean;
  viewOnly?: boolean;
}

export default function PDFPreviewModal({
  isOpen,
  onClose,
  order,
  onDownload,
  onPrint,
  onEmail,
  onShare,
  hideEditLaudo = false,
  viewOnly = false
}: PDFPreviewModalProps) {
  const { settings: labSettings } = useLabSettings();
  const { user } = useAuth();
  const { enrichExams } = useExamReportConfig();
  const [zoom, setZoom] = React.useState(100);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const enrichedOrder = React.useMemo(
    () => ({ ...order, exams: enrichExams((order as any)?.exams || []) }),
    [order, enrichExams],
  );

  const isAdmin = user?.role === 'company_admin' || user?.role === 'super_admin';
  const documentRef = React.useRef<HTMLDivElement>(null);
  const overlayMouseDown = React.useRef(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [savedHtml, setSavedHtml] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const protocol = (order as any)?.protocol as string | undefined;

  // Carrega uma versão editada do laudo (se existir)
  React.useEffect(() => {
    let active = true;
    if (!isOpen || !protocol || !user?.companyId) return;
    (async () => {
      const { data } = await supabase
        .from('lab_report_overrides')
        .select('html')
        .eq('company_id', user.companyId)
        .eq('protocol', protocol)
        .maybeSingle();
      if (active) setSavedHtml((data as any)?.html ?? null);
    })();
    return () => { active = false; };
  }, [isOpen, protocol, user?.companyId]);

  React.useEffect(() => {
    if (!isOpen) { setIsEditing(false); }
  }, [isOpen]);

  const exec = (command: string) => document.execCommand(command, false);

  const handleSaveEdits = async () => {
    if (!documentRef.current || !protocol || !user?.companyId) {
      toast.error('Não foi possível identificar o laudo para salvar.');
      return;
    }
    setSaving(true);
    try {
      const html = documentRef.current.innerHTML;
      const { error } = await supabase
        .from('lab_report_overrides')
        .upsert(
          { company_id: user.companyId, protocol, html, updated_by: user.id },
          { onConflict: 'company_id,protocol' },
        );
      if (error) throw error;
      setSavedHtml(html);
      setIsEditing(false);
      toast.success('Alterações do laudo salvas.');
    } catch (e: any) {
      console.error('Erro ao salvar laudo editado:', e);
      toast.error(e?.message || 'Erro ao salvar as alterações do laudo.');
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async () => {
    if (!protocol || !user?.companyId) return;
    setSaving(true);
    try {
      await supabase
        .from('lab_report_overrides')
        .delete()
        .eq('company_id', user.companyId)
        .eq('protocol', protocol);
      setSavedHtml(null);
      setIsEditing(false);
      toast.success('Laudo restaurado para o original.');
    } finally {
      setSaving(false);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));
  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  // Imprime somente o documento do laudo (A4, sem modal/tela)
  const printLaudoOnly = React.useCallback((): Promise<void> => {
    if (!documentRef.current) {
      toast.error('Laudo ainda não carregou. Aguarde um instante e tente novamente.');
      return Promise.resolve();
    }
    // remove resíduos de impressões anteriores
    window.document.getElementById('laudo-print-root')?.remove();
    const body = window.document.body;
    const root = window.document.createElement('div');
    root.id = 'laudo-print-root';
    root.innerHTML = documentRef.current.innerHTML;
    const printStyle = window.document.createElement('style');
    printStyle.textContent = '@media print { @page { size: A4 portrait; margin: 0; } }';
    root.appendChild(printStyle);
    body.appendChild(root);
    body.classList.add('printing-laudo');

    return new Promise<void>((resolve) => {
      let done = false;
      const cleanup = () => {
        if (done) return;
        done = true;
        body.classList.remove('printing-laudo');
        root.remove();
        // pequena folga para descartar o clique residual do diálogo de impressão
        setTimeout(resolve, 300);
      };
      window.addEventListener('afterprint', cleanup, { once: true });
      setTimeout(() => {
        try {
          window.print();
        } catch {
          /* ignora */
        }
        setTimeout(cleanup, 1500);
      }, 120);
    });
  }, []);

  // Impressão do laudo: usa o Servidor de Impressão local quando estiver ativo
  const [enviandoImpressao, setEnviandoImpressao] = React.useState(false);

  const handlePrintLaudo = React.useCallback(async () => {
    if (enviandoImpressao) return;
    setEnviandoImpressao(true);
    let usouFallback = false;
    const fallback = async () => {
      if (usouFallback) return;
      usouFallback = true;
      if (onPrint) onPrint();
      else await printLaudoOnly();
    };
    try {
      const ativo = await servidorImpressaoAtivo();
      if (ativo && documentRef.current) {
        const pages = Array.from(
          documentRef.current.querySelectorAll<HTMLElement>('.laudo-page'),
        );
        const nodes = pages.length ? pages : [documentRef.current];
        const pdf = await gerarPdfElementos(nodes, 210);
        const r = await imprimirDireto(TIPOS_DOCUMENTO.laudo, pdf);
        toast.success(r.mensagem || 'Laudo enviado para a impressora.');
        return;
      }
      await fallback();
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao imprimir pelo servidor local. Usando a impressão do navegador.');
      try {
        await fallback();
      } catch {
        /* ignora */
      }
    } finally {
      setEnviandoImpressao(false);
    }
  }, [enviandoImpressao, onPrint, printLaudoOnly]);



  // Download do laudo em PDF (gera o arquivo a partir do documento exibido)
  const [baixandoPdf, setBaixandoPdf] = React.useState(false);

  const handleDownloadPdf = React.useCallback(async () => {
    if (baixandoPdf) return;
    if (!documentRef.current) {
      toast.error('Laudo ainda não carregou. Aguarde um instante e tente novamente.');
      return;
    }
    setBaixandoPdf(true);
    try {
      const pages = Array.from(
        documentRef.current.querySelectorAll<HTMLElement>('.laudo-page'),
      );
      const nodes = pages.length ? pages : [documentRef.current];
      const blob = await gerarPdfElementos(nodes, 210);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `laudo-${protocol || 'documento'}.pdf`;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast.success('Laudo baixado em PDF.');
    } catch (e: any) {
      console.error('Erro ao gerar PDF do laudo:', e);
      toast.error(e?.message || 'Não foi possível gerar o PDF do laudo.');
    } finally {
      setBaixandoPdf(false);
    }
  }, [baixandoPdf, protocol]);

  // Container próprio do portal: impede que cliques/teclas dentro do laudo
  // sejam interpretados como "clique fora" pelo modal que abriu esta janela
  // (era isso que fechava tudo ao clicar no título/cabeçalho).
  const [portalHost, setPortalHost] = React.useState<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const host = window.document.createElement('div');
    host.setAttribute('data-laudo-preview', '');
    // Este preview é aberto sobre outro Dialog (recepção/digitação). O Radix
    // bloqueia pointer-events no body enquanto o Dialog pai está aberto; como
    // este portal fica fora dele, precisamos reabilitar os eventos no host.
    host.style.pointerEvents = 'auto';
    host.style.position = 'relative';
    host.style.zIndex = '9999';
    window.document.body.appendChild(host);
    setPortalHost(host);
    return () => {
      setPortalHost(null);
      host.remove();
    };
  }, [isOpen]);

  React.useEffect(() => {
    if (!portalHost) return;
    const stop = (event: Event) => event.stopPropagation();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        if (!enviandoImpressao) onClose();
        return;
      }
      event.stopPropagation();
    };
    const events: (keyof DocumentEventMap)[] = [
      'pointerdown', 'mousedown', 'mouseup', 'click', 'touchstart', 'focusin', 'focusout',
    ];
    events.forEach((name) => portalHost.addEventListener(name, stop));
    portalHost.addEventListener('keydown', onKeyDown);
    return () => {
      events.forEach((name) => portalHost.removeEventListener(name, stop));
      portalHost.removeEventListener('keydown', onKeyDown);
    };
  }, [portalHost, onClose, enviandoImpressao]);


  // Status mapping
  const getStatusBadge = () => {
    const status = order.exams?.[0]?.status; // Simplified check
    switch (status) {
      case 'validated':
      case 'liberado':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Liberado</Badge>;
      case 'waiting_approval':
        return <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">Aprovado Tecnicamente</Badge>;
      default:
        return <Badge variant="outline">Em Processamento</Badge>;
    }
  };

  if (!isOpen || !portalHost) return null;

  return createPortal(
    <div
      className="pointer-events-auto fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950/80 p-2 md:p-4"
      onMouseDown={(event) => {
        // só marca intenção de fechar se o clique começou no fundo escuro
        overlayMouseDown.current = event.target === event.currentTarget;
      }}
      onMouseUp={(event) => {
        const started = overlayMouseDown.current;
        overlayMouseDown.current = false;
        if (!started || event.target !== event.currentTarget) return;
        if (enviandoImpressao) return;
        onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="laudo-preview-title"
        onMouseDown={(event) => event.stopPropagation()}
        className={cn(
          "flex flex-col overflow-hidden border bg-background shadow-2xl transition-all duration-300",
          isFullscreen ? "h-screen w-screen rounded-none" : "h-[90dvh] w-full max-w-[1000px] rounded-lg"
        )}
      >
        <header className="p-4 border-b bg-muted/30 no-print">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h2 id="laudo-preview-title" className="text-lg font-semibold">Visualização do Laudo</h2>
                <p className="text-xs text-muted-foreground">{order.patientName} • {order.protocol}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 pr-8">
              <ServidorImpressaoStatus />
              {getStatusBadge()}
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 bg-zinc-700/50 p-4 md:p-8 overflow-hidden flex flex-col items-center relative">
          {/* Zoom Controls Overlay */}
          <div className="absolute top-4 right-4 flex gap-2 z-10 no-print bg-zinc-900/80 backdrop-blur-md p-1.5 rounded-lg shadow-xl border border-white/10">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white hover:bg-white/10" onClick={handleZoomOut} disabled={zoom <= 50}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="flex items-center px-2 text-xs font-mono text-zinc-300 min-w-[45px] justify-center">{zoom}%</span>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white hover:bg-white/10" onClick={handleZoomIn} disabled={zoom >= 200}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="w-px bg-white/10 mx-1" />
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white hover:bg-white/10" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>

          {isEditing && (
            <div className="absolute top-4 left-4 flex gap-1 z-10 bg-zinc-900/80 backdrop-blur-md p-1.5 rounded-lg shadow-xl border border-white/10">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white hover:bg-white/10" onMouseDown={(e) => { e.preventDefault(); exec('bold'); }}>
                <Bold className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white hover:bg-white/10" onMouseDown={(e) => { e.preventDefault(); exec('italic'); }}>
                <Italic className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white hover:bg-white/10" onMouseDown={(e) => { e.preventDefault(); exec('underline'); }}>
                <UnderlineIcon className="h-4 w-4" />
              </Button>
              <span className="flex items-center px-2 text-[11px] text-amber-300">Modo edição</span>
            </div>
          )}

          <div className="w-full h-full min-h-0 overflow-auto overscroll-contain touch-pan-x touch-pan-y" data-laudo-scroll>
            <div className="flex justify-center p-4 min-w-max">
              <div 
                className="transition-transform duration-200 shadow-2xl"
                style={{ 
                  // "zoom" redimensiona o layout (diferente de transform: scale),
                  // então a rolagem acompanha a altura real do laudo em qualquer zoom
                  zoom: zoom / 100,
                } as React.CSSProperties}
              >
                <div
                  ref={documentRef}
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  className={cn('laudo-print-area', isEditing && 'outline outline-2 outline-amber-400 rounded-sm')}
                >
                  {savedHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: savedHtml }} />
                  ) : (
                    <LaudoDocument 
                      order={enrichedOrder}
                      companyLogo={labSettings?.report_logo_primary_url || undefined}
                      secondaryLogo={labSettings?.report_logo_secondary_url || undefined}
                      laboratoryName={labSettings?.report_header_title || labSettings?.lab_name || undefined}
                      laboratorySubtitle={labSettings?.report_header_subtitle || undefined}
                      institutionalWarning={labSettings?.report_institutional_warning || undefined}
                      footerText={labSettings?.report_footer_text || undefined}
                      technicalResponsible={{
                        name: labSettings?.signature_name || labSettings?.responsible_name || "",
                        register: labSettings?.signature_include_register === false
                          ? ""
                          : (labSettings?.signature_register || labSettings?.responsible_register || ""),
                        signatureUrl: labSettings?.signature_image_url || undefined,
                      }}
                      isRetified={order.exams?.some(e => e.isRetificado)}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

        <footer className="no-print flex flex-col-reverse gap-2 border-t bg-background p-4 sm:flex-row sm:justify-between">
          <div className="flex gap-2">
            {onEmail && (
              <Button variant="outline" size="sm" onClick={onEmail} className="gap-2">
                <Mail className="h-4 w-4" /> E-mail
              </Button>
            )}
            {onShare && (
              <Button variant="outline" size="sm" onClick={onShare} className="gap-2">
                <Share2 className="h-4 w-4" /> Link Público
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="gap-2">
              <X className="h-4 w-4" /> Fechar
            </Button>
            {isAdmin && (
              isEditing ? (
                <>
                  <Button variant="outline" className="gap-2" onClick={() => setIsEditing(false)} disabled={saving}>
                    <X className="h-4 w-4" /> Cancelar edição
                  </Button>
                  <Button variant="default" className="gap-2" onClick={handleSaveEdits} disabled={saving}>
                    <Save className="h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </>
              ) : (
                <>
                  {savedHtml && (
                    <Button variant="outline" className="gap-2" onClick={handleRestore} disabled={saving}>
                      <RotateCcw className="h-4 w-4" /> Restaurar original
                    </Button>
                  )}
                  {protocol && !hideEditLaudo && (
                    <Button variant="outline" className="gap-2" onClick={() => setIsEditing(true)}>
                      <Pencil className="h-4 w-4" /> Editar laudo
                    </Button>
                  )}
                </>
              )
            )}
            <Button variant="outline" className="gap-2" onClick={handlePrintLaudo} disabled={enviandoImpressao}>
              <Printer className="h-4 w-4" /> {enviandoImpressao ? 'Enviando...' : 'Imprimir'}
            </Button>

            <Button className="gradient-bg text-white gap-2" onClick={handleDownloadPdf} disabled={baixandoPdf}>
              <Download className="h-4 w-4" /> {baixandoPdf ? 'Gerando PDF...' : 'Download PDF'}
            </Button>
          </div>
        </footer>
      </section>
    </div>,
    portalHost,
  );
}
