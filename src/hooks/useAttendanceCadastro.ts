import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import type { AttendanceOrder } from '@/types/attendance-cadastro.types'
import { useToast } from '@/hooks/use-toast'
import { useQuery } from '@tanstack/react-query'
import { generateOrderHash } from '@/utils/orderHash'

export function useAttendanceCadastro() {
  const { user } = useAuth()
  const { toast } = useToast()
  const companyId = user?.companyId
  const isAdmin = user?.isAdmin === true || user?.role === 'company_admin' || user?.role === 'super_admin'

  const { data: orders = [], refetch: refresh, isLoading: loading } = useQuery({
    queryKey: ['attendance_orders', companyId, isAdmin],
    queryFn: async () => {
      if (!companyId) return []
      let query = (supabase
        .from('attendance_orders' as any) as any)
        .select('*, patients(name, birth_date, gender)')
        .eq('company_id', companyId)
      if (!isAdmin) query = query.neq('status', 'deleted')
      const { data, error } = await query.order('created_at', { ascending: false })

      
      if (error) throw error
      
      return (data || []).map((item: any) => ({
        id: item.id,
        orderNumber: item.order_number,
        patientId: item.patient_id,
        // Nome sempre atualizado a partir do cadastro do paciente
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
        examMode: item.exam_mode as 'clinic' | 'lab',
        deliveryDate: item.delivery_date,
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
      })) as AttendanceOrder[]

    },
    enabled: !!companyId
  })

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
      
      const item = newOrder as any
      return {
        id: item.id,
        orderNumber: item.order_number,
        patientId: item.patient_id,
        patientName: item.patient_name || '',
        companyId: item.company_id,
        unitId: '', 
        originId: item.origin_id,
        originCode: item.origin_code ? Number(item.origin_code) : undefined,
        originName: item.origin_name,
        protocol: item.protocol,
        hash: item.hash,
        examMode: item.exam_mode as 'clinic' | 'lab',
        deliveryDate: item.delivery_date,
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

  return { orders, createOrder, updateOrder, refresh, loading }
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