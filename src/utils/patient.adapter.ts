// =====================================================================
// Adapter entre o formato do banco (snake_case) e o tipo Patient
// =====================================================================
import type {
  Patient, PatientAddress, PatientConvenio, PatientResponsible,
  PatientClinicalData, Gender, PatientStatus, PhoneType,
  EthnicityType, MaritalStatus, EducationType,
} from '@/types/patient.types'

type DBPatient = Record<string, any>

const safeJsonArr = <T>(value: any, fallback: T[]): T[] => {
  if (!value) return fallback
  if (Array.isArray(value)) return value as T[]
  try { const p = typeof value === 'string' ? JSON.parse(value) : value; return Array.isArray(p) ? p : fallback } catch { return fallback }
}
const safeJsonObj = <T>(value: any, fallback: T | undefined = undefined): T | undefined => {
  if (!value) return fallback
  if (typeof value === 'object' && !Array.isArray(value)) return value as T
  try { return typeof value === 'string' ? (JSON.parse(value) as T) : (value as T) } catch { return fallback }
}

export function dbToPatient(row: DBPatient): Patient {
  const clinical = safeJsonObj<PatientClinicalData>(row.clinical_data, {
    allergies: [], chronicConditions: [], continuousMedications: [],
  }) || { allergies: [], chronicConditions: [], continuousMedications: [] }

  // Compat: array antigo de strings em row.allergies → migra para clinicalData.allergies
  if ((!clinical.allergies || clinical.allergies.length === 0) && Array.isArray(row.allergies) && row.allergies.length > 0) {
    clinical.allergies = (row.allergies as string[]).map((s, i) => ({
      id: `legacy-${i}`,
      substance: s,
      type: 'other' as const,
      reaction: '',
      severity: 'moderate' as const,
    }))
  }
  if (!clinical.chronicConditions) clinical.chronicConditions = []
  if (!clinical.continuousMedications) clinical.continuousMedications = []
  if (!clinical.bloodType && row.blood_type) clinical.bloodType = row.blood_type

  return {
    id: row.id,
    companyId: row.company_id,
    fullName: row.name,
    socialName: row.social_name || undefined,
    cpf: row.cpf || undefined,
    rg: row.rg || undefined,
    rgIssuer: row.rg_issuer || undefined,
    rgState: row.rg_state || undefined,
    rgIssueDate: row.rg_issue_date || undefined,
    birthDate: row.birth_date,
    birthCity: row.birth_city || undefined,
    birthState: row.birth_state || undefined,
    nationality: row.nationality || 'Brasileira',
    gender: (row.gender as Gender) || 'not_informed',
    ethnicity: row.ethnicity as EthnicityType | undefined,
    maritalStatus: row.marital_status as MaritalStatus | undefined,
    education: row.education as EducationType | undefined,
    motherName: row.mother_name || undefined,
    fatherName: row.father_name || undefined,
    status: (row.status as PatientStatus) || 'active',
    phone1: row.phone || '',
    phone1Type: (row.phone1_type as PhoneType) || 'mobile',
    phone2: row.phone2 || undefined,
    phone2Type: (row.phone2_type as PhoneType) || undefined,
    phone3: row.phone3 || undefined,
    email: row.email || undefined,
    emailSecondary: row.email_secondary || undefined,
    address: safeJsonObj<PatientAddress>(row.address_data) || (row.address ? parseLegacyAddress(row.address) : undefined),
    occupation: row.occupation || undefined,
    employer: row.employer || undefined,
    workPhone: row.work_phone || undefined,
    convenios: safeJsonArr<PatientConvenio>(row.convenios, []),
    responsible: safeJsonObj<PatientResponsible>(row.responsible),
    clinicalData: clinical,
    referralSource: row.referral_source || undefined,
    referralBy: row.referral_by || undefined,
    registeredBy: row.registered_by || undefined,
    importedFrom: row.imported_from || undefined,
    importBatchId: row.import_batch_id || undefined,
    generalNotes: row.general_notes || undefined,
    internalAlerts: safeJsonObj(row.internal_alerts),
    financialNotes: row.financial_notes || undefined,
    tags: row.tags || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastAttendance: row.last_attendance || undefined,
  }
}

