import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'

const db = supabase as any

export interface Post { id: string; name: string; hospital_id: string | null; is_active: boolean }
export interface Bed { id: string; post_id: string; name: string; sort_order: number; status: 'free' | 'occupied' | 'cleaning'; current_occupancy_id: string | null; is_active: boolean }
export interface Occupancy { id: string; bed_id: string; patient_name: string; patient_id: string | null; triage_entry_id: string | null; manchester_color: string | null; away: boolean; allocated_at: string; status: string }
export interface Referral { id: string; occupancy_id: string; bed_id: string; sector_name: string; patient_name: string; manchester_color: string | null; notes: string | null; status: string; referred_at: string; returned_at: string | null }
export interface Sector { id: string; name: string; hospital_id: string | null; is_active: boolean }

export async function rpc(name: string, args: Record<string, any>, ok?: string) {
  const { data, error } = await db.rpc(name, args)
  if (error) { toast.error(error.message); return null }
  if (ok) toast.success(ok)
  return data ?? true
}

export function useCollectionPosts() {
  const { user } = useAuth()
  const companyId = user?.companyId
  const [posts, setPosts] = useState<Post[]>([])
  const [beds, setBeds] = useState<Bed[]>([])
  const [occupancies, setOccupancies] = useState<Occupancy[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!companyId) return
    const [p, b, o, s] = await Promise.all([
      db.from('collection_posts').select('*').eq('company_id', companyId).order('name'),
      db.from('beds').select('*').eq('company_id', companyId).order('sort_order').order('name'),
      db.from('bed_occupancies').select('*').eq('company_id', companyId).eq('status', 'active'),
      db.from('bed_referral_sectors').select('*').eq('company_id', companyId).order('name'),
    ])
    setPosts(p.data || []); setBeds(b.data || []); setOccupancies(o.data || []); setSectors(s.data || [])
    setLoading(false)
  }, [companyId])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!companyId) return
    const ch = supabase.channel('beds-' + companyId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beds', filter: `company_id=eq.${companyId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bed_occupancies', filter: `company_id=eq.${companyId}` }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [companyId, load])

  const createPost = async (name: string, hospitalId: string | null, bedCount: number) => {
    if (!companyId || !name.trim()) return
    const { data, error } = await db.from('collection_posts').insert({ company_id: companyId, name: name.trim(), hospital_id: hospitalId, created_by: user?.id }).select().single()
    if (error) return toast.error(error.message)
    if (bedCount > 0) {
      await db.from('beds').insert(Array.from({ length: bedCount }, (_, i) => ({ company_id: companyId, post_id: data.id, name: `Leito ${String(i + 1).padStart(2, '0')}`, sort_order: i + 1 })))
    }
    toast.success('Posto criado'); load()
  }
  const addBed = async (postId: string, name: string) => {
    if (!companyId || !name.trim()) return
    const order = beds.filter(b => b.post_id === postId).length + 1
    const { error } = await db.from('beds').insert({ company_id: companyId, post_id: postId, name: name.trim(), sort_order: order })
    if (error) return toast.error(error.message)
    load()
  }
  const toggleBed = async (bed: Bed) => {
    if (bed.status === 'occupied' && bed.is_active) return toast.error('Libere o leito antes de inativar')
    await db.from('beds').update({ is_active: !bed.is_active }).eq('id', bed.id); load()
  }
  const togglePost = async (post: Post) => { await db.from('collection_posts').update({ is_active: !post.is_active }).eq('id', post.id); load() }
  const addSector = async (name: string, hospitalId: string | null) => {
    if (!companyId || !name.trim()) return
    await db.from('bed_referral_sectors').insert({ company_id: companyId, name: name.trim(), hospital_id: hospitalId }); load()
  }
  const toggleSector = async (s: Sector) => { await db.from('bed_referral_sectors').update({ is_active: !s.is_active }).eq('id', s.id); load() }

  return { companyId, posts, beds, occupancies, sectors, loading, reload: load, createPost, addBed, toggleBed, togglePost, addSector, toggleSector }
}
