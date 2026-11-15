import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ArrowDown, ArrowUp, FileDown, FileSpreadsheet, Minus } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { Cor } from '@/lib/painelOperacional'
import { tatPreAnalitico, tatRel, type ExameRel, type PeriodoRel, type Variacao } from '@/lib/relatoriosGerenciais'

export const COR_TEXTO: Record<Cor, string> = { verde: 'text-success', amarelo: 'text-warning', vermelho: 'text-destructive' }
export const COR_BORDA: Record<Cor, string> = { verde: 'border-success/40', amarelo: 'border-warning/50', vermelho: 'border-destructive/50' }

export const PERIODOS_REL: { value: PeriodoRel; label: string }[] = [
  { value: 'hoje', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: 'mes', label: 'Este mês' },
  { value: 'mes_anterior', label: 'Mês anterior' },
  { value: 'personalizado', label: 'Personalizado' },
]

export const fmtNum = (n: number | null, casas = 0) =>
  n === null || !Number.isFinite(n) ? '—' : n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
export const fmtMin = (n: number | null) => (n === null ? '—' : `${Math.round(n)} min`)
export const fmtPct = (n: number | null) => (n === null ? '—' : `${fmtNum(n, 1)}%`)

export interface FiltrosRel {
  periodo: PeriodoRel
  de: string
  ate: string
  bancada: string
}

