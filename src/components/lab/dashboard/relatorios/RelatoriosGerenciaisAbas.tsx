import { useMemo, useState, type ReactNode } from 'react'
import { format } from 'date-fns'
import { Lock } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useRegisters } from '@/context/RegistersContext'
import { useRelatorioGerencial, useRelatoriosGerenciaisAcesso } from '@/hooks/useRelatoriosGerenciais'
import { intervaloDeBusca, janelaRelatorio, montarExamesRel, somarDias, ymdSP } from '@/lib/relatoriosGerenciais'
import { PERIODOS_REL, type FiltrosRel } from './comum'
import { ProducaoTab } from './ProducaoTab'
import { RejeicoesTab } from './RejeicoesTab'
import { ResumoDiaTab } from './ResumoDiaTab'

type Aba = 'geral' | 'producao' | 'rejeicoes' | 'resumo'

/** Abas do Dashboard Laboratorial; Visão Geral é o conteúdo atual, as demais exigem lab.relatorios_gerenciais. */
export function RelatoriosGerenciaisAbas({ visaoGeral }: { visaoGeral: ReactNode }) {
  const acesso = useRelatoriosGerenciaisAcesso()
  const { workbenches } = useRegisters()
  const [aba, setAba] = useState<Aba>('geral')
  const hoje = ymdSP(Date.now())
  const [filtros, setFiltros] = useState<FiltrosRel>({ periodo: 'hoje', de: somarDias(hoje, -6), ate: hoje, bancada: 'todas' })
  // Relógio fixo por consulta: muda quando o filtro muda (o botão de período recalcula "agora").
  const [agora, setAgora] = useState(() => Date.now())
  const mudarFiltros = (f: FiltrosRel) => { setAgora(Date.now()); setFiltros(f) }

  const todas = useMemo(() => (workbenches || []).filter((w: any) => w.isActive !== false), [workbenches])
  const internas = useMemo(() => todas.filter((w: any) => w.tipo !== 'apoio')
    .sort((a: any, b: any) => (a.reportOrder ?? 0) - (b.reportOrder ?? 0) || String(a.name).localeCompare(String(b.name))), [todas])
  const idsInternos = useMemo(() => new Set<string>(internas.map((w: any) => w.id)), [internas])
  const nomes = useMemo(() => new Map<string, string>((workbenches || []).map((w: any) => [w.id, w.name])), [workbenches])
  const nomeBancada = useMemo(() => (id: string) => (id ? nomes.get(id) || 'Bancada removida' : 'Sem bancada'), [nomes])

  const janela = useMemo(() => janelaRelatorio(filtros.periodo, agora, { de: filtros.de, ate: filtros.ate }), [filtros, agora])
  const busca = useMemo(() => intervaloDeBusca(janela), [janela])
  const usaPeriodo = aba === 'producao' || aba === 'rejeicoes'
  const q = useRelatorioGerencial(busca.de, busca.ate, acesso === true && usaPeriodo)
  const exames = useMemo(() => montarExamesRel(q.data?.exames ?? [], idsInternos), [q.data, idsInternos])
  const rotuloPeriodo = `${PERIODOS_REL.find(p => p.value === filtros.periodo)?.label}: ${format(janela.inicio, 'dd/MM/yyyy')} a ${format(janela.fim, 'dd/MM/yyyy HH:mm')}`
  const bancadasFiltro = aba === 'rejeicoes' ? todas : internas

  const travada = acesso !== true
  const gatilho = (valor: Aba, rotulo: string) => (
    <TabsTrigger value={valor} disabled={travada} title={travada ? 'Seu perfil não tem a permissão “Relatórios gerenciais do laboratório”' : undefined} className="gap-1.5">
      {travada && <Lock className="h-3 w-3" />}{rotulo}
    </TabsTrigger>
  )

  const corpoPeriodo = (conteudo: ReactNode) =>
    q.isLoading ? <div className="space-y-4"><Skeleton className="h-14 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>
    : q.error ? <p className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">Não foi possível carregar o relatório agora. Tente de novo em instantes.</p>
    : conteudo

  return (
    <Tabs value={aba} onValueChange={v => setAba(v as Aba)} className="space-y-6">
      <TabsList className="h-auto flex-wrap">
        <TabsTrigger value="geral">Visão Geral</TabsTrigger>
        {gatilho('producao', 'Produção')}
        {gatilho('rejeicoes', 'Rejeições')}
        {gatilho('resumo', 'Resumo do Dia')}
      </TabsList>
      <TabsContent value="geral" className="mt-0">{visaoGeral}</TabsContent>
      {acesso === true && (
        <>
          <TabsContent value="producao" className="mt-0">
            {corpoPeriodo(<ProducaoTab exames={exames} janela={janela} filtros={filtros} setFiltros={mudarFiltros} bancadas={internas} nomeBancada={nomeBancada} rotuloPeriodo={rotuloPeriodo} />)}
          </TabsContent>
          <TabsContent value="rejeicoes" className="mt-0">
            {corpoPeriodo(<RejeicoesTab exames={exames} janela={janela} filtros={filtros} setFiltros={mudarFiltros} bancadas={bancadasFiltro} nomeBancada={nomeBancada} rotuloPeriodo={rotuloPeriodo} />)}
          </TabsContent>
          <TabsContent value="resumo" className="mt-0"><ResumoDiaTab bancadasInternas={idsInternos} /></TabsContent>
        </>
      )}
    </Tabs>
  )
}
