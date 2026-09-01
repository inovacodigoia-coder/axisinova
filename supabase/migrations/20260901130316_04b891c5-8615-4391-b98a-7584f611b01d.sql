CREATE TABLE public.integration_oauth_clients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  client_id text NOT NULL UNIQUE,
  secret_hash text NOT NULL,
  scopes text[] NOT NULL DEFAULT ARRAY['exams:read','orders:read','results:write']::text[],
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_oauth_clients TO authenticated;
GRANT ALL ON public.integration_oauth_clients TO service_role;

ALTER TABLE public.integration_oauth_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "oauth_clients_select_own_company"
ON public.integration_oauth_clients FOR SELECT TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "oauth_clients_update_managers"
ON public.integration_oauth_clients FOR UPDATE TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()) AND public.is_company_manager(auth.uid()))
WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.is_company_manager(auth.uid()));

CREATE POLICY "oauth_clients_delete_managers"
ON public.integration_oauth_clients FOR DELETE TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()) AND public.is_company_manager(auth.uid()));

CREATE INDEX idx_oauth_clients_company ON public.integration_oauth_clients(company_id);