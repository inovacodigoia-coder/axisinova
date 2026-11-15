-- Soroteca: módulo desativado vale para todos da empresa (sem exceção de administrador/TI).
-- Ligar/desligar deixa de ser da própria empresa: só Super Admin.
CREATE OR REPLACE FUNCTION public.soroteca_pode_ativar()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT auth.uid() IS NOT NULL AND private.is_super_admin();
$$;
REVOKE EXECUTE ON FUNCTION public.soroteca_pode_ativar() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_pode_ativar() TO authenticated;

CREATE OR REPLACE FUNCTION public.soroteca_tem_permissao(p_codigo text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT auth.uid() IS NOT NULL
    AND public.soroteca_modulo_ativo()
    AND (
    public.is_company_manager(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.sector_users su
      JOIN public.company_sectors cs ON cs.id = su.sector_id AND coalesce(cs.is_active, true)
      JOIN public.access_profiles ap ON ap.id = ANY(cs.allowed_profile_ids::text[]) AND coalesce(ap.is_active, true)
      WHERE su.user_id = auth.uid()
        AND ap.company_id = public.get_user_company_id(auth.uid())
        AND (coalesce(ap.permissions->'soroteca', '[]'::jsonb) ? p_codigo
          OR (p_codigo = 'soroteca.ver' AND coalesce(ap.permissions->'soroteca', '[]'::jsonb)
              ?| ARRAY['soroteca.armazenar', 'soroteca.descartar', 'soroteca.configurar']))));
$$;

CREATE OR REPLACE FUNCTION public.soroteca_modulo_definir(p_ativo boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid());
BEGIN
  IF NOT public.soroteca_pode_ativar() THEN
    RAISE EXCEPTION 'Só o Super Admin pode ativar ou desativar a Soroteca' USING ERRCODE = '42501';
  END IF;
  IF v_company IS NULL OR p_ativo IS NULL THEN RAISE EXCEPTION 'Empresa não identificada'; END IF;
  INSERT INTO public.soroteca_modulo (company_id, ativo, alterado_por, alterado_por_nome, alterado_em)
  VALUES (v_company, p_ativo, auth.uid(), public.soroteca__usuario_nome(), now())
  ON CONFLICT (company_id) DO UPDATE SET ativo = EXCLUDED.ativo, alterado_por = EXCLUDED.alterado_por,
    alterado_por_nome = EXCLUDED.alterado_por_nome, alterado_em = now();
  RETURN p_ativo;
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_modulo_definir(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_modulo_definir(boolean) TO authenticated;
