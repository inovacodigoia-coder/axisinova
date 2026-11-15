import { Fragment, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  Activity, AlertTriangle, ArrowDown, ArrowUp, BellRing, ChevronDown, ChevronRight, Clock, Lock, Printer, RefreshCcw, Siren,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useRegisters } from '@/context/RegistersContext'
import { supabase } from '@/integrations/supabase/client'
import { usePainelOperacional, usePainelOperacionalAcesso } from '@/hooks/usePainelOperacional'
import { StatusAparelhos } from '@/components/lab/painel/StatusAparelhos'
import {
  alertaDoPendente, corDaBancada, corDoTat, formatarDuracao, indicadoresDoPeriodo, janelaDoPeriodo, montarExames,
  ordenarBacklog, pendente, SITUACAO_LABEL, tatMinutos, valorCritico,
  type Cor, type ExamePainel, type PeriodoPainel,
} from '@/lib/painelOperacional'

const PERIODOS: { value: PeriodoPainel; label: string }[] = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'turno', label: 'Turno atual (últimas 8h)' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7 dias' },
]

type FiltroPrioridade = 'todas' | 'urgente' | 'rotina'

const COR_TEXTO: Record<Cor, string> = { verde: 'text-success', amarelo: 'text-warning', vermelho: 'text-destructive' }
const COR_BOLINHA: Record<Cor, string> = { verde: 'bg-success', amarelo: 'bg-warning', vermelho: 'bg-destructive' }

function Semaforo({ cor }: { cor: Cor }) {
  const label = cor === 'verde' ? 'Dentro da meta' : cor === 'amarelo' ? 'Atenção' : 'Fora da meta'
  return <span className="inline-flex items-center gap-1.5" title={label}><span className={cn('h-3 w-3 rounded-full', COR_BOLINHA[cor])} /><span className={cn('text-xs font-semibold', COR_TEXTO[cor])}>{label}</span></span>
}

function Seta({ atual, anterior, menorMelhor, sufixo, comparacao }: { atual: number | null; anterior: number | null; menorMelhor?: boolean; sufixo: string; comparacao: string }) {
  if (atual === null || anterior === null) return <span className="text-[11px] text-muted-foreground">sem base {comparacao}</span>
  const dif = Math.round(atual - anterior)
  if (dif === 0) return <span className="text-[11px] text-muted-foreground">= {comparacao}</span>
  const melhor = menorMelhor ? dif < 0 : dif > 0
  const Icone = dif > 0 ? ArrowUp : ArrowDown
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[11px] font-semibold', melhor ? 'text-success' : 'text-destructive')}>
      <Icone className="h-3 w-3" />{Math.abs(dif)}{sufixo} {comparacao}
    </span>
  )
}

interface CardKpiProps {
  titulo: string
  valor: string
  detalhe?: React.ReactNode
  tom?: 'urgente' | 'normal'
  corValor?: string
  pulsar?: boolean
  onClick?: () => void
}

function CardKpi({ titulo, valor, detalhe, tom = 'normal', corValor, pulsar, onClick }: CardKpiProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-left rounded-xl border p-4 transition-colors hover:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        tom === 'urgente' ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-card',
        pulsar && 'animate-pulse print:animate-none',
      )}
    >
      <p className={cn('text-[11px] font-bold uppercase tracking-wide', tom === 'urgente' ? 'text-destructive' : 'text-muted-foreground')}>{titulo}</p>
      <p className={cn('mt-1 text-3xl font-bold tabular-nums', corValor || 'text-foreground')}>{valor}</p>
      {detalhe && <div className="mt-1">{detalhe}</div>}
    </button>
  )
}

function BadgeAlerta({ e, agora }: { e: ExamePainel; agora: number }) {
  const alerta = alertaDoPendente(tatMinutos(e, agora), e.prioridade)
  if (!alerta) return <span className="text-muted-foreground">—</span>
  if (alerta === 'proximo') return <Badge variant="outline" className="border-warning/50 bg-warning/10 text-warning">⚠️ PRÓXIMO DO LIMITE</Badge>
  return <Badge variant="outline" className="border-destructive/50 bg-destructive/10 text-destructive">{e.prioridade === 'urgente' ? '🚨' : '⚠️'} ATRASADO</Badge>
}

