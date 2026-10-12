import { useCallback, useEffect, useState } from 'react'
import { Loader2, Play } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Modo = 'desligada' | 'simulacao' | 'real'
const ROTULO: Record<Modo, string> = { desligada: 'Desligada', simulacao: 'Simulação', real: 'Real' }

/** Super Admin: chave global de exclusão por retenção e últimas execuções da empresa. */
export function RetencaoPanel({ companyId }: { companyId: string }) {
  const [modo, setModo] = useState<Modo | null>(null)
  const [execs, setExecs] = useState<any[]>([])
  const [confirmar, setConfirmar] = useState(false)
  const [txt, setTxt] = useState('')
  const [rodando, setRodando] = useState(false)

  const carregar = useCallback(() => {
    void supabase.rpc('whatsapp_retencao_modo').then(({ data }) => setModo((data as Modo) ?? 'simulacao'))
    void supabase.from('whatsapp_retencao_execucoes').select('*').eq('company_id', companyId).order('executada_em', { ascending: false }).limit(10)
      .then(({ data }) => setExecs(data ?? []))
  }, [companyId])
  useEffect(() => { carregar() }, [carregar])

  const definir = async (m: Modo, conf = '') => {
    const { error } = await supabase.rpc('whatsapp_retencao_definir_modo', { p_modo: m, p_confirmacao: conf })
    if (error) { toast.error(error.message); return }
    toast.success(`Exclusão por retenção: ${ROTULO[m]}.`); setConfirmar(false); setTxt(''); carregar()
  }
  const simular = async () => {
    setRodando(true)
    const { data, error } = await supabase.functions.invoke('inovachat-retencao', { body: {} })
    setRodando(false)
    if (error || !(data as any)?.ok) { toast.error('Não foi possível executar a simulação.'); return }
    toast.success('Simulação registrada. Nada foi apagado.'); carregar()
  }
  if (!modo) return null
  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Exclusão automática por retenção</p>
          <p className="text-xs text-muted-foreground">Vale para todas as empresas. Roda todo dia às 03:30 (Fortaleza).</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {(['desligada', 'simulacao', 'real'] as Modo[]).map(m => (
            <button key={m} onClick={() => m === 'real' ? setConfirmar(true) : void definir(m)}
              className={`min-h-[36px] rounded-md px-3 text-xs font-medium ${modo === m ? (m === 'real' ? 'bg-destructive text-destructive-foreground' : 'bg-card text-foreground shadow-sm') : 'text-muted-foreground'}`}>
              {ROTULO[m]}
            </button>
          ))}
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={() => void simular()} disabled={rodando}>
        {rodando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}Executar simulação agora
      </Button>
      {execs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-muted-foreground"><th className="py-1">Quando</th><th>Modo</th><th>Msgs</th><th>Mídias</th><th>Conversas</th><th>Contatos</th><th>Fila</th><th>Acessos</th><th>Erro</th></tr></thead>
            <tbody>{execs.map(e => (
              <tr key={e.id} className="border-t border-border">
                <td className="py-1">{new Date(e.executada_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td>
                <td>{e.modo === 'real' ? 'Real' : 'Simulação'}{e.manual ? ' (manual)' : ''}</td>
                <td>{e.mensagens}</td><td>{e.midias}</td><td>{e.conversas}</td><td>{e.contatos}</td><td>{e.fila}</td><td>{e.acessos}</td>
                <td className="max-w-[160px] truncate text-destructive" title={e.erro ?? ''}>{e.erro ?? ''}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={confirmar} onOpenChange={v => { if (!v) { setConfirmar(false); setTxt('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ligar exclusão real?</DialogTitle>
            <DialogDescription>Mensagens, arquivos e registros vencidos de todas as empresas passarão a ser apagados de verdade, sem volta. Digite APAGAR para confirmar.</DialogDescription>
          </DialogHeader>
          <Input value={txt} onChange={e => setTxt(e.target.value)} placeholder="APAGAR" className="h-11" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmar(false)}>Cancelar</Button>
            <Button variant="destructive" disabled={txt !== 'APAGAR'} onClick={() => void definir('real', txt)}>Ligar modo Real</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
