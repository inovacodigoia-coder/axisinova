import { useMemo, useEffect, useState } from 'react'
import { useRegisters } from '@/context/RegistersContext'
import { useCompanyContext } from '@/context/CompanyContext'
import { DEMO_CATALOG, type CatalogProcedure } from '@/mocks/attendance-cadastro.mock'
import { Stethoscope, FlaskConical, Activity, CreditCard, Banknote, Gift, Search, Check } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { cn } from '@/lib/utils'
import type { CadastroState } from '../AttendanceCadastroModal'
import type { AttendanceServiceType, AttendancePaymentType } from '@/types/attendance-cadastro.types'

interface Props { state: CadastroState; update: (patch: Partial<CadastroState>) => void }

const SERVICE_BTNS: { value: AttendanceServiceType; icon: any; label: string }[] = [
  { value: 'consultation', icon: Stethoscope, label: 'CONSULTA' },
  { value: 'exam', icon: FlaskConical, label: 'EXAME' },
  { value: 'procedure', icon: Activity, label: 'PROCEDIMENTO' },
]

const PAYMENT_BTNS: { value: AttendancePaymentType; icon: any; label: string }[] = [
  { value: 'convenio', icon: CreditCard, label: 'Convênio' },
  { value: 'private', icon: Banknote, label: 'Particular' },
  { value: 'free', icon: Gift, label: 'Cortesia' },
]

