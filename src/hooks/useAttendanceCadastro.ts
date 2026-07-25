import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import type { AttendanceOrder } from '@/types/attendance-cadastro.types'
import { useToast } from '@/hooks/use-toast'
import { useQuery } from '@tanstack/react-query'

export function useAttendanceCadastro() {
  const { user } = useAuth()
  const { toast } = useToast()
  const companyId = user?.companyId

  const { data: orders = [], refetch: refresh } = useQuery({
    queryKey: ['attendance_orders', companyId],
    queryFn: async () => {
      if (!companyId) return []
      const { data, error } = await (supabase
        .from('attendance_orders' as any) as any)
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      // Map database fields back to camelCase AttendanceOrder interface
      return (data || []).map((item: any) => ({
        id: item.id,
        orderNumber: item.order_number,
        patientId: item.patient_id,
        patientName: item.patient_name || '',
        companyId: item.company_id,
        unitId: '', // Unit management to be implemented
        originId: item.origin_id,
        originCode: item.origin_code ? Number(item.origin_code) : undefined,
        originName: item.origin_name,
        protocol: item.protocol,
        hash: item.hash,
        examMode: item.exam_mode as 'clinic' | 'lab',
        deliveryDate: item.delivery_date,
        labGuides: item.lab_guides as any[],
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

  const createOrder = useCallback(async (data: any): Promise<AttendanceOrder | null> => {
    if (!companyId || !user) return null

    try {
      // Get current count for sequential ID
      const { count } = await (supabase
        .from('attendance_orders' as any) as any)
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)

      const totalOrderCount = (count || 0) + 1
      const originStr = String(data.originCode || '00').replace(/\D/g, '').padStart(2, '0')
      const protocol = `${totalOrderCount}-${originStr}`
      const hash = Math.random().toString(36).substring(2, 8).toUpperCase()

      const { data: newOrder, error } = await (supabase
        .from('attendance_orders' as any) as any)
        .insert({
          company_id: companyId,
          patient_id: data.patientId,
          patient_name: data.patientName,
          origin_id: data.originId,
          origin_code: String(data.originCode || '00'),
          origin_name: data.originName,
          order_number: protocol,
          protocol: protocol,
          hash: hash,
          service_type: data.serviceType,
          payment_type: data.paymentType,
          exam_mode: data.examMode,
          doctor_id: data.doctorId,
          doctor_name: data.doctorName,
          doctor_crm: data.doctorCRM,
          specialty: data.specialty,
          requesting_doctor: data.requestingDoctor,
          convenio_id: data.convenioId,
          convenio_name: data.convenioName,
          card_number: data.cardNumber,
          card_expiry: data.cardExpiry,
          authorization_code: data.authorizationCode,
          authorization_date: data.authorizationDate,
          authorization_expiry: data.authorizationExpiry,
          authorization_password: data.authorizationPassword,
          private_value: data.privateValue,
          delivery_date: data.deliveryDate,
          lab_guides: data.labGuides || [],
          status: 'open',
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

      refresh()
      
      // Map result back
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
      
      const { error } = await (supabase
        .from('attendance_orders' as any) as any)
        .update(updateData)
        .eq('id', orderId)

      if (error) throw error
      refresh()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: error.message,
      })
    }
  }, [refresh, toast])

  return { orders, createOrder, updateOrder, refresh }
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
