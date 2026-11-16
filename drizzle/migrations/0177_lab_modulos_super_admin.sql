-- Super Admin: situação e liga/desliga dos módulos do laboratório de QUALQUER empresa
CREATE OR REPLACE FUNCTION public.lab_modulos_situacao(p_company uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_super_admin() THEN
    RAISE EXCEPTION 'Só o Super Admin pode ver a liberação dos módulos' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'soroteca', coalesce((SELECT ativo FROM public.soroteca_modulo WHERE company_id = p_company), false),
    'painel', coalesce((SELECT ativo FROM public.lab_painel_modulo WHERE company_id = p_company), false),
    'relatorios', coalesce((SELECT ativo FROM public.lab_relatorios_modulo WHERE company_id = p_company), false));
END $$;
REVOKE EXECUTE ON FUNCTION public.lab_modulos_situacao(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lab_modulos_situacao(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.lab_modulo_definir(p_company uuid, p_modulo text, p_ativo boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_super_admin() THEN
    RAISE EXCEPTION 'Só o Super Admin pode ativar ou desativar este módulo' USING ERRCODE = '42501';
  END IF;
  IF p_ativo IS NULL OR NOT EXISTS (SELECT 1 FROM public.companies WHERE id = p_company) THEN
    RAISE EXCEPTION 'Empresa não encontrada';
  END IF;
  IF p_modulo = 'soroteca' THEN
    INSERT INTO public.soroteca_modulo (company_id, ativo, alterado_por, alterado_por_nome, alterado_em)
    VALUES (p_company, p_ativo, auth.uid(), public.soroteca__usuario_nome(), now())
    ON CONFLICT (company_id) DO UPDATE SET ativo = EXCLUDED.ativo, alterado_por = EXCLUDED.alterado_por,
      alterado_por_nome = EXCLUDED.alterado_por_nome, alterado_em = now();
  ELSIF p_modulo = 'painel' THEN
    INSERT INTO public.lab_painel_modulo (company_id, ativo, alterado_por, alterado_em)
    VALUES (p_company, p_ativo, auth.uid(), now())
    ON CONFLICT (company_id) DO UPDATE SET ativo = EXCLUDED.ativo, alterado_por = EXCLUDED.alterado_por, alterado_em = now();
  ELSIF p_modulo = 'relatorios' THEN
    INSERT INTO public.lab_relatorios_modulo (company_id, ativo, alterado_por, alterado_em)
    VALUES (p_company, p_ativo, auth.uid(), now())
    ON CONFLICT (company_id) DO UPDATE SET ativo = EXCLUDED.ativo, alterado_por = EXCLUDED.alterado_por, alterado_em = now();
  ELSE
    RAISE EXCEPTION 'Módulo desconhecido';
  END IF;
  RETURN p_ativo;
END $$;
REVOKE EXECUTE ON FUNCTION public.lab_modulo_definir(uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lab_modulo_definir(uuid, text, boolean) TO authenticated;