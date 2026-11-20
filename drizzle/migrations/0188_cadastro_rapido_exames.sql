ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS cadastro_rapido_exames boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.cadastro_rapido_situacao(p_company uuid DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := coalesce(p_company, public.get_user_company_id(auth.uid()));
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF v_company IS DISTINCT FROM public.get_user_company_id(auth.uid()) AND NOT private.is_super_admin() THEN
    RETURN false;
  END IF;
  RETURN coalesce((SELECT cadastro_rapido_exames FROM public.companies WHERE id = v_company), false);
END $$;
REVOKE EXECUTE ON FUNCTION public.cadastro_rapido_situacao(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cadastro_rapido_situacao(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.cadastro_rapido_definir(p_company uuid, p_ativo boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR p_ativo IS NULL THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501';
  END IF;
  IF NOT (private.is_super_admin()
      OR (public.is_company_manager(auth.uid()) AND p_company = public.get_user_company_id(auth.uid()))) THEN
    RAISE EXCEPTION 'Só o administrador da empresa pode mudar esta opção' USING ERRCODE = '42501';
  END IF;
  UPDATE public.companies SET cadastro_rapido_exames = p_ativo WHERE id = p_company;
  IF NOT FOUND THEN RAISE EXCEPTION 'Empresa não encontrada'; END IF;
  RETURN p_ativo;
END $$;
REVOKE EXECUTE ON FUNCTION public.cadastro_rapido_definir(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cadastro_rapido_definir(uuid, boolean) TO authenticated;