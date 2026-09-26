import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Printer, ScanLine } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { imprimirRaw, textoParaBase64, servidorImpressaoAtivo } from '@/lib/impressaoLocal'
import { CONSERVACAO, ORDEM_CONSERVACAO, eplSaco } from './conservacao'

interface Recip { id: string; cod_bar_apoio: string; conservacao: string | null; conservacao_texto: string | null; separado: boolean; cancelado: boolean }

function beep(ok: boolean) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.frequency.value = ok ? 880 : 220; o.connect(g); g.connect(ctx.destination)
    g.gain.value = 0.15; o.start(); o.stop(ctx.currentTime + (ok ? 0.12 : 0.4))
  } catch { /* sem áudio */ }
}

export function SepararTemperaturaDialog({ remessa, onClose, onChanged }: {
  remessa: { id: string; cod_lote_lab: number; apoio_nome: string; saida_prevista?: string | null }
  onClose: () => void; onChanged: () => void
}) {
  const [recip, setRecip] = useState<Recip[]>([])
  const [codigo, setCodigo] = useState('')
  const [ultimo, setUltimo] = useState<{ ok: boolean; msg: string } | null>(null)
  const [verificar, setVerificar] = useState<{ id: string; codigo: string; texto: string | null } | null>(null)
  const ref = useRef<HTMLInputElement>(null)

  const carregar = async () => {
    const { data } = await supabase.from('apoio_recipiente').select('id, cod_bar_apoio, conservacao, conservacao_texto, separado, cancelado').eq('remessa_id', remessa.id).eq('cancelado', false).order('cod_bar_apoio')
    setRecip(((data as any) || []) as Recip[])
  }
  useEffect(() => { carregar() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setInterval(() => { if (!verificar && document.activeElement !== ref.current) ref.current?.focus() }, 400); return () => clearInterval(t) }, [verificar])

  const colunas = [...ORDEM_CONSERVACAO.filter(k => recip.some(r => r.conservacao === k)), ...(recip.some(r => !r.conservacao || r.conservacao === 'verificar') ? ['verificar'] : [])]
  const completas = recip.length > 0 && recip.every(r => r.separado && r.conservacao && r.conservacao !== 'verificar')

  const bipar = async (cod: string) => {
    const c = cod.trim(); setCodigo('')
    if (!c) return
    const { data, error } = await supabase.rpc('apoio_separar_bipar' as any, { _remessa: remessa.id, _codigo: c })
    if (error) { beep(false); setUltimo({ ok: false, msg: error.message }); return }
    const r: any = data
    if (r?.verificar) { beep(false); setVerificar({ id: r.recipiente_id, codigo: c, texto: r.texto }); setUltimo({ ok: false, msg: r.msg }); return }
    if (!r?.ok) { beep(false); setUltimo({ ok: false, msg: r?.msg || 'Tubo não reconhecido' }); return }
    beep(true)
    setUltimo({ ok: true, msg: `${c} → ${CONSERVACAO[r.conservacao]?.label}${r.ja ? ' (já estava separado)' : ''}` })
    await carregar(); onChanged()
    if (r.faltam === 0) toast.success(`Remessa ${remessa.cod_lote_lab} separada por temperatura`)
  }

  const escolher = async (cons: string) => {
    if (!verificar) return
    const { error } = await supabase.rpc('apoio_conservacao_definir' as any, { _recipiente: verificar.id, _conservacao: cons })
    if (error) return toast.error(error.message)
    const cod = verificar.codigo; setVerificar(null)
    await bipar(cod)
  }

  const sacos = ORDEM_CONSERVACAO.filter(k => recip.some(r => r.conservacao === k))
  const imprimirSaco = async (cons: string) => {
    if (!(await servidorImpressaoAtivo())) return toast.error('Servidor de Impressão AisAxius não está aberto. Abra o programa na bandeja do Windows e tente de novo.')
    const epl = eplSaco({ remessa: remessa.cod_lote_lab, apoio: remessa.apoio_nome, conservacao: cons, tubos: recip.filter(r => r.conservacao === cons).length,
      saco: sacos.indexOf(cons as any) + 1, total: sacos.length, saida: remessa.saida_prevista })
    try {
      const res = await imprimirRaw('etiqueta_apoio_pardini', textoParaBase64(epl))
      toast.success(res?.mensagem || 'Etiqueta do saco enviada para impressão.')
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Falha ao imprimir a etiqueta do saco.') }
  }

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>Separar por temperatura · Remessa {remessa.cod_lote_lab}</DialogTitle></DialogHeader>
        <div className="flex items-center gap-2">
          <ScanLine className="h-5 w-5 text-primary" />
          <Input ref={ref} autoFocus value={codigo} placeholder="Leia o código de barras do tubo" onChange={e => setCodigo(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') bipar(codigo) }} disabled={!!verificar} />
        </div>
        {ultimo && <p className={`text-sm font-medium ${ultimo.ok ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>{ultimo.ok ? '✅' : '❌'} {ultimo.msg}</p>}
        {verificar && (
          <div className="rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm space-y-2">
            <p>O tubo <b className="font-mono">{verificar.codigo}</b> está em <b>Verificar</b>{verificar.texto ? <> (etiqueta diz <b>{verificar.texto}</b>)</> : ' (etiqueta sem texto de conservação)'}. Escolha a conservação:</p>
            <div className="flex flex-wrap gap-2">
              {ORDEM_CONSERVACAO.map(k => <Button key={k} size="sm" variant="outline" onClick={() => escolher(k)}>{CONSERVACAO[k].icon} {CONSERVACAO[k].label}</Button>)}
              <Button size="sm" variant="ghost" onClick={() => setVerificar(null)}>Voltar</Button>
            </div>
          </div>
        )}
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(colunas.length, 1)}, minmax(0, 1fr))` }}>
          {colunas.map(k => {
            const tubos = recip.filter(r => (k === 'verificar' ? (!r.conservacao || r.conservacao === 'verificar') : r.conservacao === k))
            const ok = tubos.filter(t => t.separado).length
            return (
              <div key={k} className={`rounded-xl border p-3 ${CONSERVACAO[k].cls}`}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-semibold">{CONSERVACAO[k].icon} {CONSERVACAO[k].label} {k !== 'verificar' && <span className="font-normal">{ok}/{tubos.length}</span>}</p>
                  {k !== 'verificar' && <Button size="sm" variant="outline" className="h-7 gap-1 bg-background" onClick={() => imprimirSaco(k)}><Printer className="h-3.5 w-3.5" />Etiqueta do saco</Button>}
                </div>
                <ul className="space-y-1 text-sm">
                  {tubos.map(t => <li key={t.id} className="flex items-center gap-1 font-mono text-xs text-foreground">
                    {t.separado ? <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))]" /> : <span className="inline-block h-3.5 w-3.5 rounded-full border border-border" />}{t.cod_bar_apoio}
                  </li>)}
                </ul>
              </div>
            )
          })}
        </div>
        {completas && <p className="text-sm font-medium text-[hsl(var(--success))]">Todos os tubos separados. A remessa está "Separada".</p>}
      </DialogContent>
    </Dialog>
  )
}
