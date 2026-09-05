import { useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { useRegisters } from '@/context/RegistersContext'
import { useCompanyContext } from '@/context/CompanyContext'
import { generateOrderHash } from '@/utils/orderHash'
import { applyImportResults, type BatchProcessResult } from '@/stores/apiPartnerOrdersStore'
import type { PartnerOrder } from '@/types/api-partner-orders.types'

/** Extrai a mensagem real do erro (Supabase/PostgREST ou Error) para exibir ao usuário. */
function describeError(err: unknown): string {
  if (!err) return 'Falha ao criar o atendimento.'
  if (typeof err === 'string') return err
  const e = err as { message?: string; details?: string; hint?: string; code?: string }
  const parts = [e.message, e.details, e.hint].filter(Boolean) as string[]
  const text = [...new Set(parts)].join(' — ')
  if (text) return e.code ? `${text} (código ${e.code})` : text
  try { return JSON.stringify(err) } catch { return 'Falha ao criar o atendimento.' }
}

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
  const { activeOrigin } = useCompanyContext()
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

    const norm = (v: string) =>
      (v || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()

    const activeExams = exams.filter(e => e.isActive !== false)
    const byCode = new Map(
      activeExams.map(e => [norm(String((e as { internalCode?: string }).internalCode || '')), e]),
    )
    const byName = new Map(activeExams.map(e => [norm(e.name), e]))

    /** Resolve o exame pelo código interno; se não achar, tenta pelo nome enviado pelo parceiro. */
    const resolveExam = (code: string, name?: string) => {
      const c = norm(code)
      if (c && byCode.has(c)) return byCode.get(c)
      const n = norm(name || '')
      if (!n) return undefined
      if (byName.has(n)) return byName.get(n)
      return activeExams.find(e => {
        const en = norm(e.name)
        return en.includes(n) || n.includes(en)
      })
    }

    const originId = activeOrigin?.id ?? null
    const originCode = String(activeOrigin?.internal_code ?? '00').padStart(2, '0')
    const originName = activeOrigin?.name ?? 'MATRIZ'

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
        // Proteção contra criação duplicada: confere o estado atual do pedido no banco
        const { data: current } = await supabase
          .from('partner_orders')
          .select('status, attendance_order_id, attendance_orders(order_number, protocol)')
          .eq('id', o.id)
          .maybeSingle()
        const cur = current as {
          status?: string
          attendance_order_id?: string | null
          attendance_orders?: { order_number: string | null; protocol: string | null } | null
        } | null
        if (cur?.status === 'processed' && cur.attendance_order_id) {
          results.push({
            ...base,
            ok: true,
            attendanceProtocol:
              cur.attendance_orders?.order_number ?? cur.attendance_orders?.protocol ?? undefined,
          })
          continue
        }

        const matched = o.exams.map(e => ({ e, exam: resolveExam(e.code, e.name) }))
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
          const birthDate = toIsoDate(o.patient.birthDate)
          if (!digits) throw new Error('Paciente sem CPF válido no pedido — cadastro obrigatório.')
          if (!birthDate) throw new Error('Paciente sem data de nascimento válida no pedido — cadastro obrigatório.')
          const { data: created, error: pErr } = await supabase
            .from('patients')
            .insert({
              company_id: companyId,
              name: o.patient.name,
              cpf: digits,
              birth_date: birthDate,
              gender: genderFromSex(o.patient.sex),
              phone: o.patient.phone || 'Não informado',
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
          _origin_id: originId,
          _origin_code: originCode,
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

        const { data: createdOrder, error: oErr } = await supabase
          .from('attendance_orders')
          .insert({
            company_id: companyId,
            patient_id: patientId,
            patient_name: o.patient.name,
            origin_id: originId,
            origin_code: originCode,
            origin_name: originName,
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
          .select('id')
          .single()
        if (oErr) throw oErr

        const createdOrderId = (createdOrder as { id: string } | null)?.id ?? null
        const { data: updated, error: upErr } = await supabase
          .from('partner_orders')
          .update({
            status: 'processed',
            error: null,
            attendance_order_id: createdOrderId,
          } as never)
          .eq('id', o.id)
          .select('id')
        if (upErr || !updated || updated.length === 0) {
          // O atendimento já existe: reporta como criado, sinalizando a falha de vínculo.
          results.push({
            ...base,
            ok: true,
            attendanceProtocol: protocol,
            errorMessage: `Atendimento criado, mas houve falha ao marcar o pedido como processado: ${upErr ? describeError(upErr) : 'nenhum registro atualizado (permissão negada)'}`,
          })
          continue
        }

        results.push({ ...base, ok: true, attendanceProtocol: protocol })
      } catch (err) {
        const message = describeError(err)
        await supabase
          .from('partner_orders')
          .update({ status: 'error', error: message } as never)
          .eq('id', o.id)
        results.push({ ...base, ok: false, errorMessage: message })
      }
    }

    applyImportResults(results)
    return results
  }, [companyId, user, exams, convenios, activeOrigin])

  return { importOrders }
}
