import React, { useEffect, useRef, useState } from 'react'
import { X, Info, Loader2, AlertTriangle, Flame, Siren, StickyNote, HeartPulse } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { cn } from '@/lib/utils'

interface Props {
  orderId?: string
  patientId?: string
  patientName: string
  protocol: string
  onClose: () => void
}

function Field({ label, value, accent }: { label: string; value?: React.ReactNode; accent?: boolean }) {
  return (
    <div className={cn(
      'rounded-md border px-2.5 py-1.5',
      accent ? 'border-amber-300 bg-amber-50' : 'border-border bg-muted/40'
    )}>
      <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-xs font-semibold text-foreground break-words">{value || '—'}</p>
    </div>
  )
}

export function PatientInfoFloating({ orderId, patientId, patientName, protocol, onClose }: Props) {
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<any>(null)
  const [patient, setPatient] = useState<any>(null)
  const [pos, setPos] = useState({ x: Math.max(24, window.innerWidth - 420), y: 120 })
  const dragRef = useRef<{ dx: number; dy: number } | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        if (orderId) {
          const { data } = await (supabase
            .from('attendance_orders' as any) as any)
            .select('weight, height, is_urgent, has_fever, is_fasting, service_observation, fasting_start_hour, fasting_type, hospital_name, hospital_sector_name, bed, medical_record_number')
            .eq('id', orderId)
            .maybeSingle()
          if (active) setOrder(data || null)
        }
        if (patientId) {
          const { data } = await (supabase
            .from('patients' as any) as any)
            .select('name, blood_type, allergies, clinical_data, general_notes, internal_alerts, tags')
            .eq('id', patientId)
            .maybeSingle()
          if (active) setPatient(data || null)
        }
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [orderId, patientId])

  // Arrastar pelo cabeçalho
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return
      const panel = panelRef.current
      const w = panel?.offsetWidth ?? 380
      const h = panel?.offsetHeight ?? 300
      setPos({
        x: Math.min(Math.max(0, e.clientX - dragRef.current.dx), window.innerWidth - w),
        y: Math.min(Math.max(0, e.clientY - dragRef.current.dy), window.innerHeight - 60),
      })
    }
    const onUp = () => { dragRef.current = null }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])

  const startDrag = (e: React.PointerEvent) => {
    const panel = panelRef.current
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top }
  }

  const clinical = (patient?.clinical_data as any) || {}
  const allergiesList: any[] = Array.isArray(clinical.allergies) ? clinical.allergies : (Array.isArray(patient?.allergies) ? patient.allergies : [])
  const chronic: string[] = Array.isArray(clinical.chronicConditions) ? clinical.chronicConditions : []
  const meds: any[] = Array.isArray(clinical.continuousMedications) ? clinical.continuousMedications : []
  const alert = patient?.internal_alerts as any
  const fasting = order?.is_fasting

  return (
    <div
      ref={panelRef}
      className="fixed z-[10000] w-[380px] max-w-[92vw] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* Cabeçalho arrastável */}
      <div
        className="flex items-center justify-between gap-2 bg-slate-800 text-white px-4 py-2.5 cursor-move select-none touch-none"
        onPointerDown={startDrag}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Info className="h-4 w-4 text-cyan-300 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-tight truncate">{patientName}</p>
            <p className="text-[9px] font-bold text-white/50 uppercase">Pedido {protocol}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          onPointerDown={(e) => e.stopPropagation()}
          className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-destructive/20 hover:text-red-300 transition-colors shrink-0"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-[65vh] overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <>
            {/* Alerta interno */}
            {alert?.message && (
              <div className={cn(
                'flex items-start gap-2 rounded-md border px-3 py-2 text-xs font-semibold',
                alert.color === 'red' ? 'border-red-300 bg-red-50 text-red-700' :
                alert.color === 'yellow' ? 'border-amber-300 bg-amber-50 text-amber-700' :
                'border-blue-300 bg-blue-50 text-blue-700'
              )}>
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {alert.message}
              </div>
            )}

            {/* Dados do pedido */}
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <StickyNote className="h-3 w-3" /> Dados do Atendimento
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                <Field label="Peso (kg)" value={order?.weight} />
                <Field label="Altura (m)" value={order?.height} />
                <Field label="Urgência" value={order?.is_urgent ? 'Sim' : 'Não'} accent={!!order?.is_urgent} />
                <Field label="Febre" value={order?.has_fever ? 'Sim' : 'Não'} accent={!!order?.has_fever} />
                <Field label="Jejum do paciente" value={fasting === null || fasting === undefined ? '—' : fasting ? 'Sim' : 'Não'} />
                {order?.fasting_start_hour && <Field label="Início Jejum" value={order.fasting_start_hour} />}
                {order?.fasting_type && <Field label="Jejum" value={order.fasting_type} />}
                {order?.hospital_name && <Field label="Hospital" value={order.hospital_name} />}
                {order?.hospital_sector_name && <Field label="Setor" value={order.hospital_sector_name} />}
                {order?.bed && <Field label="Leito" value={order.bed} />}
                {order?.medical_record_number && <Field label="Nº Prontuário" value={order.medical_record_number} />}
              </div>
              {order?.service_observation && (
                <div className="rounded-md border border-border bg-muted/40 px-2.5 py-1.5">
                  <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Observação do Atendimento</p>
                  <p className="text-xs font-medium text-foreground whitespace-pre-wrap break-words">{order.service_observation}</p>
                </div>
              )}
            </div>

            {/* Dados clínicos */}
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <HeartPulse className="h-3 w-3" /> Dados Clínicos
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                <Field label="Tipo Sanguíneo" value={patient?.blood_type || clinical.bloodType} />
                <Field label="Gestante" value={clinical.isPregnant ? 'Sim' : 'Não'} accent={!!clinical.isPregnant} />
                <Field label="Atendimento Prioritário" value={clinical.needsPriority ? 'Sim' : 'Não'} accent={!!clinical.needsPriority} />
                <Field label="Doador de Órgãos" value={clinical.organDonor ? 'Sim' : 'Não'} />
              </div>
              {allergiesList.length > 0 && (
                <div className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5">
                  <p className="text-[9px] font-black uppercase tracking-wider text-red-600 flex items-center gap-1">
                    <Flame className="h-2.5 w-2.5" /> Alergias
                  </p>
                  <ul className="text-xs font-medium text-red-700 list-disc pl-4">
                    {allergiesList.map((a: any, i: number) => (
                      <li key={i}>{typeof a === 'string' ? a : [a.substance, a.reaction].filter(Boolean).join(' — ')}</li>
                    ))}
                  </ul>
                </div>
              )}
              {chronic.length > 0 && (
                <Field label="Condições Crônicas" value={chronic.join(', ')} />
              )}
              {meds.length > 0 && (
                <Field label="Medicamentos Contínuos" value={meds.map((m: any) => [m.name, m.dosage, m.frequency].filter(Boolean).join(' ')).join('; ')} />
              )}
              {clinical.disabilities && <Field label="Deficiência / Necessidades" value={clinical.disabilities} />}
              {clinical.notes && <Field label="Observações Clínicas" value={clinical.notes} />}
            </div>

            {/* Observações gerais */}
            {patient?.general_notes && (
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Siren className="h-3 w-3" /> Observações do Paciente
                </p>
                <div className="rounded-md border border-border bg-muted/40 px-2.5 py-1.5">
                  <p className="text-xs font-medium text-foreground whitespace-pre-wrap break-words">{patient.general_notes}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
