import { useCallback, useEffect, useState } from 'react'
import { Loader2, MessagesSquare } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/** Super Admin: liga/desliga o Chat Interno da empresa e ajusta a retenção (meses). */
export function CompanyChatInternoPanel({ companyId }: { companyId: string }) {
  const [habilitado, setHabilitado] = useState<boolean | null>(null)
  const [retencao, setRetencao] = useState('24')
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(() => {
    void supabase.from('companies').select('chat_interno_habilitado, chat_interno_retencao_meses').eq('id', companyId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setHabilitado(data.chat_interno_habilitado)
          setRetencao(String(data.chat_interno_retencao_meses ?? 24))
        }
      })
  }, [companyId])
  useEffect(() => { carregar() }, [carregar])

  const salvar = async (novo: boolean) => {
    setSalvando(true)
    const meses = Math.max(1, parseInt(retencao, 10) || 24)
    const { error } = await supabase.rpc('chat_interno_liberar', { p_company: companyId, p_habilitado: novo, p_retencao: meses })
    setSalvando(false)
    if (error) { toast.error(error.message); return }
    setHabilitado(novo)
    toast.success(novo ? 'Chat Interno ligado para esta empresa.' : 'Chat Interno desligado para esta empresa.')
  }

  if (habilitado === null) return null
  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium"><MessagesSquare className="h-4 w-4" />Chat Interno</p>
          <p className="text-xs text-muted-foreground">Conversas entre a equipe da empresa. Ligado por padrão; ao desligar, o menu some e as ações são recusadas.</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {[true, false].map(v => (
            <button key={String(v)} onClick={() => void salvar(v)} disabled={salvando}
              className={`min-h-[36px] rounded-md px-3 text-xs font-medium ${habilitado === v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
              {v ? 'Ligado' : 'Desligado'}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">Retenção (meses):</label>
        <Input type="number" min={1} value={retencao} onChange={e => setRetencao(e.target.value)} className="h-8 w-24" />
        <Button size="sm" variant="outline" disabled={salvando} onClick={() => void salvar(habilitado)}>
          {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar retenção
        </Button>
      </div>
    </div>
  )
}