export function Step2AttendanceData({ state, update }: Props) {
  const { doctors, specialties, convenios, exams, procedures } = useRegisters()
  const { availableOrigins, activeOrigin } = useCompanyContext()

  // Catálogo unificado: exames e procedimentos reais (apenas ativos) + mock de consultas
  const catalog = useMemo<CatalogProcedure[]>(() => {
    const fromExams: CatalogProcedure[] = exams
      .filter(e => e.isActive !== false)
      .map(e => ({
        id: e.id,
        type: 'exam',
        name: e.name,
        tussCode: e.tussCode || e.internalCode || '',
        specialtyId: e.specialtyId,
        doctorIds: [],
        durationMinutes: e.estimatedDurationMinutes,
        prepInstructions: e.preparationInstructions,
        resultDays: e.resultDeadlineDays,
        requiresAuthorization: e.requiresAuthorization,
      }))
    const fromProcedures: CatalogProcedure[] = procedures
      .filter(p => p.isActive !== false)
      .map(p => ({
        id: p.id,
        type: 'procedure',
        name: p.name,
        tussCode: p.tussCode || p.internalCode || '',
        price: p.price,
        specialtyId: p.specialtyId,
        doctorIds: [],
        durationMinutes: p.estimatedDurationMinutes,
        prepInstructions: p.preOperativeInstructions,
        resultDays: undefined,
        requiresAuthorization: p.requiresAuthorization ?? false,
      }))
    return [
      ...DEMO_CATALOG.filter(p => p.type === 'consultation'),
      ...fromExams,
      ...fromProcedures,
    ]
  }, [exams, procedures])

  // Sincronizar origem ativa se não houver uma selecionada no estado
  useEffect(() => {
    if (activeOrigin && !state.originId) {
      update({ 
        originId: activeOrigin.id, 
        originCode: activeOrigin.internal_code ? Number(activeOrigin.internal_code) : 0 
      })
    }
  }, [activeOrigin, state.originId, update])

  // Pré-popular convênio do paciente
  useEffect(() => {
    if (state.paymentType === 'convenio' && !state.convenioId && state.patient?.convenios?.[0]) {
      const c = state.patient.convenios[0]
      update({ convenioId: c.convenioId, convenioName: c.convenioName, cardNumber: c.cardNumber, cardExpiry: c.cardExpiry })
    }
  }, [state.paymentType, state.convenioId, state.patient, update])

  const availableProcedures = useMemo(() => {
    return catalog.filter(p => {
      if (p.type !== state.serviceType) return false
      if (!state.doctorId) return true
      if (p.doctorIds.length > 0) return p.doctorIds.includes(state.doctorId)
      if (p.specialtyId) {
        const d = doctors.find(doc => doc.id === state.doctorId)
        return d ? d.specialtyIds.includes(p.specialtyId) : true
      }
      return true
    })
  }, [catalog, state.serviceType, state.doctorId, doctors])

  const doctorSpecialties = useMemo(() => {
    if (!state.doctorId) return specialties
    const d = doctors.find(d => d.id === state.doctorId)
    return specialties.filter(s => d?.specialtyIds.includes(s.id))
  }, [state.doctorId, doctors, specialties])

  const selectDoctor = (id: string) => {
    const d = doctors.find(d => d.id === id)
    if (!d) { update({ doctorId: undefined, doctorName: undefined, doctorCRM: undefined, specialty: undefined }); return }
    const firstSpec = specialties.find(s => d.specialtyIds.includes(s.id))
    update({ doctorId: id, doctorName: d.fullName, doctorCRM: d.crm, specialty: firstSpec?.name, procedureId: undefined, procedureName: undefined, procedureCode: undefined })
  }

  const selectProcedure = (id: string) => {
    const p = catalog.find(p => p.id === id)
    if (!p) return
    update({
      procedureId: p.id, procedureName: p.name, procedureCode: p.tussCode,
      procedureRequiresAuth: p.requiresAuthorization,
      procedureDescription: p.prepInstructions,
      billingCode: p.tussCode, billingTable: 'TUSS', quantity: 1,
      privateValue: state.paymentType === 'private' ? p.price : state.privateValue,
    })
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Tipo */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-2">Tipo de Atendimento *</h3>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3">
            {SERVICE_BTNS.map(({ value, icon: Icon, label }) => {
              const active = state.serviceType === value
              return (
                <button key={value} type="button" onClick={() => {
                  if (value === 'exam') {
                    update({ serviceType: value, procedureId: undefined, procedureName: undefined, procedureCode: undefined, examMode: 'ask' })
                  } else {
                    update({ serviceType: value, procedureId: undefined, procedureName: undefined, procedureCode: undefined, examMode: undefined })
                  }
                }}
                  className={cn('rounded-lg border-2 p-4 flex flex-col items-center gap-2 transition-all',
                    active ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:border-primary/50')}>
                  <Icon className={cn('h-7 w-7', active ? 'text-primary' : 'text-muted-foreground')} />
                  <span className={cn('text-xs font-bold', active ? 'text-foreground' : 'text-muted-foreground')}>{label}</span>
                  {active && <Check className="h-3 w-3 text-primary" />}
                </button>
              )
            })}
          </div>

          {state.serviceType === 'exam' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300 grid grid-cols-2 gap-3 mt-1 p-3 bg-muted/30 rounded-lg border border-dashed border-primary/30">
              <div className="col-span-2 text-center text-[10px] font-bold text-primary mb-1 uppercase tracking-wider">
                Local de Realização do Exame
              </div>
              <button
                type="button"
                onClick={() => update({ examMode: 'clinic' })}
                className={cn(
                  "flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all",
                  state.examMode === 'clinic' 
                    ? "border-primary bg-primary/10 shadow-sm" 
                    : "border-border bg-card hover:border-primary/40"
                )}
              >
                <Stethoscope className={cn("h-4 w-4", state.examMode === 'clinic' ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-xs font-bold", state.examMode === 'clinic' ? "text-foreground" : "text-muted-foreground")}>CLÍNICA</span>
                {state.examMode === 'clinic' && <Check className="h-3 w-3 text-primary" />}
              </button>

              <button
                type="button"
                onClick={() => update({ examMode: 'lab' })}
                className={cn(
                  "flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all",
                  state.examMode === 'lab' 
                    ? "border-primary bg-primary/10 shadow-sm" 
                    : "border-border bg-card hover:border-primary/40"
                )}
              >
                <FlaskConical className={cn("h-4 w-4", state.examMode === 'lab' ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-xs font-bold", state.examMode === 'lab' ? "text-foreground" : "text-muted-foreground")}>LABORATÓRIO</span>
                {state.examMode === 'lab' && <Check className="h-3 w-3 text-primary" />}
              </button>
            </div>
          )}
        </div>
      </section>


      {state.serviceType && (state.serviceType !== 'exam' || (state.examMode && state.examMode !== 'ask')) && (
        <>

          {/* Origem */}
          <section>
            <Field label="Origem do Atendimento *">
              <select 
                value={state.originId || ''} 
                onChange={e => {
                  const val = e.target.value;
                  const origin = availableOrigins.find(o => o.id === val);
                  update({ originId: val, originCode: origin?.internal_code ? Number(origin.internal_code) : 0 });
                }}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecione...</option>
                {availableOrigins.map(o => (
                  <option key={o.id} value={o.id}>{o.name} ({o.internal_code})</option>
                ))}
              </select>
            </Field>
          </section>

          {/* Médico + Especialidade */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Médico *">
              <select value={state.doctorId || ''} onChange={e => selectDoctor(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                {doctors.filter(d => d.isActive && !d.isBlocked).map(d => (
                  <option key={d.id} value={d.id}>{d.fullName} · CRM {d.crm}</option>
                ))}
              </select>
            </Field>
            <Field label="Especialidade">
              <select value={state.specialty || ''} onChange={e => update({ specialty: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" disabled={!state.doctorId}>
                <option value="">—</option>
                {doctorSpecialties.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </Field>
            {state.serviceType === 'exam' && (
              <Field label="Médico Solicitante">
                <input value={state.requestingDoctor || ''} onChange={e => update({ requestingDoctor: e.target.value })}
                  placeholder="Nome do médico que solicitou o exame"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </Field>
            )}
          </section>

          {/* Procedimento */}
          <section>
            <Field label={`${state.serviceType === 'consultation' ? 'Consulta' : state.serviceType === 'exam' ? 'Exame' : 'Procedimento'} *`}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <select value={state.procedureId || ''} onChange={e => selectProcedure(e.target.value)}
                  className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm">
                  <option value="">Buscar do cadastro...</option>
                  {availableProcedures.map(p => (
                    <option key={p.id} value={p.id}>{p.tussCode} — {p.name} {p.price ? `(R$ ${p.price})` : ''}</option>
                  ))}
                </select>
              </div>
            </Field>
            {state.procedureId && (() => {
              const p = catalog.find(x => x.id === state.procedureId)!
              return (
                <div className="mt-2 rounded-lg border border-border bg-card p-3 text-xs space-y-1">
                  <div className="font-semibold text-foreground">✅ {p.name}</div>
                  <div className="text-muted-foreground">TUSS: {p.tussCode}{p.durationMinutes ? ` · ${p.durationMinutes} min` : ''}{p.resultDays ? ` · Resultado: ${p.resultDays} dia(s)` : ''}</div>
                  {p.prepInstructions && <div className="text-muted-foreground">Preparo: {p.prepInstructions}</div>}
                  {p.requiresAuthorization && <span className="inline-block mt-1 rounded bg-amber-100 text-amber-700 px-2 py-0.5 font-semibold">Requer Autorização</span>}
                </div>
              )
            })()}
          </section>

          {/* TUSS field editável */}
          <Field label="Código do Procedimento (TUSS/TISS) *">
            <input value={state.procedureCode || ''} onChange={e => update({ procedureCode: e.target.value })}
              placeholder="XX.XX.XX.XXX-X"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono" />
          </Field>

          {/* Forma de pagamento */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-2">Forma de Pagamento *</h3>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {PAYMENT_BTNS.map(({ value, icon: Icon, label }) => {
                const active = state.paymentType === value
                return (
                  <button key={value} onClick={() => update({ paymentType: value })}
                    className={cn('rounded-lg border-2 p-3 flex items-center justify-center gap-2 transition-all',
                      active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50')}>
                    <Icon className={cn('h-4 w-4', active ? 'text-primary' : 'text-muted-foreground')} />
                    <span className={cn('text-xs font-semibold', active ? 'text-foreground' : 'text-muted-foreground')}>{label}</span>
                  </button>
                )
              })}
            </div>

            {state.paymentType === 'convenio' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Convênio *">
                  <select value={state.convenioId || ''} onChange={e => {
                    const c = convenios.find(x => x.id === e.target.value)
                    update({ convenioId: e.target.value, convenioName: c?.name })
                  }} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                    <option value="">Selecione...</option>
                    {convenios.filter(c => c.isActive).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Número da Carteirinha *">
                  <input value={state.cardNumber || ''} onChange={e => update({ cardNumber: e.target.value.replace(/\D/g, '').slice(0, 20) })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                </Field>
                <Field label="Validade MM/AAAA">
                  <input value={state.cardExpiry || ''} onChange={e => update({ cardExpiry: e.target.value })} placeholder="MM/AAAA"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                </Field>
              </div>
            )}

            {state.paymentType === 'private' && (
              <div className="space-y-2">
                <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                  💰 Atendimento particular — pagamento será registrado no próximo prompt
                </div>
                <Field label="Valor do atendimento (R$)">
                  <input type="number" step="0.01" value={state.privateValue ?? ''} onChange={e => update({ privateValue: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                </Field>
              </div>
            )}

            {state.paymentType === 'free' && (
              <Field label="Motivo da cortesia *">
                <textarea value={state.freeReason || ''} onChange={e => update({ freeReason: e.target.value })} rows={3}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </Field>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  )
}
