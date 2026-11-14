import { useCallback, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import type { AttendanceOrder } from '@/types/attendance-cadastro.types'
import { useToast } from '@/hooks/use-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { generateOrderHash } from '@/utils/orderHash'
import { buscarEmBlocos } from '@/lib/buscarEmBlocos'

/** Raiz do cache das listas de atendimentos; invalidar esta chave atualiza todas. */
export const ATTENDANCE_ORDERS_KEY = 'attendance_orders'

/** Fila de coleta e digitação: dados mais frescos e recarga ao voltar para a aba. */
export const FILA_TEMPO_REAL = { staleTime: 10_000, refetchOnWindowFocus: true } as const

/** Pedidos com exame pendente de digitação/liberação (filas de Digitação e Hematologia). */
export const STATUS_PENDENTES_ANALISE = ['collection_done', 'in_analysis', 'validation', 'released'] as const
/** Pedidos concluídos (inclui o legado 'concluded'). */
export const STATUS_CONCLUIDOS = ['completed', 'concluded'] as const
/** Teto de segurança da lista de pedidos (blocos de 1.000); acima disso a tela avisa. */
export const TETO_PEDIDOS = 20_000

/**
 * Colunas usadas pelas telas que leem a lista (o mesmo que o mapeamento abaixo).
 * Ficam de fora as colunas que nenhuma lista mostra (hospital/leito, jejum, prontuário,
 * episódio, delivery_status); elas continuam sendo lidas no detalhe/edição por id.
 */
const LIST_COLUMNS = [
  'id', 'order_number', 'patient_id', 'patient_name', 'company_id', 'origin_id', 'origin_code', 'origin_name',
  'protocol', 'hash', 'exam_mode', 'delivery_date', 'coleta_programada_para', 'lab_guides', 'is_fasting',
  'weight', 'height', 'is_urgent', 'has_fever', 'service_observation', 'service_type', 'payment_type',
  'doctor_id', 'doctor_name', 'doctor_crm', 'specialty', 'requesting_doctor', 'convenio_id', 'convenio_name',
  'card_number', 'card_expiry', 'authorization_code', 'authorization_date', 'authorization_expiry',
  'authorization_password', 'private_value', 'attachments', 'status', 'registered_by', 'registered_by_name',
  'created_at', 'updated_at', 'empresa_seq',
].join(', ')

export interface AttendanceOrdersOptions {
  /** Período (created_at) buscado no servidor; ausente/null = todos os pedidos. */
  range?: { from: string; to: string } | null
  /** Só estes status (filtro no servidor), de qualquer data. */
  statuses?: readonly string[] | null
  /** Status que NÃO entram (filtro no servidor). */
  excludeStatuses?: readonly string[] | null
  enabled?: boolean
  staleTime?: number
  refetchOnWindowFocus?: boolean
}

function mapOrderRow(item: any): AttendanceOrder {
  return {
    id: item.id,
    orderNumber: item.order_number,
    patientId: item.patient_id,
    // Dados pessoais sempre atualizados a partir do cadastro do paciente.
    patientName: item.patients?.name || item.patient_name || '',
    patientBirthDate: item.patients?.birth_date,
    patientGender: item.patients?.gender,
    companyId: item.company_id,
    unitId: '',
    originId: item.origin_id,
    originCode: item.origin_code ? Number(item.origin_code) : undefined,
    originName: item.origin_name,
    protocol: item.protocol,
    hash: item.hash,
    empresaSeq: item.empresa_seq ?? null,
    examMode: item.exam_mode as 'clinic' | 'lab',
    deliveryDate: item.delivery_date,
    coletaProgramadaPara: (item as any).coleta_programada_para ?? null,
    labGuides: item.lab_guides as any[],
    isFasting: item.is_fasting ?? undefined,
    weight: item.weight ?? undefined,
    height: item.height ?? undefined,
    isUrgent: item.is_urgent ?? undefined,
    hasFever: item.has_fever ?? undefined,
    serviceObservation: item.service_observation ?? undefined,
    serviceType: item.service_type as any,
    paymentType: item.payment_type as any,
    doctorId: item.doctor_id,
    doctorName: item.doctor_name,
    doctorCRM: item.doctor_crm,
    specialty: item.specialty,
    requestingDoctor: item.requesting_doctor,
    convenioId: item.convenio_id,
    convenioName: item.convenio_name,
    cardNumber: item.card_number,
    cardExpiry: item.card_expiry,
    authorizationCode: item.authorization_code,
    authorizationDate: item.authorization_date,
    authorizationExpiry: item.authorization_expiry,
    authorizationPassword: item.authorization_password,
    privateValue: item.private_value,
    attachments: (item.attachments as any[]) || [],
    status: item.status as any,
    registeredBy: item.registered_by,
    registeredByName: item.registered_by_name,
    registeredAt: item.created_at,
    updatedAt: item.updated_at,
  } as AttendanceOrder
}

/** Lista de atendimentos (com as ações). Use useAttendanceOrderActions quando a tela só grava. */
export function useAttendanceCadastro(options: AttendanceOrdersOptions = {}) {
  const { user } = useAuth()
  const companyId = user?.companyId
  const isAdmin = user?.isAdmin === true || user?.role === 'company_admin' || user?.role === 'super_admin'
  const range = options.range ?? null
  const statuses = options.statuses?.length ? [...options.statuses] : null
  const excludeStatuses = options.excludeStatuses?.length ? [...options.excludeStatuses] : null
  const actions = useAttendanceOrderActions()

  const { data, isLoading: loading } = useQuery({
    queryKey: [
      ATTENDANCE_ORDERS_KEY, companyId, isAdmin,
      ...(range ? ['periodo', range.from, range.to] : []),
      ...(statuses ? ['status', statuses.join(',')] : []),
      ...(excludeStatuses ? ['sem_status', excludeStatuses.join(',')] : []),
    ],
    queryFn: async () => {
      if (!companyId) return { orders: [] as AttendanceOrder[], limitado: false }
      // Busca em blocos de 1.000 até acabar: nenhum pedido fica de fora pelo limite do servidor.
      const { linhas, limitado } = await buscarEmBlocos<any>((de, ate) => {
        let query = (supabase
          .from('attendance_orders' as any) as any)
          .select(`${LIST_COLUMNS}, patients(name, birth_date, gender)`)
          .eq('company_id', companyId)
        if (!isAdmin) query = query.neq('status', 'deleted')
        if (statuses) query = query.in('status', statuses)
        if (excludeStatuses) query = query.not('status', 'in', `(${excludeStatuses.join(',')})`)
        if (range) query = query.gte('created_at', range.from).lte('created_at', range.to)
        return query
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(de, ate)
      }, { chave: (r) => r.id, teto: TETO_PEDIDOS, tela: 'Atendimentos' })
      return { orders: linhas.map(mapOrderRow), limitado }
    },
    enabled: !!companyId && options.enabled !== false,
    ...(options.staleTime !== undefined ? { staleTime: options.staleTime } : {}),
    ...(options.refetchOnWindowFocus !== undefined ? { refetchOnWindowFocus: options.refetchOnWindowFocus } : {}),
  })

  const orders = data?.orders ?? EMPTY_ORDERS
  return { orders, loading, limitado: data?.limitado ?? false, ...actions }
}

const EMPTY_ORDERS: AttendanceOrder[] = []

/** Criar/atualizar pedidos sem carregar a lista inteira. */
export function useAttendanceOrderActions() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const companyId = user?.companyId

  // Atualiza todas as listas de atendimentos da empresa (inclusive os contadores do menu)
  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: [ATTENDANCE_ORDERS_KEY, companyId] }),
    [queryClient, companyId],
  )

  const ensureIsoDate = (dateStr: any) => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr.toISOString();
    
    // Check if already ISO
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(dateStr)) return dateStr;

    // Handle DD/MM/YYYY HH:mm
    const brDateTimeMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
    if (brDateTimeMatch) {
      const [_, day, month, year, hour, minute] = brDateTimeMatch;
      return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)).toISOString();
    }

    // Handle DD/MM/YYYY
    const brDateMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (brDateMatch) {
      const [_, day, month, year] = brDateMatch;
      return new Date(Number(year), Number(month) - 1, Number(day)).toISOString();
    }

    try {
      const parsed = new Date(dateStr);
      return isNaN(parsed.getTime()) ? null : parsed.toISOString();
    } catch {
      return null;
    }
  };

  const createOrder = useCallback(async (data: any): Promise<AttendanceOrder | null> => {
    if (!companyId || !user) return null

    try {
      const originId = data.originId || null

      // Use active origin code or default to MATRIZ '00'
      const originCode = data.originCode !== undefined ? data.originCode : '00'
      const originStr = String(originCode).replace(/\D/g, '').padStart(2, '0')

      // Numeração atômica no banco (nunca gera duplicados, considera pedidos excluídos)
      const { data: nextNumber, error: seqError } = await (supabase as any).rpc(
        'next_attendance_order_number',
        { _company_id: companyId, _origin_id: originId, _origin_code: originStr }
      )
      if (seqError) throw seqError

      const protocol = String(nextNumber)
      const hash = generateOrderHash(protocol, Date.now())


      // Calculate max delivery date from guides
      const calculatedDeliveryDate = (data.guides || data.labGuides)?.reduce((latest: string | null, guide: any) => {
        if (!guide.exams) return latest
        const dates = guide.exams.map((e: any) => e.expectedDeliveryDate || e.deliveryDate).filter(Boolean)
        if (dates.length === 0) return latest
        // Normalize all dates to ISO before sorting
        const isoDates = dates.map(ensureIsoDate).filter(Boolean) as string[]
        if (isoDates.length === 0) return latest
        const maxDate = isoDates.sort().reverse()[0]
        if (!latest || maxDate > latest) return maxDate
        return latest
      }, null)

      // Prioritize the convenio/plan from the first guide if available
      const firstGuide = (data.guides || data.labGuides)?.[0]
      const convenioId = firstGuide?.convenioId || data.convenioId
      const convenioName = firstGuide?.convenioName || firstGuide?.name || firstGuide?.plan || data.convenioName || 'Particular'

      const { data: newOrder, error } = await (supabase
        .from('attendance_orders' as any) as any)
        .insert({
          company_id: companyId,
          patient_id: data.patientId,
          patient_name: data.patientName,
          origin_id: data.originId || null,
          origin_code: String(data.originCode !== undefined ? data.originCode : '00'),
          origin_name: data.originName,
          order_number: protocol,
          protocol: protocol,
          hash: hash,
          service_type: data.serviceType,
          payment_type: data.paymentType,
          exam_mode: data.examMode,
          doctor_id: data.doctorId || firstGuide?.doctorId || null,
          doctor_name: data.doctorName || firstGuide?.doctorName || null,
          doctor_crm: data.doctorCRM || firstGuide?.doctorCRM || firstGuide?.doctorCrm || null,
          specialty: data.specialty,
          requesting_doctor: data.requestingDoctor || firstGuide?.doctorName || null,
          convenio_id: convenioId,
          convenio_name: convenioName,
          card_number: data.cardNumber || firstGuide?.number,
          card_expiry: ensureIsoDate(data.cardExpiry),
          authorization_code: data.authorizationCode,
          authorization_date: ensureIsoDate(data.authorizationDate),
          authorization_expiry: ensureIsoDate(data.authorizationExpiry),
          authorization_password: data.authorizationPassword,
          private_value: data.privateValue, 
          delivery_date: ensureIsoDate(data.deliveryDate) || calculatedDeliveryDate,
          lab_guides: data.guides || data.labGuides || [],
          is_fasting: typeof data.isFasting === 'boolean' ? data.isFasting : null,
          weight: data.weight || null,
          height: data.height || null,
          is_urgent: !!data.isUrgent,
          has_fever: !!data.hasFever,
          service_observation: data.serviceObservation || null,
          fasting_start_hour: data.fastingStartHour || null,
          fasting_type: data.fastingType || null,
          hospital_id: data.hospitalId || null,
          hospital_name: data.hospitalName || null,
          hospital_sector_id: data.hospitalSectorId || null,
          hospital_sector_name: data.hospitalSectorName || null,
          bed: data.bed || null,
          medical_record_number: data.medicalRecordNumber || null,
          status: data.examMode === 'lab' 
            ? ((data.guides || data.labGuides)?.some((g: any) => g.exams?.some((e: any) => e.collected)) ? 'waiting_collection' : 'open')
            : ((data.guides || data.labGuides)?.some((g: any) => g.exams?.some((e: any) => e.collected)) ? 'collection_done' : 'open'),
          registered_by: user.id,
          registered_by_name: user.name,
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Atendimento registrado no banco de dados.",
      })

      await refresh()
      
      return mapOrderRow({ ...(newOrder as any), patients: null })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message,
      })
      return null
    }
  }, [companyId, user, refresh, toast])

  const updateOrder = useCallback(async (orderId: string, patch: Partial<AttendanceOrder>) => {
    try {
      const updateData: any = {}
      if (patch.status) updateData.status = patch.status
      if (patch.cardNumber) updateData.card_number = patch.cardNumber
      if (patch.authorizationCode) updateData.authorization_code = patch.authorizationCode
      if (patch.authorizationExpiry) updateData.authorization_expiry = patch.authorizationExpiry
      if (patch.labGuides !== undefined) updateData.lab_guides = patch.labGuides
      if (patch.convenioId !== undefined) updateData.convenio_id = patch.convenioId || null
      if (patch.convenioName !== undefined) updateData.convenio_name = patch.convenioName
      if (patch.paymentType !== undefined) updateData.payment_type = patch.paymentType
      if (patch.doctorId !== undefined) updateData.doctor_id = patch.doctorId || null
      if (patch.doctorName !== undefined) updateData.doctor_name = patch.doctorName
      if (patch.doctorCRM !== undefined) updateData.doctor_crm = patch.doctorCRM
      if (patch.deliveryDate !== undefined) updateData.delivery_date = ensureIsoDate(patch.deliveryDate)

      
      const { error } = await (supabase
        .from('attendance_orders' as any) as any)
        .update(updateData)
        .eq('id', orderId)
        .neq('status', 'deleted')

      if (error) throw error
      await refresh()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: error.message,
      })
    }
  }, [refresh, toast])

  return { createOrder, updateOrder, refresh }
}

const DRAFT_PREFIX = 'attendance_draft_'

export function loadDraft(ticketId: string): any | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_PREFIX + ticketId)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function saveDraft(ticketId: string, data: any) {
  try { sessionStorage.setItem(DRAFT_PREFIX + ticketId, JSON.stringify({ ...data, savedAt: new Date().toISOString() })) } catch {}
}

export function clearDraft(ticketId: string) {
  try { sessionStorage.removeItem(DRAFT_PREFIX + ticketId) } catch {}
}

export function useDraftAutosave(ticketId: string | undefined, data: any, enabled: boolean) {
  useEffect(() => {
    if (!ticketId || !enabled) return
    const id = setTimeout(() => saveDraft(ticketId, data), 800)
    return () => clearTimeout(id)
  }, [ticketId, data, enabled])
}