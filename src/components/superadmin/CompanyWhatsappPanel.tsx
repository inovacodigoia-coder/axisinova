import { useCallback, useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { WhatsappWebhookCheck } from './WhatsappWebhookCheck'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface WaState { habilitado: boolean; numeros: number; instancias: number }

/** Liberação do WhatsApp por empresa (Super Admin). Mesmo padrão visual da API de Parceiros. */
export function CompanyWhatsappPanel({ companyId }: { companyId: string }) {
  const [st, setSt] = useState<WaState | null>(null)
  const [numeros, setNumeros] = useState('0')
  const [confirmOff, setConfirmOff] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!companyId) return
    const [{ data: c }, { count }] = await Promise.all([
      supabase.from('companies').select('whatsapp_habilitado, whatsapp_numeros_autorizados').eq('id', companyId).maybeSingle(),
      supabase.from('whatsapp_instancias').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    ])
    if (!c) return
    setSt({ habilitado: c.whatsapp_habilitado, numeros: c.whatsapp_numeros_autorizados, instancias: count ?? 0 })
    setNumeros(String(c.whatsapp_numeros_autorizados))
  }, [companyId])

  useEffect(() => { void load() }, [load])

  const salvar = async (habilitado: boolean, n: number | null) => {
    setSaving(true)
    const { error } = await supabase.rpc('whatsapp_liberar', { _company: companyId, _habilitado: habilitado, _numeros: n as number })
    setSaving(false)
    if (error) { toast.error(error.message || 'Não foi possível salvar.'); return }
    toast.success(habilitado ? 'WhatsApp liberado para a empresa.' : 'WhatsApp bloqueado para a empresa.')
    void load()
  }

  const onToggle = (v: boolean) => {
    if (!v) { setConfirmOff(true); return }
    void salvar(true, null)
  }

  const desligar = async () => {
    setConfirmOff(false)
    setSaving(true)
    const { data, error } = await supabase.functions.invoke('whatsapp-instancia', { body: { acao: 'desconectar_empresa', company_id: companyId } })
    setSaving(false)
    if (error || !data?.ok) toast.warning(data?.mensagem || 'Alguns números não foram desconectados; o envio será bloqueado mesmo assim.')
    void salvar(false, null)
  }

  const salvarNumeros = () => {
    const n = Number(numeros)
    if (!Number.isInteger(n) || n < 0) { toast.error('Informe um número inteiro igual ou maior que 0.'); return }
    if (st && n === st.numeros) return
    void salvar(st?.habilitado ?? false, n)
  }

  if (!st) return null

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">WhatsApp liberado</p>
            <p className="text-xs text-muted-foreground">{st.instancias} número(s) criado(s) de {st.numeros} autorizado(s)</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Números autorizados
            <Input type="number" min={0} step={1} value={numeros} onChange={e => setNumeros(e.target.value)}
              onBlur={salvarNumeros} className="h-8 w-20" disabled={saving} />
          </label>
          <Switch checked={st.habilitado} onCheckedChange={onToggle} disabled={saving} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Ao liberar pela primeira vez, a empresa recebe 1 número e os 3 modelos de mensagem padrão. Cada número a mais vem de uma solicitação aprovada.
      </p>
      <WhatsappWebhookCheck companyId={companyId} />


      <AlertDialog open={confirmOff} onOpenChange={setConfirmOff}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bloquear WhatsApp desta empresa?</AlertDialogTitle>
            <AlertDialogDescription>Todos os números serão desconectados e o envio será bloqueado.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={desligar} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Bloquear</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
