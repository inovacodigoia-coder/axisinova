CREATE TABLE public.sector_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sector_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, sector_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sector_users TO authenticated;
GRANT ALL ON public.sector_users TO service_role;

ALTER TABLE public.sector_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view sector users"
ON public.sector_users FOR SELECT TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Company members can add sector users"
ON public.sector_users FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Company members can update sector users"
ON public.sector_users FOR UPDATE TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()))
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Company members can remove sector users"
ON public.sector_users FOR DELETE TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()));