CREATE OR REPLACE FUNCTION public.chat_interno_colegas()
RETURNS TABLE(id uuid, nome text)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT p.id, coalesce(nullif(btrim(p.full_name), ''), 'Colega') AS nome
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND public.chat_interno_ativo(public.get_user_company_id(auth.uid()))
    AND p.company_id = public.get_user_company_id(auth.uid())
    AND p.is_active
    AND p.id <> auth.uid()
  ORDER BY nome
$$;

REVOKE ALL ON FUNCTION public.chat_interno_colegas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.chat_interno_colegas() TO authenticated, service_role;