function parseLegacyAddress(s: string): PatientAddress | undefined {
  if (!s) return undefined
  return { cep: '', street: s, number: '', neighborhood: '', city: '', state: '' }
}

export function patientToDb(p: Partial<Patient>): Record<string, any> {
  const out: Record<string, any> = {}
  if (p.companyId !== undefined) out.company_id = p.companyId
  if (p.fullName !== undefined) out.name = p.fullName
  if (p.socialName !== undefined) out.social_name = p.socialName || null
  if (p.cpf !== undefined) out.cpf = p.cpf?.replace(/\D/g, '') || null
  if (p.rg !== undefined) out.rg = p.rg || null
  if (p.rgIssuer !== undefined) out.rg_issuer = p.rgIssuer || null
  if (p.rgState !== undefined) out.rg_state = p.rgState || null
  if (p.rgIssueDate !== undefined) out.rg_issue_date = p.rgIssueDate || null
  if (p.birthDate !== undefined) out.birth_date = p.birthDate
  if (p.birthCity !== undefined) out.birth_city = p.birthCity || null
  if (p.birthState !== undefined) out.birth_state = p.birthState || null
  if (p.nationality !== undefined) out.nationality = p.nationality || 'Brasileira'
  if (p.gender !== undefined) out.gender = p.gender
  if (p.ethnicity !== undefined) out.ethnicity = p.ethnicity || null
  if (p.maritalStatus !== undefined) out.marital_status = p.maritalStatus || null
  if (p.education !== undefined) out.education = p.education || null
  if (p.motherName !== undefined) out.mother_name = p.motherName || null
  if (p.fatherName !== undefined) out.father_name = p.fatherName || null
  if (p.status !== undefined) out.status = p.status
  if (p.phone1 !== undefined) out.phone = p.phone1?.replace(/\D/g, '') || ''
  if (p.phone1Type !== undefined) out.phone1_type = p.phone1Type
  if (p.phone2 !== undefined) out.phone2 = p.phone2?.replace(/\D/g, '') || null
  if (p.phone2Type !== undefined) out.phone2_type = p.phone2Type || null
  if (p.phone3 !== undefined) out.phone3 = p.phone3?.replace(/\D/g, '') || null
  if (p.email !== undefined) out.email = p.email?.trim() || null
  if (p.emailSecondary !== undefined) out.email_secondary = p.emailSecondary || null
  if (p.address !== undefined) out.address_data = p.address || null
  if (p.occupation !== undefined) out.occupation = p.occupation || null
  if (p.employer !== undefined) out.employer = p.employer || null
  if (p.workPhone !== undefined) out.work_phone = p.workPhone?.replace(/\D/g, '') || null
  if (p.convenios !== undefined) out.convenios = p.convenios
  if (p.responsible !== undefined) out.responsible = p.responsible || null
  if (p.clinicalData !== undefined) {
    out.clinical_data = p.clinicalData
    if (p.clinicalData.bloodType) out.blood_type = p.clinicalData.bloodType
    out.allergies = p.clinicalData.allergies?.map(a => a.substance) || []
  }
  if (p.referralSource !== undefined) out.referral_source = p.referralSource || null
  if (p.referralBy !== undefined) out.referral_by = p.referralBy || null
  if (p.registeredBy !== undefined) out.registered_by = p.registeredBy || null
  if (p.importedFrom !== undefined) out.imported_from = p.importedFrom || null
  if (p.importBatchId !== undefined) out.import_batch_id = p.importBatchId || null
  if (p.generalNotes !== undefined) out.general_notes = p.generalNotes || null
  if (p.internalAlerts !== undefined) out.internal_alerts = p.internalAlerts || null
  if (p.financialNotes !== undefined) out.financial_notes = p.financialNotes || null
  if (p.tags !== undefined) out.tags = p.tags
  return out
}
