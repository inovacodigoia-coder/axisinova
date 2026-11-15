import { useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { cn } from '@/lib/utils'
import {
  DIAS_SEMANA, HORAS_MAPA, corTatFase, corUrgNoPrazo, examesDoKpi, kpisProducao, mapaCalor, produtividadeAnalistas, serie7Dias,
  topDaBancada, topPedidos, variacao, volumePorBancada, type ChaveKpi, type ExameRel, type JanelaRel,
} from '@/lib/relatoriosGerenciais'
import { exportarElementoPdf, exportarPlanilha } from '@/lib/exportarRelatorio'
import { BarraFiltros, Bloco, KpiCard, ListaExamesDialog, fmtMin, fmtNum, fmtPct, tooltipStyle, type FiltrosRel } from './comum'

const TITULOS_KPI: Record<ChaveKpi, string> = {
  urgRecebidas: 'Urgências recebidas', urgTat: 'TAT médio urgência', urgNoPrazoPct: '% urgências no prazo',
  liberados: 'Exames liberados', porDia: 'Exames liberados', rotTat: 'TAT médio rotina', noPrazoPct: 'Exames com TAT no período',
  preTat: 'TAT pré-analítico', analTat: 'TAT analítico',
}

export function ProducaoTab({ exames, analistas, janela, filtros, setFiltros, bancadas, nomeBancada, rotuloPeriodo }: {
  exames: ExameRel[]
  analistas: Record<string, string>
  janela: JanelaRel
  filtros: FiltrosRel
  setFiltros: (f: FiltrosRel) => void
  bancadas: { id: string; name: string }[]
  nomeBancada: (id: string) => string
  rotuloPeriodo: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [exportando, setExportando] = useState(false)
  const [bancadaAberta, setBancadaAberta] = useState<string | null>(null)
  const [kpiAberto, setKpiAberto] = useState<ChaveKpi | null>(null)
  const [analistaAberto, setAnalistaAberto] = useState<string | null>(null)

  const base = useMemo(() => exames.filter(e => !e.apoio && (filtros.bancada === 'todas' || e.bancadaId === filtros.bancada)), [exames, filtros.bancada])
  const k = useMemo(() => kpisProducao(base, janela.inicio, janela.fim), [base, janela])
  const ant = useMemo(() => kpisProducao(base, janela.anteriorInicio, janela.anteriorFim), [base, janela])
  const s = useMemo(() => ({
    urgRecebidas: serie7Dias(base, janela.fim, x => x.urgRecebidas),
    urgTat: serie7Dias(base, janela.fim, x => x.urgTat),
    urgNoPrazoPct: serie7Dias(base, janela.fim, x => x.urgNoPrazoPct),
    liberados: serie7Dias(base, janela.fim, x => x.liberados),
    rotTat: serie7Dias(base, janela.fim, x => x.rotTat),
    noPrazoPct: serie7Dias(base, janela.fim, x => x.noPrazoPct),
    preTat: serie7Dias(base, janela.fim, x => x.preTat),
    analTat: serie7Dias(base, janela.fim, x => x.analTat),
  }), [base, janela])
  const listaKpi = useMemo(() => (kpiAberto === null ? [] : examesDoKpi(base, kpiAberto, janela.inicio, janela.fim)), [base, kpiAberto, janela])
  const porAnalista = useMemo(() => produtividadeAnalistas(base, janela.inicio, janela.fim, analistas), [base, janela, analistas])
  const analista = porAnalista.find(a => a.chave === analistaAberto) ?? null
  const abrir = (c: ChaveKpi) => () => setKpiAberto(c)
  const volume = useMemo(() => volumePorBancada(base, janela.inicio, janela.fim).map(v => ({ ...v, nome: nomeBancada(v.bancadaId) })), [base, janela, nomeBancada])
  const mapa = useMemo(() => mapaCalor(base, janela.inicio, janela.fim), [base, janela])
  const top = useMemo(() => topPedidos(base, janela.inicio, janela.fim), [base, janela])
  const topBancada = useMemo(() => (bancadaAberta === null ? [] : topDaBancada(base, bancadaAberta, janela.inicio, janela.fim)), [base, bancadaAberta, janela])
  const cmp = janela.comparacao

  const nomeArquivo = `producao_${format(janela.inicio, 'yyyy-MM-dd')}_${format(janela.fim, 'yyyy-MM-dd')}`
  const pdf = async () => {
    if (!ref.current) return
    setExportando(true)
    try { await exportarElementoPdf(ref.current, `${nomeArquivo}.pdf`) } catch { toast.error('Não foi possível gerar o PDF.') } finally { setExportando(false) }
  }
  const excel = () => {
    const ind = (nome: string, a: number | null, b: number | null) => ({ Indicador: nome, 'Período': a === null ? '' : Math.round(a * 10) / 10, 'Período anterior': b === null ? '' : Math.round(b * 10) / 10 })
    exportarPlanilha([
      { nome: 'Indicadores', linhas: [
        ind('Urgências recebidas', k.urgRecebidas, ant.urgRecebidas),
        ind('TAT médio urgência (min)', k.urgTat, ant.urgTat),
        ind('% urgências no prazo (< 60 min)', k.urgNoPrazoPct, ant.urgNoPrazoPct),
        ind('Exames liberados', k.liberados, ant.liberados),
        ind('Exames por dia (média)', k.porDia, ant.porDia),
        ind('TAT médio rotina (min)', k.rotTat, ant.rotTat),
        ind('Taxa de exames no prazo (%)', k.noPrazoPct, ant.noPrazoPct),
        ind('TAT pré-analítico (min) — recebido → coleta', k.preTat, ant.preTat),
        ind('TAT analítico (min) — coleta → liberação', k.analTat, ant.analTat),
      ] },
      { nome: 'Volume por bancada', linhas: volume.map(v => ({ Bancada: v.nome, 'Exames liberados': v.total })) },
      { nome: 'Top 10 exames', linhas: top.map((t, i) => ({ 'Posição': i + 1, Exame: t.exame, Bancada: nomeBancada(t.bancadaId), Quantidade: t.quantidade, 'TAT médio (min)': t.tatMedio === null ? '' : Math.round(t.tatMedio) })) },
      { nome: 'Produtividade por analista', linhas: porAnalista.map(a => ({ Analista: a.nome, 'Exames liberados': a.liberados, 'TAT médio (min)': a.tatMedio === null ? '' : Math.round(a.tatMedio), 'Urgências liberadas': a.urgencias, 'Rejeições': a.rejeicoes })) },
      { nome: 'Mapa de calor', linhas: HORAS_MAPA.map((h, i) => Object.fromEntries([['Hora', `${String(h).padStart(2, '0')}h`], ...DIAS_SEMANA.map((d, j) => [d, mapa.celulas[i][j]])])) },
    ], `${nomeArquivo}.xlsx`)
  }

  return (
    <div className="space-y-6">
      <BarraFiltros filtros={filtros} onChange={setFiltros} bancadas={bancadas} onPdf={pdf} onExcel={excel} exportando={exportando} />
      <div ref={ref} className="space-y-6 bg-background">
        <p className="text-xs text-muted-foreground">
          {rotuloPeriodo} · {filtros.bancada === 'todas' ? 'Todas as bancadas' : nomeBancada(filtros.bancada)} · TAT = liberação − coleta · exames de apoio não entram.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <KpiCard destaque onClick={abrir('urgRecebidas')} titulo="🔴 Urgências recebidas" valor={fmtNum(k.urgRecebidas)} detalhe="exames urgentes pedidos no período"
            variacao={variacao(k.urgRecebidas, ant.urgRecebidas, 'pct')} melhorQuandoSobe={false} comparacao={cmp} serie={s.urgRecebidas} />
          <KpiCard destaque onClick={abrir('urgTat')} titulo="🔴 TAT médio urgência" valor={fmtMin(k.urgTat)}
            variacao={variacao(k.urgTat, ant.urgTat, 'min')} melhorQuandoSobe={false} comparacao={cmp} serie={s.urgTat} />
          <KpiCard destaque onClick={abrir('urgNoPrazoPct')} titulo="🔴 % urgências no prazo (< 60 min)" valor={fmtPct(k.urgNoPrazoPct)} cor={corUrgNoPrazo(k.urgNoPrazoPct)} detalhe="meta ≥ 90%"
            variacao={variacao(k.urgNoPrazoPct, ant.urgNoPrazoPct, 'pp')} comparacao={cmp} serie={s.urgNoPrazoPct} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard onClick={abrir('liberados')} titulo="Total de exames liberados" valor={fmtNum(k.liberados)} variacao={variacao(k.liberados, ant.liberados, 'pct')} comparacao={cmp} serie={s.liberados} />
          <KpiCard onClick={abrir('porDia')} titulo="Exames por dia (média)" valor={fmtNum(k.porDia, 1)} variacao={variacao(k.porDia, ant.porDia, 'pct')} comparacao={cmp} serie={s.liberados} />
          <KpiCard onClick={abrir('rotTat')} titulo="TAT médio rotina" valor={fmtMin(k.rotTat)} variacao={variacao(k.rotTat, ant.rotTat, 'min')} melhorQuandoSobe={false} comparacao={cmp} serie={s.rotTat} />
          <KpiCard onClick={abrir('noPrazoPct')} titulo="Taxa de exames no prazo" valor={fmtPct(k.noPrazoPct)} detalhe="urgência ≤ 60 min · rotina ≤ 120 min"
            variacao={variacao(k.noPrazoPct, ant.noPrazoPct, 'pp')} comparacao={cmp} serie={s.noPrazoPct} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <KpiCard onClick={abrir('preTat')} titulo="TAT pré-analítico · gargalo na recepção" valor={fmtMin(k.preTat)} cor={corTatFase(k.preTat)}
            detalhe="recebido → coleta realizada · verde < 30 min · amarelo 30–60 · vermelho > 60"
            variacao={variacao(k.preTat, ant.preTat, 'min')} melhorQuandoSobe={false} comparacao={cmp} serie={s.preTat} />
          <KpiCard onClick={abrir('analTat')} titulo="TAT analítico · gargalo na bancada" valor={fmtMin(k.analTat)} cor={corTatFase(k.analTat)}
            detalhe="coleta realizada → liberado · verde < 30 min · amarelo 30–60 · vermelho > 60"
            variacao={variacao(k.analTat, ant.analTat, 'min')} melhorQuandoSobe={false} comparacao={cmp} serie={s.analTat} />
        </div>

        <Bloco titulo="Volume por bancada" subtitulo="Exames liberados no período — clique numa barra para ver os 10 exames dessa bancada">
          {volume.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhum exame liberado no período.</p> : (
            <ResponsiveContainer width="100%" height={Math.max(160, volume.length * 34)}>
              <BarChart data={volume} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="nome" width={150} tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [v, 'Exames liberados']} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
                <Bar dataKey="total" radius={[0, 6, 6, 0]} className="cursor-pointer" onClick={(d: any) => setBancadaAberta(d?.bancadaId ?? null)}>
                  {volume.map(v => <Cell key={v.bancadaId} fill={v.bancadaId === bancadaAberta ? 'hsl(var(--secondary))' : 'hsl(var(--primary))'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {bancadaAberta !== null && (
            <div className="mt-4 rounded-xl border border-border">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <p className="text-xs font-semibold">Top 10 exames — {nomeBancada(bancadaAberta)}</p>
                <button className="text-xs text-primary hover:underline" onClick={() => setBancadaAberta(null)}>Fechar</button>
              </div>
              <TabelaRanking linhas={topBancada} nomeBancada={nomeBancada} rotuloQtd="Liberados" />
            </div>
          )}
        </Bloco>

        <Bloco titulo="Mapa de calor — liberações por hora × dia da semana" subtitulo="Das 06h às 22h; quanto mais escuro, mais exames liberados">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-1 text-[11px]">
              <thead><tr><th className="w-12" />{DIAS_SEMANA.map(d => <th key={d} className="font-semibold text-muted-foreground">{d}</th>)}</tr></thead>
              <tbody>
                {HORAS_MAPA.map((h, i) => (
                  <tr key={h}>
                    <td className="pr-1 text-right text-muted-foreground">{String(h).padStart(2, '0')}h</td>
                    {mapa.celulas[i].map((v, j) => {
                      const a = mapa.max ? v / mapa.max : 0
                      return (
                        <td key={j} title={`${DIAS_SEMANA[j]} ${String(h).padStart(2, '0')}h: ${v} exame(s)`}
                          className={cn('h-6 min-w-10 rounded text-center font-medium', a > 0.55 ? 'text-primary-foreground' : 'text-foreground')}
                          style={{ backgroundColor: v ? `hsl(var(--primary) / ${0.12 + a * 0.88})` : 'hsl(var(--muted) / 0.5)' }}>
                          {v || ''}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Bloco>

        <Bloco titulo="Top 10 exames mais pedidos" subtitulo="Pedidos no período; TAT médio dos que já foram liberados">
          <TabelaRanking linhas={top} nomeBancada={nomeBancada} rotuloQtd="Quantidade" />
        </Bloco>

        <Bloco titulo="Produtividade por analista" subtitulo="Quem liberou o laudo no período · rejeições = recoletas pedidas pelo analista · clique no nome para ver os exames">
          {porAnalista.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Nenhum exame liberado no período.</p> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2">Analista</th><th className="px-3 py-2 text-right">Exames liberados</th><th className="px-3 py-2 text-right">TAT médio</th>
                  <th className="px-3 py-2 text-right">Urgências liberadas</th><th className="px-3 py-2 text-right">Rejeições</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {porAnalista.map(a => (
                  <tr key={a.chave}>
                    <td className="px-3 py-2">
                      {a.liberados > 0
                        ? <button className="font-medium text-primary hover:underline" onClick={() => setAnalistaAberto(a.chave)}>{a.nome}</button>
                        : <span className="font-medium">{a.nome}</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">{fmtNum(a.liberados)}</td>
                    <td className="px-3 py-2 text-right">{fmtMin(a.tatMedio)}</td>
                    <td className="px-3 py-2 text-right">{fmtNum(a.urgencias)}</td>
                    <td className="px-3 py-2 text-right">{fmtNum(a.rejeicoes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Bloco>
      </div>

      <ListaExamesDialog titulo={kpiAberto === null ? null : TITULOS_KPI[kpiAberto]} exames={listaKpi} nomeBancada={nomeBancada} onClose={() => setKpiAberto(null)} />
      <ListaExamesDialog titulo={analista ? `Liberados por ${analista.nome}` : null} exames={analista?.exames ?? []} nomeBancada={nomeBancada} onClose={() => setAnalistaAberto(null)} />
    </div>
  )
}

function TabelaRanking({ linhas, nomeBancada, rotuloQtd }: { linhas: ReturnType<typeof topPedidos>; nomeBancada: (id: string) => string; rotuloQtd: string }) {
  if (!linhas.length) return <p className="py-6 text-center text-sm text-muted-foreground">Nenhum exame no período.</p>
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
          <th className="px-3 py-2">Posição</th><th className="px-3 py-2">Exame</th><th className="px-3 py-2">Bancada</th>
          <th className="px-3 py-2 text-right">{rotuloQtd}</th><th className="px-3 py-2 text-right">TAT médio</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {linhas.map((t, i) => (
          <tr key={t.examId}>
            <td className="px-3 py-2 font-semibold">{i + 1}º</td>
            <td className="px-3 py-2">{t.exame}</td>
            <td className="px-3 py-2 text-muted-foreground">{nomeBancada(t.bancadaId)}</td>
            <td className="px-3 py-2 text-right font-semibold">{fmtNum(t.quantidade)}</td>
            <td className="px-3 py-2 text-right">{fmtMin(t.tatMedio)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
