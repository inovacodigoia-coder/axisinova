import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import type { CompanyUserOption, SupportBoard, SupportBoardMember } from '@/hooks/useSupportBoards'
import type { Sector } from '@/types/permissions.types'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  board: SupportBoard | null
  sectors: Sector[]
  users: CompanyUserOption[]
  loadMembers: (boardId: string) => Promise<SupportBoardMember[]>
  onSubmit: (input: {
    name: string
    sectorId: string | null
    visibility: 'public' | 'private'
    members: SupportBoardMember[]
  }) => Promise<void>
}

const PERMS = [
  { key: 'can_view', label: 'Visualizar' },
  { key: 'can_move', label: 'Mover' },
  { key: 'can_edit', label: 'Editar' },
  { key: 'can_delete', label: 'Excluir' },
] as const

export function BoardFormModal({ open, onOpenChange, board, sectors, users, loadMembers, onSubmit }: Props) {
  const [name, setName] = useState('')
  const [sectorId, setSectorId] = useState<string>('none')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [members, setMembers] = useState<Record<string, SupportBoardMember>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(board?.name || '')
    setSectorId(board?.sector_id || 'none')
    setVisibility(board?.visibility || 'public')
    setMembers({})
    if (board) {
      loadMembers(board.id).then(list => {
        const map: Record<string, SupportBoardMember> = {}
        list.forEach(m => { map[m.user_id] = m })
        setMembers(map)
      })
    }
  }, [open, board, loadMembers])

  const toggleUser = (userId: string, checked: boolean) => {
    setMembers(prev => {
      const next = { ...prev }
      if (checked) next[userId] = { user_id: userId, can_view: true, can_move: false, can_edit: false, can_delete: false }
      else delete next[userId]
      return next
    })
  }

  const togglePerm = (userId: string, key: typeof PERMS[number]['key'], value: boolean) => {
    setMembers(prev => ({ ...prev, [userId]: { ...prev[userId], [key]: value } }))
  }

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Informe o nome do quadro'); return }
    if (visibility === 'private' && Object.keys(members).length === 0) {
      toast.error('Selecione ao menos um usuário com acesso ao quadro privado')
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        name,
        sectorId: sectorId === 'none' ? null : sectorId,
        visibility,
        members: Object.values(members),
      })
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar o quadro')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{board ? 'Editar Quadro' : 'Novo Quadro'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nome do quadro *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Apoio - Envio de amostras" />
          </div>

          <div>
            <Label>Setor / Finalidade</Label>
            <Select value={sectorId} onValueChange={setSectorId}>
              <SelectTrigger><SelectValue placeholder="Selecione um setor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem setor</SelectItem>
                {sectors.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Visibilidade</Label>
            <Select value={visibility} onValueChange={(v: 'public' | 'private') => setVisibility(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Público (todos da empresa)</SelectItem>
                <SelectItem value="private">Privado (usuários selecionados)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {visibility === 'private' && (
            <div className="rounded-lg border p-3">
              <p className="mb-3 text-sm font-medium">Usuários com acesso</p>
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {users.map(u => {
                  const member = members[u.id]
                  return (
                    <div key={u.id} className="rounded-md border p-2">
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox checked={!!member} onCheckedChange={v => toggleUser(u.id, !!v)} />
                        <span className="font-medium">{u.name}</span>
                      </label>
                      {member && (
                        <div className="mt-2 flex flex-wrap gap-4 pl-6">
                          {PERMS.map(p => (
                            <label key={p.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Checkbox
                                checked={member[p.key]}
                                disabled={p.key === 'can_view'}
                                onCheckedChange={v => togglePerm(u.id, p.key, !!v)}
                              />
                              {p.label}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
                {users.length === 0 && <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gradient-bg text-white">
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