export function BarraFiltros({ filtros, onChange, bancadas, onPdf, onExcel, exportando }: {
  filtros: FiltrosRel
  onChange: (f: FiltrosRel) => void
  bancadas: { id: string; name: string }[]
  onPdf: () => void
  onExcel: () => void
  exportando: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-sm">
      <span className="text-xs font-medium text-muted-foreground">Período:</span>
      <Select value={filtros.periodo} onValueChange={v => onChange({ ...filtros, periodo: v as PeriodoRel })}>
        <SelectTrigger className="h-9 w-40" aria-label="Período"><SelectValue /></SelectTrigger>
        <SelectContent>{PERIODOS_REL.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
      </Select>
      {filtros.periodo === 'personalizado' && (
        <>
          <Input type="date" aria-label="De" className="h-9 w-40" value={filtros.de} onChange={e => onChange({ ...filtros, de: e.target.value })} />
          <span className="text-xs text-muted-foreground">até</span>
          <Input type="date" aria-label="Até" className="h-9 w-40" value={filtros.ate} onChange={e => onChange({ ...filtros, ate: e.target.value })} />
        </>
      )}
      <span className="mx-1 h-4 w-px bg-border" />
      <span className="text-xs font-medium text-muted-foreground">Bancada:</span>
      <Select value={filtros.bancada} onValueChange={v => onChange({ ...filtros, bancada: v })}>
        <SelectTrigger className="h-9 w-48" aria-label="Bancada"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas as bancadas</SelectItem>
          {bancadas.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <div className="ml-auto flex gap-2">
        <Button variant="outline" size="sm" onClick={onPdf} disabled={exportando}><FileDown className="mr-1.5 h-4 w-4" />Exportar PDF</Button>
        <Button variant="outline" size="sm" onClick={onExcel} disabled={exportando}><FileSpreadsheet className="mr-1.5 h-4 w-4" />Exportar Excel</Button>
      </div>
    </div>
  )
}

export function SetaVariacao({ v, melhorQuandoSobe, comparacao }: { v: Variacao | null; melhorQuandoSobe: boolean; comparacao: string }) {
  if (!v) return <span className="text-[11px] text-muted-foreground">sem base {comparacao}</span>
  const bom = v.direcao === 'igual' ? null : (v.direcao === 'sobe') === melhorQuandoSobe
  const Icone = v.direcao === 'sobe' ? ArrowUp : v.direcao === 'desce' ? ArrowDown : Minus
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[11px] font-semibold', bom === null ? 'text-muted-foreground' : bom ? 'text-success' : 'text-destructive')}>
      <Icone className="h-3 w-3" />{v.texto} <span className="font-normal text-muted-foreground">{comparacao}</span>
    </span>
  )
}

export function KpiCard({ titulo, valor, detalhe, cor, variacao, melhorQuandoSobe = true, comparacao, serie, destaque, onClick }: {
  titulo: string
  valor: string
  detalhe?: string
  cor?: Cor | null
  variacao?: Variacao | null
  melhorQuandoSobe?: boolean
  comparacao: string
  serie?: { dia: string; v: number | null }[]
  destaque?: boolean
  /** Card clicável: abre a lista dos exames que entram no número. */
  onClick?: () => void
}) {
  return (
    <div
      className={cn('rounded-2xl border bg-card p-4 shadow-sm', cor ? COR_BORDA[cor] : 'border-border', destaque && 'bg-destructive/5',
        onClick && 'cursor-pointer transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}
      {...(onClick ? { role: 'button', tabIndex: 0, title: 'Clique para ver os exames', onClick,
        onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } } : {})}>
      <p className="text-xs font-medium text-muted-foreground">{titulo}</p>
      <p className={cn('mt-1 text-2xl font-bold', cor ? COR_TEXTO[cor] : 'text-foreground')}>{valor}</p>
      {detalhe && <p className="text-[11px] text-muted-foreground">{detalhe}</p>}
      {variacao !== undefined && <div className="mt-1"><SetaVariacao v={variacao} melhorQuandoSobe={melhorQuandoSobe} comparacao={comparacao} /></div>}
      {serie && (
        <div className="mt-2 h-10" aria-label="Últimos 7 dias">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={serie.map(s => ({ dia: s.dia.slice(8, 10) + '/' + s.dia.slice(5, 7), v: s.v }))}>
              <Tooltip
                formatter={(v: any) => [v === null || v === undefined ? '—' : fmtNum(Number(v), 1), titulo]}
                labelFormatter={(l: any) => l}
                contentStyle={{ borderRadius: 8, fontSize: 11, border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
              />
              <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export function Bloco({ titulo, subtitulo, children, acao }: { titulo: string; subtitulo?: string; children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{titulo}</h3>
          {subtitulo && <p className="text-xs text-muted-foreground">{subtitulo}</p>}
        </div>
        {acao}
      </div>
      {children}
    </div>
  )
}

export const tooltipStyle = { borderRadius: 12, border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', fontSize: 12 }

const LOTE_LISTA = 200

/** Lista de exames (cards clicáveis e analistas). Mostra em lotes de 200, sem esconder nenhum. */
export function ListaExamesDialog({ titulo, exames, nomeBancada, onClose }: {
  titulo: string | null
  exames: ExameRel[]
  nomeBancada: (id: string) => string
  onClose: () => void
}) {
  const [limite, setLimite] = useState(LOTE_LISTA)
  useEffect(() => { setLimite(LOTE_LISTA) }, [titulo])
  const fmt = (t: number | null) => (t ? format(t, 'dd/MM/yyyy HH:mm') : '—')
  const visiveis = exames.slice(0, limite)
  return (
    <Dialog open={titulo !== null} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader><DialogTitle>{titulo} — {fmtNum(exames.length)} exame(s)</DialogTitle></DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          {exames.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Nenhum exame.</p> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2">Pedido</th><th className="px-3 py-2">Exame</th><th className="px-3 py-2">Bancada</th>
                  <th className="px-3 py-2">Recebido</th><th className="px-3 py-2">Coleta</th><th className="px-3 py-2">Liberação</th>
                  <th className="px-3 py-2 text-right">Pré-analítico</th><th className="px-3 py-2 text-right">TAT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visiveis.map(e => (
                  <tr key={e.chave}>
                    <td className="px-3 py-2 font-mono text-xs">{e.protocolo || '—'}{e.urgente && <span className="ml-1 font-sans text-[10px] font-semibold text-destructive">URG</span>}</td>
                    <td className="px-3 py-2">{e.exame}</td>
                    <td className="px-3 py-2 text-muted-foreground">{nomeBancada(e.bancadaId)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmt(e.pedidoEm)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmt(e.coletaEm)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmt(e.liberadoEm)}</td>
                    <td className="px-3 py-2 text-right">{fmtMin(tatPreAnalitico(e))}</td>
                    <td className="px-3 py-2 text-right">{fmtMin(tatRel(e))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ScrollArea>
        {exames.length > limite && (
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setLimite(l => l + LOTE_LISTA)}>Mostrar mais {fmtNum(Math.min(LOTE_LISTA, exames.length - limite))}</Button>
            <Button variant="ghost" size="sm" onClick={() => setLimite(exames.length)}>Mostrar todos ({fmtNum(exames.length)})</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
