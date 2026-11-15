import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useSorotecaAcesso, useSorotecaAcoes, useSorotecaConfig } from '@/hooks/useSoroteca'
import { SemAcessoSoroteca } from '@/components/lab/soroteca/SorotecaDialogs'

export default function LabSorotecaConfigPage() {
  const acesso = useSorotecaAcesso()
  const q = useSorotecaConfig(!!acesso?.ver)
  const { salvarConfig } = useSorotecaAcoes()
  const [aviso, setAviso] = useState('7')
  const [responsavel, setResponsavel] = useState('')
  const [dias, setDias] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!q.data) return
    setAviso(String(q.data.aviso_dias))
    setResponsavel(q.data.responsavel_descarte || '')
    setDias(Object.fromEntries(q.data.bancadas.map(b => [b.id, String(b.dias)])))
  }, [q.data])

  if (acesso === null) return <Skeleton className="h-96 rounded-2xl" />
  if (!acesso.ver) return <SemAcessoSoroteca />
  const editar = acesso.configurar
  const inteiro = (v: string, min: number, max: number) => /^\d+$/.test(v) && Number(v) >= min && Number(v) <= max
  const valido = inteiro(aviso, 1, 90) && Object.values(dias).every(v => inteiro(v, 1, 3650))

  const salvar = async () => {
    if (!q.data || !valido) return
    setSalvando(true)
    try {
      // Só grava como personalizado o que difere do padrão (ou já era personalizado)
      const ret: Record<string, number> = {}
      for (const b of q.data.bancadas) {
        const n = Number(dias[b.id])
        if (b.personalizado || n !== b.padrao) ret[b.id] = n
      }
      await salvarConfig(Number(aviso), responsavel, ret)
      toast.success('Configuração da Soroteca salva. Vale para as próximas entradas.')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuração da Soroteca</h1>
        <p className="text-muted-foreground">Prazos de retenção, aviso de vencimento e responsável padrão pelo descarte</p>
      </div>
      {!editar && <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">Seu perfil pode ver, mas não alterar a configuração.</p>}
      {q.isLoading ? <Skeleton className="h-64 rounded-2xl" /> : q.error ? (
        <p className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{(q.error as Error).message}</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prazo de retenção por bancada</CardTitle>
              <p className="text-xs text-muted-foreground">Validade da amostra = data da coleta + prazo da bancada. Mudanças valem para as próximas entradas.</p>
            </CardHeader>
            <CardContent>
              {!q.data?.bancadas.length ? <p className="text-sm text-muted-foreground">Nenhuma bancada interna cadastrada.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Bancada</TableHead><TableHead className="w-40">Prazo (dias)</TableHead><TableHead className="w-28">Padrão</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {q.data.bancadas.map(b => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.nome}</TableCell>
                        <TableCell><Input type="number" min={1} max={3650} value={dias[b.id] ?? ''} disabled={!editar} onChange={e => setDias(d => ({ ...d, [b.id]: e.target.value }))} aria-label={`Prazo de ${b.nome}`} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {b.padrao} dias
                          {editar && Number(dias[b.id]) !== b.padrao && <Button variant="ghost" size="icon" className="ml-1 h-6 w-6" title="Voltar ao padrão" onClick={() => setDias(d => ({ ...d, [b.id]: String(b.padrao) }))}><RotateCcw className="h-3 w-3" /></Button>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Avisos e descarte</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Aviso de vencimento (dias antes)</Label>
                <Input type="number" min={1} max={90} value={aviso} disabled={!editar} onChange={e => setAviso(e.target.value)} />
                <p className="text-[11px] text-muted-foreground">Amostras que vencem dentro desse prazo aparecem em alerta no dashboard e como “Atenção” no descarte.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Responsável pelo descarte padrão</Label>
                <Input value={responsavel} maxLength={120} disabled={!editar} placeholder="Nome que já vem preenchido no descarte" onChange={e => setResponsavel(e.target.value)} />
              </div>
              {editar && <Button className="w-full" onClick={salvar} disabled={!valido || salvando}>{salvando && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Salvar</Button>}
              {!valido && <p className="text-xs text-destructive">Use números inteiros: aviso de 1 a 90 dias e prazos de 1 a 3650 dias.</p>}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
