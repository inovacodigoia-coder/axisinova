CREATE TABLE public.lab_work_maps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  sector text NOT NULL DEFAULT '',
  responsible text NOT NULL DEFAULT '',
  item_keys jsonb NOT NULL DEFAULT '[]'::jsonb,
  items_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_work_maps TO authenticated;
GRANT ALL ON public.lab_work_maps TO service_role;

ALTER TABLE public.lab_work_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage their work maps"
ON public.lab_work_maps FOR ALL TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()))
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE TRIGGER update_lab_work_maps_updated_at
BEFORE UPDATE ON public.lab_work_maps
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();