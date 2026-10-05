import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const OPCOES = [
  { label: '07:00 às 20:00', inicio: '07:00', fim: '20:00' },
  { label: '08:00 às 18:00', inicio: '08:00', fim: '18:00' },
  { label: '09:00 às 17:00', inicio: '09:00', fim: '17:00' },
]

/** Janela de horário em que as confirmações automáticas podem sair (fuso de Fortaleza). */
export function JanelaEnvio() {
  const [inicio, setInicio] = useState('07:00')
  const [fim, setFim] = useState('20:00')
  const [salvo, setSalvo] = useState({ inicio: '07:00', fim: '20:00' })
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    void supabase.rpc('whatsapp_janela_obter' as any).then(({ data }) => {
      const d = data as any
      if (d?.inicio) { setInicio(d.inicio); setFim(d.fim); setSalvo({ inicio: d.inicio, fim: d.fim }) }
    })
  }, [])

  const salvar = async (i = inicio, f = fim) => {
    if (f <= i) { toast.error('O fim deve ser depois do início.'); return }
    setSalvando(true)
    const { data, error } = await supabase.rpc('whatsapp_janela_salvar' as any, { p_inicio: i, p_fim: f })
    setSalvando(false)
    const d = data as any
    if (error || !d?.ok) { toast.error(d?.mensagem || 'Não foi possível salvar.'); return }
    setInicio(i); setFim(f); setSalvo({ inicio: i, fim: f })
    toast.success('Horário de envio salvo.')
  }

  const mudou = inicio !== salvo.inicio || fim !== salvo.fim

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">Horário de envio das confirmações</h3>
      </div>
      <p className="text-xs text-muted-foreground">Fora deste horário as mensagens esperam na fila e saem quando o horário abrir.</p>
      <div className="flex flex-wrap gap-2">
        {OPCOES.map(o => (
          <Button key={o.label} size="sm" disabled={salvando}
            variant={salvo.inicio === o.inicio && salvo.fim === o.fim ? 'default' : 'outline'}
            onClick={() => void salvar(o.inicio, o.fim)}>{o.label}</Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Personalizar:</span>
        <Input type="time" value={inicio} onChange={e => setInicio(e.target.value)} className="h-9 w-28" />
        <span className="text-muted-foreground">às</span>
        <Input type="time" value={fim} onChange={e => setFim(e.target.value)} className="h-9 w-28" />
        <Button size="sm" disabled={!mudou || salvando} onClick={() => void salvar()}>Salvar</Button>
      </div>
    </div>
  )
}
