import { useMemo } from 'react'
import { CheckCircle2, Printer, ReceiptText, XCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { maskCpf } from '@/types/api-partner-orders.types'

export interface ReportRow {
  patientName: string
  cpf: string
  partnerName: string
  examsCount: number
  status: 'received' | 'processed' | 'error'
  attendanceProtocol?: string
  errorMessage?: string
  warningMessage?: string
  partnerProtocol?: string
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  subtitle?: string
  companyName: string
  periodLabel?: string
  rows: ReportRow[]
}

const STATUS_TEXT: Record<ReportRow['status'], string> = {
  received: 'Aguardando',
  processed: 'Processado',
  error: 'Erro',
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
}

function openPrintWindow(html: string) {
  const w = window.open('', '_blank', 'width=900,height=700')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 350)
}

export function PartnerOrdersReportModal({
  open, onOpenChange, title, subtitle, companyName, periodLabel, rows,
}: Props) {
  const totals = useMemo(() => ({
    total: rows.length,
    ok: rows.filter(r => r.status === 'processed').length,
    err: rows.filter(r => r.status === 'error').length,
    pend: rows.filter(r => r.status === 'received').length,
  }), [rows])

  const generatedAt = new Date().toLocaleString('pt-BR')

  const printThermal = () => {
    const lines = rows.map(r => `
      <div class="row">
        <div class="name">${escapeHtml(r.patientName)}</div>
        <div class="meta">
          <span>${escapeHtml(r.partnerProtocol || '—')}</span>
          <span>${STATUS_TEXT[r.status]}</span>
        </div>
        <div class="meta"><span>Atend.: ${escapeHtml(r.attendanceProtocol || '—')}</span></div>
      </div>`).join('')

    openPrintWindow(`<!doctype html><html><head><meta charset="utf-8"><title>Recibo</title>
    <style>
      @page { size: 80mm auto; margin: 3mm; }
      body { width: 72mm; font-family: 'Courier New', monospace; font-size: 11px; color: #000; margin: 0; }
      h1 { font-size: 12px; text-align: center; margin: 0 0 2px; text-transform: uppercase; }
      .sub { text-align: center; font-size: 10px; margin-bottom: 4px; }
      hr { border: none; border-top: 1px dashed #000; margin: 4px 0; }
      .row { margin-bottom: 4px; }
      .name { font-weight: bold; text-transform: uppercase; }
      .meta { display: flex; justify-content: space-between; }
      .tot { font-size: 11px; }
    </style></head><body>
      <h1>${escapeHtml(companyName)}</h1>
      <div class="sub">${escapeHtml(title)}<br/>${generatedAt}</div>
      <hr/>
      ${lines || '<div>Nenhum pedido.</div>'}
      <hr/>
      <div class="tot">Total: ${totals.total}</div>
      <div class="tot">Processados: ${totals.ok}</div>
      <div class="tot">Erro: ${totals.err}</div>
      <div class="tot">Aguardando: ${totals.pend}</div>
      <hr/>
      <div class="sub">Conferencia rapida - nao fiscal</div>
    </body></html>`)
  }

  const printA4 = () => {
    const body = rows.map(r => `
      <tr>
        <td>${escapeHtml(r.partnerName)}</td>
        <td>${escapeHtml(r.patientName)}</td>
        <td>${escapeHtml(maskCpf(r.cpf))}</td>
        <td class="c">${r.examsCount}</td>
        <td>${STATUS_TEXT[r.status]}</td>
        <td>${escapeHtml(r.attendanceProtocol || '—')}</td>
        <td>${escapeHtml(r.errorMessage || '—')}</td>
      </tr>`).join('')

    openPrintWindow(`<!doctype html><html><head><meta charset="utf-8"><title>Relatório</title>
    <style>
      @page { size: A4; margin: 14mm; }
      body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1A202C; margin: 0; }
      header { border-bottom: 2px solid #00D4FF; padding-bottom: 8px; margin-bottom: 12px; }
      h1 { font-size: 18px; margin: 0 0 2px; }
      .muted { color: #718096; font-size: 11px; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #F5F7FA; text-align: left; font-size: 10px; text-transform: uppercase; color: #718096; }
      th, td { border: 1px solid #E2E8F0; padding: 5px 6px; vertical-align: top; }
      td.c { text-align: center; }
      footer { margin-top: 14px; display: flex; gap: 18px; font-weight: bold; font-size: 12px; }
    </style></head><body>
      <header>
        <h1>${escapeHtml(companyName)}</h1>
        <div class="muted">${escapeHtml(title)}${subtitle ? ' — ' + escapeHtml(subtitle) : ''}</div>
        <div class="muted">Gerado em ${generatedAt}${periodLabel ? ' · Período: ' + escapeHtml(periodLabel) : ''}</div>
      </header>
      <table>
        <thead><tr>
          <th>Parceiro</th><th>Paciente</th><th>CPF</th><th>Exames</th><th>Status</th><th>Atendimento</th><th>Motivo do erro</th>
        </tr></thead>
        <tbody>${body || '<tr><td colspan="7">Nenhum pedido no filtro atual.</td></tr>'}</tbody>
      </table>
      <footer>
        <span>Total: ${totals.total}</span>
        <span>Processados: ${totals.ok}</span>
        <span>Com erro: ${totals.err}</span>
        <span>Aguardando: ${totals.pend}</span>
      </footer>
    </body></html>`)
  }

  const ok = rows.filter(r => r.status === 'processed')
  const err = rows.filter(r => r.status === 'error')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-hidden p-0">
        <DialogHeader className="border-b p-5 pb-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {subtitle ?? `${totals.total} pedido(s) — ${totals.ok} com sucesso, ${totals.err} com erro`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh]">
          <div className="space-y-5 p-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { l: 'Total', v: totals.total },
                { l: 'Sucesso', v: totals.ok },
                { l: 'Erro', v: totals.err },
                { l: 'Aguardando', v: totals.pend },
              ].map(c => (
                <div key={c.l} className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">{c.l}</p>
                  <p className="text-xl font-bold text-foreground">{c.v}</p>
                </div>
              ))}
            </div>

            {ok.length > 0 && (
              <section className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-[hsl(145,63%,42%)]" /> Criados com sucesso ({ok.length})
                </h3>
                <ul className="divide-y rounded-lg border">
                  {ok.map((r, i) => (
                    <li key={i} className="p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate">{r.patientName}</span>
                        <span className="font-medium text-primary">{r.attendanceProtocol ?? '—'}</span>
                      </div>
                      {r.warningMessage && (
                        <p className="mt-1 text-xs text-amber-600">{r.warningMessage}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {err.length > 0 && (
              <section className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <XCircle className="h-4 w-4 text-destructive" /> Com erro ({err.length})
                </h3>
                <ul className="divide-y rounded-lg border">
                  {err.map((r, i) => (
                    <li key={i} className="p-3 text-sm">
                      <p className="font-medium text-foreground">{r.patientName}</p>
                      <p className="text-xs text-destructive">{r.errorMessage ?? 'Erro no processamento.'}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </ScrollArea>

        <div className="flex flex-col gap-2 border-t p-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={printThermal} className="gap-2">
            <ReceiptText className="h-4 w-4" /> Imprimir Recibo Térmico
          </Button>
          <Button onClick={printA4} className="gap-2">
            <Printer className="h-4 w-4" /> Imprimir Relatório A4
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
