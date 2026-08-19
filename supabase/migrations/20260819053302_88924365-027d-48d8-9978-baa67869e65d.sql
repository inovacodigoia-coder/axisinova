CREATE TABLE public.lab_report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  header_html text,
  body_html text,
  footer_html text,
  is_default boolean NOT NULL DEFAULT false,
  single_page boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_report_templates TO authenticated;
GRANT ALL ON public.lab_report_templates TO service_role;

ALTER TABLE public.lab_report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members manage report templates"
ON public.lab_report_templates FOR ALL TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()))
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE TRIGGER update_lab_report_templates_updated_at
BEFORE UPDATE ON public.lab_report_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS report_template_id uuid REFERENCES public.lab_report_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS report_single_page boolean NOT NULL DEFAULT false;