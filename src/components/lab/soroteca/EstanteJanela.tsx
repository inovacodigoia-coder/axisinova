import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, PackageCheck, Printer, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { type AcessoSoroteca, useSorotecaAmostras, useSorotecaResumo } from '@/hooks/useSoroteca'
import { SorotecaGrid, SorotecaLegenda } from '@/components/lab/soroteca/SorotecaGrid'
import { AmostraDetalheDialog } from '@/components/lab/soroteca/SorotecaDialogs'
import { DescartarEstanteDialog } from '@/components/lab/soroteca/DescarteEstante'
import { LocalDaEstanteDesenho } from '@/components/lab/soroteca/EquipamentoDesenho'
import { imprimirEtiquetaEquipamento } from '@/lib/sorotecaEtiqueta'
import { ehEstante, gradeDaEstante, localDaEstante, type EquipamentoSoroteca } from '@/lib/soroteca'

const fmt = (n: number | undefined) => (n ?? 0).toLocaleString('pt-BR')

/**
 * Janela da estante (Dashboard e Estrutura Física): grade dos tubos + desenho do equipamento
 * onde ela está guardada. Clicar noutra estante do desenho troca a janela para ela.
 */
export function EstanteJanelaDialog({ estanteId, onChange, acesso, destaqueAmostraId }: {
  estanteId: string | null
  onChange: (estanteId: string | null) => void
  acesso: AcessoSoroteca
  destaqueAmostraId?: string | null
}) {
  const resumo = useSorotecaResumo(!!estanteId && acesso.ver)
  const amostrasQ = useSorotecaAmostras(estanteId ? { situacao: 'armazenada', equipamento_id: estanteId } : null, acesso.ver)
  const [imprimindo, setImprimindo] = useState(false)
  const [descartarId, setDescartarId] = useState<string | null>(null)
  const [detalhe, setDetalhe] = useState<string | null>(null)

  const equipamentos = resumo.data?.equipamentos ?? []
  const estante = equipamentos.find(e => e.id === estanteId && ehEstante(e)) || null
  const grade = gradeDaEstante(estante)
  const amostras = (amostrasQ.data?.amostras ?? []).filter(a => a.equipamento_id === estanteId)

  const imprimir = async (e: EquipamentoSoroteca) => {
    setImprimindo(true)
    try { toast.success(await imprimirEtiquetaEquipamento(e)) } catch (err) { toast.error((err as Error).message) } finally { setImprimindo(false) }
  }

  return (
    <>
      <Dialog open={!!estante} onOpenChange={o => { if (!o) onChange(null) }}>
        <DialogContent className="max-h-[95vh] max-w-[95vw] overflow-auto">
          {estante && (
            <>
              <DialogHeader>
                <DialogTitle>{estante.nome} — {fmt(estante.ocupadas)}/{fmt(estante.capacidade)} tubos</DialogTitle>
                <DialogDescription>{localDaEstante(estante) ? `Guardada em ${localDaEstante(estante)}` : 'Em preenchimento (fora da geladeira)'}{estante.bancada_nome ? ` · ${estante.bancada_nome}` : ''}. Clique numa amostra para ver os detalhes.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-wrap gap-2">
                {(acesso.armazenar || acesso.configurar) && (
                  <Button variant="outline" size="sm" onClick={() => imprimir(estante)} disabled={imprimindo}>
                    {imprimindo ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Printer className="mr-1.5 h-3.5 w-3.5" />}Reimprimir etiqueta
                  </Button>
                )}
                {acesso.armazenar && <Button size="sm" asChild><Link to={`/app/soroteca/entrada?estante=${estante.id}`}><PackageCheck className="mr-1.5 h-3.5 w-3.5" />Abrir na Entrada</Link></Button>}
                {acesso.descartar && (
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => { setDescartarId(estante.id); onChange(null) }}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />Descartar estante
                  </Button>
                )}
              </div>
              <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="min-w-0 space-y-3">
                  <div className="rounded-lg bg-muted/40 p-3">
                    {amostrasQ.isLoading ? <Skeleton className="h-48" /> : grade ? (
                      <SorotecaGrid prateleira={grade} equipamentoNome={estante.nome} amostras={amostras} avisoDias={resumo.data?.aviso_dias ?? 7} destaqueId={destaqueAmostraId}
                        comprimida={false} grande onCelula={(_l, _c, a) => { if (a) setDetalhe(a.id) }} />
                    ) : <p className="py-6 text-center text-sm text-muted-foreground">Estante sem grade cadastrada.</p>}
                  </div>
                  <SorotecaLegenda />
                </div>
                <LocalDaEstanteDesenho estante={estante} equipamentos={equipamentos} onEstante={id => { if (id !== estante.id) onChange(id) }} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <DescartarEstanteDialog estanteId={descartarId} onClose={() => setDescartarId(null)} />
      <AmostraDetalheDialog amostraId={detalhe} onClose={() => setDetalhe(null)} podeRetirar={acesso.descartar} />
    </>
  )
}
