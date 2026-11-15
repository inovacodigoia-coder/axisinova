import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { FileDown, FileText, Loader2, Rows3, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatBirthBR } from '@/lib/attendanceDocHeader'
import { buscarAmostras, useSorotecaAcesso, useSorotecaRastreio, useSorotecaResumo } from '@/hooks/useSoroteca'
import { LinhaDoTempoView, SemAcessoSoroteca, StatusBadge } from '@/components/lab/soroteca/SorotecaDialogs'
import { FolhaDescarteDialog } from '@/components/lab/soroteca/FolhaDescarte'
import { EstanteRastreioView } from '@/components/lab/soroteca/EstanteRastreio'
import { dataBR, dataHoraBR, ehEstante, estanteDoCodigo, linhaDoTempo, enderecoAmostra, type AmostraSoroteca, type EquipamentoSoroteca } from '@/lib/soroteca'

/** Sugestões enquanto digita o código da estante. */
const sugerirEstantes = (estantes: EquipamentoSoroteca[], termo: string) => {
  const t = termo.trim().toUpperCase()
  if (!t) return []
  return estantes.filter(e => String(e.codigo || '').toUpperCase().includes(t) || e.nome.toUpperCase().includes(t)).slice(0, 8)
}

export default function LabSorotecaRastreabilidadePage() {
  const acesso = useSorotecaAcesso()
  const [params, setParams] = useSearchParams()
  const [termo, setTermo] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [opcoes, setOpcoes] = useState<AmostraSoroteca[] | null>(null)
  const [amostraId, setAmostraId] = useState<string | null>(params.get('amostra'))
  const q = useSorotecaRastreio(amostraId)
  const [folha, setFolha] = useState(false)
  const resumo = useSorotecaResumo(!!acesso?.ver)
  const estantes = useMemo(() => (resumo.data?.equipamentos ?? []).filter(ehEstante), [resumo.data])
  const aba = params.get('aba') === 'estante' || (params.get('estante') && !params.get('amostra')) ? 'estante' : 'amostra'
  const estanteId = params.get('estante')
  const [termoEstante, setTermoEstante] = useState('')
  const [semEstante, setSemEstante] = useState(false)

  useEffect(() => { const id = params.get('amostra'); if (id) setAmostraId(id) }, [params])

  if (acesso === null) return <Skeleton className="h-96 rounded-2xl" />
  if (!acesso.ver) return <SemAcessoSoroteca />

  const abrirEstante = (id: string) => { setSemEstante(false); setTermoEstante(''); setParams({ aba: 'estante', estante: id }) }
  const abrirAmostra = (id: string) => { setOpcoes(null); setAmostraId(id); setParams({ aba: 'amostra', amostra: id }) }
  const mudarAba = (v: string) => setParams(v === 'estante' ? { aba: 'estante', ...(estanteId ? { estante: estanteId } : {}) } : { aba: 'amostra', ...(amostraId ? { amostra: amostraId } : {}) }, { replace: true })

  const buscar = async () => {
    if (termo.trim().length < 2) return
    // código de estante bipado na aba Amostra: troca de aba sozinho
    const est = estanteDoCodigo(estantes, termo)
    if (est) { setTermo(''); toast.info(`Código da estante ${est.codigo}: abrindo a aba Estante`); abrirEstante(est.id); return }
    setBuscando(true)
    try {
      const r = await buscarAmostras({ situacao: 'todas', codigo: termo.trim() })
      setOpcoes(r.amostras)
      if (r.amostras.length === 1) { setAmostraId(r.amostras[0].id); setParams({ aba: 'amostra', amostra: r.amostras[0].id }, { replace: true }) }
      else setAmostraId(null)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBuscando(false)
    }
  }
  const sugestoes = sugerirEstantes(estantes, termoEstante)
  const buscarEstante = () => {
    const exata = estanteDoCodigo(estantes, termoEstante)
    const alvo = exata || (sugestoes.length === 1 ? sugestoes[0] : null)
    if (alvo) abrirEstante(alvo.id)
    else setSemEstante(true)
  }
  const estanteDaAmostra = (codigo: string | null | undefined) => (codigo ? estanteDoCodigo(estantes, codigo) : null)

  const r = q.data
  const a = r?.amostra
  const eventos = r ? linhaDoTempo(r) : []
  const lab = r?.laboratorio

  return (
    <div className="rastreio-tela space-y-6">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 14mm; }
          body > *:not(.rastreio-impressao) { display: none !important; }
          html, body { height: auto !important; overflow: visible !important; background: none !important; }
          .rastreio-impressao { display: block !important; width: 100%; font-family: 'Times New Roman', Georgia, serif; font-size: 11pt;
            color: var(--document-ink, black); background: none; }
          .rastreio-impressao * { background: none !important; box-shadow: none !important; }
          .rastreio-impressao table { width: 100%; border-collapse: collapse; margin-top: 6pt; }
          .rastreio-impressao th, .rastreio-impressao td { border: 0.5pt solid; padding: 3pt 6pt; text-align: left; vertical-align: top; }
          .rastreio-impressao h1 { font-size: 15pt; margin: 0; }
          .rastreio-impressao h2 { font-size: 12pt; margin: 12pt 0 0; }
        }
      `}</style>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rastreabilidade</h1>
          <p className="text-muted-foreground">Histórico completo da amostra (da coleta ao descarte) e da estante</p>
        </div>
        {aba === 'amostra' && (
          <div className="flex gap-2">
            {a?.status === 'descartada' && <Button variant="outline" onClick={() => setFolha(true)}><FileText className="mr-1.5 h-4 w-4" />Folha de descarte</Button>}
            {a && <Button onClick={() => window.print()} title="Abre a impressão; escolha “Salvar como PDF”"><FileDown className="mr-1.5 h-4 w-4" />Exportar PDF</Button>}
          </div>
        )}
      </div>
      <FolhaDescarteDialog alvo={folha && a ? { amostraId: a.id } : null} reimpressao onClose={() => setFolha(false)} />

      <Tabs value={aba} onValueChange={mudarAba}>
        <TabsList>
          <TabsTrigger value="amostra">Amostra</TabsTrigger>
          <TabsTrigger value="estante">Estante</TabsTrigger>
        </TabsList>

        <TabsContent value="amostra" className="space-y-6">
          <form className="flex max-w-xl gap-2" onSubmit={e => { e.preventDefault(); void buscar() }}>
            <Input value={termo} onChange={e => setTermo(e.target.value)} placeholder="Código da amostra ou pedido" aria-label="Código da amostra ou pedido" />
            <Button type="submit" disabled={buscando}>{buscando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Search className="mr-1.5 h-4 w-4" />}Buscar</Button>
          </form>

          {opcoes && !opcoes.length && <p className="text-sm text-muted-foreground">Nenhuma amostra da soroteca encontrada com esse código.</p>}
          {opcoes && opcoes.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {opcoes.map(o => (
                <Button key={o.id} variant={o.id === amostraId ? 'default' : 'outline'} size="sm" onClick={() => { setAmostraId(o.id); setParams({ aba: 'amostra', amostra: o.id }, { replace: true }) }}>
                  {o.codigo_amostra} · {o.tubo_nome || o.bancada_nome}
                </Button>
              ))}
            </div>
          )}

          {amostraId && (q.isLoading ? <Skeleton className="h-80 rounded-2xl" /> : q.error ? (
            <p className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{(q.error as Error).message}</p>
          ) : a && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Amostra {a.codigo_amostra} · Paciente {a.patient_name || '—'} · {a.bancada_nome || 'Sem bancada'}</CardTitle>
                <p className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span>Pedido {a.protocolo}</span><span>Código de barras {a.codigo_alfanumerico}</span><span>Validade {dataBR(a.validade)}</span>
                  {enderecoAmostra(a) && estanteDaAmostra(a.estante_codigo) ? (
                    <button type="button" className="text-primary underline-offset-2 hover:underline" title="Abrir o histórico da estante"
                      onClick={() => abrirEstante(estanteDaAmostra(a.estante_codigo)!.id)}>Em {enderecoAmostra(a)}</button>
                  ) : <span>{enderecoAmostra(a) ? `Em ${enderecoAmostra(a)}` : a.status === 'retirada' ? 'Retirada' : 'Descartada'}</span>}
                  {a.status === 'descartada' && <StatusBadge status="liberado" descartada />}
                </p>
              </CardHeader>
              <CardContent><LinhaDoTempoView eventos={eventos} /></CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="estante" className="space-y-6">
          <form className="relative max-w-xl" onSubmit={e => { e.preventDefault(); buscarEstante() }}>
            <div className="flex gap-2">
              <Input value={termoEstante} onChange={e => { setTermoEstante(e.target.value.toUpperCase()); setSemEstante(false) }} autoComplete="off"
                placeholder="Bipe ou digite o código da estante (ex.: E00001)" aria-label="Código da estante" className="font-mono uppercase" />
              <Button type="submit"><Search className="mr-1.5 h-4 w-4" />Buscar</Button>
            </div>
            {!!sugestoes.length && !estanteDoCodigo(estantes, termoEstante) && (
              <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-md" role="listbox" aria-label="Estantes encontradas">
                {sugestoes.map(e => (
                  <li key={e.id}>
                    <button type="button" role="option" aria-selected={false} onClick={() => abrirEstante(e.id)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent">
                      <span className="flex items-center gap-2"><Rows3 className="h-3.5 w-3.5 text-muted-foreground" /><span className="font-mono font-semibold">{e.codigo}</span></span>
                      <span className="text-xs text-muted-foreground">{e.ativo ? `${e.ocupadas}/${e.capacidade} tubos` : 'Inativa'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </form>
          {semEstante && <p className="text-sm text-muted-foreground">Nenhuma estante encontrada com esse código.</p>}
          {estanteId ? <EstanteRastreioView estanteId={estanteId} onAmostra={abrirAmostra} />
            : !semEstante && <p className="text-sm text-muted-foreground">Bipe a etiqueta da estante para ver quem a criou e quem colocou, removeu, retirou ou devolveu cada tubo.</p>}
        </TabsContent>
      </Tabs>

      {a && createPortal(
        <div className="rastreio-impressao hidden" aria-hidden>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10pt', borderBottom: '0.5pt solid', paddingBottom: '6pt' }}>
            {lab?.logo && <img src={lab.logo} alt="" style={{ height: '42pt', maxWidth: '120pt', objectFit: 'contain' }} />}
            <div>
              <h1>Relatório de rastreabilidade da amostra</h1>
              <div>{lab?.nome || ''}</div>
            </div>
          </div>
          <h2>Identificação</h2>
          <table>
            <tbody>
              <tr><th style={{ width: '30%' }}>Amostra</th><td>{a.codigo_amostra} (código de barras {a.codigo_alfanumerico})</td></tr>
              <tr><th>Paciente</th><td>{a.patient_name || '—'} · nascimento {formatBirthBR(a.patient_birth) || '—'}</td></tr>
              <tr><th>Pedido</th><td>{a.protocolo}</td></tr>
              <tr><th>Bancada / tubo</th><td>{a.bancada_nome || '—'} · {a.tubo_nome || '—'}</td></tr>
              <tr><th>Validade</th><td>{dataBR(a.validade)}</td></tr>
              <tr><th>Situação atual</th><td>{enderecoAmostra(a) ? `Armazenada em ${enderecoAmostra(a)}` : a.status === 'retirada' ? 'Retirada' : `Descartada em ${dataHoraBR(a.descartada_em)}`}</td></tr>
            </tbody>
          </table>
          <h2>Linha do tempo</h2>
          <table>
            <thead><tr><th style={{ width: '22%' }}>Data / hora</th><th style={{ width: '33%' }}>Evento</th><th>Detalhes</th></tr></thead>
            <tbody>
              {eventos.map((e, i) => <tr key={i}><td>{dataHoraBR(e.quando)}</td><td>{e.titulo}</td><td>{e.linhas.join(' · ')}</td></tr>)}
            </tbody>
          </table>
          <p style={{ marginTop: '6pt', fontSize: '9pt' }}>Emitido em {dataHoraBR(new Date().toISOString())}. Documento para auditoria do ciclo de vida da amostra (PALC / ISO 15189).</p>
          <div style={{ marginTop: '48pt', width: '60%', marginLeft: 'auto', marginRight: 'auto', textAlign: 'center' }}>
            <div style={{ borderTop: '0.5pt solid', paddingTop: '4pt' }}>{lab?.responsavel || 'Responsável Técnico'}</div>
            <div>Responsável Técnico · {lab?.registro || 'CRF ________________'}</div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
