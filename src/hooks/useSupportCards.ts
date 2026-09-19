import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import type { SupportBoardStage } from '@/hooks/useSupportBoards'

export type SupportFieldType = 'short_text' | 'long_text' | 'date' | 'select'

export const FIELD_TYPE_LABELS: Record<SupportFieldType, string> = {
  short_text: 'Texto curto',
  long_text: 'Texto longo',
  date: 'Data',
  select: 'Seleção',
}

export interface SupportCardField {
  id: string
  board_id: string
  label: string
  field_type: SupportFieldType
  options: string[]
  is_required: boolean
  show_on_card: boolean
  position: number
}

export interface SupportCardSource {
  source_order_id: string | null
  source_protocol: string | null
  source_order_number: string | null
}

export interface SupportCard extends SupportCardSource {
  id: string
  board_id: string
  stage_id: string
  values: Record<string, string>
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}


export interface SupportCardAudit {
  id: string
  card_id: string
  board_id: string
  action: 'created' | 'field_changed' | 'stage_changed' | 'deleted'
  field_id: string | null
  field_label: string | null
  old_value: string | null
  new_value: string | null
  actor_id: string | null
  created_at: string
}

export interface SupportBoardDetail {
  id: string
  name: string
  company_id: string
  visibility: 'public' | 'private'
  created_by: string | null
}

export const DEFAULT_CARD_FIELDS: { label: string; field_type: SupportFieldType }[] = [
  { label: 'Leito', field_type: 'short_text' },
  { label: 'Nome do paciente', field_type: 'short_text' },
  { label: 'Exame', field_type: 'short_text' },
  { label: 'Data da solicitação', field_type: 'date' },
  { label: 'Data do Envio', field_type: 'date' },
]

