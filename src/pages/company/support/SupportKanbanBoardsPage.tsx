import { useMemo, useState } from 'react'
import { Globe, KanbanSquare, Layers, Lock, MoreHorizontal, Pencil, Plus, Search, Settings2, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { EmptyState } from '@/components/feedback/EmptyState'
import { toast } from 'sonner'
import { useCompanyContext } from '@/context/CompanyContext'
import { useSupportBoards, type SupportBoard } from '@/hooks/useSupportBoards'
import { BoardFormModal } from '@/components/support/BoardFormModal'
import { BoardStagesModal } from '@/components/support/BoardStagesModal'

export default function SupportKanbanBoardsPage() {
  const { allSectors } = useCompanyContext()
  const { companyId, boards, users, loading, reload, createBoard, updateBoard, deleteBoard, fetchMembers } = useSupportBoards()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SupportBoard | null>(null)
  const [stagesFor, setStagesFor] = useState<SupportBoard | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SupportBoard | null>(null)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return term ? boards.filter(b => b.name.toLowerCase().includes(term)) : boards
  }, [boards, search])

  const sectorName = (id: string | null) => allSectors.find(s => s.id === id)?.name || 'Sem setor'

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kanban Apoio</h1>
          <p className="text-sm text-muted-foreground">Gerencie os quadros de apoio e suas etapas.</p>
        </div>
        <Button className="gradient-bg text-white" onClick={() => { setEditing(null); setFormOpen(true) }}>
          <Plus className="mr-1 h-4 w-4" />Novo Quadro
        </Button>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar quadro..." className="pl-9" />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando quadros...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={<KanbanSquare className="h-10 w-10" />}
            title="Nenhum quadro criado"
            description="Crie o primeiro quadro de apoio para organizar o fluxo em etapas."
            action={<Button className="gradient-bg text-white" onClick={() => { setEditing(null); setFormOpen(true) }}>Novo Quadro</Button>}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(board => (
            <div key={board.id} className="rounded-xl border bg-card p-4 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <button className="min-w-0 text-left" onClick={() => navigate(`/app/apoio/kanban/${board.id}`)}>
                  <h3 className="truncate font-semibold text-foreground hover:text-primary">{board.name}</h3>
                  <p className="truncate text-xs text-muted-foreground">{sectorName(board.sector_id)}</p>
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setEditing(board); setFormOpen(true) }}>
                      <Pencil className="mr-2 h-4 w-4" />Editar quadro
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStagesFor(board)}>
                      <Settings2 className="mr-2 h-4 w-4" />Configurar etapas
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(board)}>
                      <Trash2 className="mr-2 h-4 w-4" />Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="secondary">
                  {board.visibility === 'public'
                    ? <><Globe className="mr-1 h-3 w-3" />Público</>
                    : <><Lock className="mr-1 h-3 w-3" />Privado</>}
                </Badge>
                <Badge variant="outline"><Layers className="mr-1 h-3 w-3" />{board.stagesCount} etapas</Badge>
                <Badge variant="outline"><Users className="mr-1 h-3 w-3" />{board.membersCount} membros</Badge>
              </div>

              <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => setStagesFor(board)}>
                Configurar Etapas
              </Button>
            </div>
          ))}
        </div>
      )}

      <BoardFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        board={editing}
        sectors={allSectors}
        users={users}
        loadMembers={fetchMembers}
        onSubmit={async input => {
          if (editing) { await updateBoard(editing.id, input); toast.success('Quadro atualizado') }
          else { await createBoard(input); toast.success('Quadro criado com as etapas padrão') }
        }}
      />

      <BoardStagesModal
        open={!!stagesFor}
        onOpenChange={v => { if (!v) { setStagesFor(null); reload() } }}
        boardId={stagesFor?.id ?? null}
        boardName={stagesFor?.name ?? ''}
        companyId={companyId}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir quadro</AlertDialogTitle>
            <AlertDialogDescription>
              O quadro "{deleteTarget?.name}" e suas etapas serão removidos. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteTarget) return
                try { await deleteBoard(deleteTarget.id); toast.success('Quadro excluído') }
                catch (e) { toast.error(e instanceof Error ? e.message : 'Falha ao excluir') }
                setDeleteTarget(null)
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
