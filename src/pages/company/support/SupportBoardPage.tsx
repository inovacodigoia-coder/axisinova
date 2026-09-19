import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, CalendarDays, ChevronDown, ChevronUp, Eye, FileText, KanbanSquare, List,
  Lock, PencilLine, Plus, Settings2, User, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { EmptyState } from '@/components/feedback/EmptyState'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useSupportBoardWorkspace, useUserNames, type SupportCard } from '@/hooks/useSupportCards'
import { CardFieldsModal } from '@/components/support/CardFieldsModal'
import { CardFormModal } from '@/components/support/CardFormModal'
import { OrderPickerModal, type PickedOrder } from '@/components/support/OrderPickerModal'
import { CardTimelineModal } from '@/components/support/CardTimelineModal'

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

export default function SupportBoardPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const navigate = useNavigate()
  const {
    board, stages, fields, cards, canEdit, loading, cardMeta,
    saveField, deleteField, moveField, createCard, updateCard, moveCard, deleteCard,
  } = useSupportBoardWorkspace(boardId)
  const [historyCardId, setHistoryCardId] = useState<string | null>(null)

  const [view, setView] = useState<'list' | 'kanban'>('kanban')
  const [fieldsOpen, setFieldsOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [activeCard, setActiveCard] = useState<SupportCard | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SupportCard | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [originOpen, setOriginOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [draftValues, setDraftValues] = useState<Record<string, string>>({})
  const [draftSource, setDraftSource] = useState<{ source_order_id: string; source_protocol: string | null; source_order_number: string | null } | null>(null)

  const names = useUserNames([
    ...cards.flatMap(c => [c.created_by, c.updated_by]),
    ...Object.values(cardMeta).flatMap(m => [m.createdBy, m.updatedBy]),
  ])
  const summaryFields = useMemo(() => fields.filter(f => f.show_on_card).slice(0, 4), [fields])
  const endStageId = stages.find(s => s.is_end)?.id
  const stageById = (id: string) => stages.find(s => s.id === id)

  const isLocked = (card: SupportCard) => card.stage_id === endStageId

  const openCard = (card: SupportCard) => { setActiveCard(card); setDraftValues({}); setDraftSource(null); setFormOpen(true) }

  const startManualCard = () => {
    setActiveCard(null); setDraftValues({}); setDraftSource(null)
    setOriginOpen(false); setFormOpen(true)
  }

  const applyOrder = (order: PickedOrder, examLabels: string[]) => {
    const values: Record<string, string> = {}
    fields.forEach(f => {
      const label = norm(f.label)
      if (label === 'nome do paciente' && order.patient_name) values[f.id] = order.patient_name
      else if (label === 'exame' && examLabels.length) {
        values[f.id] = f.field_type === 'select'
          ? (f.options.find(o => norm(o) === norm(examLabels[0])) || '')
          : examLabels.join(', ')
      } else if (label === 'data da solicitacao') {
        values[f.id] = order.created_at.slice(0, 10)
      }
    })
    setActiveCard(null)
    setDraftValues(values)
    setDraftSource({
      source_order_id: order.id,
      source_protocol: order.protocol,
      source_order_number: order.order_number,
    })
    setFormOpen(true)
  }

  const openSource = (card: SupportCard | null, fallback?: string | null) => {
    const ref = card?.source_protocol || card?.source_order_number || fallback
    if (!ref) return
    window.open(`/app/lab/analise?busca=${encodeURIComponent(ref)}`, '_blank')
  }


  const handleDrop = async (stageId: string, cardId: string) => {
    setDragOver(null)
    const card = cards.find(c => c.id === cardId)
    if (!card || card.stage_id === stageId) return
    if (!canEdit) { toast.error('Você tem apenas permissão de visualização'); return }
    if (isLocked(card)) { toast.error('Card arquivado na etapa final não pode ser movido'); return }
    try { await moveCard(cardId, stageId) }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Falha ao mover o card') }
  }

  const renderSummary = (card: SupportCard) => (
    <div className="space-y-1">
      {summaryFields.map(f => {
        const value = card.values?.[f.id]
        if (!value) return null
        return (
          <p key={f.id} className="truncate text-xs">
            <span className="text-muted-foreground">{f.label}: </span>
            <span className="text-foreground">{value}</span>
          </p>
        )
      })}
      {(card.source_protocol || card.source_order_number) && (
        <Badge variant="outline" className="mt-1 gap-1 text-[10px] text-primary">
          <FileText className="h-3 w-3" />{card.source_protocol || card.source_order_number}
        </Badge>
      )}
    </div>
  )


  if (loading) return <div className="p-6 text-sm text-muted-foreground">Carregando quadro...</div>
  if (!board) return <div className="p-6 text-sm text-muted-foreground">Quadro não encontrado.</div>

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="ghost" onClick={() => navigate('/app/apoio/kanban')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{board.name}</h1>
            <p className="text-sm text-muted-foreground">
              {cards.length} card(s) · {stages.length} etapas
              {!canEdit && ' · somente leitura'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border p-0.5">
            <Button size="sm" variant={view === 'list' ? 'secondary' : 'ghost'} onClick={() => setView('list')}>
              <List className="mr-1 h-4 w-4" />Lista
            </Button>
            <Button size="sm" variant={view === 'kanban' ? 'secondary' : 'ghost'} onClick={() => setView('kanban')}>
              <KanbanSquare className="mr-1 h-4 w-4" />Kanban
            </Button>
          </div>
          {canEdit && (
            <>
              <Button variant="outline" onClick={() => setFieldsOpen(true)}>
                <Settings2 className="mr-1 h-4 w-4" />Configurar Campos
              </Button>
              <Button className="gradient-bg text-white" onClick={() => setOriginOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />Novo Card
              </Button>

            </>
          )}
          {!canEdit && <Badge variant="secondary"><Eye className="mr-1 h-3 w-3" />Visualização</Badge>}
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={<KanbanSquare className="h-10 w-10" />}
            title="Nenhum card neste quadro"
            description={canEdit ? 'Crie o primeiro card para começar o fluxo.' : 'Ainda não há cards para visualizar.'}
            action={canEdit ? <Button className="gradient-bg text-white" onClick={() => setOriginOpen(true)}>Novo Card</Button> : undefined}
          />
        </div>
      ) : view === 'list' ? (
        <div className="space-y-6">
          {stages.map(stage => {
            const stageCards = cards.filter(c => c.stage_id === stage.id)
            return (
              <div key={stage.id}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} />
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{stage.name}</h2>
                  <Badge variant="outline">{stageCards.length}</Badge>
                </div>
                <div className="space-y-2">
                  {stageCards.map(card => (
                    <button
                      key={card.id}
                      onClick={() => openCard(card)}
                      className="flex w-full items-center justify-between gap-4 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">{renderSummary(card)}</div>
                      <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                        {isLocked(card) && <Lock className="h-3 w-3" />}
                        <User className="h-3 w-3" />
                        {names[cardMeta[card.id]?.updatedBy || card.updated_by || ''] || '—'}
                      </div>
                    </button>
                  ))}
                  {stageCards.length === 0 && (
                    <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">Sem cards nesta etapa.</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map(stage => {
            const stageCards = cards.filter(c => c.stage_id === stage.id)
            return (
              <div
                key={stage.id}
                onDragOver={e => { e.preventDefault(); setDragOver(stage.id) }}
                onDragLeave={() => setDragOver(prev => (prev === stage.id ? null : prev))}
                onDrop={e => { e.preventDefault(); handleDrop(stage.id, e.dataTransfer.getData('text/plain')) }}
                className={cn(
                  'w-72 shrink-0 rounded-xl border bg-muted/30 p-3 transition-colors',
                  dragOver === stage.id && 'border-primary bg-primary/5'
                )}
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} />
                  <h2 className="flex-1 truncate text-sm font-semibold">{stage.name}</h2>
                  <Badge variant="outline">{stageCards.length}</Badge>
                </div>
                <div className="space-y-2">
                  {stageCards.map(card => (
                    <div
                      key={card.id}
                      draggable={canEdit && !isLocked(card)}
                      onDragStart={e => e.dataTransfer.setData('text/plain', card.id)}
                      onClick={() => openCard(card)}
                      className="cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
                    >
                      {renderSummary(card)}
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                        {isLocked(card) && <Lock className="h-3 w-3" />}
                        <User className="h-3 w-3" />
                        {names[cardMeta[card.id]?.updatedBy || card.updated_by || ''] || '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <CardFieldsModal
        open={fieldsOpen}
        onOpenChange={setFieldsOpen}
        fields={fields}
        onSave={saveField}
        onDelete={deleteField}
        onMove={moveField}
      />

      <Dialog open={originOpen} onOpenChange={setOriginOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Card</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <button onClick={startManualCard} className="flex items-start gap-3 rounded-lg border p-4 text-left hover:bg-muted/50">
              <PencilLine className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Preencher manualmente</p>
                <p className="text-xs text-muted-foreground">Formulário em branco com os campos do quadro.</p>
              </div>
            </button>
            <button onClick={() => { setOriginOpen(false); setPickerOpen(true) }} className="flex items-start gap-3 rounded-lg border p-4 text-left hover:bg-muted/50">
              <FileText className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Puxar de um pedido</p>
                <p className="text-xs text-muted-foreground">Busque por protocolo, nome ou CPF e selecione os exames.</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {board && (
        <OrderPickerModal
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          companyId={board.company_id}
          usedOrderIds={cards.map(c => c.source_order_id).filter(Boolean) as string[]}
          onConfirm={applyOrder}
        />
      )}

      <CardFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        fields={fields}
        card={activeCard}
        initialValues={draftValues}
        sourceLabel={activeCard
          ? (activeCard.source_protocol || activeCard.source_order_number)
          : (draftSource?.source_protocol || draftSource?.source_order_number || null)}
        onOpenSource={() => openSource(activeCard, draftSource?.source_protocol || draftSource?.source_order_number)}
        stageName={activeCard ? stageById(activeCard.stage_id)?.name : stages.find(s => s.is_start)?.name}
        readOnly={!canEdit || (!!activeCard && isLocked(activeCard))}
        lockedReason={
          !canEdit
            ? 'Você tem apenas permissão de visualização neste quadro.'
            : activeCard && isLocked(activeCard)
              ? 'Card arquivado na etapa final — somente leitura.'
              : undefined
        }
        meta={activeCard ? {
          createdBy: names[cardMeta[activeCard.id]?.createdBy || activeCard.created_by || ''],
          createdAt: cardMeta[activeCard.id]?.createdAt || activeCard.created_at,
          updatedBy: names[cardMeta[activeCard.id]?.updatedBy || activeCard.updated_by || ''],
          updatedAt: cardMeta[activeCard.id]?.updatedAt || activeCard.updated_at,
        } : undefined}
        onOpenHistory={activeCard ? () => setHistoryCardId(activeCard.id) : undefined}
        onDelete={activeCard ? () => { setFormOpen(false); setDeleteTarget(activeCard) } : undefined}
        onSubmit={async values => {
          if (activeCard) { await updateCard(activeCard.id, values); toast.success('Card atualizado') }
          else {
            await createCard(values, draftSource || undefined)
            setDraftSource(null); setDraftValues({})
            toast.success('Card criado na etapa de início')
          }
        }}
      />




      <CardTimelineModal
        open={!!historyCardId}
        onOpenChange={v => !v && setHistoryCardId(null)}
        cardId={historyCardId}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir card</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!deleteTarget) return
              try { await deleteCard(deleteTarget.id); toast.success('Card excluído'); setActiveCard(null) }
              catch (e) { toast.error(e instanceof Error ? e.message : 'Falha ao excluir') }
              setDeleteTarget(null)
            }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
