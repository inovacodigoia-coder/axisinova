CREATE OR REPLACE FUNCTION public.company_cnpj_exists(_cnpj text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.companies c WHERE c.cnpj = _cnpj);
$$;

CREATE OR REPLACE FUNCTION public.company_id_by_cnpj(_cnpj text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.id FROM public.companies c WHERE c.cnpj = _cnpj LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.company_cnpj_exists(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.company_id_by_cnpj(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.company_cnpj_exists(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.company_id_by_cnpj(text) TO anon, authenticated, service_role;