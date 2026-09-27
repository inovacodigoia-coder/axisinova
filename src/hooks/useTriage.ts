import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { ManchesterColor, MANCHESTER_COLORS, escalateColor } from '@/data/manchester'

export interface TriageEntry {
  id: string
  company_id: string
  source: string
  ticket_id: string | null
  ticket_code: string | null
  patient_id: string | null
  patient_name: string
  patient_cpf: string | null
  patient_birth_date: string | null
  protocol: string | null
  status: 'waiting' | 'classified' | 'in_doctor' | 'done' | string
  complaint: string | null
  flowchart: string | null
  discriminators: any[]
  vitals: Record<string, any>
  color: ManchesterColor | null
  target_minutes: number | null
  classified_at: string | null
  arrived_at: string
  wristband_printed_at: string | null
  destination_sector_id?: string | null
  sent_to_doctor_at?: string | null
  created_at: string
}

export interface TriageSettings {
  company_id: string
  reclassification_mode: 'auto' | 'manual'
  wristband_width_mm: number
  wristband_height_mm: number
}

/** Minutos decorridos desde a classificação (ou desde a chegada, se ainda não classificado). */
export function elapsedMinutes(entry: TriageEntry): number {
  const base = entry.classified_at || entry.arrived_at
  return Math.floor((Date.now() - new Date(base).getTime()) / 60000)
}

/** Situação do tempo-alvo da cor. */
export function targetState(entry: TriageEntry): 'ok' | 'near' | 'late' {
  if (!entry.color || entry.target_minutes == null) return 'ok'
  const elapsed = elapsedMinutes(entry)
  if (entry.target_minutes === 0) return elapsed > 0 ? 'late' : 'ok'
  if (elapsed >= entry.target_minutes) return 'late'
  if (elapsed >= entry.target_minutes * 0.8) return 'near'
  return 'ok'
}

