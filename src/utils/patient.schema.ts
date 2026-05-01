// =====================================================================
// Schema Zod do formulário completo de Pacientes (6 seções)
// =====================================================================
import { z } from 'zod'
import { isValidCPF, isValidEmail, isValidName } from './patient.validators'

// ─── Endereço ────────────────────────────────────────────────────────
export const addressSchema = z.object({
  cep: z.string().trim().regex(/^\d{5}-?\d{3}$/, 'CEP inválido').or(z.literal('')),
  street: z.string().max(200).optional().or(z.literal('')),
  number: z.string().max(20).optional().or(z.literal('')),
  complement: z.string().max(120).optional().or(z.literal('')),
  neighborhood: z.string().max(120).optional().or(z.literal('')),
  city: z.string().max(120).optional().or(z.literal('')),
  state: z.string().length(2, 'UF inválida').optional().or(z.literal('')),
  ibgeCode: z.string().optional().or(z.literal('')),
})

// ─── Convênio ────────────────────────────────────────────────────────
export const convenioSchema = z.object({
  convenioId: z.string().min(1, 'Convênio obrigatório'),
  convenioName: z.string().min(1),
  cardNumber: z.string().min(3, 'Número do cartão obrigatório').max(60),
  cardExpiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{4}$/, 'MM/AAAA').optional().or(z.literal('')),
  planName: z.string().max(120).optional().or(z.literal('')),
  holderName: z.string().max(200).optional().or(z.literal('')),
  holderCPF: z.string().optional().or(z.literal('')),
  isHolder: z.boolean(),
  nationalHealthCard: z.string().optional().or(z.literal('')),
})

// ─── Responsável ─────────────────────────────────────────────────────
// Para adultos os campos do responsável são livres; quando o paciente for menor
// de idade a obrigatoriedade dos principais campos é validada no superRefine
// abaixo (name, cpf, relationship e phone1).
export const responsibleSchema = z.object({
  name: z.string().max(200).optional().or(z.literal('')),
  cpf: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(v => !v || isValidCPF(v), 'CPF inválido'),
  birthDate: z.string().optional().or(z.literal('')),
  relationship: z.string().max(60).optional().or(z.literal('')),
  phone1: z.string().optional().or(z.literal('')),
  phone2: z.string().optional().or(z.literal('')),
  email: z.string().refine(v => !v || isValidEmail(v), 'E-mail inválido').optional().or(z.literal('')),
  address: addressSchema.optional(),
})

// ─── Alergia ────────────────────────────────────────────────────────
export const allergySchema = z.object({
  id: z.string(),
  substance: z.string().min(2, 'Substância obrigatória').max(120),
  type: z.enum(['medication', 'food', 'environmental', 'other']),
  reaction: z.string().max(300).optional().or(z.literal('')),
  severity: z.enum(['mild', 'moderate', 'severe', 'critical']),
})

export const continuousMedicationSchema = z.object({
  id: z.string(),
  name: z.string().min(2, 'Nome obrigatório').max(120),
  dosage: z.string().max(60).optional().or(z.literal('')),
  frequency: z.string().max(60).optional().or(z.literal('')),
})

export const clinicalDataSchema = z.object({
  bloodType: z.enum(['A+','A-','B+','B-','AB+','AB-','O+','O-','unknown']).optional(),
  allergies: z.array(allergySchema),
  chronicConditions: z.array(z.string()),
  continuousMedications: z.array(continuousMedicationSchema),
  disabilities: z.string().max(300).optional().or(z.literal('')),
  needsPriority: z.boolean().optional(),
  organDonor: z.boolean().optional(),
  notes: z.string().max(500).optional().or(z.literal('')),
})

