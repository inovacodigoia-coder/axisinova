import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Beaker, Loader2, Package, PackageCheck, Plus, Printer, Refrigerator, Rows3, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useSorotecaAcesso, useSorotecaAmostras, useSorotecaResumo } from '@/hooks/useSoroteca'
import { SorotecaGrid, SorotecaLegenda } from '@/components/lab/soroteca/SorotecaGrid'
import { AmostraDetalheDialog, SemAcessoSoroteca } from '@/components/lab/soroteca/SorotecaDialogs'
import { SorotecaModuloCard } from '@/components/lab/soroteca/SorotecaModuloCard'
import { DescartarEstanteDialog } from '@/components/lab/soroteca/DescarteEstante'
import { imprimirEtiquetaEquipamento } from '@/lib/sorotecaEtiqueta'
import { ehArmario, ehEstante, estantesNaPrateleira, gradeDaEstante, localDaEstante, prateleirasDe, type EquipamentoSoroteca } from '@/lib/soroteca'

const fmt = (n: number | undefined) => (n ?? 0).toLocaleString('pt-BR')

/** Botão de uma estante: código e ocupação (abre o mapa da estante). */
function ChipEstante({ e, onClick }: { e: EquipamentoSoroteca; onClick: () => void }) {
  const pct = e.capacidade ? Math.round((e.ocupadas / e.capacidade) * 100) : 0
  return (
    <button type="button" onClick={onClick} className="w-28 rounded-lg border border-border bg-card p-2 text-left shadow-sm transition-colors hover:border-primary hover:bg-primary/5">
      <span className="block font-mono text-sm font-semibold">{e.codigo}</span>
      <span className="block text-[11px] text-muted-foreground">{fmt(e.ocupadas)}/{fmt(e.capacidade)} tubos</span>
      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full bg-primary" style={{ width: `${pct}%` }} /></span>
    </button>
  )
}

