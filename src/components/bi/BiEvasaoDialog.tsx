import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface BiEvasaoDialogProps {
  /** Episódio hospitalar do atendimento (hospital_episode_id). */
  episodioId: string | null | undefined
  /** Rótulo do paciente para exibir no diálogo. */
  pacienteNome?: string | null
}

/** Botão + diálogo "Registrar evasão" (saída sem alta). Gera o evento final da jornada com motivo obrigatório. */
export function BiEvasaoButton({ episodioId, pacienteNome }: BiEvasaoDialogProps) {
  const [open, setOpen] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)
  if (!episodioId) return null

  const confirmar = async () => {
    if (!motivo.trim()) { toast.error('Informe o motivo da evasão.'); return }
    setSaving(true)
    const { error } = await supabase.rpc('bi_registrar_evasao' as any, { _episodio: episodioId, _motivo: motivo.trim() })
    setSaving(false)
    if (error) { toast.error(error.message || 'Não foi possível registrar a evasão.'); return }
    toast.success('Evasão registrada na jornada do paciente.')
    setOpen(false); setMotivo('')
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <LogOut className="mr-1 h-3.5 w-3.5" /> Registrar evasão
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar evasão</DialogTitle>
            <DialogDescription>
              Confirma que {pacienteNome ? <strong>{pacienteNome}</strong> : 'o paciente'} saiu sem alta registrada? Essa saída será gravada como o evento final da jornada.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Motivo da evasão (obrigatório)"
            rows={3}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button type="button" variant="destructive" onClick={() => void confirmar()} disabled={saving}>
              {saving ? 'Registrando…' : 'Confirmar evasão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
