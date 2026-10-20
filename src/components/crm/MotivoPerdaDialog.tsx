import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { CrmMotivo } from '@/lib/crm'
import { selCls } from './LeadFormDialog'

export function MotivoPerdaDialog({ open, motivos, onClose, onConfirmar }: {
  open: boolean; motivos: CrmMotivo[]; onClose: () => void; onConfirmar: (motivo: string, texto: string) => void
}) {
  const [m, setM] = useState(''); const [t, setT] = useState('')
  useEffect(() => { if (open) { setM(''); setT('') } }, [open])
  const outro = motivos.find(x => x.id === m)?.nome === 'Outro'
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Marcar como perdido</DialogTitle><DialogDescription>O motivo é obrigatório.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Motivo *</Label>
            <select className={selCls} value={m} onChange={e => setM(e.target.value)}>
              <option value="">Selecione…</option>{motivos.filter(x => x.ativo).map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}
            </select></div>
          <div className="space-y-1"><Label>Detalhes{outro ? ' *' : ''}</Label><Textarea value={t} maxLength={300} onChange={e => setT(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" disabled={!m || (outro && !t.trim())} onClick={() => onConfirmar(m, t)}>Confirmar perda</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
