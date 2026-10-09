import { useCallback, useEffect, useState } from 'react'
import { MessagesSquare } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const RETENCOES = [6, 12, 24, 36, 60]
const MOTIVOS: Record<string, string> = { grupo: 'grupo', sem_telefone: 'telefone não identificado', telefone_invalido: 'telefone inválido', sem_id: 'sem identificação' }

/** Super Admin: liberação do InovaChat por empresa, retenção contratada e contagem das últimas 24 h. */
export function CompanyInovachatPanel({ companyId }: { companyId: string }) {
  const [st, setSt] = useState<{ on: boolean; wa: boolean; ret: number } | null>(null)
  const [resumo, setResumo] = useState<{ gravadas_entrada: number; gravadas_saida: number; ignoradas: Record<string, number> } | null>(null)
  const [confirmar, setConfirmar] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('companies').select('inovachat_habilitado, whatsapp_habilitado, inovachat_retencao_meses').eq('id', companyId).maybeSingle()
    if (data) setSt({ on: data.inovachat_habilitado, wa: data.whatsapp_habilitado, ret: data.inovachat_retencao_meses })
    const { data: r } = await supabase.rpc('inovachat_resumo_24h', { _company: companyId })
    setResumo(r as any)
  }, [companyId])
  useEffect(() => { void load() }, [load])

  const salvar = async (on: boolean, ret: number) => {
    setSaving(true)
    const { error } = await supabase.rpc('inovachat_liberar', { _company: companyId, _habilitado: on, _retencao: ret })
    setSaving(false)
    if (error) { toast.error(error.message || 'Não foi possível salvar.'); return }
    toast.success('InovaChat atualizado.')
    void load()
  }

  if (!st) return null
  const ign = Object.entries(resumo?.ignoradas ?? {})
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <MessagesSquare className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">InovaChat</p>
            <p className="text-xs text-muted-foreground">{st.wa ? 'Grava as conversas recebidas nos números desta empresa' : 'Libere o WhatsApp antes'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Guardar conversas
            <select value={st.ret} disabled={saving} onChange={e => void salvar(st.on, Number(e.target.value))}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs">
              {RETENCOES.map(m => <option key={m} value={m}>{m} meses{m === 6 ? ' (incluso)' : ' (adicional)'}</option>)}
            </select>
          </label>
          <Switch checked={st.on} disabled={saving || (!st.wa && !st.on)} onCheckedChange={v => setConfirmar(v)} />
        </div>
      </div>
      {st.on && resumo && (
        <p className="text-xs text-muted-foreground">
          Últimas 24 h: {resumo.gravadas_entrada} recebida(s) e {resumo.gravadas_saida} enviada(s) gravadas
          {ign.length > 0 && <> · ignoradas: {ign.map(([k, n]) => `${n} ${MOTIVOS[k] ?? k}`).join(', ')}</>}
        </p>
      )}
      <AlertDialog open={confirmar !== null} onOpenChange={v => { if (!v) setConfirmar(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmar ? 'Ligar o InovaChat?' : 'Desligar o InovaChat?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmar ? 'As mensagens recebidas nos números de WhatsApp desta empresa passarão a ser gravadas no sistema.'
                : 'A gravação de novas mensagens será interrompida. As conversas já gravadas permanecem.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { const v = confirmar!; setConfirmar(null); void salvar(v, st.ret) }}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
