
-- BI Hospitalar: permissões por código (bi_hospitalar.ver/exportar/configurar), padrão dos demais módulos

CREATE OR REPLACE FUNCTION public.bi_hospitalar_tem_permissao(_acao text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id = public.get_user_company_id(auth.uid()) AND c.bi_hospitalar_habilitado)
    AND (
      public.is_company_manager(auth.uid()) OR EXISTS (
        SELECT 1 FROM public.sector_users su
        JOIN public.company_sectors cs ON cs.id = su.sector_id AND coalesce(cs.is_active, true)
        JOIN public.access_profiles ap ON ap.id = ANY(cs.allowed_profile_ids::text[]) AND coalesce(ap.is_active, true)
        WHERE su.user_id = auth.uid()
          AND ap.company_id = public.get_user_company_id(auth.uid())
          AND coalesce(ap.permissions->'bi_hospitalar','[]'::jsonb) ? ('bi_hospitalar.' || _acao)));
$$;
REVOKE EXECUTE ON FUNCTION public.bi_hospitalar_tem_permissao(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bi_hospitalar_tem_permissao(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.bi_meu_acesso()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT jsonb_build_object(
    'ver', public.bi_hospitalar_tem_permissao('ver'),
    'exportar', public.bi_hospitalar_tem_permissao('exportar'),
    'configurar', public.bi_hospitalar_tem_permissao('configurar'));
$$;
REVOKE EXECUTE ON FUNCTION public.bi_meu_acesso() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bi_meu_acesso() TO authenticated;

-- Flag da empresa do usuário logado (para mostrar/ocultar o grupo em Perfis de Acesso)
CREATE OR REPLACE FUNCTION public.bi_hospitalar_habilitada()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.companies c WHERE c.id = public.get_user_company_id(auth.uid()) AND c.bi_hospitalar_habilitado);
$$;
REVOKE EXECUTE ON FUNCTION public.bi_hospitalar_habilitada() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bi_hospitalar_habilitada() TO authenticated;
