ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS patient_id uuid,
  ADD COLUMN IF NOT EXISTS patient_phone1 text,
  ADD COLUMN IF NOT EXISTS patient_phone2 text,
  ADD COLUMN IF NOT EXISTS doctor_id uuid,
  ADD COLUMN IF NOT EXISTS convenio_id text,
  ADD COLUMN IF NOT EXISTS convenio_name text,
  ADD COLUMN IF NOT EXISTS appointment_type text NOT NULL DEFAULT 'consultation',
  ADD COLUMN IF NOT EXISTS exam_id text,
  ADD COLUMN IF NOT EXISTS exam_name text,
  ADD COLUMN IF NOT EXISTS sched_status text NOT NULL DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS visit_type text NOT NULL DEFAULT 'first_visit',
  ADD COLUMN IF NOT EXISTS cancelled_reason text,
  ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
CREATE INDEX IF NOT EXISTS appointments_company_date_idx ON public.appointments(company_id, date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;