function classeLinha(e: ExamePainel, agora: number) {
  const alerta = alertaDoPendente(tatMinutos(e, agora), e.prioridade)
  if (alerta === 'atrasado') return cn('bg-destructive/10', e.prioridade === 'urgente' && 'animate-pulse print:animate-none')
  if (alerta === 'proximo') return 'bg-warning/10'
  return ''
}

function TabelaExames({ exames, agora, nomeBancada, mostrarDivisor = true }: { exames: ExamePainel[]; agora: number; nomeBancada: (id: string) => string; mostrarDivisor?: boolean }) {
  if (!exames.length) return <p className="py-6 text-center text-sm text-muted-foreground">Nenhum exame.</p>
  const primeiroRotina = exames.findIndex(e => e.prioridade === 'rotina')
  return (
    <table className="painel-tabela w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
          <th className="px-2 py-2">Prioridade</th><th className="px-2 py-2">Pedido</th><th className="px-2 py-2">Paciente</th>
          <th className="px-2 py-2">Bancada</th><th className="px-2 py-2">Exame</th><th className="px-2 py-2">Status atual</th>
          <th className="px-2 py-2 text-right">Tempo</th><th className="px-2 py-2">Alerta</th>
        </tr>
      </thead>
      <tbody>
        {exames.map((e, i) => (
          <Fragment key={e.chave}>
            {mostrarDivisor && i === primeiroRotina && primeiroRotina > 0 && (
              <tr><td colSpan={8} className="bg-muted/60 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Rotina</td></tr>
            )}
            <tr className={cn('border-b border-border/60', classeLinha(e, agora))}>
              <td className="px-2 py-2 whitespace-nowrap">
                {e.prioridade === 'urgente'
                  ? <span className="font-bold text-destructive">🔴 URGENTE</span>
                  : <span className="text-muted-foreground">— Rotina</span>}
              </td>
              <td className="px-2 py-2 font-mono text-xs">{e.protocolo}</td>
              <td className="px-2 py-2 font-medium">{e.paciente}</td>
              <td className="px-2 py-2">{nomeBancada(e.bancadaId)}</td>
              <td className="px-2 py-2">{e.exame}</td>
              <td className="px-2 py-2 whitespace-nowrap">{SITUACAO_LABEL[e.situacao]}</td>
              <td className="px-2 py-2 text-right tabular-nums whitespace-nowrap">{formatarDuracao(tatMinutos(e, agora))}</td>
              <td className="px-2 py-2">{pendente(e) ? <BadgeAlerta e={e} agora={agora} /> : <span className="text-muted-foreground">—</span>}</td>
            </tr>
          </Fragment>
        ))}
      </tbody>
    </table>
  )
}

