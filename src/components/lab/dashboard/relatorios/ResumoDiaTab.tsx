import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Printer } from 'lucide-react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { useRelatorioGerencial } from '@/hooks/useRelatoriosGerenciais'
import { corDoTat } from '@/lib/painelOperacional'
import {
  SEMAFORO_TEXTO, comparativoMes, comparativoSemana, corIndiceHemolise, corTaxaRejeicao, corUrgNoPrazo, inicioDiaSP, intervaloResumo,
  montarExamesRel, porBancadaDoDia, resumoDoDia, semaforoTat, somarDias, variacao, ymdSP,
} from '@/lib/relatoriosGerenciais'
import { cn } from '@/lib/utils'
import { Bloco, COR_TEXTO, SetaVariacao, fmtMin, fmtNum, fmtPct, tooltipStyle } from './comum'

const dataBR = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}/${ymd.slice(0, 4)}`

export function ResumoDiaTab({ bancadasInternas, ordemBancadas, nomeBancada }: {
  bancadasInternas: ReadonlySet<string>
  ordemBancadas: string[]
  nomeBancada: (id: string) => string
}) {
  const { user } = useAuth()
  const ontem = useMemo(() => somarDias(ymdSP(Date.now()), -1), [])
  const [dia, setDia] = useState(ontem)
  const [marca, setMarca] = useState<{ logo: string | null; nome: string | null }>({ logo: null, nome: null })
  const intervalo = useMemo(() => intervaloResumo(dia), [dia])
  const q = useRelatorioGerencial(intervalo.de, intervalo.ate, true)

  useEffect(() => {
    if (!user?.companyId) return
    void supabase.from('company_branding').select('logo_url, brand_name').eq('company_id', user.companyId).maybeSingle()
      .then(({ data }: any) => setMarca({ logo: data?.logo_url || null, nome: data?.brand_name || null }))
  }, [user?.companyId])

  const exames = useMemo(() => montarExamesRel(q.data?.exames ?? [], bancadasInternas), [q.data, bancadasInternas])
  const r = useMemo(() => resumoDoDia(exames, dia, q.data?.criticos ?? []), [exames, dia, q.data])
  const sem = useMemo(() => comparativoSemana(exames, dia), [exames, dia])
  const mes = useMemo(() => comparativoMes(exames, dia), [exames, dia])
  const bancadas = useMemo(() => {
    const pos = new Map(ordemBancadas.map((id, i) => [id, i]))
    return porBancadaDoDia(exames, dia).sort((a, b) => (pos.get(a.bancadaId) ?? 999) - (pos.get(b.bancadaId) ?? 999) || b.liberados - a.liberados)
  }, [exames, dia, ordemBancadas])
  const corHemo = corIndiceHemolise(r.indiceHemolise)
  const corRej = corTaxaRejeicao(r.taxaRejeicao)
  const pct2 = (n: number | null) => (n === null ? '—' : `${fmtNum(n, 1)}%`)
  const logo = q.data?.responsavel?.logo || marca.logo
  const nomeLab = marca.nome || user?.companyName || ''
  const corUrg = r.urgTat === null ? null : corDoTat(r.urgTat, 'urgente')
  const corRot = r.rotTat === null ? null : corDoTat(r.rotTat, 'rotina')
  const corPrazo = corUrgNoPrazo(r.urgNoPrazoPct)
  const pico = r.horaPico ? `${String(r.horaPico.hora).padStart(2, '0')}h–${String(r.horaPico.hora + 1).padStart(2, '0')}h (${r.horaPico.total} pedido(s))` : '—'
  const rejTxt = r.rejeicoes ? `${r.rejeicoes}${r.motivoTop ? ` · principal: ${r.motivoTop.nome}` : ''}` : '0'
  const varSem = variacao(sem.atual, sem.anterior, 'pct')
  const varMes = variacao(mes.totalAtual, mes.mesmoPeriodoAnterior, 'pct')
  const nomeMes = (ymd: string) => format(inicioDiaSP(ymd) + 12 * 3_600_000, 'MMMM', { locale: ptBR })
  const mesAtualNome = nomeMes(dia)
  const mesAntNome = nomeMes(somarDias(`${dia.slice(0, 7)}-01`, -1))

  type Linha = { rotulo: string; valor: string; semaforo?: string; cor?: keyof typeof COR_TEXTO | null }
  const linhas: Linha[] = [
    { rotulo: 'Total de pedidos', valor: `${fmtNum(r.pedidos)} (urgência: ${r.pedidosUrg} | rotina: ${r.pedidosRot})` },
    { rotulo: 'Total de exames liberados', valor: fmtNum(r.liberados) },
    { rotulo: 'TAT médio urgência', valor: fmtMin(r.urgTat), semaforo: semaforoTat(r.urgTat, 'urgente'), cor: corUrg },
    { rotulo: 'TAT médio rotina', valor: fmtMin(r.rotTat), semaforo: semaforoTat(r.rotTat, 'rotina'), cor: corRot },
    { rotulo: '% urgências liberadas em até 60 min', valor: fmtPct(r.urgNoPrazoPct), semaforo: corPrazo ? SEMAFORO_TEXTO[corPrazo] : '', cor: corPrazo },
    { rotulo: 'Hora de pico', valor: pico },
    { rotulo: 'Rejeições do dia', valor: rejTxt },
    { rotulo: 'Índice de hemólise do dia', valor: pct2(r.indiceHemolise), semaforo: corHemo ? SEMAFORO_TEXTO[corHemo] : '', cor: corHemo },
    { rotulo: 'Exames críticos acionados', valor: fmtNum(r.criticos) },
  ]
  // Página impressa: Produção do dia / Qualidade / Por bancada
  const producaoImp: Linha[] = [
    { rotulo: 'Pedidos recebidos', valor: fmtNum(r.pedidos) },
    { rotulo: '    └ Urgência', valor: fmtNum(r.pedidosUrg) },
    { rotulo: '    └ Rotina', valor: fmtNum(r.pedidosRot) },
    linhas[1], linhas[2], linhas[3],
    { rotulo: 'Urgências no prazo (até 60 min)', valor: linhas[4].valor, semaforo: linhas[4].semaforo },
    { rotulo: 'Hora de pico', valor: r.horaPico ? `${String(r.horaPico.hora).padStart(2, '0')}h (${r.horaPico.total} pedido(s))` : '—' },
  ]
  const qualidadeImp: Linha[] = [
    { rotulo: 'Rejeições', valor: r.rejeicoes ? `${r.rejeicoes}${r.motivoTop ? ` (${r.motivoTop.nome})` : ''}` : '0' },
    { rotulo: 'Índice de hemólise', valor: pct2(r.indiceHemolise), semaforo: corHemo ? SEMAFORO_TEXTO[corHemo] : '' },
    { rotulo: 'Taxa de rejeição', valor: pct2(r.taxaRejeicao), semaforo: corRej ? SEMAFORO_TEXTO[corRej] : '' },
    { rotulo: 'Exames críticos', valor: fmtNum(r.criticos) },
  ]
  const tabelaImp = (ls: Linha[]) => (
    <table><tbody>
      {ls.map(l => <tr key={l.rotulo}><th style={{ width: '55%', fontWeight: 'normal', whiteSpace: 'pre' }}>{l.rotulo}</th><td>{l.valor} {l.semaforo}</td></tr>)}
    </tbody></table>
  )

  return (
    <div className="resumo-dia space-y-6">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 14mm; }
          body > *:not(.resumo-impressao) { display: none !important; }
          html, body { height: auto !important; overflow: visible !important; background: none !important; }
          .resumo-impressao { display: block !important; width: 100%;
            font-family: 'Times New Roman', Georgia, serif; font-size: 11pt; color: #000; background: none; }
          .resumo-impressao * { background: none !important; color: #000 !important; box-shadow: none !important; }
          .resumo-impressao table { width: 100%; border-collapse: collapse; margin-top: 6pt; }
          .resumo-impressao th, .resumo-impressao td { border: 0.5pt solid #000; padding: 3pt 6pt; text-align: left; }
          .resumo-impressao h1 { font-size: 15pt; margin: 0; }
          .resumo-impressao h2 { font-size: 12pt; margin: 12pt 0 0; }
        }
      `}</style>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-sm">
        <span className="text-xs font-medium text-muted-foreground">Dia:</span>
        <Input type="date" aria-label="Dia do resumo" className="h-9 w-44" value={dia} max={ymdSP(Date.now())} onChange={e => e.target.value && setDia(e.target.value)} />
        {dia !== ontem && <Button variant="ghost" size="sm" onClick={() => setDia(ontem)}>Voltar para ontem</Button>}
        <span className="text-xs text-muted-foreground">{dia === ontem ? 'Mostrando ontem' : `Mostrando ${dataBR(dia)}`}</span>
        <Button size="sm" className="ml-auto" onClick={() => window.print()} disabled={q.isLoading}><Printer className="mr-1.5 h-4 w-4" />Imprimir Resumo</Button>
      </div>

      {q.isLoading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><Skeleton className="h-80 rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></div>
      ) : q.error ? (
        <p className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">Não foi possível carregar o resumo agora. Tente de novo em instantes.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Bloco titulo={`Resumo executivo — ${dataBR(dia)}`} subtitulo="TAT = liberação − coleta · exames de apoio não entram no TAT nem nos liberados">
            <dl className="divide-y divide-border">
              {linhas.map(l => (
                <div key={l.rotulo} className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="text-sm text-muted-foreground">{l.rotulo}</dt>
                  <dd className={cn('text-right text-sm font-semibold', l.cor ? COR_TEXTO[l.cor] : 'text-foreground')}>{l.valor}</dd>
                </div>
              ))}
            </dl>
          </Bloco>

          <Bloco titulo="Comparativo rápido" subtitulo="Exames liberados">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Esta semana ({dataBR(sem.de).slice(0, 5)}–{dataBR(sem.ate).slice(0, 5)})</p>
                <p className="text-2xl font-bold">{fmtNum(sem.atual)}</p>
                <SetaVariacao v={varSem} melhorQuandoSobe comparacao="vs semana passada" />
                <p className="mt-1 text-[11px] text-muted-foreground">Semana passada: {fmtNum(sem.anterior)}</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Este mês (até dia {Number(dia.slice(8, 10))})</p>
                <p className="text-2xl font-bold">{fmtNum(mes.totalAtual)}</p>
                <SetaVariacao v={varMes} melhorQuandoSobe comparacao="vs mesmo período" />
                <p className="mt-1 text-[11px] text-muted-foreground">Mês passado no mesmo período: {fmtNum(mes.mesmoPeriodoAnterior)}</p>
              </div>
            </div>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mes.dias}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={(d: any) => `Dia ${d}`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line name={`Este mês (${mesAtualNome})`} dataKey="atual" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                  <Line name={`Mês passado (${mesAntNome})`} dataKey="anterior" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 3" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Bloco>
        </div>
      )}

      {/* Página A4 só da impressão (fora do layout, direto no corpo da página) */}
      {createPortal(<div className="resumo-impressao hidden" aria-hidden>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10pt', borderBottom: '0.5pt solid #000', paddingBottom: '6pt' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8pt' }}>
            {logo && <img src={logo} alt="" style={{ height: '42pt', maxWidth: '120pt', objectFit: 'contain' }} />}
            <div>{nomeLab}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h1>Resumo Diário</h1>
            <div>Data: {dataBR(dia)}</div>
          </div>
        </div>
        <h2>Produção do dia</h2>
        {tabelaImp(producaoImp)}
        <h2>Qualidade</h2>
        {tabelaImp(qualidadeImp)}
        <h2>Por bancada</h2>
        {bancadas.length === 0 ? <p>Nenhum exame liberado no dia.</p> : (
          <table>
            <thead><tr><th>Bancada</th><th>Exames liberados</th><th>TAT médio</th></tr></thead>
            <tbody>
              {bancadas.map(b => (
                <tr key={b.bancadaId}><td>{nomeBancada(b.bancadaId)}</td><td>{b.liberados}</td><td>{fmtMin(b.tatMedio)} {semaforoTat(b.tatMedio, 'rotina')}</td></tr>
              ))}
            </tbody>
          </table>
        )}
        <h2>Comparativo rápido (exames liberados)</h2>
        <table>
          <thead><tr><th>Período</th><th>Atual</th><th>Anterior</th><th>Variação</th></tr></thead>
          <tbody>
            <tr><td>Esta semana ({dataBR(sem.de)} a {dataBR(sem.ate)}) vs semana passada</td><td>{sem.atual}</td><td>{sem.anterior}</td><td>{varSem ? `${varSem.direcao === 'desce' ? '−' : varSem.direcao === 'sobe' ? '+' : ''}${varSem.texto}` : '—'}</td></tr>
            <tr><td>Este mês até o dia {Number(dia.slice(8, 10))} vs mesmo período do mês passado</td><td>{mes.totalAtual}</td><td>{mes.mesmoPeriodoAnterior}</td><td>{varMes ? `${varMes.direcao === 'desce' ? '−' : varMes.direcao === 'sobe' ? '+' : ''}${varMes.texto}` : '—'}</td></tr>
          </tbody>
        </table>
        <p style={{ marginTop: '6pt', fontSize: '9pt' }}>TAT = liberação − coleta. Metas: urgência até 30 min (OK), até 60 min (ATENÇÃO), acima de 60 min (ATRASO); rotina e bancadas até 60 / 120 min. Hemólise: OK &lt; 2%, ATENÇÃO 2–3%, ATRASO &gt; 3%. Rejeição: OK &lt; 0,6%, ATENÇÃO 0,6–1%, ATRASO &gt; 1%. Exames de apoio não entram no TAT.</p>
        <div style={{ marginTop: '48pt', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '24pt' }}>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: '28pt' }}>Responsável técnico: {q.data?.responsavel?.nome || '______________________________'}</div>
            <div style={{ borderTop: '0.5pt solid #000', paddingTop: '3pt' }}>Assinatura</div>
          </div>
          <div style={{ width: '170pt', borderTop: '0.5pt solid #000', paddingTop: '3pt' }}>
            CRF: {q.data?.responsavel?.registro || '________________'}
          </div>
        </div>
        <p style={{ marginTop: '10pt', fontSize: '9pt' }}>Impresso em {format(Date.now(), "dd/MM/yyyy 'às' HH:mm")} por {user?.name}</p>
      </div>, document.body)}
    </div>
  )
}
