
-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Enum for appointment status
CREATE TYPE public.appointment_status AS ENUM ('confirmed', 'waiting', 'cancelled');

-- Enum for TISS guide status  
CREATE TYPE public.tiss_guide_status AS ENUM ('enviada', 'aprovada', 'pendente', 'glosada');

-- Companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Companies are viewable by authenticated users" ON public.companies FOR SELECT TO authenticated USING (true);

-- Patients table
CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cpf TEXT NOT NULL,
  birth_date DATE NOT NULL,
  phone TEXT NOT NULL,
  blood_type TEXT DEFAULT 'O+',
  allergies TEXT[] DEFAULT '{}',
  email TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients viewable by company members" ON public.patients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Patients insertable by authenticated" ON public.patients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Patients updatable by authenticated" ON public.patients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Patients deletable by authenticated" ON public.patients FOR DELETE TO authenticated USING (true);

-- Appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  doctor TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  type TEXT NOT NULL DEFAULT 'Consulta',
  duration INTEGER NOT NULL DEFAULT 30,
  status appointment_status NOT NULL DEFAULT 'confirmed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Appointments viewable by authenticated" ON public.appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Appointments insertable by authenticated" ON public.appointments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Appointments updatable by authenticated" ON public.appointments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Appointments deletable by authenticated" ON public.appointments FOR DELETE TO authenticated USING (true);

-- Medical records table
CREATE TABLE public.medical_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  doctor TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Consulta',
  diagnosis TEXT NOT NULL,
  notes TEXT NOT NULL,
  prescription TEXT,
  exams TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Records viewable by authenticated" ON public.medical_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Records insertable by authenticated" ON public.medical_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Records updatable by authenticated" ON public.medical_records FOR UPDATE TO authenticated USING (true);

-- TISS guides table
CREATE TABLE public.tiss_guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  guide_number TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  procedure_name TEXT NOT NULL,
  procedure_code TEXT,
  operator TEXT NOT NULL,
  value NUMERIC(10,2) NOT NULL DEFAULT 0,
  doctor TEXT NOT NULL,
  authorization_number TEXT,
  notes TEXT,
  status tiss_guide_status NOT NULL DEFAULT 'enviada',
  gloss_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.tiss_guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guides viewable by authenticated" ON public.tiss_guides FOR SELECT TO authenticated USING (true);
CREATE POLICY "Guides insertable by authenticated" ON public.tiss_guides FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Guides updatable by authenticated" ON public.tiss_guides FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Guides deletable by authenticated" ON public.tiss_guides FOR DELETE TO authenticated USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_medical_records_updated_at BEFORE UPDATE ON public.medical_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tiss_guides_updated_at BEFORE UPDATE ON public.tiss_guides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_patients_company ON public.patients(company_id);
CREATE INDEX idx_appointments_company_date ON public.appointments(company_id, date);
CREATE INDEX idx_medical_records_patient ON public.medical_records(patient_id);
CREATE INDEX idx_tiss_guides_company ON public.tiss_guides(company_id);
