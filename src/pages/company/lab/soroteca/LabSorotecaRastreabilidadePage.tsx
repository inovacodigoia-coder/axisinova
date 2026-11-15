import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { FileDown, Loader2, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatBirthBR } from '@/lib/attendanceDocHeader'
import { buscarAmostras, useSorotecaAcesso, useSorotecaRastreio } from '@/hooks/useSoroteca'
import { LinhaDoTempoView, SemAcessoSoroteca, StatusBadge } from '@/components/lab/soroteca/SorotecaDialogs'
import { dataBR, dataHoraBR, linhaDoTempo, enderecoAmostra, type AmostraSoroteca } from '@/lib/soroteca'

export default function LabSorotecaRastreabilidadePage() {
  const acesso = useSorotecaAcesso()
  const [params, setParams] = useSearchParams()
  const [termo, setTermo] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [opcoes, setOpcoes] = useState<AmostraSoroteca[] | null>(null)
  const [amostraId, setAmostraId] = useState<string | null>(params.get('amostra'))
  const q = useSorotecaRastreio(amostraId)

  useEffect(() => { const id = params.get('amostra'); if (id) setAmostraId(id) }, [params])

  if (acesso === null) return <Skeleton className="h-96 rounded-2xl" />
  if (!acesso.ver) return <SemAcessoSoroteca />

  const buscar = async () => {
    if (termo.trim().length < 2) return
    setBuscando(true)
    try {
      const r = await buscarAmostras({ situacao: 'todas', codigo: termo.trim() })
      setOpcoes(r.amostras)
      if (r.amostras.length === 1) { setAmostraId(r.amostras[0].id); setParams({ amostra: r.amostras[0].id }, { replace: true }) }
      else setAmostraId(null)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBuscando(false)
    }
  }

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
          <p className="text-muted-foreground">Histórico completo da amostra, da coleta ao descarte</p>
        </div>
        {a && <Button onClick={() => window.print()} title="Abre a impressão; escolha “Salvar como PDF”"><FileDown className="mr-1.5 h-4 w-4" />Exportar PDF</Button>}
      </div>

      <form className="flex max-w-xl gap-2" onSubmit={e => { e.preventDefault(); void buscar() }}>
        <Input value={termo} onChange={e => setTermo(e.target.value)} placeholder="Código da amostra ou pedido" aria-label="Código da amostra ou pedido" />
        <Button type="submit" disabled={buscando}>{buscando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Search className="mr-1.5 h-4 w-4" />}Buscar</Button>
      </form>

      {opcoes && !opcoes.length && <p className="text-sm text-muted-foreground">Nenhuma amostra da soroteca encontrada com esse código.</p>}
      {opcoes && opcoes.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {opcoes.map(o => (
            <Button key={o.id} variant={o.id === amostraId ? 'default' : 'outline'} size="sm" onClick={() => { setAmostraId(o.id); setParams({ amostra: o.id }, { replace: true }) }}>
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
              <span>{enderecoAmostra(a) ? `Em ${enderecoAmostra(a)}` : a.status === 'retirada' ? 'Retirada' : 'Descartada'}</span>
              {a.status === 'descartada' && <StatusBadge status="liberado" descartada />}
            </p>
          </CardHeader>
          <CardContent><LinhaDoTempoView eventos={eventos} /></CardContent>
        </Card>
      ))}

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