export function useTriage() {
  const [companyId, setCompanyId] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [entries, setEntries] = useState<TriageEntry[]>([])
  const [settings, setSettings] = useState<TriageSettings | null>(null)
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  // Relógio para atualizar contadores de tempo a cada 30 segundos
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return
      setUserId(auth.user.id)
      const { data: prof } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', auth.user.id)
        .single()
      if (prof?.company_id) setCompanyId(prof.company_id)
    }
    init()
  }, [])

  const loadSettings = useCallback(async () => {
    if (!companyId) return
    const { data } = await supabase
      .from('triage_settings')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle()
    if (data) {
      setSettings(data as any)
    } else {
      const { data: created } = await supabase
        .from('triage_settings')
        .insert({ company_id: companyId })
        .select('*')
        .single()
      if (created) setSettings(created as any)
    }
  }, [companyId])

  const loadEntries = useCallback(async () => {
    if (!companyId) return
    const { data, error } = await supabase
      .from('triage_entries')
      .select('*')
      .eq('company_id', companyId)
      .neq('status', 'done')
      .order('created_at', { ascending: true })
    if (error) {
      console.error('Erro ao carregar triagem:', error)
      return
    }
    setEntries(
      (data || []).map((e: any) => ({
        ...e,
        discriminators: Array.isArray(e.discriminators) ? e.discriminators : [],
        vitals: e.vitals && typeof e.vitals === 'object' ? e.vitals : {},
      })) as TriageEntry[],
    )
  }, [companyId])

  /** Senhas do totem aguardando, disponíveis para transferência à triagem. */
  const loadTickets = useCallback(async () => {
    if (!companyId) return
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const { data } = await supabase
      .from('queue_tickets')
      .select('id, display_code, queue_line_name, patient_name, status, generated_at')
      .eq('company_id', companyId)
      .in('status', ['waiting', 'called'])
      .gte('generated_at', startOfDay.toISOString())
      .order('generated_at', { ascending: true })
    setTickets(data || [])
  }, [companyId])

  const reload = useCallback(async () => {
    setLoading(true)
    await Promise.all([loadEntries(), loadTickets(), loadSettings()])
    setLoading(false)
  }, [loadEntries, loadTickets, loadSettings])

  useEffect(() => { if (companyId) reload() }, [companyId, reload])

  // Realtime: mantém o painel sincronizado entre recepção, triagem e médico
  useEffect(() => {
    if (!companyId) return
    const channel = supabase
      .channel('triage-entries')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'triage_entries' }, () => loadEntries())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [companyId, loadEntries])

  const createEntry = useCallback(
    async (payload: Partial<TriageEntry>) => {
      if (!companyId) return null
      const { data, error } = await supabase
        .from('triage_entries')
        .insert({
          company_id: companyId,
          created_by: userId || null,
          status: 'waiting',
          ...payload,
        } as any)
        .select('*')
        .single()
      if (error) {
        toast.error('Não foi possível colocar o paciente na triagem')
        return null
      }
      await loadEntries()
      return data as any as TriageEntry
    },
    [companyId, userId, loadEntries],
  )

  const classify = useCallback(
    async (
      entryId: string,
      payload: {
        color: ManchesterColor
        complaint: string
        flowchart: string
        discriminators: any[]
        vitals: Record<string, any>
      },
    ) => {
      const now = new Date().toISOString()
      const target = MANCHESTER_COLORS[payload.color].targetMinutes
      const { error } = await supabase
        .from('triage_entries')
        .update({
          color: payload.color,
          target_minutes: target,
          complaint: payload.complaint,
          flowchart: payload.flowchart,
          discriminators: payload.discriminators,
          vitals: payload.vitals,
          classified_at: now,
          classified_by: userId || null,
          status: 'classified',
        })
        .eq('id', entryId)
      if (error) {
        toast.error('Não foi possível salvar a classificação')
        return false
      }
      await supabase.from('triage_classifications').insert({
        company_id: companyId,
        entry_id: entryId,
        color: payload.color,
        target_minutes: target,
        reason: 'initial',
        changed_by: userId || null,
      })
      await loadEntries()
      return true
    },
    [companyId, userId, loadEntries],
  )

  const reclassify = useCallback(
    async (entry: TriageEntry, color: ManchesterColor, reason: 'manual' | 'auto', notes?: string) => {
      const target = MANCHESTER_COLORS[color].targetMinutes
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('triage_entries')
        .update({ color, target_minutes: target, classified_at: now })
        .eq('id', entry.id)
      if (error) return false
      await supabase.from('triage_classifications').insert({
        company_id: companyId,
        entry_id: entry.id,
        color,
        target_minutes: target,
        reason,
        notes: notes || null,
        changed_by: reason === 'manual' ? userId || null : null,
      })
      await loadEntries()
      return true
    },
    [companyId, userId, loadEntries],
  )

  // Reclassificação automática ao estourar o tempo-alvo (quando configurada)
  useEffect(() => {
    if (settings?.reclassification_mode !== 'auto') return
    const late = entries.filter(
      (e) => e.status === 'classified' && e.color && e.color !== 'red' && targetState(e) === 'late',
    )
    late.forEach((e) => {
      reclassify(e, escalateColor(e.color as ManchesterColor), 'auto', 'Tempo-alvo excedido')
    })
  }, [tick, entries, settings, reclassify])

  const sendToDoctor = useCallback(
    async (entryId: string, sectorId?: string | null) => {
      const { error } = await supabase.from('triage_entries')
        .update({ status: 'in_doctor', destination_sector_id: sectorId || null, sent_to_doctor_at: new Date().toISOString() } as any)
        .eq('id', entryId)
      if (error) {
        toast.error('Não foi possível enviar para a fila do médico')
        return false
      }
      toast.success('Paciente enviado para a fila do médico')
      await loadEntries()
      return true
    },
    [loadEntries],
  )

  /** Médico inicia o atendimento (sai da fila de espera). */
  const startDoctor = useCallback(async (entryId: string) => {
    const { error } = await supabase.from('triage_entries')
      .update({ status: 'in_attendance', doctor_started_at: new Date().toISOString(), doctor_started_by: userId || null } as any)
      .eq('id', entryId)
    if (error) { toast.error('Não foi possível iniciar o atendimento'); return false }
    await loadEntries(); return true
  }, [userId, loadEntries])

  const finishDoctor = useCallback(async (entryId: string) => {
    const { error } = await supabase.from('triage_entries').update({ status: 'done' }).eq('id', entryId)
    if (error) { toast.error('Não foi possível concluir'); return false }
    await loadEntries(); return true
  }, [loadEntries])

  const registerPrint = useCallback(
    async (entryId: string, isReprint: boolean, reason?: string) => {
      await supabase.from('triage_wristband_prints').insert({
        company_id: companyId,
        entry_id: entryId,
        is_reprint: isReprint,
        reason: reason || null,
        printed_by: userId || null,
      })
      await supabase
        .from('triage_entries')
        .update({ wristband_printed_at: new Date().toISOString() })
        .eq('id', entryId)
      await loadEntries()
    },
    [companyId, userId, loadEntries],
  )

  const updateSettings = useCallback(
    async (patch: Partial<TriageSettings>) => {
      if (!companyId) return
      const { data, error } = await supabase
        .from('triage_settings')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('company_id', companyId)
        .select('*')
        .single()
      if (error) {
        toast.error('Não foi possível salvar a configuração')
        return
      }
      setSettings(data as any)
      toast.success('Configuração da triagem salva')
    },
    [companyId],
  )

  /** Fila do médico: prioridade por cor e, dentro da cor, por tempo de espera. */
  const doctorQueue = useMemo(() => {
    return entries
      .filter((e) => e.status === 'in_doctor')
      .sort((a, b) => {
        const pa = a.color ? MANCHESTER_COLORS[a.color].priority : 99
        const pb = b.color ? MANCHESTER_COLORS[b.color].priority : 99
        if (pa !== pb) return pa - pb
        return new Date(a.sent_to_doctor_at || a.classified_at || a.arrived_at).getTime() - new Date(b.sent_to_doctor_at || b.classified_at || b.arrived_at).getTime()
      })
  }, [entries, tick])
  const inAttendance = useMemo(() => entries.filter((e) => e.status === 'in_attendance'), [entries])

  const waiting = useMemo(() => entries.filter((e) => e.status === 'waiting'), [entries])
  const classified = useMemo(() => entries.filter((e) => e.status !== 'waiting'), [entries, tick])

  return {
    companyId, userId, loading, entries, waiting, classified, doctorQueue,
    tickets, settings, reload, createEntry, classify, reclassify,
    sendToDoctor, startDoctor, finishDoctor, inAttendance, registerPrint, updateSettings, tick,
  }
}
