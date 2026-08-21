CREATE OR REPLACE FUNCTION public.is_company_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id
      AND coalesce(p.is_active, true)
      AND (p.is_admin = true OR p.role IN ('company_admin','super_admin'))
  );
$$;

DROP POLICY IF EXISTS "Company admins create integration keys" ON public.instrument_integration_keys;
DROP POLICY IF EXISTS "Company admins update integration keys" ON public.instrument_integration_keys;
DROP POLICY IF EXISTS "Company admins delete integration keys" ON public.instrument_integration_keys;
DROP POLICY IF EXISTS "Company admins view integration keys" ON public.instrument_integration_keys;

CREATE POLICY "Company managers view integration keys"
ON public.instrument_integration_keys FOR SELECT TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()) AND public.is_company_manager(auth.uid()));

CREATE POLICY "Company managers create integration keys"
ON public.instrument_integration_keys FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.is_company_manager(auth.uid()));

CREATE POLICY "Company managers update integration keys"
ON public.instrument_integration_keys FOR UPDATE TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()) AND public.is_company_manager(auth.uid()))
WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.is_company_manager(auth.uid()));

CREATE POLICY "Company managers delete integration keys"
ON public.instrument_integration_keys FOR DELETE TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()) AND public.is_company_manager(auth.uid()));