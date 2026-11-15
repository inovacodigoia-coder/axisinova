import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { FileText, Loader2, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/context/AuthContext'
import { useLabSettings } from '@/hooks/useLabSettings'
import { useSorotecaEstanteHistorico, registrarImpressaoSoroteca, useSorotecaFolhaDescarte } from '@/hooks/useSoroteca'
import { LabReportHeader, type LabReportHeaderProps } from '@/components/lab/LabReportHeader'
import {
  dataBR, dataHoraBR, marcaItemFolha, posicaoItemFolha, TIPO_DESCARTE_LABEL, TIPO_MOVIMENTO_ESTANTE, totaisFolha, type FolhaDescarte,
} from '@/lib/soroteca'

/** Imprime só o elemento, num quadro à parte (A4 retrato), sem misturar com outras impressões da página. */
async function imprimirElemento(node: HTMLElement, titulo: string) {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.position = 'fixed'; frame.style.width = '0'; frame.style.height = '0'; frame.style.border = '0'
  document.body.appendChild(frame)
  const win = frame.contentWindow
  if (!win) { frame.remove(); throw new Error('Não foi possível abrir a impressão no navegador') }
  win.document.write(`<!doctype html><html><head><title>${titulo}</title></head><body></body></html>`)
  win.document.close()
  document.querySelectorAll('style,link[rel="stylesheet"]').forEach(el => win.document.head.appendChild(el.cloneNode(true)))
  const st = win.document.createElement('style')
  st.textContent = '@page{size:A4 portrait;margin:12mm} html body > .folha-descarte{display:block!important;visibility:visible!important} html,body{margin:0;background:var(--document-paper);color:var(--document-ink)} .folha-descarte{box-shadow:none!important;padding:0!important;width:100%!important}'
  win.document.head.appendChild(st)
  win.document.body.appendChild(node.cloneNode(true))
  await new Promise<void>(resolve => {
    let fim = false
    const done = () => { if (fim) return; fim = true; frame.remove(); resolve() }
    win.addEventListener('afterprint', done, { once: true })
    win.setTimeout(() => { win.focus(); win.print(); win.setTimeout(done, 1000) }, 400)
  })
}

const celula: React.CSSProperties = { border: '0.5pt solid var(--document-ink)', padding: '3pt 5pt', textAlign: 'left', verticalAlign: 'top' }

/** Folha A4 do descarte: cabeçalho do laboratório, dados do descarte, uma linha por tubo, total e assinatura. */
export function FolhaDescarteDocumento({ folha, header, reimpressao }: { folha: FolhaDescarte; header: LabReportHeaderProps; reimpressao?: boolean }) {
  const { total, marcados } = totaisFolha(folha)
  const info: [string, string][] = [
    ['Data e hora do descarte', dataHoraBR(folha.created_at)],
    ['Tipo', TIPO_DESCARTE_LABEL[folha.tipo]],
    ...(folha.tipo === 'estante' ? [['Estante', folha.estante_codigo || '—'] as [string, string], ['Onde estava', folha.estante_origem || 'Fora da geladeira (em preenchimento)'] as [string, string]] : []),
    ['Responsável', folha.responsavel_nome],
    ['Motivo', [folha.motivo, folha.observacao].filter(Boolean).join(' — ')],
    ...(folha.usuario_nome && folha.usuario_nome !== folha.responsavel_nome ? [['Registrado por', folha.usuario_nome] as [string, string]] : []),
  ]
  return (
    <div className="folha-descarte" style={{ background: 'var(--document-paper)', color: 'var(--document-ink)', fontFamily: "'Times New Roman', Georgia, serif", fontSize: '10pt', padding: '10mm', width: '210mm', maxWidth: '100%', boxSizing: 'border-box' }}>
      <LabReportHeader {...header} />
      <h2 style={{ fontSize: '13pt', fontWeight: 700, textAlign: 'center', margin: '0 0 8pt', textTransform: 'uppercase' }}>
        Folha de descarte de amostras{folha.tipo === 'estante' && folha.estante_codigo ? ` — Estante ${folha.estante_codigo}` : ''}
      </h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8pt' }}>
        <tbody>
          {info.map(([k, v]) => <tr key={k}><th style={{ ...celula, width: '28%' }}>{k}</th><td style={celula}>{v}</td></tr>)}
        </tbody>
      </table>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Nº', 'Posição', 'Amostra', 'Paciente', 'Bancada', 'Coleta', 'Vencimento', 'Atenção'].map(h => <th key={h} style={celula}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {folha.itens.map(i => {
            const marca = marcaItemFolha(i)
            return (
              <tr key={i.ordem} style={marca ? { fontWeight: 700 } : undefined}>
                <td style={celula}>{i.ordem}</td>
                <td style={celula}>{posicaoItemFolha(folha.tipo, i)}</td>
                <td style={{ ...celula, fontFamily: 'monospace' }}>{i.codigo_amostra}</td>
                <td style={celula}>{i.patient_name || '—'}</td>
                <td style={celula}>{i.bancada_nome || '—'}</td>
                <td style={celula}>{dataBR(i.coletada_em)}</td>
                <td style={celula}>{dataBR(i.validade)}</td>
                <td style={celula}>{marca ? `* ${marca}` : ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p style={{ marginTop: '8pt' }}>
        <strong>Total de tubos descartados: {total}</strong>
        {marcados ? ` · ${marcados} marcado(s) com * foram descartados com exame pendente ou ainda dentro do prazo.` : ''}
      </p>
      <div style={{ marginTop: '40pt', width: '60%', marginLeft: 'auto', marginRight: 'auto', textAlign: 'center' }}>
        <div style={{ borderTop: '0.5pt solid var(--document-ink)', paddingTop: '4pt' }}>{folha.responsavel_nome}</div>
        <div>Responsável pelo descarte</div>
      </div>
      <p style={{ marginTop: '14pt', fontSize: '8pt' }}>
        {reimpressao ? `Reimpressão emitida em ${dataHoraBR(new Date().toISOString())}. ` : ''}Descarte registrado na Soroteca; os tubos continuam no histórico de rastreabilidade.
      </p>
    </div>
  )
}

/** Cabeçalho igual ao dos outros relatórios do laboratório. */
function useCabecalhoLaboratorio(): { header: LabReportHeaderProps; carregando: boolean } {
  const { user } = useAuth()
  const { settings, isLoading } = useLabSettings()
  return {
    carregando: isLoading,
    header: {
      companyLogo: settings?.report_logo_primary_url || undefined,
      secondaryLogo: settings?.report_logo_secondary_url || undefined,
      laboratoryName: settings?.report_header_title || settings?.lab_name || user?.companyName || 'LABORATÓRIO',
      laboratorySubtitle: settings?.report_header_subtitle || undefined,
      headerStyle: (settings as any)?.report_header_style,
    },
  }
}

/** Prévia + "Imprimir" da folha de descarte (logo após descartar ou reimpressão). */
export function FolhaDescarteDialog({ alvo, reimpressao, onClose }: {
  alvo: { descarteId?: string | null; amostraId?: string | null } | null
  reimpressao?: boolean
  onClose: () => void
}) {
  const q = useSorotecaFolhaDescarte(alvo)
  const { header, carregando } = useCabecalhoLaboratorio()
  const ref = useRef<HTMLDivElement>(null)
  const [imprimindo, setImprimindo] = useState(false)
  const folha = q.data

  const imprimir = async () => {
    const node = ref.current?.querySelector('.folha-descarte') as HTMLElement | null
    if (!node || !folha) return
    setImprimindo(true)
    try {
      await imprimirElemento(node, `Folha de descarte ${folha.estante_codigo || ''}`.trim())
      await registrarImpressaoSoroteca('folha_descarte', folha.id)
    }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível imprimir') }
    finally { setImprimindo(false) }
  }

  return (
    <Dialog open={!!alvo} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[92vh] w-[95vw] max-w-[900px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{reimpressao ? 'Reimprimir folha de descarte' : 'Folha de descarte'}</DialogTitle>
          <DialogDescription>A4 retrato. Assine e guarde junto com os registros do laboratório.</DialogDescription>
        </DialogHeader>
        {q.isLoading || carregando ? <Skeleton className="h-96" /> : q.error ? (
          <p className="text-sm text-destructive" role="alert">{(q.error as Error).message}</p>
        ) : folha && (
          <div ref={ref} className="overflow-x-auto rounded-md bg-muted p-3">
            <FolhaDescarteDocumento folha={folha} header={header} reimpressao={reimpressao} />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={imprimir} disabled={!folha || imprimindo}>
            {imprimindo ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Printer className="mr-1.5 h-4 w-4" />}Imprimir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Histórico da estante, com reimpressão da folha de cada descarte. */
export function EstanteHistoricoDialog({ estante, onClose }: { estante: { id: string; codigo?: string | null } | null; onClose: () => void }) {
  const q = useSorotecaEstanteHistorico(estante?.id ?? null)
  const [folha, setFolha] = useState<string | null>(null)
  return (
    <>
      <Dialog open={!!estante} onOpenChange={o => !o && onClose()}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico da estante {estante?.codigo || ''}</DialogTitle>
            <DialogDescription>Criação, idas à geladeira, descartes e inativações.</DialogDescription>
          </DialogHeader>
          {q.isLoading ? <Skeleton className="h-40" /> : q.error ? <p className="text-sm text-destructive">{(q.error as Error).message}</p> : !q.data?.length ? (
            <p className="text-sm text-muted-foreground">Sem registros.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Quando</TableHead><TableHead>Evento</TableHead><TableHead>Detalhes</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {q.data.map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap text-xs">{dataHoraBR(m.quando)}</TableCell>
                    <TableCell className="text-sm font-medium">{TIPO_MOVIMENTO_ESTANTE[m.tipo]}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {[
                        [m.equipamento_nome, m.prateleira_nome].filter(Boolean).join(' > '),
                        m.tipo === 'descartada' ? `${m.tubos} tubo(s)` : '',
                        m.motivo ? `Motivo: ${[m.motivo, m.observacao].filter(Boolean).join(' — ')}` : '',
                        m.destino ? (m.destino === 'reaproveitar' ? 'Reaproveitada' : 'Inativada') : '',
                        m.responsavel_nome || m.usuario_nome ? `Responsável: ${m.responsavel_nome || m.usuario_nome}` : '',
                      ].filter(Boolean).join(' · ')}
                    </TableCell>
                    <TableCell className="text-right">
                      {m.descarte_id && <Button size="sm" variant="outline" onClick={() => setFolha(m.descarte_id)}><FileText className="mr-1 h-3.5 w-3.5" />Folha</Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
      <FolhaDescarteDialog alvo={folha ? { descarteId: folha } : null} reimpressao onClose={() => setFolha(null)} />
    </>
  )
}
