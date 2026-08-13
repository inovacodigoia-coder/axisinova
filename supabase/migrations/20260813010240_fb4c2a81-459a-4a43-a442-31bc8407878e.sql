REVOKE ALL ON FUNCTION public.initialize_company_access_defaults(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.initialize_company_access_defaults(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.initialize_company_access_defaults(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_company_access_defaults(uuid) TO service_role;