export default function LabSorotecaDashboardPage() {
  const acesso = useSorotecaAcesso()
  const pode = !!acesso?.ver
  const resumo = useSorotecaResumo(pode)
  const amostrasQ = useSorotecaAmostras(pode ? { situacao: 'armazenada' } : null, pode)
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [detalhe, setDetalhe] = useState<string | null>(null)
  const [aberta, setAberta] = useState<string | null>(null)
  const [imprimindo, setImprimindo] = useState(false)
  const [descartarId, setDescartarId] = useState<string | null>(null)
  const destaque = params.get('amostra')

  // Vindo de "Ver no mapa" (Consulta): abre a estante com a amostra destacada
  useEffect(() => { const eq = params.get('equipamento'); if (eq) setAberta(eq) }, [params])

  const amostras = amostrasQ.data?.amostras ?? []
  const avisoDias = resumo.data?.aviso_dias ?? 7
  const equipamentos = useMemo(() => resumo.data?.equipamentos ?? [], [resumo.data])
  const armarios = equipamentos.filter(e => ehArmario(e) && e.ativo)
  const foraDaGeladeira = equipamentos.filter(e => ehEstante(e) && e.ativo && e.situacao !== 'armazenada')
  const estanteAberta = equipamentos.find(e => e.id === aberta && ehEstante(e)) || null
  const gradeAberta = gradeDaEstante(estanteAberta)

  if (acesso === null) return <Skeleton className="h-96 rounded-2xl" />
  if (!pode) return <SemAcessoSoroteca />

  const fechar = () => { setAberta(null); if (params.get('equipamento')) setParams({}, { replace: true }) }
  const imprimir = async (e: EquipamentoSoroteca) => {
    setImprimindo(true)
    try { toast.success(await imprimirEtiquetaEquipamento(e)) } catch (err) { toast.error((err as Error).message) } finally { setImprimindo(false) }
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

      {!acesso.modulo_ativo && <SorotecaModuloCard />}

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

      {resumo.isLoading || amostrasQ.isLoading ? (
        <div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-72 rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /></div>
      ) : resumo.error || amostrasQ.error ? (
        <p className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{((resumo.error || amostrasQ.error) as Error).message}</p>
      ) : !equipamentos.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Package className="h-10 w-10 text-muted-foreground" />
            <p className="font-semibold">Nenhum equipamento cadastrado</p>
            <p className="max-w-md text-sm text-muted-foreground">Cadastre as geladeiras ou freezers (prateleiras e quantas estantes cabem) e as estantes (linhas × colunas) para ver o mapa.</p>
            <Button asChild><Link to="/app/soroteca/estrutura"><Plus className="mr-1.5 h-4 w-4" />Cadastrar equipamento</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {!!foraDaGeladeira.length && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Rows3 className="h-4 w-4 text-primary" />Estantes em preenchimento ({foraDaGeladeira.length})</CardTitle>
                <p className="text-xs text-muted-foreground">Fora da geladeira: ainda recebendo tubos.</p>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {foraDaGeladeira.map(e => <ChipEstante key={e.id} e={e} onClick={() => setAberta(e.id)} />)}
              </CardContent>
            </Card>
          )}
          <div className="grid gap-6 xl:grid-cols-2">
            {armarios.map(g => {
              const pct = g.capacidade ? Math.round((g.ocupadas / g.capacidade) * 100) : 0
              return (
                <Card key={g.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base uppercase"><Refrigerator className="h-4 w-4 text-info" />{g.nome} ({pct}%)</CardTitle>
                    <p className="text-xs text-muted-foreground">{fmt(g.ocupadas)} de {fmt(g.capacidade)} posições de estante{g.temperatura ? ` · ${g.temperatura}` : ''}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {prateleirasDe(g).map(p => {
                      const cap = p.linhas * p.colunas
                      const lista = estantesNaPrateleira(equipamentos, p.id)
                      return (
                        <div key={p.id} className="rounded-lg bg-muted/40 p-3">
                          <p className="mb-2 text-xs font-semibold text-muted-foreground">{p.nome} · {lista.length}/{cap} estantes</p>
                          <div className="flex flex-wrap gap-2">
                            {lista.map(e => <ChipEstante key={e.id} e={e} onClick={() => setAberta(e.id)} />)}
                            {cap <= 12 && Array.from({ length: Math.max(0, cap - lista.length) }, (_, i) => (
                              <span key={`v${i}`} className="flex h-[62px] w-28 items-center justify-center rounded-lg border border-dashed border-border text-[11px] text-muted-foreground">Livre</span>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
      {amostrasQ.data?.limitado && <p className="text-xs text-warning">Mostrando as primeiras 5.000 amostras armazenadas.</p>}

      <Dialog open={!!estanteAberta} onOpenChange={o => { if (!o) fechar() }}>
        <DialogContent className="max-h-[95vh] max-w-[95vw] overflow-auto">
          {estanteAberta && (
            <>
              <DialogHeader>
                <DialogTitle>{estanteAberta.nome} — {fmt(estanteAberta.ocupadas)}/{fmt(estanteAberta.capacidade)} tubos</DialogTitle>
                <DialogDescription>{localDaEstante(estanteAberta) ? `Guardada em ${localDaEstante(estanteAberta)}` : 'Em preenchimento (fora da geladeira)'}{estanteAberta.bancada_nome ? ` · ${estanteAberta.bancada_nome}` : ''}. Clique numa amostra para ver os detalhes.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-wrap gap-2">
                {(acesso.armazenar || acesso.configurar) && (
                  <Button variant="outline" size="sm" onClick={() => imprimir(estanteAberta)} disabled={imprimindo}>
                    {imprimindo ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Printer className="mr-1.5 h-3.5 w-3.5" />}Reimprimir etiqueta
                  </Button>
                )}
                {acesso.armazenar && <Button size="sm" asChild><Link to={`/app/soroteca/entrada?estante=${estanteAberta.id}`}><PackageCheck className="mr-1.5 h-3.5 w-3.5" />Abrir na Entrada</Link></Button>}
                {acesso.descartar && (
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => { setDescartarId(estanteAberta.id); fechar() }}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />Descartar estante
                  </Button>
                )}
              </div>
              <div className={cn('rounded-lg bg-muted/40 p-3')}>
                {gradeAberta ? (
                  <SorotecaGrid prateleira={gradeAberta} equipamentoNome={estanteAberta.nome} amostras={amostras} avisoDias={avisoDias} destaqueId={destaque}
                    comprimida={false} grande onCelula={(_l, _c, a) => { if (a) setDetalhe(a.id) }} />
                ) : <p className="py-6 text-center text-sm text-muted-foreground">Estante sem grade cadastrada.</p>}
              </div>
              <SorotecaLegenda />
            </>
          )}
        </DialogContent>
      </Dialog>

      <DescartarEstanteDialog estanteId={descartarId} onClose={() => setDescartarId(null)} />
      <AmostraDetalheDialog amostraId={detalhe} onClose={() => setDetalhe(null)} podeRetirar={acesso.descartar} />
    </div>
  )
}
