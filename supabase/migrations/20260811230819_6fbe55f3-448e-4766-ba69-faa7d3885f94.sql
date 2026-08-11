CREATE TABLE public.lab_exam_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  order_id uuid,
  protocol text,
  exam_ref text NOT NULL,
  exam_catalog_id uuid,
  exam_code text,
  exam_name text,
  patient_id uuid,
  patient_name text,
  status text NOT NULL DEFAULT 'digitized',
  notes text,
  version integer NOT NULL DEFAULT 1,
  typed_by uuid,
  typed_at timestamptz,
  released_by uuid,
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, exam_ref)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_exam_results TO authenticated;
GRANT ALL ON public.lab_exam_results TO service_role;
ALTER TABLE public.lab_exam_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members manage lab exam results"
ON public.lab_exam_results FOR ALL TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()))
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE TRIGGER update_lab_exam_results_updated_at
BEFORE UPDATE ON public.lab_exam_results
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.lab_result_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  result_id uuid NOT NULL REFERENCES public.lab_exam_results(id) ON DELETE CASCADE,
  parameter_key text NOT NULL,
  parameter_name text,
  value text,
  unit text,
  reference text,
  status text,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (result_id, parameter_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_result_values TO authenticated;
GRANT ALL ON public.lab_result_values TO service_role;
ALTER TABLE public.lab_result_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members manage lab result values"
ON public.lab_result_values FOR ALL TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()))
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE TRIGGER update_lab_result_values_updated_at
BEFORE UPDATE ON public.lab_result_values
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_lab_exam_results_order ON public.lab_exam_results(order_id);
CREATE INDEX idx_lab_result_values_result ON public.lab_result_values(result_id);