// ─── Schema principal ────────────────────────────────────────────────
export const patientFormSchema = z
  .object({
    // Personal
    fullName: z.string().refine(isValidName, 'Informe nome completo'),
    socialName: z.string().max(200).optional().or(z.literal('')),
    cpf: z.string().optional().or(z.literal('')).refine(v => !v || isValidCPF(v), 'CPF inválido'),
    rg: z.string().max(20).optional().or(z.literal('')),
    rgIssuer: z.string().max(20).optional().or(z.literal('')),
    rgState: z.string().max(2).optional().or(z.literal('')),
    rgIssueDate: z.string().optional().or(z.literal('')),
    birthDate: z.string().min(1, 'Data de nascimento obrigatória'),
    birthCity: z.string().max(120).optional().or(z.literal('')),
    birthState: z.string().length(2).optional().or(z.literal('')),
    nationality: z.string().max(60).optional().or(z.literal('')),
    gender: z.enum(['male', 'female', 'other', 'not_informed']),
    ethnicity: z.enum(['white','black','brown','yellow','indigenous','not_informed']).optional(),
    maritalStatus: z.enum(['single','married','divorced','widowed','stable_union','other']).optional(),
    education: z.enum(['no_education','elementary_incomplete','elementary_complete','high_school_incomplete','high_school_complete','higher_incomplete','higher_complete','postgraduate']).optional(),
    motherName: z.string().max(200).optional().or(z.literal('')),
    fatherName: z.string().max(200).optional().or(z.literal('')),
    status: z.enum(['active', 'inactive', 'blocked', 'deceased']),

    // Contact
    phone1: z.string().min(10, 'Telefone obrigatório'),
    phone1Type: z.enum(['mobile', 'landline']),
    phone2: z.string().optional().or(z.literal('')),
    phone2Type: z.enum(['mobile', 'landline']).optional(),
    phone3: z.string().optional().or(z.literal('')),
    email: z.string().refine(v => !v || isValidEmail(v), 'E-mail inválido').optional().or(z.literal('')),
    emailSecondary: z.string().refine(v => !v || isValidEmail(v), 'E-mail inválido').optional().or(z.literal('')),
    address: addressSchema.optional(),
    occupation: z.string().max(120).optional().or(z.literal('')),
    employer: z.string().max(200).optional().or(z.literal('')),
    workPhone: z.string().optional().or(z.literal('')),

    // Insurance
    convenios: z.array(convenioSchema),

    // Responsible (only required if minor)
    responsible: responsibleSchema.optional(),

    // Clinical
    clinicalData: clinicalDataSchema,

    // Notes
    referralSource: z.string().max(120).optional().or(z.literal('')),
    referralBy: z.string().max(200).optional().or(z.literal('')),
    generalNotes: z.string().max(2000).optional().or(z.literal('')),
    internalAlerts: z
      .object({
        message: z.string().max(300),
        color: z.enum(['red', 'yellow', 'blue']),
      })
      .optional(),
    financialNotes: z.string().max(1000).optional().or(z.literal('')),
    tags: z.array(z.string()),
  })
  .superRefine((data, ctx) => {
    // Responsável obrigatório se menor de idade
    if (data.birthDate) {
      const b = new Date(data.birthDate)
      if (!Number.isNaN(b.getTime())) {
        const t = new Date()
        let age = t.getFullYear() - b.getFullYear()
        const m = t.getMonth() - b.getMonth()
        if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--
        if (age < 18) {
          if (!data.responsible || !data.responsible.name || !data.responsible.cpf) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['responsible', 'name'],
              message: 'Responsável é obrigatório para pacientes menores de 18 anos',
            })
          }
        }
      }
    }
  })

export type PatientFormValues = z.infer<typeof patientFormSchema>

export const emptyPatientForm = (): PatientFormValues => ({
  fullName: '',
  socialName: '',
  cpf: '',
  rg: '',
  rgIssuer: '',
  rgState: '',
  rgIssueDate: '',
  birthDate: '',
  birthCity: '',
  birthState: '',
  nationality: 'Brasileira',
  gender: 'not_informed',
  ethnicity: undefined,
  maritalStatus: undefined,
  education: undefined,
  motherName: '',
  fatherName: '',
  status: 'active',
  phone1: '',
  phone1Type: 'mobile',
  phone2: '',
  phone2Type: undefined,
  phone3: '',
  email: '',
  emailSecondary: '',
  address: { cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' },
  occupation: '',
  employer: '',
  workPhone: '',
  convenios: [],
  responsible: undefined,
  clinicalData: {
    bloodType: undefined,
    allergies: [],
    chronicConditions: [],
    continuousMedications: [],
    disabilities: '',
    needsPriority: false,
    organDonor: false,
    notes: '',
  },
  referralSource: '',
  referralBy: '',
  generalNotes: '',
  internalAlerts: undefined,
  financialNotes: '',
  tags: [],
})