export default function LabPainelOperacionalPage() {
  const { user } = useAuth()
  const { workbenches } = useRegisters()
  const acesso = usePainelOperacionalAcesso()
  const [periodo, setPeriodo] = useState<PeriodoPainel>('hoje')
  const [bancada, setBancada] = useState<string>('todas')
  const [prioridade, setPrioridade] = useState<FiltroPrioridade>('todas')
  const [abertas, setAbertas] = useState<Record<string, boolean>>({})
  const [modal, setModal] = useState<{ titulo: string; exames: ExamePainel[] } | null>(null)
  const [marcando, setMarcando] = useState<string | null>(null)
  const [marca, setMarca] = useState<{ logo: string | null; nome: string | null }>({ logo: null, nome: null })
  const painel = usePainelOperacional(periodo, acesso === true)

  // Relógio da tela: tempos de espera andam sozinhos entre as atualizações.
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setAgora(Date.now()), 30_000); return () => clearInterval(t) }, [])
  useEffect(() => { if (painel.atualizadoEm) setAgora(Date.now()) }, [painel.atualizadoEm])

  useEffect(() => {
    if (!user?.companyId) return
    void supabase.from('company_branding').select('logo_url, brand_name').eq('company_id', user.companyId).maybeSingle()
      .then(({ data }: any) => setMarca({ logo: data?.logo_url || null, nome: data?.brand_name || null }))
  }, [user?.companyId])

  const bancadasInternas = useMemo(
    () => (workbenches || []).filter((w: any) => w.isActive !== false && w.tipo !== 'apoio')
      .sort((a: any, b: any) => (a.reportOrder ?? 0) - (b.reportOrder ?? 0) || String(a.name).localeCompare(String(b.name))),
    [workbenches],
  )
  const idsInternos = useMemo(() => new Set(bancadasInternas.map((w: any) => w.id as string)), [bancadasInternas])
  const nomeBancada = (id: string) => bancadasInternas.find((w: any) => w.id === id)?.name || 'Sem bancada'

  const exames = useMemo(() => montarExames(painel.linhas, agora, idsInternos), [painel.linhas, agora, idsInternos])
  const filtrados = useMemo(() => exames.filter(e =>
    (bancada === 'todas' || e.bancadaId === bancada) && (prioridade === 'todas' || e.prioridade === prioridade)), [exames, bancada, prioridade])
  const janela = useMemo(() => janelaDoPeriodo(periodo, agora), [periodo, agora])
  const pendentes = useMemo(() => ordenarBacklog(filtrados.filter(pendente), agora), [filtrados, agora])

  const urg = useMemo(() => {
    const p = pendentes.filter(e => e.prioridade === 'urgente')
    return {
      pendentes: p,
      atrasadas: p.filter(e => alertaDoPendente(tatMinutos(e, agora), 'urgente') === 'atrasado'),
      ind: indicadoresDoPeriodo(filtrados, 'urgente', janela.inicio, janela.fim, agora),
    }
  }, [pendentes, filtrados, janela, agora])

  const rot = useMemo(() => {
    const p = pendentes.filter(e => e.prioridade === 'rotina')
    return {
      pendentes: p,
      atrasadas: p.filter(e => alertaDoPendente(tatMinutos(e, agora), 'rotina') === 'atrasado'),
      ind: indicadoresDoPeriodo(filtrados, 'rotina', janela.inicio, janela.fim, agora),
      anterior: indicadoresDoPeriodo(filtrados, 'rotina', janela.anteriorInicio, janela.anteriorFim, agora),
    }
  }, [pendentes, filtrados, janela, agora])

  const rejeicoes = useMemo(() => {
    const lista = filtrados.filter(e => e.recoletaEm !== null && e.recoletaEm >= janela.inicio && e.recoletaEm <= janela.fim)
    const coletados = filtrados.filter(e => e.coletaEm >= janela.inicio && e.coletaEm <= janela.fim).length
    return { lista, taxa: coletados ? (lista.length / coletados) * 100 : null }
  }, [filtrados, janela])

  const linhasBancada = useMemo(() => {
    const ids = bancada === 'todas' ? bancadasInternas.map((w: any) => w.id as string) : [bancada]
    if (bancada === 'todas' && filtrados.some(e => !e.bancadaId)) ids.push('')
    return ids.map(id => {
      const daBancada = filtrados.filter(e => e.bancadaId === id)
      const pend = ordenarBacklog(daBancada.filter(pendente), agora)
      const base = [
        ...indicadoresDoPeriodo(daBancada, 'urgente', janela.inicio, janela.fim, agora).baseTat,
        ...indicadoresDoPeriodo(daBancada, 'rotina', janela.inicio, janela.fim, agora).baseTat,
      ]
      const tatMedio = base.length ? base.reduce((s, e) => s + tatMinutos(e, agora), 0) / base.length : null
      const maisAntigo = pend.length ? Math.max(...pend.map(e => tatMinutos(e, agora))) : null
      const urgentes = pend.filter(e => e.prioridade === 'urgente')
      return {
        id, nome: nomeBancada(id), pend, tatMedio, maisAntigo,
        urgentes: urgentes.length,
        rotina: pend.length - urgentes.length,
        cor: corDaBancada(pend, tatMedio, agora),
        urgenciaAtrasada: urgentes.some(e => tatMinutos(e, agora) > 60),
      }
    })
  }, [bancada, bancadasInternas, filtrados, janela, agora])

  const criticos = useMemo(() => painel.criticos.filter(c =>
    valorCritico(c.valor || '', c.limite_critico || '') &&
    (bancada === 'todas' || c.workbench_id === bancada) &&
    (prioridade === 'todas' || (prioridade === 'urgente') === !!c.is_urgent)), [painel.criticos, bancada, prioridade])

  const marcarNotificado = async (id: string) => {
    setMarcando(id)
    try {
      await painel.marcarNotificado(id)
      toast.success('Notificação registrada com seu nome e horário.')
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível registrar a notificação.')
    } finally { setMarcando(null) }
  }

  const nomeBancadaFiltro = bancada === 'todas' ? 'Todas as bancadas' : nomeBancada(bancada)
  const tituloImpressao = `Relatório Operacional — ${nomeBancadaFiltro} — ${format(agora, "dd/MM/yyyy HH:mm", { locale: ptBR })}`

  if (acesso === null) return <div className="space-y-4 p-6"><Skeleton className="h-12 w-80" /><Skeleton className="h-40 w-full" /></div>
  if (acesso === false) {
    return (
      <div className="p-6">
        <Card className="mx-auto max-w-lg p-8 text-center">
          <Lock className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-3 text-lg font-bold">Painel Operacional</h1>
          <p className="mt-1 text-sm text-muted-foreground">Seu perfil não tem a permissão “Painel Operacional do Laboratório”. Peça ao administrador para liberar em Perfis de Acesso.</p>
        </Card>
      </div>
    )
  }

  const verUrg = prioridade !== 'rotina'
  const verRot = prioridade !== 'urgente'

  return (
    <div className="painel-operacional space-y-6 p-4 md:p-6">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          html, body, #root, main, .painel-operacional { height: auto !important; overflow: visible !important; }
          aside, nav, header, [data-sidebar], .painel-sem-impressao { display: none !important; }
          .painel-operacional { padding: 0 !important; font-size: 11pt; }
          .painel-operacional * { animation: none !important; box-shadow: none !important; }
          .painel-tabela { border-collapse: collapse; font-size: 11pt; }
          .painel-tabela th, .painel-tabela td { border: 0.5pt solid hsl(var(--border)); }
          .painel-bloco { break-inside: avoid; }
        }
      `}</style>

      {/* Cabeçalho só da impressão */}
      <div className="hidden print:flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-3">
          {marca.logo && <img src={marca.logo} alt={marca.nome || 'Logo do laboratório'} className="h-12 w-12 object-contain" />}
          <div>
            <p className="text-base font-bold">{tituloImpressao}</p>
            <p className="text-xs">{marca.nome || user?.companyName}</p>
          </div>
        </div>
        <div className="text-right text-xs">
          <p>Bioquímico: <strong>{user?.name}</strong></p>
          <p>Impresso em {format(agora, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
          <p>Período: {PERIODOS.find(p => p.value === periodo)?.label} · Prioridade: {prioridade === 'todas' ? 'Todas' : prioridade === 'urgente' ? 'Urgência' : 'Rotina'}</p>
        </div>
      </div>

      {/* Cabeçalho da tela */}
      <div className="painel-sem-impressao flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Painel Operacional</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-2.5 py-0.5 text-[11px] font-bold text-success">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-success" /></span>
              AO VIVO
            </span>
            {painel.atualizadoEm && <span className="text-xs text-muted-foreground">atualizado às {format(painel.atualizadoEm, 'HH:mm:ss')}</span>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">TAT = liberação − coleta. Atualiza sozinho a cada 60 segundos. Pendentes de qualquer data.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={bancada} onValueChange={setBancada}>
            <SelectTrigger className="h-9 w-48" aria-label="Bancada"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as bancadas</SelectItem>
              {bancadasInternas.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={prioridade} onValueChange={v => setPrioridade(v as FiltroPrioridade)}>
            <SelectTrigger className="h-9 w-36" aria-label="Prioridade"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="urgente">🔴 Urgência</SelectItem>
              <SelectItem value="rotina">Rotina</SelectItem>
            </SelectContent>
          </Select>
          <Select value={periodo} onValueChange={v => setPeriodo(v as PeriodoPainel)}>
            <SelectTrigger className="h-9 w-52" aria-label="Período"><SelectValue /></SelectTrigger>
            <SelectContent>{PERIODOS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={painel.recarregar} disabled={painel.atualizando}>
            <RefreshCcw className={cn('mr-1.5 h-4 w-4', painel.atualizando && 'animate-spin')} />Atualizar
          </Button>
          <Button size="sm" onClick={() => window.print()}><Printer className="mr-1.5 h-4 w-4" />Imprimir painel</Button>
        </div>
      </div>

      {painel.erro && <Card className="painel-sem-impressao border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">Não foi possível carregar o painel agora. Ele tenta de novo sozinho em 60 segundos.</Card>}
      {painel.limitado && <Card className="border-warning/40 bg-warning/10 p-3 text-sm">Resultados limitados, refine o período.</Card>}

      {painel.carregando ? (
        <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-28" />)}</div>
      ) : (
        <>
          {verUrg && (
            <div className="painel-bloco grid gap-4 md:grid-cols-3">
              <CardKpi tom="urgente" titulo="🔴 Urgências pendentes" valor={String(urg.pendentes.length)} pulsar={urg.pendentes.length > 0}
                corValor={urg.pendentes.length ? 'text-destructive' : undefined}
                detalhe={<span className="text-[11px] text-muted-foreground">clique para ver a lista</span>}
                onClick={() => setModal({ titulo: 'Urgências pendentes', exames: urg.pendentes })} />
              <CardKpi tom="urgente" titulo="🔴 Urgências atrasadas" valor={String(urg.atrasadas.length)}
                corValor={urg.atrasadas.length ? 'text-destructive' : undefined}
                detalhe={<span className="text-[11px] text-muted-foreground">TAT acima de 60 min</span>}
                onClick={() => setModal({ titulo: 'Urgências atrasadas (> 60 min)', exames: urg.atrasadas })} />
              <CardKpi tom="urgente" titulo="🔴 TAT médio urgência" valor={formatarDuracao(urg.ind.tatMedio)}
                corValor={urg.ind.tatMedio === null ? undefined : COR_TEXTO[corDoTat(urg.ind.tatMedio, 'urgente')]}
                detalhe={<span className="text-[11px] text-muted-foreground">{urg.ind.baseTat.length} exame(s) no período</span>}
                onClick={() => setModal({ titulo: 'Urgências que compõem o TAT médio', exames: ordenarBacklog(urg.ind.baseTat, agora) })} />
            </div>
          )}

          {verRot && (
            <div className="painel-bloco grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <CardKpi titulo="Exames no prazo" valor={rot.ind.noPrazoPct === null ? '—' : `${Math.round(rot.ind.noPrazoPct)}%`}
                detalhe={<Seta atual={rot.ind.noPrazoPct} anterior={rot.anterior.noPrazoPct} sufixo=" p.p." comparacao={janela.comparacao} />}
                onClick={() => setModal({ titulo: 'Rotina liberada no prazo (até 120 min)', exames: rot.ind.noPrazo })} />
              <CardKpi titulo="TAT médio rotina" valor={formatarDuracao(rot.ind.tatMedio)}
                corValor={rot.ind.tatMedio === null ? undefined : COR_TEXTO[corDoTat(rot.ind.tatMedio, 'rotina')]}
                detalhe={<Seta atual={rot.ind.tatMedio} anterior={rot.anterior.tatMedio} menorMelhor sufixo=" min" comparacao={janela.comparacao} />}
                onClick={() => setModal({ titulo: 'Rotina que compõe o TAT médio', exames: ordenarBacklog(rot.ind.baseTat, agora) })} />
              <CardKpi titulo="Pendentes rotina" valor={String(rot.pendentes.length)}
                detalhe={rot.atrasadas.length
                  ? <Badge variant="outline" className="border-destructive/50 bg-destructive/10 text-destructive">{rot.atrasadas.length} acima de 120 min</Badge>
                  : <span className="text-[11px] text-success">nenhum atrasado</span>}
                onClick={() => setModal({ titulo: 'Pendentes de rotina', exames: rot.pendentes })} />
              <CardKpi titulo={periodo === 'hoje' ? 'Rejeições hoje' : 'Rejeições no período'} valor={String(rejeicoes.lista.length)}
                detalhe={<span className="text-[11px] text-muted-foreground">{rejeicoes.taxa === null ? 'sem coletas no período' : `${rejeicoes.taxa.toFixed(1).replace('.', ',')}% do total coletado`}</span>}
                onClick={() => setModal({ titulo: 'Recoletas solicitadas no período', exames: rejeicoes.lista })} />
            </div>
          )}

          <StatusAparelhos agora={agora} habilitado={acesso === true} />

          {criticos.length > 0 && (
            <Card className="painel-bloco border-destructive/40 p-0">
              <div className="flex items-center gap-2 border-b border-border bg-destructive/5 px-4 py-3">
                <BellRing className="h-5 w-5 text-destructive" />
                <h2 className="font-bold text-destructive">Exames críticos pendentes de notificação ({criticos.length})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="painel-tabela w-full text-sm">
                  <thead><tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2">Pedido</th><th className="px-2 py-2">Paciente</th><th className="px-2 py-2">Exame</th>
                    <th className="px-2 py-2">Valor encontrado</th><th className="px-2 py-2">Valor de referência</th>
                    <th className="px-2 py-2 text-right">Desde o resultado</th><th className="painel-sem-impressao px-2 py-2">Ação</th>
                  </tr></thead>
                  <tbody>
                    {criticos.map(c => (
                      <tr key={c.value_id} className="border-b border-border/60 bg-destructive/5">
                        <td className="px-2 py-2 font-mono text-xs">{c.protocol}</td>
                        <td className="px-2 py-2 font-medium">{c.patient_name}</td>
                        <td className="px-2 py-2">{c.exam_name} · {c.parameter_name}</td>
                        <td className="px-2 py-2 font-bold text-destructive">{c.valor} {c.unidade}</td>
                        <td className="px-2 py-2 text-xs">{c.referencia || '—'}<span className="block text-muted-foreground">Crítico: {c.limite_critico}</span></td>
                        <td className="px-2 py-2 text-right tabular-nums">{c.resultado_em ? formatarDuracao((agora - new Date(c.resultado_em).getTime()) / 60_000) : '—'}</td>
                        <td className="painel-sem-impressao px-2 py-2">
                          <Button size="sm" variant="destructive" disabled={marcando === c.value_id} onClick={() => marcarNotificado(c.value_id)}>Marcar como notificado</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <Card className="painel-bloco p-0">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="font-bold">Semáforo de TAT por bancada</h2>
              <span className="painel-sem-impressao ml-auto text-[11px] text-muted-foreground">Urgência 🟢 &lt; 30 · 🟡 30–60 · 🔴 &gt; 60 min · Rotina 🟢 &lt; 60 · 🟡 60–120 · 🔴 &gt; 120 min</span>
            </div>
            <div className="overflow-x-auto">
              <table className="painel-tabela w-full text-sm">
                <thead><tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">Bancada</th><th className="px-3 py-2">Urgências</th><th className="px-3 py-2">Rotina</th>
                  <th className="px-3 py-2">TAT médio</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Mais antigo</th>
                </tr></thead>
                <tbody>
                  {linhasBancada.map(b => (
                    <Fragment key={b.id || 'sem'}>
                      <tr
                        className={cn('cursor-pointer border-b border-border/60 hover:bg-muted/40', b.urgenciaAtrasada && 'bg-destructive/10')}
                        onClick={() => setAbertas(a => ({ ...a, [b.id]: !a[b.id] }))}
                      >
                        <td className="px-3 py-2 font-semibold">
                          <span className="inline-flex items-center gap-1">
                            {abertas[b.id] ? <ChevronDown className="painel-sem-impressao h-4 w-4" /> : <ChevronRight className="painel-sem-impressao h-4 w-4" />}{b.nome}
                          </span>
                        </td>
                        <td className="px-3 py-2">{b.urgentes ? <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive">🔴 {b.urgentes}</Badge> : '—'}</td>
                        <td className="px-3 py-2 tabular-nums">{b.rotina}</td>
                        <td className="px-3 py-2 tabular-nums">{formatarDuracao(b.tatMedio)}</td>
                        <td className="px-3 py-2"><Semaforo cor={b.cor} /></td>
                        <td className="px-3 py-2 tabular-nums">{formatarDuracao(b.maisAntigo)}</td>
                      </tr>
                      {abertas[b.id] && (
                        <tr className="border-b border-border/60 bg-muted/20">
                          <td colSpan={6} className="px-3 py-2"><TabelaExames exames={b.pend} agora={agora} nomeBancada={nomeBancada} /></td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  {!linhasBancada.length && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Nenhuma bancada interna ativa.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="painel-bloco p-0">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Siren className="h-5 w-5 text-destructive" />
              <h2 className="font-bold">Pendentes com idade (backlog)</h2>
              <span className="text-sm text-muted-foreground">{pendentes.length} exame(s)</span>
              {urg.atrasadas.length > 0 && <Badge variant="outline" className="ml-auto border-destructive/50 text-destructive"><AlertTriangle className="mr-1 h-3 w-3" />{urg.atrasadas.length} urgência(s) atrasada(s)</Badge>}
            </div>
            <div className="overflow-x-auto px-2 pb-2"><TabelaExames exames={pendentes} agora={agora} nomeBancada={nomeBancada} /></div>
          </Card>
        </>
      )}

      <Dialog open={!!modal} onOpenChange={o => !o && setModal(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader><DialogTitle>{modal?.titulo} ({modal?.exames.length ?? 0})</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[65vh]">
            {modal && <TabelaExames exames={modal.exames} agora={agora} nomeBancada={nomeBancada} mostrarDivisor={false} />}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
