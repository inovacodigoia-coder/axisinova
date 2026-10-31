import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  orderId: string
  companyId?: string
  currentOriginId?: string
  currentOriginName?: string
  onChanged?: (origin: { id: string; name: string }) => void
}

export function MudarOrigemDialog({ open, onOpenChange, orderId, companyId, currentOriginId, currentOriginName, onChanged }: Props) {
  const { toast } = useToast()
  const [origens, setOrigens] = useState<{ id: string; name: string; internal_code: string | null }[]>([])
  const [destino, setDestino] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!open || !companyId) return
    setDestino('')
    supabase.from('origins').select('id,name,internal_code').eq('company_id', companyId).order('internal_code')
      .then(({ data }) => setOrigens((data as any[]) || []))
  }, [open, companyId])

  const salvar = async () => {
    setSalvando(true)
    const { data, error } = await (supabase.rpc as any)('atendimento_mudar_origem', { _order_id: orderId, _origin_id: destino })
    setSalvando(false)
    if (error) { toast({ title: 'Não foi possível mudar a origem', description: error.message, variant: 'destructive' }); return }
    toast({ title: 'Origem alterada', description: `Atendimento agora em ${data?.origin_name}.` })
    onChanged?.({ id: data.origin_id, name: data.origin_name })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[300] max-w-md">
        <DialogHeader>
          <DialogTitle>Mudar origem do atendimento</DialogTitle>
          <DialogDescription>
            Origem atual: <b>{currentOriginName || '—'}</b>. Após a mudança, o paciente aparece nos Portais Externos da nova origem.
          </DialogDescription>
        </DialogHeader>
        <Select value={destino} onValueChange={setDestino}>
          <SelectTrigger><SelectValue placeholder="Selecione a nova origem" /></SelectTrigger>
          <SelectContent className="z-[310]">
            {origens.filter(o => o.id !== currentOriginId).map(o => (
              <SelectItem key={o.id} value={o.id}>{o.internal_code ? `${o.internal_code} - ` : ''}{o.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!destino || salvando} onClick={salvar}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Transferir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
