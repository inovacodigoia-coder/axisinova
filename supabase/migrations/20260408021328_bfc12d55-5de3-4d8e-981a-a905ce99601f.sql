
-- Specialties table
CREATE TABLE public.specialties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Specialties viewable by authenticated" ON public.specialties FOR SELECT TO authenticated USING (true);
CREATE POLICY "Specialties insertable by authenticated" ON public.specialties FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Specialties updatable by authenticated" ON public.specialties FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Specialties deletable by authenticated" ON public.specialties FOR DELETE TO authenticated USING (true);

-- Doctors table
CREATE TABLE public.doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  full_name text NOT NULL,
  crm text NOT NULL,
  crm_state text NOT NULL DEFAULT '',
  specialty_ids text[] NOT NULL DEFAULT '{}',
  phone text,
  email text,
  birth_date text,
  photo text,
  enabled_convenio_ids text[] NOT NULL DEFAULT '{}',
  schedule_config jsonb,
  is_active boolean NOT NULL DEFAULT true,
  is_blocked boolean NOT NULL DEFAULT false,
  blocked_reason text,
  blocked_at text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Doctors viewable by authenticated" ON public.doctors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Doctors insertable by authenticated" ON public.doctors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Doctors updatable by authenticated" ON public.doctors FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Doctors deletable by authenticated" ON public.doctors FOR DELETE TO authenticated USING (true);

-- Convenios table
CREATE TABLE public.convenios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  ans_code text,
  type text NOT NULL DEFAULT 'health_plan',
  cnpj text,
  auth_phone text,
  email text,
  observations text,
  attachment_rules jsonb NOT NULL DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.convenios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Convenios viewable by authenticated" ON public.convenios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Convenios insertable by authenticated" ON public.convenios FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Convenios updatable by authenticated" ON public.convenios FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Convenios deletable by authenticated" ON public.convenios FOR DELETE TO authenticated USING (true);

-- Exams table
CREATE TABLE public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  tuss_code text,
  specialty_id text,
  preparation_instructions text,
  estimated_duration_minutes integer,
  result_deadline_days integer,
  requires_authorization boolean NOT NULL DEFAULT false,
  authorization_instructions text,
  attachment_rules jsonb NOT NULL DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Exams viewable by authenticated" ON public.exams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Exams insertable by authenticated" ON public.exams FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Exams updatable by authenticated" ON public.exams FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Exams deletable by authenticated" ON public.exams FOR DELETE TO authenticated USING (true);

-- Procedures table
CREATE TABLE public.procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  tuss_code text,
  type text NOT NULL DEFAULT 'clinical',
  specialty_id text,
  estimated_duration_minutes integer,
  requires_authorization boolean NOT NULL DEFAULT false,
  authorization_instructions text,
  requires_anesthesia boolean NOT NULL DEFAULT false,
  anesthesia_type text,
  pre_operative_instructions text,
  post_operative_instructions text,
  attachment_rules jsonb NOT NULL DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Procedures viewable by authenticated" ON public.procedures FOR SELECT TO authenticated USING (true);
CREATE POLICY "Procedures insertable by authenticated" ON public.procedures FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Procedures updatable by authenticated" ON public.procedures FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Procedures deletable by authenticated" ON public.procedures FOR DELETE TO authenticated USING (true);

-- Company branding table
CREATE TABLE public.company_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL UNIQUE,
  primary_color text NOT NULL DEFAULT '#00D4FF',
  secondary_color text NOT NULL DEFAULT '#7B2FF7',
  sidebar_bg text NOT NULL DEFAULT '#1E293B',
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.company_branding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Branding viewable by authenticated" ON public.company_branding FOR SELECT TO authenticated USING (true);
CREATE POLICY "Branding insertable by authenticated" ON public.company_branding FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Branding updatable by authenticated" ON public.company_branding FOR UPDATE TO authenticated USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON public.doctors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_company_branding_updated_at BEFORE UPDATE ON public.company_branding FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
