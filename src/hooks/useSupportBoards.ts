import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { DEFAULT_CARD_FIELDS } from '@/hooks/useSupportCards'


export interface SupportBoardMember {
  id?: string
  user_id: string
  can_view: boolean
  can_move: boolean
  can_edit: boolean
  can_delete: boolean
}

export interface SupportBoardStage {
  id: string
  board_id: string
  name: string
  color: string
  position: number
  is_start: boolean
  is_end: boolean
}

export interface SupportBoard {
  id: string
  company_id: string
  name: string
  sector_id: string | null
  visibility: 'public' | 'private'
  created_by: string | null
  stagesCount: number
  membersCount: number
}

export interface CompanyUserOption {
  id: string
  name: string
  role: string | null
}

export function useSupportBoards() {
  const { user } = useAuth()
  const companyId = user?.companyId || null
  const [boards, setBoards] = useState<SupportBoard[]>([])
  const [users, setUsers] = useState<CompanyUserOption[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!companyId) { setBoards([]); setLoading(false); return }
    setLoading(true)
    const [{ data: boardRows }, { data: stageRows }, { data: memberRows }] = await Promise.all([
      supabase.from('support_boards').select('*').eq('company_id', companyId).order('created_at'),
      supabase.from('support_board_stages').select('id, board_id'),
      supabase.from('support_board_members').select('id, board_id'),
    ])
    const list = (boardRows || []).map((b: any) => ({
      id: b.id,
      company_id: b.company_id,
      name: b.name,
      sector_id: b.sector_id,
      visibility: b.visibility as 'public' | 'private',
      created_by: b.created_by,
      stagesCount: (stageRows || []).filter((s: any) => s.board_id === b.id).length,
      membersCount: (memberRows || []).filter((m: any) => m.board_id === b.id).length,
    }))
    setBoards(list)
    setLoading(false)
  }, [companyId])

  const loadUsers = useCallback(async () => {
    if (!companyId) return
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('company_id', companyId)
      .order('full_name')
    setUsers((data || []).map((u: any) => ({ id: u.id, name: u.full_name || 'Sem nome', role: u.role })))
  }, [companyId])

  useEffect(() => { load(); loadUsers() }, [load, loadUsers])

  const createBoard = useCallback(async (input: {
    name: string
    sectorId: string | null
    visibility: 'public' | 'private'
    members: SupportBoardMember[]
  }) => {
    if (!companyId) throw new Error('Empresa não identificada')
    const { data, error } = await supabase
      .from('support_boards')
      .insert({
        company_id: companyId,
        name: input.name.trim(),
        sector_id: input.sectorId,
        visibility: input.visibility,
        created_by: user?.id ?? null,
      })
      .select('*')
      .single()
    if (error) throw error

    const { error: stageError } = await supabase.from('support_board_stages').insert([
      { company_id: companyId, board_id: data.id, name: 'A Fazer', color: '#00D4FF', position: 0, is_start: true, is_end: false },
      { company_id: companyId, board_id: data.id, name: 'Concluído', color: '#7B2FF7', position: 1, is_start: false, is_end: true },
    ])
    if (stageError) throw stageError

    const { error: fieldError } = await supabase.from('support_card_fields').insert(
      DEFAULT_CARD_FIELDS.map((f, index) => ({
        company_id: companyId,
        board_id: data.id,
        label: f.label,
        field_type: f.field_type,
        is_required: index === 1,
        show_on_card: true,
        position: index,
      }))
    )
    if (fieldError) throw fieldError


    if (input.visibility === 'private' && input.members.length > 0) {
      const { error: memberError } = await supabase.from('support_board_members').insert(
        input.members.map(m => ({ ...m, company_id: companyId, board_id: data.id }))
      )
      if (memberError) throw memberError
    }
    await load()
    return data.id as string
  }, [companyId, user?.id, load])

  const updateBoard = useCallback(async (boardId: string, input: {
    name: string
    sectorId: string | null
    visibility: 'public' | 'private'
    members: SupportBoardMember[]
  }) => {
    if (!companyId) throw new Error('Empresa não identificada')
    const { error } = await supabase
      .from('support_boards')
      .update({ name: input.name.trim(), sector_id: input.sectorId, visibility: input.visibility })
      .eq('id', boardId)
    if (error) throw error

    await supabase.from('support_board_members').delete().eq('board_id', boardId)
    if (input.visibility === 'private' && input.members.length > 0) {
      const { error: memberError } = await supabase.from('support_board_members').insert(
        input.members.map(m => ({
          company_id: companyId,
          board_id: boardId,
          user_id: m.user_id,
          can_view: m.can_view,
          can_move: m.can_move,
          can_edit: m.can_edit,
          can_delete: m.can_delete,
        }))
      )
      if (memberError) throw memberError
    }
    await load()
  }, [companyId, load])

  const deleteBoard = useCallback(async (boardId: string) => {
    const { error } = await supabase.from('support_boards').delete().eq('id', boardId)
    if (error) throw error
    await load()
  }, [load])

  const fetchMembers = useCallback(async (boardId: string): Promise<SupportBoardMember[]> => {
    const { data } = await supabase
      .from('support_board_members')
      .select('id, user_id, can_view, can_move, can_edit, can_delete')
      .eq('board_id', boardId)
    return (data || []) as SupportBoardMember[]
  }, [])

  return { companyId, boards, users, loading, reload: load, createBoard, updateBoard, deleteBoard, fetchMembers }
}

export function useBoardStages(boardId: string | null, companyId: string | null) {
  const [stages, setStages] = useState<SupportBoardStage[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!boardId) { setStages([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('support_board_stages')
      .select('*')
      .eq('board_id', boardId)
      .order('position')
    setStages((data || []) as SupportBoardStage[])
    setLoading(false)
  }, [boardId])

  useEffect(() => { load() }, [load])

  const addStage = useCallback(async (name: string, color: string) => {
    if (!boardId || !companyId) return
    const position = stages.length ? Math.max(...stages.map(s => s.position)) + 1 : 0
    const { error } = await supabase.from('support_board_stages').insert({
      company_id: companyId, board_id: boardId, name: name.trim(), color, position,
    })
    if (error) throw error
    await load()
  }, [boardId, companyId, stages, load])

  const updateStage = useCallback(async (stageId: string, patch: Partial<SupportBoardStage>) => {
    const { error } = await supabase.from('support_board_stages').update(patch).eq('id', stageId)
    if (error) throw error
    await load()
  }, [load])

  const deleteStage = useCallback(async (stageId: string) => {
    const target = stages.find(s => s.id === stageId)
    if (target && (target.is_start || target.is_end)) {
      throw new Error('Defina outra etapa como Início/Fim antes de excluir esta.')
    }
    const { error } = await supabase.from('support_board_stages').delete().eq('id', stageId)
    if (error) throw error
    await load()
  }, [stages, load])

  const moveStage = useCallback(async (stageId: string, direction: -1 | 1) => {
    const ordered = [...stages].sort((a, b) => a.position - b.position)
    const index = ordered.findIndex(s => s.id === stageId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= ordered.length) return
    const a = ordered[index]
    const b = ordered[target]
    await supabase.from('support_board_stages').update({ position: b.position }).eq('id', a.id)
    await supabase.from('support_board_stages').update({ position: a.position }).eq('id', b.id)
    await load()
  }, [stages, load])

  return { stages, loading, reload: load, addStage, updateStage, deleteStage, moveStage }
}
