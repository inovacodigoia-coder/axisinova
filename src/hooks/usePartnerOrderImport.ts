import { useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { useRegisters } from '@/context/RegistersContext'
import { generateOrderHash } from '@/utils/orderHash'
import { applyImportResults, type BatchProcessResult } from '@/stores/apiPartnerOrdersStore'
import type { PartnerOrder } from '@/types/api-partner-orders.types'

const onlyDigits = (v: string) => (v || '').replace(/\D/g, '')

function formatCpf(digits: string) {
  if (digits.length !== 11) return digits
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

function toIsoDate(value?: string): string | null {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
  const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (br) return `${br[3]}-${br[2]}-${br[1]}`
  return null
}

function genderFromSex(sex?: string) {
  const s = (sex || '').toUpperCase()
  if (s === 'M' || s === 'MALE' || s === 'MASCULINO') return 'male'
  if (s === 'F' || s === 'FEMALE' || s === 'FEMININO') return 'female'
  return 'not_informed'
}

/**
 * Criação REAL dos Atendimentos a partir dos Pedidos Recebidos via API dos parceiros.
 * Regra: tudo ou nada por pedido — todos os códigos precisam existir no Catálogo de Exames ativo.
 */
export function usePartnerOrderImport() {
  const { user } = useAuth()
  const { exams, convenios } = useRegisters()
  const companyId = (user as { companyId?: string } | null)?.companyId

  const importOrders = useCallback(async (orders: PartnerOrder[]): Promise<BatchProcessResult[]> => {
    const results: BatchProcessResult[] = []
    if (!companyId || !user) {
      return orders.map(o => ({
        orderId: o.id,
        patientName: o.patient.name,
        cpf: o.patient.cpf,
        partnerId: o.partnerId,
        partnerProtocol: o.partnerProtocol,
        examsCount: o.exams.length,
        ok: false,
        errorMessage: 'Sessão sem empresa vinculada — não foi possível criar os atendimentos.',
      }))
    }

    const catalog = new Map(
      exams
        .filter(e => e.isActive !== false)
        .map(e => [String((e as { internalCode?: string }).internalCode || '').toUpperCase().trim(), e]),
    )

    for (const o of orders) {
      const base = {
        orderId: o.id,
        patientName: o.patient.name,
        cpf: o.patient.cpf,
        partnerId: o.partnerId,
        partnerProtocol: o.partnerProtocol,
        examsCount: o.exams.length,
      }

      try {
        const matched = o.exams.map(e => ({ e, exam: catalog.get(String(e.code).toUpperCase().trim()) }))
        const invalid = matched.filter(m => !m.exam)
        if (invalid.length) {
          const errorMessage = `${invalid.length} de ${o.exams.length} exames com código inválido (${invalid.map(m => m.e.code).join(', ')}) — nenhum atendimento foi criado.`
          results.push({ ...base, ok: false, errorMessage })
          continue
        }

        // --- Paciente (busca por CPF, cria se não existir) ---
        const digits = onlyDigits(o.patient.cpf)
        let patientId: string | null = null
        if (digits.length === 11) {
          const { data: found } = await supabase
            .from('patients')
            .select('id')
            .eq('company_id', companyId)
            .in('cpf', [digits, formatCpf(digits)])
            .limit(1)
            .maybeSingle()
          patientId = (found as { id?: string } | null)?.id ?? null
        }

        if (!patientId) {
          const { data: created, error: pErr } = await supabase
            .from('patients')
            .insert({
              company_id: companyId,
              name: o.patient.name,
              cpf: digits || null,
              birth_date: toIsoDate(o.patient.birthDate),
              gender: genderFromSex(o.patient.sex),
              phone: o.patient.phone || null,
              status: 'active',
            } as never)
            .select('id')
            .single()
          if (pErr) throw pErr
          patientId = (created as { id: string }).id
        }

        // --- Numeração atômica do pedido ---
        const { data: nextNumber, error: seqError } = await (supabase as unknown as {
          rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>
        }).rpc('next_attendance_order_number', {
          _company_id: companyId,
          _origin_id: null,
          _origin_code: '00',
        })
        if (seqError) throw seqError

        const protocol = String(nextNumber)
        const hash = generateOrderHash(protocol, Date.now())

        const convenio = o.insurance
          ? convenios.find(c => c.name.toLowerCase() === String(o.insurance).toLowerCase())
          : undefined
        const convenioName = convenio?.name || o.insurance || 'Particular'

        const guides = [{
          id: '1',
          name: convenioName,
          plan: convenioName,
          number: o.insuranceGuide || undefined,
          convenioId: convenio?.id,
          convenioName,
          exams: matched.map(m => ({ ...(m.exam as object), quantity: 1, collected: false })),
        }]

        const { error: oErr } = await supabase
          .from('attendance_orders')
          .insert({
            company_id: companyId,
            patient_id: patientId,
            patient_name: o.patient.name,
            origin_id: null,
            origin_code: '00',
            origin_name: 'MATRIZ',
            order_number: protocol,
            protocol,
            hash,
            service_type: 'exam',
            payment_type: convenio ? 'convenio' : 'private',
            exam_mode: 'lab',
            requesting_doctor: o.requestingDoctor || null,
            convenio_id: convenio?.id || null,
            convenio_name: convenioName,
            card_number: o.insuranceGuide || null,
            lab_guides: guides,
            status: 'open',
            registered_by: user.id,
            registered_by_name: user.name,
          } as never)
        if (oErr) throw oErr

        results.push({ ...base, ok: true, attendanceProtocol: protocol })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Falha ao criar o atendimento.'
        results.push({ ...base, ok: false, errorMessage: message })
      }
    }

    applyImportResults(results)
    return results
  }, [companyId, user, exams, convenios])

  return { importOrders }
}
