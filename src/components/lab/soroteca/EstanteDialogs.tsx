import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EquipamentoDesenho } from '@/components/lab/soroteca/EquipamentoDesenho'
import {
  COLUNAS_ESTANTE, desenhoDoArmario, ehArmario, erroCodigoEstante, LINHAS_ESTANTE, rotuloPosicao,
  type EquipamentoSoroteca,
} from '@/lib/soroteca'

const SEM_BANCADA = '__nenhuma__'

export interface NovaEstanteDados { codigo: string; linhas: number; colunas: number; workbench_id: string | null; imprimir: boolean }

/** "+ Nova estante" sem sair da Entrada: código, grade (linhas × colunas), bancada principal e etiqueta. */
export function NovaEstanteDialog({ aberto, codigoInicial, doBipe, bancadas, onClose, onCriar }: {
  aberto: boolean
  codigoInicial: string
  /** Veio de um bipe de etiqueta desconhecida (pergunta antes de criar e não imprime por padrão). */
  doBipe: boolean
  bancadas: { id: string; name: string }[]
  onClose: () => void
  onCriar: (d: NovaEstanteDados) => Promise<void>
}) {
  const [codigo, setCodigo] = useState(codigoInicial)
  const [linhas, setLinhas] = useState(4)
  const [colunas, setColunas] = useState(16)
  const [bancada, setBancada] = useState(SEM_BANCADA)
  const [imprimir, setImprimir] = useState(!doBipe)
  const [salvando, setSalvando] = useState(false)
  useEffect(() => { if (aberto) { setCodigo(codigoInicial); setImprimir(!doBipe) } }, [aberto, codigoInicial, doBipe])
  const erro = codigo.trim() ? erroCodigoEstante(codigo) : 'Informe a etiqueta da estante'

  const criar = async () => {
    if (erro) return
    setSalvando(true)
    try { await onCriar({ codigo: codigo.trim().toUpperCase(), linhas, colunas, workbench_id: bancada === SEM_BANCADA ? null : bancada, imprimir }) }
    finally { setSalvando(false) }
  }

  return (
    <Dialog open={aberto} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{doBipe ? `Estante ${codigoInicial} não cadastrada` : 'Nova estante'}</DialogTitle>
          <DialogDescription>{doBipe ? 'Deseja criar uma nova estante com esse código e começar a preencher?' : 'Crie a estante e já comece a bipar os tubos.'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nova-estante-codigo">Etiqueta / código da estante</Label>
            <Input id="nova-estante-codigo" value={codigo} maxLength={30} className="font-mono uppercase" onChange={e => setCodigo(e.target.value.toUpperCase())} />
            {erro && codigo.trim() && <p className="text-xs text-destructive">{erro}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Linhas</Label>
              <Select value={String(linhas)} onValueChange={v => setLinhas(Number(v))}>
                <SelectTrigger aria-label="Linhas"><SelectValue /></SelectTrigger>
                <SelectContent>{LINHAS_ESTANTE.map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Colunas</Label>
              <Select value={String(colunas)} onValueChange={v => setColunas(Number(v))}>
                <SelectTrigger aria-label="Colunas"><SelectValue /></SelectTrigger>
                <SelectContent>{COLUNAS_ESTANTE.map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            Endereço: letra da linha + número da coluna → <strong className="text-foreground">A01</strong> até <strong className="text-foreground">{rotuloPosicao(linhas, colunas)}</strong> ({linhas * colunas} posições)
          </p>
          <div className="space-y-1.5">
            <Label>Bancada principal (opcional)</Label>
            <Select value={bancada} onValueChange={setBancada}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_BANCADA}>Nenhuma</SelectItem>
                {bancadas.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={imprimir} onCheckedChange={v => setImprimir(v === true)} />Imprimir a etiqueta da estante ao criar
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={criar} disabled={!!erro || salvando}>{salvando && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Criar e abrir para preenchimento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Finalizar: escolhe a geladeira/freezer e a prateleira (com vaga) onde a estante fica guardada. */
export function FinalizarEstanteDialog({ estante, preenchidas, total, equipamentos, onClose, onConfirmar }: {
  estante: EquipamentoSoroteca | null
  preenchidas: number
  total: number
  equipamentos: EquipamentoSoroteca[]
  onClose: () => void
  onConfirmar: (equipamentoId: string, prateleiraId: string) => Promise<void>
}) {
  const armarios = useMemo(() => equipamentos.filter(e => ehArmario(e) && e.ativo), [equipamentos])
  const [eqId, setEqId] = useState('')
  const [prId, setPrId] = useState('')
  const [salvando, setSalvando] = useState(false)
  // Mesma regra do desenho: prateleira cheia não pode ser escolhida (a própria estante não conta).
  const prateleirasDoArmario = (a: EquipamentoSoroteca | null | undefined) => desenhoDoArmario(a, equipamentos, estante?.id)

  useEffect(() => {
    if (!estante) return
    const atual = armarios.find(a => a.id === estante.local_equipamento_id)
    const eq = atual || armarios.find(a => prateleirasDoArmario(a).some(p => !p.cheia)) || armarios[0]
    setEqId(eq?.id || '')
    const ps = prateleirasDoArmario(eq)
    const pr = ps.find(p => p.id === estante.local_prateleira_id) || ps.find(p => !p.cheia)
    setPrId(pr?.id || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estante?.id])

  const eq = armarios.find(a => a.id === eqId) || null
  const prateleiras = prateleirasDoArmario(eq)
  const escolherPrateleira = (id: string) => { const p = prateleiras.find(x => x.id === id); if (p && !p.cheia) setPrId(id) }
  const confirmar = async () => {
    if (!eqId || !prId) return
    setSalvando(true)
    try { await onConfirmar(eqId, prId) } finally { setSalvando(false) }
  }

  return (
    <Dialog open={!!estante} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[95vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Finalizar estante</DialogTitle>
          <DialogDescription>
            <strong className="text-foreground">{estante?.nome}</strong> — {preenchidas}/{total} posições preenchidas
          </DialogDescription>
        </DialogHeader>
        {!armarios.length ? (
          <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">Nenhuma geladeira ou freezer ativo. Cadastre em Estrutura Física para guardar a estante.</p>
        ) : (
          <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Geladeira</Label>
                <Select value={eqId} onValueChange={v => { setEqId(v); setPrId('') }}>
                  <SelectTrigger aria-label="Geladeira"><SelectValue placeholder="Escolha" /></SelectTrigger>
                  <SelectContent>
                    {armarios.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}{a.temperatura ? ` · ${a.temperatura}` : ''} ({a.ocupadas}/{a.capacidade})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Prateleira</Label>
                <Select value={prId} onValueChange={escolherPrateleira} disabled={!eq}>
                  <SelectTrigger aria-label="Prateleira"><SelectValue placeholder="Escolha" /></SelectTrigger>
                  <SelectContent>
                    {prateleiras.map(p => (
                      <SelectItem key={p.id} value={p.id} disabled={p.cheia}>{p.nome} — {p.estantes.length}/{p.capacidade} estantes{p.cheia ? ' (cheia)' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">Também dá para clicar na prateleira no desenho. Prateleira cheia fica bloqueada.</p>
            </div>
            {eq && (
              <EquipamentoDesenho armario={eq} equipamentos={equipamentos} ignorarEstanteId={estante?.id} destaquePrateleiraId={prId || null}
                onPrateleira={escolherPrateleira} rodape={[eq.nome, prateleiras.find(p => p.id === prId)?.nome].filter(Boolean).join(' > ')} />
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Voltar</Button>
          <Button onClick={confirmar} disabled={!eqId || !prId || salvando || preenchidas === 0}>
            {salvando && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Confirmar armazenamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
