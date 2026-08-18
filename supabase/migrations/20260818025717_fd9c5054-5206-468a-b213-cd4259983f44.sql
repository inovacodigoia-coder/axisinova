CREATE TABLE public.lab_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_methods TO authenticated;
GRANT ALL ON public.lab_methods TO service_role;

ALTER TABLE public.lab_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view lab methods" ON public.lab_methods
  FOR SELECT TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Company users can insert lab methods" ON public.lab_methods
  FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Company users can update lab methods" ON public.lab_methods
  FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Company users can delete lab methods" ON public.lab_methods
  FOR DELETE TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));

CREATE UNIQUE INDEX lab_methods_company_name_idx ON public.lab_methods (company_id, lower(name));

CREATE TRIGGER update_lab_methods_updated_at BEFORE UPDATE ON public.lab_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();