export function useSupportBoardWorkspace(boardId: string | undefined) {
  const { user } = useAuth()
  const [board, setBoard] = useState<SupportBoardDetail | null>(null)
  const [stages, setStages] = useState<SupportBoardStage[]>([])
  const [fields, setFields] = useState<SupportCardField[]>([])
  const [cards, setCards] = useState<SupportCard[]>([])
  const [canEdit, setCanEdit] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!boardId) return
    setLoading(true)
    const [{ data: boardRow }, { data: stageRows }, { data: fieldRows }, { data: cardRows }, { data: memberRows }] =
      await Promise.all([
        supabase.from('support_boards').select('*').eq('id', boardId).maybeSingle(),
        supabase.from('support_board_stages').select('*').eq('board_id', boardId).order('position'),
        supabase.from('support_card_fields').select('*').eq('board_id', boardId).order('position'),
        supabase.from('support_cards').select('*').eq('board_id', boardId).order('created_at'),
        supabase.from('support_board_members').select('*').eq('board_id', boardId).eq('user_id', user?.id ?? ''),
      ])

    setBoard(boardRow as SupportBoardDetail | null)
    setStages((stageRows || []) as SupportBoardStage[])
    setFields(((fieldRows || []) as any[]).map(f => ({ ...f, options: (f.options as string[]) || [] })))
    setCards(((cardRows || []) as any[]).map(c => ({ ...c, values: (c.values as Record<string, string>) || {} })))

    const member = (memberRows || [])[0] as any
    const isManager = user?.role === 'company_admin' || user?.role === 'super_admin'
    setCanEdit(Boolean(isManager || (boardRow as any)?.created_by === user?.id || member?.can_edit))
    setLoading(false)
  }, [boardId, user?.id, user?.role])

  useEffect(() => { load() }, [load])

  /* ── Campos ── */
  const saveField = useCallback(async (input: Partial<SupportCardField> & { label: string; field_type: SupportFieldType }) => {
    if (!boardId || !board) return
    const payload = {
      company_id: board.company_id,
      board_id: boardId,
      label: input.label.trim(),
      field_type: input.field_type,
      options: input.field_type === 'select' ? (input.options || []) : [],
      is_required: !!input.is_required,
      show_on_card: !!input.show_on_card,
      position: input.position ?? (fields.length ? Math.max(...fields.map(f => f.position)) + 1 : 0),
    }
    const { error } = input.id
      ? await supabase.from('support_card_fields').update(payload).eq('id', input.id)
      : await supabase.from('support_card_fields').insert(payload)
    if (error) throw error
    await load()
  }, [boardId, board, fields, load])

  const deleteField = useCallback(async (fieldId: string) => {
    const inUse = cards.filter(c => {
      const v = c.values?.[fieldId]
      return v !== undefined && v !== null && String(v).trim() !== ''
    }).length
    if (inUse > 0) {
      throw new Error(`Não é possível excluir: ${inUse} card(s) já usam este campo.`)
    }
    const { error } = await supabase.from('support_card_fields').delete().eq('id', fieldId)
    if (error) throw error
    await load()
  }, [cards, load])

  const moveField = useCallback(async (fieldId: string, direction: -1 | 1) => {
    const ordered = [...fields].sort((a, b) => a.position - b.position)
    const index = ordered.findIndex(f => f.id === fieldId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= ordered.length) return
    const a = ordered[index]
    const b = ordered[target]
    await supabase.from('support_card_fields').update({ position: b.position }).eq('id', a.id)
    await supabase.from('support_card_fields').update({ position: a.position }).eq('id', b.id)
    await load()
  }, [fields, load])

  /* ── Cards ── */
  const createCard = useCallback(async (values: Record<string, string>, source?: Partial<SupportCardSource>) => {
    if (!boardId || !board) return
    const start = stages.find(s => s.is_start) || stages[0]
    if (!start) throw new Error('Configure uma etapa de Início antes de criar cards.')
    const { error } = await supabase.from('support_cards').insert({
      company_id: board.company_id,
      board_id: boardId,
      stage_id: start.id,
      values,
      source_order_id: source?.source_order_id ?? null,
      source_protocol: source?.source_protocol ?? null,
      source_order_number: source?.source_order_number ?? null,
      created_by: user?.id ?? null,
      updated_by: user?.id ?? null,
    })

    if (error) throw error
    await load()
  }, [boardId, board, stages, user?.id, load])

  const updateCard = useCallback(async (cardId: string, values: Record<string, string>) => {
    const { error } = await supabase
      .from('support_cards')
      .update({ values, updated_by: user?.id ?? null })
      .eq('id', cardId)
    if (error) throw error
    await load()
  }, [user?.id, load])

  const moveCard = useCallback(async (cardId: string, stageId: string) => {
    const { error } = await supabase
      .from('support_cards')
      .update({ stage_id: stageId, updated_by: user?.id ?? null })
      .eq('id', cardId)
    if (error) throw error
    setCards(prev => prev.map(c => (c.id === cardId ? { ...c, stage_id: stageId } : c)))
  }, [user?.id])

  const deleteCard = useCallback(async (cardId: string) => {
    const { error } = await supabase.from('support_cards').delete().eq('id', cardId)
    if (error) throw error
    await load()
  }, [load])

  return {
    board, stages, fields, cards, canEdit, loading, reload: load,
    saveField, deleteField, moveField,
    createCard, updateCard, moveCard, deleteCard,
  }
}

export function useUserNames(ids: (string | null)[]) {
  const [names, setNames] = useState<Record<string, string>>({})
  const key = Array.from(new Set(ids.filter(Boolean) as string[])).sort().join(',')

  useEffect(() => {
    const list = key ? key.split(',') : []
    if (list.length === 0) { setNames({}); return }
    supabase.from('profiles').select('id, full_name').in('id', list).then(({ data }) => {
      const map: Record<string, string> = {}
      ;(data || []).forEach((p: any) => { map[p.id] = p.full_name || 'Usuário' })
      setNames(map)
    })
  }, [key])

  return names
}
