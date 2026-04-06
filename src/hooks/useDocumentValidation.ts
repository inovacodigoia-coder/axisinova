import { useMemo } from 'react'
import { useRegisters } from '@/context/RegistersContext'
import type { CheckinDocument, DocumentValidationStatus } from '@/types/reception.types'
import type { AttachmentRule, AppointmentType } from '@/types/registers.types'

const TYPE_MAP: Record<string, AppointmentType> = {
  consultation: 'consulta',
  exam: 'exame',
  procedure: 'procedimento',
}

export function useDocumentValidation(
  convenioId: string | null,
  appointmentType: 'consultation' | 'exam' | 'procedure' | null,
  uploadedDocuments: CheckinDocument[]
) {
  const { convenios } = useRegisters()

  const convenio = useMemo(() =>
    convenioId ? convenios.find(c => c.id === convenioId) : null,
    [convenioId, convenios]
  )

  const rules: AttachmentRule[] = useMemo(() => {
    if (!convenio || !appointmentType) return []
    const mappedType = TYPE_MAP[appointmentType]
    if (!mappedType) return []
    return convenio.attachmentRules
      .filter(rule => rule.appliesToTypes.includes(mappedType))
      .sort((a, b) => a.order - b.order)
  }, [convenio, appointmentType])

  const validationStatus: DocumentValidationStatus = useMemo(() => {
    if (rules.length === 0) {
      return { total: 0, required: 0, validated: 0, missingRequired: [], isComplete: true }
    }
    const requiredRules = rules.filter(r => r.isRequired)
    const validatedRequired = requiredRules.filter(rule =>
      uploadedDocuments.some(doc =>
        doc.attachmentRuleId === rule.id &&
        ['uploaded', 'validated'].includes(doc.status)
      )
    )
    const missingRequired = requiredRules
      .filter(rule =>
        !uploadedDocuments.some(doc =>
          doc.attachmentRuleId === rule.id &&
          ['uploaded', 'validated'].includes(doc.status)
        )
      )
      .map(r => r.attachmentName)

    return {
      total: rules.length,
      required: requiredRules.length,
      validated: validatedRequired.length,
      missingRequired,
      isComplete: missingRequired.length === 0,
    }
  }, [rules, uploadedDocuments])

  return { rules, validationStatus, convenio, hasRules: rules.length > 0 }
}
