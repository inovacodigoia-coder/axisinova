import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Beaker, Maximize2, Package, PackageCheck, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useSorotecaAcesso, useSorotecaAmostras, useSorotecaResumo } from '@/hooks/useSoroteca'
import { SorotecaGrid, SorotecaLegenda } from '@/components/lab/soroteca/SorotecaGrid'
import { AmostraDetalheDialog, SemAcessoSoroteca } from '@/components/lab/soroteca/SorotecaDialogs'
import { PrateleiraAbas, prateleiraAtual } from '@/components/lab/soroteca/PrateleiraAbas'
import { enderecoPosicao, gradeComprimida, type EquipamentoSoroteca, type PosicaoSoroteca } from '@/lib/soroteca'

const fmt = (n: number | undefined) => (n ?? 0).toLocaleString('pt-BR')

export default function LabSorotecaDashboardPage() {
  const acesso = useSorotecaAcesso()
  const pode = !!acesso?.ver
  const resumo = useSorotecaResumo(pode)
  const amostrasQ = useSorotecaAmostras(pode ? { situacao: 'armazenada' } : null, pode)
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [detalhe, setDetalhe] = useState<string | null>(null)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [sugestao, setSugestao] = useState<PosicaoSoroteca | null>(null)
  const [pratSel, setPratSel] = useState<Record<string, string>>({})
  const destaque = params.get('amostra')

  // Vindo de "Ver posição no mapa" (Consulta): abre o equipamento em tela cheia com a célula destacada
  useEffect(() => {
    const eq = params.get('equipamento')
    const pr = params.get('prateleira')
    if (eq) setExpandido(eq)
    if (eq && pr) setPratSel(m => ({ ...m, [eq]: pr }))
  }, [params])

  const amostras = amostrasQ.data?.amostras ?? []
  const avisoDias = resumo.data?.aviso_dias ?? 7
  const equipamentos = useMemo(() => (resumo.data?.equipamentos ?? []).filter(e => e.ativo), [resumo.data])
  const eqExpandido = equipamentos.find(e => e.id === expandido) || null

  if (acesso === null) return <Skeleton className="h-96 rounded-2xl" />
  if (!pode) return <SemAcessoSoroteca />

  const clicar = (eq: EquipamentoSoroteca, prateleiraId: string) => (linha: number, coluna: number, a: { id: string } | null) => {
    if (a) { setDetalhe(a.id); return }
    setSugestao(s => (s && s.prateleira_id === prateleiraId && s.linha === linha && s.coluna === coluna ? null : { equipamento_id: eq.id, prateleira_id: prateleiraId, linha, coluna }))
  }
  const pct = (e: EquipamentoSoroteca) => (e.capacidade ? Math.round((e.ocupadas / e.capacidade) * 100) : 0)
  const eqSugestao = sugestao ? equipamentos.find(e => e.id === sugestao.equipamento_id) : null
  const pratSugestao = sugestao && eqSugestao ? eqSugestao.prateleiras.find(p => p.id === sugestao.prateleira_id) : null

  /** Abas das prateleiras + grade da prateleira escolhida. */
  const mapa = (eq: EquipamentoSoroteca, grande: boolean) => {
    const pr = prateleiraAtual(eq.prateleiras, pratSel[eq.id])
    return (
      <div className="space-y-2">
        <PrateleiraAbas prateleiras={eq.prateleiras} valor={pr?.id ?? null} onChange={id => setPratSel(m => ({ ...m, [eq.id]: id }))} />
        {pr ? (
          <SorotecaGrid prateleira={pr} equipamentoNome={eq.nome} amostras={amostras} avisoDias={avisoDias} destaqueId={destaque}
            comprimida={grande ? false : gradeComprimida(pr.linhas, pr.colunas)} grande={grande}
            sugestao={sugestao?.prateleira_id === pr.id ? sugestao : null} onCelula={clicar(eq, pr.id)} />
        ) : <p className="py-6 text-center text-sm text-muted-foreground">Sem prateleiras cadastradas.</p>}
      </div>
    )
  }

  const kpis = [
    { titulo: 'Amostras armazenadas', valor: resumo.data?.armazenadas, detalhe: 'Total ativo', icone: Beaker, tom: '' },
    { titulo: `Vencendo em ${avisoDias} dias`, valor: resumo.data?.vencendo_aviso, detalhe: `${fmt(resumo.data?.vencidas)} já vencida(s)`, icone: AlertTriangle, tom: 'text-warning' },
    { titulo: 'Vencendo em 30 dias', valor: resumo.data?.vencendo_30, detalhe: 'Planejar descarte', icone: Package, tom: '' },
    { titulo: 'Descartadas este mês', valor: resumo.data?.descartadas_mes, detalhe: 'Registradas no histórico', icone: Trash2, tom: '' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Soroteca</h1>
          <p className="text-muted-foreground">Controle de armazenamento e rastreamento de amostras</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {acesso.descartar && <Button variant="outline" asChild><Link to="/app/soroteca/descarte?modo=manual"><Trash2 className="mr-1.5 h-4 w-4" />Registrar descarte manual</Link></Button>}
          {acesso.armazenar && <Button asChild><Link to="/app/soroteca/entrada"><PackageCheck className="mr-1.5 h-4 w-4" />Entrada / Armazenar</Link></Button>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(k => (
          <Card key={k.titulo}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{k.titulo}</CardTitle>
              <k.icone className={`h-4 w-4 text-muted-foreground ${k.tom}`} />
            </CardHeader>
            <CardContent>
              {resumo.isLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{fmt(k.valor)}</div>}
              <p className="text-xs text-muted-foreground">{k.detalhe}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!!resumo.data?.vencendo_aviso && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center gap-3 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">{fmt(resumo.data.vencendo_aviso)} amostra(s) com validade vencida ou vencendo em até {avisoDias} dias.</span>
          </div>
          <Button variant="destructive" size="sm" onClick={() => navigate('/app/soroteca/descarte')}>Iniciar descarte em lote <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </div>
      )}

      {sugestao && eqSugestao && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-success/40 bg-success/10 p-3 text-sm">
          <span>Posição <strong>{enderecoPosicao(eqSugestao.nome, pratSugestao?.nome, sugestao.linha, sugestao.coluna)}</strong> marcada como sugestão para a próxima armazenagem.</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSugestao(null)}>Limpar</Button>
            {acesso.armazenar && <Button size="sm" asChild><Link to={`/app/soroteca/entrada?equipamento=${sugestao.equipamento_id}&prateleira=${sugestao.prateleira_id}&linha=${sugestao.linha}&coluna=${sugestao.coluna}`}>Armazenar aqui</Link></Button>}
          </div>
        </div>
      )}

      {resumo.isLoading || amostrasQ.isLoading ? (
        <div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-72 rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /></div>
      ) : resumo.error || amostrasQ.error ? (
        <p className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{((resumo.error || amostrasQ.error) as Error).message}</p>
      ) : !equipamentos.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Package className="h-10 w-10 text-muted-foreground" />
            <p className="font-semibold">Nenhum equipamento cadastrado</p>
            <p className="max-w-md text-sm text-muted-foreground">Cadastre geladeiras, freezers ou estantes com suas prateleiras (linhas e colunas) para ver o mapa das posições.</p>
            <Button asChild><Link to="/app/soroteca/estrutura"><Plus className="mr-1.5 h-4 w-4" />Cadastrar equipamento</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {equipamentos.map(eq => (
            <Card key={eq.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-base uppercase">{eq.nome}{eq.bancada_nome ? ` — ${eq.bancada_nome}` : ''} ({pct(eq)}%)</CardTitle>
                  <p className="text-xs text-muted-foreground">{fmt(eq.ocupadas)} de {fmt(eq.capacidade)} posições · {eq.prateleiras.length} {eq.prateleiras.length === 1 ? 'prateleira' : 'prateleiras'}{eq.temperatura ? ` · ${eq.temperatura}` : ''}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setExpandido(eq.id)}><Maximize2 className="mr-1.5 h-3.5 w-3.5" />Expandir mapa</Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {mapa(eq, false)}
                <SorotecaLegenda />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {amostrasQ.data?.limitado && <p className="text-xs text-warning">Mostrando as primeiras 5.000 amostras armazenadas.</p>}

      <Dialog open={!!eqExpandido} onOpenChange={o => { if (!o) { setExpandido(null); if (params.get('equipamento')) setParams({}, { replace: true }) } }}>
        <DialogContent className="h-[95vh] max-w-[95vw] overflow-auto">
          {eqExpandido && (
            <>
              <DialogHeader>
                <DialogTitle className="uppercase">{eqExpandido.nome}{eqExpandido.bancada_nome ? ` — ${eqExpandido.bancada_nome}` : ''} ({pct(eqExpandido)}%)</DialogTitle>
                <DialogDescription>{fmt(eqExpandido.ocupadas)} de {fmt(eqExpandido.capacidade)} posições ocupadas. Escolha a prateleira na aba e clique numa amostra para ver os detalhes.</DialogDescription>
              </DialogHeader>
              {mapa(eqExpandido, true)}
              <SorotecaLegenda />
            </>
          )}
        </DialogContent>
      </Dialog>

      <AmostraDetalheDialog amostraId={detalhe} onClose={() => setDetalhe(null)} podeRetirar={acesso.armazenar} />
    </div>
  )
}
