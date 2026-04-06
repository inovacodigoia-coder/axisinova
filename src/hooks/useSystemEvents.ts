import { useCallback } from 'react'
import { useNotificationContext } from '@/context/NotificationContext'
import { useAuth } from '@/context/AuthContext'
import type { AppNotification } from '@/types/notifications.types'
import { formatCurrency } from '@/utils/formatters'

export type SystemEvent =
  | { type: 'APPOINTMENT_CREATED'; patientName: string; doctorName: string; date: string; time: string }
  | { type: 'APPOINTMENT_CONFIRMED'; patientName: string; date: string }
  | { type: 'APPOINTMENT_ABSENT'; patientName: string }
  | { type: 'CONFIRMATION_PENDING'; count: number }
  | { type: 'PATIENT_CHECKED_IN'; patientName: string; ticketCode: string }
  | { type: 'DOCUMENTS_INCOMPLETE'; patientName: string; missing: string[] }
  | { type: 'QUEUE_LONG_WAIT'; patientName: string; minutes: number }
  | { type: 'ATTENDANCE_STARTED'; patientName: string; doctorName: string }
  | { type: 'ATTENDANCE_FINISHED'; patientName: string; doctorName: string }
  | { type: 'EXAM_REQUESTED'; patientName: string; examNames: string[] }
  | { type: 'GUIDE_DRAFT_CREATED'; patientName: string; tissNumber: string }
  | { type: 'GUIDE_RETURNED_TO_RECEPTION'; patientName: string; reason: string; guideId: string }
  | { type: 'GUIDE_CORRECTED'; patientName: string; tissNumber: string; guideId: string }
  | { type: 'GLOSA_IDENTIFIED'; patientName: string; convenioName: string; value: number; glosaId: string }
  | { type: 'GLOSA_DEADLINE_APPROACHING'; value: number; daysLeft: number; glosaId: string }
  | { type: 'RESULT_AVAILABLE'; patientName: string; examName: string; resultId: string }
  | { type: 'RESULT_DELIVERED'; patientName: string; examName: string; deliveredTo: string }
  | { type: 'SESSION_EXPIRING'; minutesLeft: number }

function eventToNotification(event: SystemEvent, role: string): Omit<AppNotification, 'id' | 'createdAt' | 'status'> | null {
  switch (event.type) {
    case 'PATIENT_CHECKED_IN':
      if (['doctor', 'company_admin'].includes(role)) {
        return {
          userId: '', category: 'reception', priority: 'medium',
          title: 'Paciente fez check-in',
          message: `${event.patientName} está aguardando na recepção. Senha: ${event.ticketCode}`,
          actionLabel: 'Ver fila', actionRoute: '/app/recepcao', icon: '🏥',
        }
      }
      return null

    case 'DOCUMENTS_INCOMPLETE':
      if (['receptionist', 'company_admin'].includes(role)) {
        return {
          userId: '', category: 'reception', priority: 'high',
          title: '⚠️ Documentos incompletos',
          message: `${event.patientName} — Faltam: ${event.missing.join(', ')}.`,
          actionLabel: 'Resolver', actionRoute: '/app/recepcao', icon: '📎',
        }
      }
      return null

    case 'QUEUE_LONG_WAIT':
      if (['receptionist', 'company_admin'].includes(role)) {
        return {
          userId: '', category: 'reception', priority: 'high',
          title: `⏱ ${event.patientName} esperando há ${event.minutes} min`,
          message: `Paciente aguarda atendimento há mais de 30 minutos.`,
          actionLabel: 'Ver fila', actionRoute: '/app/recepcao', icon: '⏱',
        }
      }
      return null

    case 'GUIDE_RETURNED_TO_RECEPTION':
      if (['receptionist', 'company_admin'].includes(role)) {
        return {
          userId: '', category: 'correction', priority: 'high',
          title: '↩️ Guia devolvida para correção',
          message: `${event.patientName} — ${event.reason}`,
          actionLabel: 'Ver correções', actionRoute: '/app/faturamento/correcoes', icon: '↩️',
          relatedEntityId: event.guideId, relatedEntityType: 'guide',
        }
      }
      return null

    case 'GUIDE_CORRECTED':
      if (['billing', 'company_admin'].includes(role)) {
        return {
          userId: '', category: 'correction', priority: 'medium',
          title: '✅ Guia corrigida pela recepção',
          message: `${event.patientName} — ${event.tissNumber} foi corrigida.`,
          actionLabel: 'Ver guia', actionRoute: `/app/faturamento/guias/${event.guideId}`, icon: '✅',
        }
      }
      return null

    case 'GLOSA_IDENTIFIED':
      if (['billing', 'company_admin'].includes(role)) {
        return {
          userId: '', category: 'billing', priority: 'high',
          title: '⚠️ Glosa identificada',
          message: `${event.patientName} — ${event.convenioName} — ${formatCurrency(event.value)}`,
          actionLabel: 'Analisar glosa', actionRoute: '/app/faturamento/glosas', icon: '💳',
          relatedEntityId: event.glosaId, relatedEntityType: 'glosa',
        }
      }
      return null

    case 'GLOSA_DEADLINE_APPROACHING':
      if (['billing', 'company_admin'].includes(role)) {
        return {
          userId: '', category: 'billing',
          priority: event.daysLeft <= 3 ? 'critical' : 'high',
          title: `🚨 Prazo de recurso: ${event.daysLeft} dias`,
          message: `Glosa de ${formatCurrency(event.value)} vence em ${event.daysLeft} dias.`,
          actionLabel: 'Ver glosa', actionRoute: '/app/faturamento/glosas', icon: '⏰',
          relatedEntityId: event.glosaId, relatedEntityType: 'glosa',
        }
      }
      return null

    case 'RESULT_AVAILABLE':
      if (['receptionist', 'company_admin'].includes(role)) {
        return {
          userId: '', category: 'results', priority: 'medium',
          title: '🔬 Resultado disponível para entrega',
          message: `${event.patientName} — ${event.examName}`,
          actionLabel: 'Registrar entrega', actionRoute: '/app/resultados', icon: '🔬',
          relatedEntityId: event.resultId, relatedEntityType: 'result',
        }
      }
      return null

    case 'ATTENDANCE_FINISHED':
      if (['billing', 'company_admin'].includes(role)) {
        return {
          userId: '', category: 'medical', priority: 'low',
          title: '📋 Atendimento finalizado',
          message: `${event.patientName} — guia draft criada para faturamento.`,
          actionLabel: 'Ver guias', actionRoute: '/app/faturamento/guias', icon: '📋',
        }
      }
      return null

    case 'CONFIRMATION_PENDING':
      if (['receptionist', 'telephonist', 'company_admin'].includes(role)) {
        return {
          userId: '', category: 'scheduling', priority: 'medium',
          title: `${event.count} confirmações pendentes`,
          message: `Existem ${event.count} pacientes para amanhã sem confirmação.`,
          actionLabel: 'Ver confirmações', actionRoute: '/app/confirmacoes', icon: '📅',
        }
      }
      return null

    default:
      return null
  }
}

export function useSystemEvents() {
  const { addNotification } = useNotificationContext()
  const { user } = useAuth()

  const publish = useCallback((event: SystemEvent) => {
    if (!user) return
    const notification = eventToNotification(event, user.role)
    if (notification) {
      addNotification({ ...notification, userId: user.id })
    }
  }, [addNotification, user])

  return { publish }
}
