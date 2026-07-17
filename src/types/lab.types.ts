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
  workbench?: string; // e.g., 'Hematologia', 'Bioquímica'
  requiresCollection?: boolean;
}

export interface LabAttendanceOrder extends AttendanceOrder {
  originId: string;
  originCode: number;
  protocol: string;
  exams: {
    examId: string;
    code: string;
    name: string;
    material: string;
    status: 'pending' | 'collected' | 'processing' | 'validated' | 'cancelled';
    isCobrado: boolean;
    isColeta: boolean;
    previsaoEntrega: string;
    valor: number;
    workbench?: string;
    result?: string;
    unit?: string;
    reference?: string;
    history?: { value: string; date: string };
  }[];
  collectionStatus?: 'waiting' | 'in_progress' | 'collected' | 'cancelled';
  collectionResponsible?: string;
  collectionObservations?: string;
  collectionTime?: string;
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
