import { AttendanceOrder } from './attendance-cadastro.types';

export interface CompanyModules {
  softClinica: boolean;
  softLaboratorio: boolean;
  softHospital: boolean;
}

export interface Origin {
  id: string;
  originCode: number;
  name: string;
  companyId: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
}

export interface ProtocolNumber {
  raw: string;
  patientId: string;
  sequence: number;
  originCode: number;
  formatted: string;
}

export type ResultStatus = 'normal' | 'attention' | 'altered' | 'critical' | 'calculated';

export interface LabExam {
  id: string;
  code: string;
  name: string;
  tussCode: string;
  material: string;
  deadlineDays: number;
  price: number;
  alertTitle?: string;
  alertMessage?: string;
  workbench?: string;
  requiresCollection?: boolean;
  parameters?: LabParameter[];
  validationRules?: {
    validateSum?: boolean;
    sumParameters?: string[]; // IDs of parameters
    expectedSum?: number;
    deltaCheckEnabled?: boolean;
    deltaMaxVariation?: number; // percentage
    deltaPreviousResultsCount?: number;
  };
}

export interface LabParameter {
  id: string;
  code: string;
  name: string;
  unit: string;
  type: 'editable' | 'calculated';
  formula?: string;
  references?: LabReferenceRange[];
  criticalMin?: number;
  criticalMax?: number;
  criticalAction?: 'alert' | 'email' | 'sms' | 'both';
}

export interface LabReferenceRange {
  id: string;
  sex: 'M' | 'F' | 'Both';
  ageMin: number;
  ageMax: number;
  ageUnit: 'days' | 'months' | 'years';
  min: number;
  max: number;
  description?: string;
}

export interface LabAttendanceOrder extends AttendanceOrder {
  originId: string;
  originCode: number;
  protocol: string;
  patientBirthDate: string;
  patientGender: 'M' | 'F' | 'Other';
  exams: {
    examId: string;
    code: string;
    name: string;
    material: string;
    status: 'pending' | 'processing' | 'waiting_approval' | 'validated' | 'cancelled' | 'retest_requested' | 'waiting_recollection';
    isCobrado: boolean;
    isColeta: boolean;
    previsaoEntrega: string;
    valor: number;
    workbench?: string;
    results?: {
      parameterId: string;
      parameterCode: string;
      value: string;
      status: ResultStatus;
      wasCalculated: boolean;
      deltaCheckOverride?: boolean;
      deltaCheckJustification?: string;
      notifiedCritical?: boolean;
      notifiedAt?: string;
    }[];
    internalObservations?: string;
    isRetificado?: boolean;
    retificationHistory?: {
      previousValue: any;
      newValue: any;
      reason: string;
      userId: string;
      userName: string;
      timestamp: string;
    }[];
  }[];
  collectionStatus?: 'waiting' | 'in_progress' | 'collected' | 'cancelled';
  collectionResponsible?: string;
  collectionObservations?: string;
  collectionTime?: string;
  auditTrail?: {
    action: 'opened' | 'confirmed' | 'cancelled' | 'postponed' | 'reprinted';
    timestamp: string;
    userId: string;
    userName: string;
    details?: string;
  }[];
}

export interface LabTube {
  type: string;
  color: string;
  label: string;
  volume: string;
  exams: string[]; // List of exam names
  tag: string; // [protocol]-[sequence]
}

export const TUBE_TYPES = [
  { type: 'gel', color: 'bg-yellow-400', label: 'Gel Separador', volume: '5mL', hex: '#FACC15' },
  { type: 'edta', color: 'bg-purple-600', label: 'EDTA', volume: '4mL', hex: '#9333EA' },
  { type: 'citrato', color: 'bg-gray-400', label: 'Plasma Citratado', volume: '3mL', hex: '#9CA3AF' },
  { type: 'urina', color: 'bg-orange-500', label: 'Frasco de Urina', volume: '50mL', hex: '#F97316' },
];
