CREATE TABLE public.triage_settings (
  company_id uuid PRIMARY KEY,
  reclassification_mode text NOT NULL DEFAULT 'manual',
  wristband_width_mm integer NOT NULL DEFAULT 25,
  wristband_height_mm integer NOT NULL DEFAULT 250,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.triage_settings TO authenticated;
GRANT ALL ON public.triage_settings TO service_role;
ALTER TABLE public.triage_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "triage_settings_company" ON public.triage_settings FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE TABLE public.triage_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  source text NOT NULL DEFAULT 'direct',
  ticket_id uuid,
  ticket_code text,
  patient_id uuid,
  patient_name text NOT NULL,
  patient_cpf text,
  patient_birth_date date,
  protocol text,
  order_id uuid,
  status text NOT NULL DEFAULT 'waiting',
  complaint text,
  flowchart text,
  discriminators jsonb NOT NULL DEFAULT '[]'::jsonb,
  vitals jsonb NOT NULL DEFAULT '{}'::jsonb,
  color text,
  target_minutes integer,
  classified_at timestamptz,
  classified_by uuid,
  arrived_at timestamptz NOT NULL DEFAULT now(),
  wristband_printed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.triage_entries TO authenticated;
GRANT ALL ON public.triage_entries TO service_role;
ALTER TABLE public.triage_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "triage_entries_company" ON public.triage_entries FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));
CREATE INDEX idx_triage_entries_company_status ON public.triage_entries (company_id, status, created_at DESC);
CREATE TRIGGER update_triage_entries_updated_at BEFORE UPDATE ON public.triage_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.triage_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  entry_id uuid NOT NULL REFERENCES public.triage_entries(id) ON DELETE CASCADE,
  color text NOT NULL,
  target_minutes integer NOT NULL,
  reason text NOT NULL DEFAULT 'initial',
  notes text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.triage_classifications TO authenticated;
GRANT ALL ON public.triage_classifications TO service_role;
ALTER TABLE public.triage_classifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "triage_classifications_company" ON public.triage_classifications FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));
CREATE INDEX idx_triage_classifications_entry ON public.triage_classifications (entry_id, created_at);

CREATE TABLE public.triage_wristband_prints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  entry_id uuid NOT NULL REFERENCES public.triage_entries(id) ON DELETE CASCADE,
  is_reprint boolean NOT NULL DEFAULT false,
  reason text,
  printed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.triage_wristband_prints TO authenticated;
GRANT ALL ON public.triage_wristband_prints TO service_role;
ALTER TABLE public.triage_wristband_prints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "triage_wristband_prints_company" ON public.triage_wristband_prints FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));
CREATE INDEX idx_triage_wristband_prints_entry ON public.triage_wristband_prints (entry_id, created_at DESC);