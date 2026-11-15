-- Soroteca ligada/desligada por empresa. Desligada: só TI/Administração (e o administrador da empresa) continua vendo, para religar no treinamento.
CREATE TABLE public.soroteca_modulo (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id),
  ativo boolean NOT NULL DEFAULT false,
  alterado_por uuid,
  alterado_por_nome text,
  alterado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.soroteca_modulo TO authenticated;
GRANT ALL ON public.soroteca_modulo TO service_role;
ALTER TABLE public.soroteca_modulo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Soroteca lê situação do módulo da própria empresa" ON public.soroteca_modulo FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

-- Só a labsaude começa ativa; as demais (e as novas) começam desativadas
INSERT INTO public.soroteca_modulo (company_id, ativo, alterado_por_nome)
SELECT id, true, 'Ativação inicial' FROM public.companies WHERE id = '7858af33-878e-40c4-9305-e912cc6655c3';

-- TI/Administração: administrador da empresa ou usuário em setor com o perfil "TI – Administração"
CREATE OR REPLACE FUNCTION public.soroteca_pode_ativar()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_company_manager(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.sector_users su
      JOIN public.company_sectors cs ON cs.id = su.sector_id AND coalesce(cs.is_active, true)
      JOIN public.access_profiles ap ON ap.id = ANY(cs.allowed_profile_ids::text[]) AND coalesce(ap.is_active, true)
      WHERE su.user_id = auth.uid()
        AND ap.company_id = public.get_user_company_id(auth.uid())
        AND ap.name ILIKE 'TI%Administra%'));
$$;
REVOKE EXECUTE ON FUNCTION public.soroteca_pode_ativar() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_pode_ativar() TO authenticated;

CREATE OR REPLACE FUNCTION public.soroteca_modulo_ativo()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce((SELECT ativo FROM public.soroteca_modulo WHERE company_id = public.get_user_company_id(auth.uid())), false);
$$;
REVOKE EXECUTE ON FUNCTION public.soroteca_modulo_ativo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_modulo_ativo() TO authenticated;

-- Permissão da Soroteca agora exige o módulo ativo na empresa (exceto TI/Administração)
CREATE OR REPLACE FUNCTION public.soroteca_tem_permissao(p_codigo text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT auth.uid() IS NOT NULL
    AND (public.soroteca_modulo_ativo() OR public.soroteca_pode_ativar())
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

CREATE OR REPLACE FUNCTION public.soroteca_acesso()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT jsonb_build_object(
    'ver', public.soroteca_tem_permissao('soroteca.ver'),
    'armazenar', public.soroteca_tem_permissao('soroteca.armazenar'),
    'descartar', public.soroteca_tem_permissao('soroteca.descartar'),
    'configurar', public.soroteca_tem_permissao('soroteca.configurar'),
    'modulo_ativo', public.soroteca_modulo_ativo(),
    'pode_ativar', public.soroteca_pode_ativar());
$$;

-- Ligar/desligar o módulo na própria empresa (só TI/Administração)
CREATE OR REPLACE FUNCTION public.soroteca_modulo_definir(p_ativo boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid());
BEGIN
  IF NOT public.soroteca_pode_ativar() THEN
    RAISE EXCEPTION 'Só TI/Administração pode ativar ou desativar a Soroteca' USING ERRCODE = '42501';
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