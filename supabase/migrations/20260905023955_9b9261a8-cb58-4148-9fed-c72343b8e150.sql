CREATE TABLE public.api_partners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type text NOT NULL,
  name text NOT NULL,
  document text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  notes text,
  auth_method text NOT NULL DEFAULT 'oauth2',
  api_authorized boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  credentials jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_partners TO authenticated;
GRANT ALL ON public.api_partners TO service_role;

ALTER TABLE public.api_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members manage their api partners"
ON public.api_partners FOR ALL TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()))
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE INDEX idx_api_partners_company ON public.api_partners(company_id);

CREATE TRIGGER update_api_partners_updated_at
BEFORE UPDATE ON public.api_partners
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();