import { useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { corIndiceHemolise, corTaxaRecoleta, corTaxaRejeicao, resumoRejeicoes, rotuloMotivo, variacao, type ExameRel, type JanelaRel } from '@/lib/relatoriosGerenciais'
import { exportarElementoPdf, exportarPlanilha } from '@/lib/exportarRelatorio'
import { BarraFiltros, Bloco, KpiCard, fmtNum, fmtPct, tooltipStyle, type FiltrosRel } from './comum'

const CORES_PIZZA = ['hsl(var(--destructive))', 'hsl(var(--warning))', 'hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--success))', 'hsl(var(--muted-foreground))', 'hsl(var(--accent-foreground))']

export function RejeicoesTab({ exames, janela, filtros, setFiltros, bancadas, nomeBancada, rotuloPeriodo }: {
  exames: ExameRel[]
  janela: JanelaRel
  filtros: FiltrosRel
  setFiltros: (f: FiltrosRel) => void
  bancadas: { id: string; name: string }[]
  nomeBancada: (id: string) => string
  rotuloPeriodo: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [exportando, setExportando] = useState(false)
  const [motivoAberto, setMotivoAberto] = useState<string | null>(null)
  const base = useMemo(() => exames.filter(e => filtros.bancada === 'todas' || e.bancadaId === filtros.bancada), [exames, filtros.bancada])
  const r = useMemo(() => resumoRejeicoes(base, janela.inicio, janela.fim), [base, janela])
  const ant = useMemo(() => resumoRejeicoes(base, janela.anteriorInicio, janela.anteriorFim), [base, janela])
  const cor = corTaxaRejeicao(r.taxa)
  const fmtData = (t: number | null) => (t ? format(t, 'dd/MM/yyyy HH:mm') : '—')
  const listaMotivo = useMemo(() => (motivoAberto === null ? [] : r.lista.filter(e => rotuloMotivo(e.motivo) === motivoAberto)), [r.lista, motivoAberto])

  const nomeArquivo = `rejeicoes_${format(janela.inicio, 'yyyy-MM-dd')}_${format(janela.fim, 'yyyy-MM-dd')}`
  const linhaPlanilha = (e: ExameRel) => ({ Pedido: e.protocolo, Paciente: e.paciente, Exame: e.exame, Bancada: nomeBancada(e.bancadaId), Motivo: rotuloMotivo(e.motivo), Data: fmtData(e.recoletaEm), Coletador: e.coletador, Origem: e.origem })
  const pdf = async () => {
    if (!ref.current) return
    setExportando(true)
    try { await exportarElementoPdf(ref.current, `${nomeArquivo}.pdf`) } catch { toast.error('Não foi possível gerar o PDF.') } finally { setExportando(false) }
  }
  const excel = () => exportarPlanilha([
    { nome: 'Indicadores', linhas: [
      { Indicador: 'Taxa de rejeição (%)', 'Período': r.taxa === null ? '' : Math.round(r.taxa * 100) / 100, 'Período anterior': ant.taxa === null ? '' : Math.round(ant.taxa * 100) / 100 },
      { Indicador: 'Total de rejeições', 'Período': r.total, 'Período anterior': ant.total },
      { Indicador: 'Amostras no período', 'Período': r.base, 'Período anterior': ant.base },
      { Indicador: 'Índice de hemólise (%)', 'Período': r.indiceHemolise === null ? '' : Math.round(r.indiceHemolise * 100) / 100, 'Período anterior': ant.indiceHemolise === null ? '' : Math.round(ant.indiceHemolise * 100) / 100 },
      { Indicador: 'Taxa de recoleta (%)', 'Período': r.taxaRecoleta === null ? '' : Math.round(r.taxaRecoleta * 100) / 100, 'Período anterior': ant.taxaRecoleta === null ? '' : Math.round(ant.taxaRecoleta * 100) / 100 },
      { Indicador: 'Motivo mais frequente', 'Período': r.motivoTop?.nome || '', 'Período anterior': ant.motivoTop?.nome || '' },
    ] },
    { nome: 'Por motivo', linhas: r.porMotivo.map(m => ({ Motivo: m.nome, Rejeições: m.total })) },
    { nome: 'Por origem', linhas: r.porOrigem.map(m => ({ Origem: m.nome, Rejeições: m.total })) },
    { nome: 'Amostras', linhas: r.lista.map(linhaPlanilha) },
  ], `${nomeArquivo}.xlsx`)

  return (
    <div className="space-y-6">
      <BarraFiltros filtros={filtros} onChange={setFiltros} bancadas={bancadas} onPdf={pdf} onExcel={excel} exportando={exportando} />
      <div ref={ref} className="space-y-6 bg-background">
        <p className="text-xs text-muted-foreground">{rotuloPeriodo} · {filtros.bancada === 'todas' ? 'Todas as bancadas' : nomeBancada(filtros.bancada)} · rejeição = recoleta solicitada (com motivo) no período.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard titulo="Taxa de rejeição" valor={r.taxa === null ? '—' : `${fmtNum(r.taxa, 2)}%`} cor={cor}
            detalhe={`${fmtNum(r.total)} de ${fmtNum(r.base)} amostras · verde < 0,6% · vermelho > 1%`}
            variacao={variacao(r.taxa, ant.taxa, 'pp')} melhorQuandoSobe={false} comparacao={janela.comparacao} />
          <KpiCard titulo="Total de rejeições" valor={fmtNum(r.total)} variacao={variacao(r.total, ant.total, 'pct')} melhorQuandoSobe={false} comparacao={janela.comparacao} />
          <KpiCard titulo="Motivo mais frequente" valor={r.motivoTop?.nome || '—'} detalhe={r.motivoTop ? `${r.motivoTop.total} rejeição(ões) · ${fmtPct((r.motivoTop.total / r.total) * 100)}` : undefined} comparacao={janela.comparacao} />
          <KpiCard titulo="Índice de hemólise" valor={r.indiceHemolise === null ? '—' : `${fmtNum(r.indiceHemolise, 2)}%`} cor={corIndiceHemolise(r.indiceHemolise)}
            detalhe={`${fmtNum(r.hemolise)} de ${fmtNum(r.base)} amostras · meta < 2% · vermelho > 3%`}
            variacao={variacao(r.indiceHemolise, ant.indiceHemolise, 'pp')} melhorQuandoSobe={false} comparacao={janela.comparacao} />
          <KpiCard titulo="Taxa de recoleta" valor={r.taxaRecoleta === null ? '—' : `${fmtNum(r.taxaRecoleta, 2)}%`} cor={corTaxaRecoleta(r.taxaRecoleta)}
            detalhe={`${fmtNum(r.pedidosRecoleta)} de ${fmtNum(r.pedidosBase)} pedidos com nova coleta · meta < 0,5%`}
            variacao={variacao(r.taxaRecoleta, ant.taxaRecoleta, 'pp')} melhorQuandoSobe={false} comparacao={janela.comparacao} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Bloco titulo="Rejeição por motivo" subtitulo="Clique numa fatia para ver as amostras">
            {r.porMotivo.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma rejeição no período.</p> : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={r.porMotivo} dataKey="total" nameKey="nome" innerRadius={50} outerRadius={95} paddingAngle={2}
                    className="cursor-pointer" onClick={(d: any) => setMotivoAberto(d?.nome ?? d?.payload?.nome ?? null)} isAnimationActive={false}>
                    {r.porMotivo.map((m, i) => <Cell key={m.nome} fill={CORES_PIZZA[i % CORES_PIZZA.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any, n: any) => [v, n]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Bloco>
          <Bloco titulo="Rejeição por origem / posto de coleta">
            {r.porOrigem.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma rejeição no período.</p> : (
              <ResponsiveContainer width="100%" height={Math.max(200, r.porOrigem.length * 34)}>
                <BarChart data={r.porOrigem} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="nome" width={150} tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [v, 'Rejeições']} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
                  <Bar dataKey="total" fill="hsl(var(--destructive))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Bloco>
        </div>

        <Bloco titulo="Amostras rejeitadas" subtitulo={`${fmtNum(r.total)} no período`}>
          <TabelaRejeicoes lista={r.lista} nomeBancada={nomeBancada} fmtData={fmtData} />
        </Bloco>
      </div>

      <Dialog open={motivoAberto !== null} onOpenChange={o => !o && setMotivoAberto(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>{motivoAberto} — {listaMotivo.length} amostra(s)</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[60vh]"><TabelaRejeicoes lista={listaMotivo} nomeBancada={nomeBancada} fmtData={fmtData} /></ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TabelaRejeicoes({ lista, nomeBancada, fmtData }: { lista: ExameRel[]; nomeBancada: (id: string) => string; fmtData: (t: number | null) => string }) {
  if (!lista.length) return <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma amostra rejeitada no período.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-3 py-2">Pedido</th><th className="px-3 py-2">Paciente</th><th className="px-3 py-2">Bancada</th>
            <th className="px-3 py-2">Motivo</th><th className="px-3 py-2">Data</th><th className="px-3 py-2">Coletador</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {lista.map(e => (
            <tr key={e.chave}>
              <td className="px-3 py-2 font-mono text-xs">{e.protocolo || '—'}</td>
              <td className="px-3 py-2">{e.paciente || '—'}<span className="block text-[11px] text-muted-foreground">{e.exame}</span></td>
              <td className="px-3 py-2 text-muted-foreground">{nomeBancada(e.bancadaId)}</td>
              <td className="px-3 py-2">{rotuloMotivo(e.motivo)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{fmtData(e.recoletaEm)}</td>
              <td className="px-3 py-2 text-muted-foreground">{e.coletador || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
