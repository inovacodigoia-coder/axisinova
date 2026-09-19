CREATE TABLE public.hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE (company_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospitals TO authenticated;
GRANT ALL ON public.hospitals TO service_role;

ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members manage hospitals"
ON public.hospitals FOR ALL TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()))
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE TABLE public.hospital_sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE (hospital_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospital_sectors TO authenticated;
GRANT ALL ON public.hospital_sectors TO service_role;

ALTER TABLE public.hospital_sectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members manage hospital sectors"
ON public.hospital_sectors FOR ALL TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()))
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE INDEX idx_hospital_sectors_hospital ON public.hospital_sectors (hospital_id);

ALTER TABLE public.attendance_orders
  ADD COLUMN fasting_start_hour TEXT,
  ADD COLUMN fasting_type TEXT,
  ADD COLUMN hospital_id UUID,
  ADD COLUMN hospital_name TEXT,
  ADD COLUMN hospital_sector_id UUID,
  ADD COLUMN hospital_sector_name TEXT,
  ADD COLUMN bed TEXT,
  ADD COLUMN medical_record_number TEXT;