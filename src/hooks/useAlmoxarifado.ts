import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { buscarEmBlocos } from '@/lib/buscarEmBlocos'
import { useAuth } from '@/context/AuthContext'
import { InventoryState, RequestLine } from '@/lib/almoxarifado'

const empty: InventoryState = { itens: [], setores: [], saldos: [], solicitacoes: [], movimentos: [] }
interface InventoryAccess { aprovar: boolean; cadastrar: boolean; entrada: boolean; ver_todos: boolean }
const noAccess: InventoryAccess = { aprovar: false, cadastrar: false, entrada: false, ver_todos: false }
export function useAlmoxarifado(enabled = true) {
  const { user } = useAuth()
  const [state, setState] = useState<InventoryState>(empty)
  const [access, setAccess] = useState<InventoryAccess>(noAccess)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    if (!enabled || !user?.companyId) return
    setLoading(true); setError('')
    try {
      const cid = user.companyId
      // Blocos de 1.000 até acabar: histórico de movimentos e solicitações sempre completo.
      const todos = <T,>(fn: (de: number, ate: number) => any) => buscarEmBlocos<T>(fn, { tela: 'Estoque' })
        .then(r => ({ data: r.linhas, error: null as { message: string } | null }), (e: any) => ({ data: [] as T[], error: { message: e?.message || String(e) } }))
      const [ctx, items, balances, requests, lines, movements] = await Promise.all([
        supabase.rpc('almox_contexto'),
        todos<any>((de, ate) => supabase.from('almox_itens').select('*').eq('company_id', cid).eq('ativo', true).order('nome').order('id').range(de, ate)),
        todos<any>((de, ate) => supabase.from('almox_saldos').select('*').eq('company_id', cid).order('id').range(de, ate)),
        todos<any>((de, ate) => supabase.from('almox_solicitacoes').select('*').eq('company_id', cid).order('created_at', { ascending: false }).order('id').range(de, ate)),
        todos<any>((de, ate) => supabase.from('almox_solicitacao_itens').select('*').eq('company_id', cid).order('id').range(de, ate)),
        todos<any>((de, ate) => supabase.from('almox_movimentos').select('*').eq('company_id', cid).order('created_at', { ascending: false }).order('id').range(de, ate)),
      ])
      for (const r of [ctx, items, balances, requests, lines, movements]) if (r.error) throw new Error(r.error.message)
      const context = ctx.data as unknown as InventoryAccess & { setores: InventoryState['setores'] }
      setAccess(context)
      setState({ itens: (items.data || []) as InventoryState['itens'], setores: context.setores || [], saldos: (balances.data || []).map((b: any) => ({ ...b, quantidade: Number(b.quantidade) })),
        solicitacoes: (requests.data || []).map((r: any) => ({ ...r, observacao: r.observacao || '', motivo: r.motivo || '', decidido_em: r.decidido_em || undefined, destino: r.destino as 'setor' | 'farmacia', status: r.status as 'pendente' | 'aprovada' | 'recusada', itens: (lines.data || []).filter((l: any) => l.solicitacao_id === r.id).map((l: any) => ({ item_id: l.item_id, quantidade: Number(l.quantidade) })) })),
        movimentos: (movements.data || []).map((m: any) => ({ ...m, setor_id: m.setor_id || undefined, solicitacao_id: m.solicitacao_id || undefined, quantidade: Number(m.quantidade) })),
      })
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível carregar o estoque') }
    finally { setLoading(false) }
  }, [enabled, user?.companyId])
  useEffect(() => { setState(empty); setAccess(noAccess); load() }, [load])
  async function decide(id: string, approve: boolean, reason: string) {
    const { error } = await supabase.rpc('almox_decidir', { _id: id, _aprovar: approve, _motivo: reason })
    if (error) throw new Error(error.message)
    await load()
  }
  async function submit(sector: string, destination: 'setor' | 'farmacia', lines: RequestLine[], notes: string) {
    const { error } = await supabase.rpc('almox_solicitar', { _setor: sector, _destino: destination, _itens: lines.map(l => ({ ...l })), _observacao: notes })
    if (error) throw new Error(error.message)
    await load()
  }
  return { state, access, loading, error, reload: load, decide, submit }
}