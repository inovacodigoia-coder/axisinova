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
  }[];
}
