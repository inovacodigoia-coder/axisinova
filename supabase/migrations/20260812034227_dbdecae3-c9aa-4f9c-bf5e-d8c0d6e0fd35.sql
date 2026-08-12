CREATE TABLE public.lab_report_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  protocol TEXT NOT NULL,
  html TEXT NOT NULL,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, protocol)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_report_overrides TO authenticated;
GRANT ALL ON public.lab_report_overrides TO service_role;
ALTER TABLE public.lab_report_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company members can view report overrides" ON public.lab_report_overrides FOR SELECT TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "company members can write report overrides" ON public.lab_report_overrides FOR ALL TO authenticated USING (company_id = public.get_user_company_id(auth.uid())) WITH CHECK (company_id = public.get_user_company_id(auth.uid()));
CREATE TRIGGER update_lab_report_overrides_updated_at BEFORE UPDATE ON public.lab_report_overrides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();