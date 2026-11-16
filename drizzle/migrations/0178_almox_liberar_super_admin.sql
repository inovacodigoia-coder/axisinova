CREATE OR REPLACE FUNCTION public.almox_liberar(_company uuid, _habilitado boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_super_admin() THEN
    RAISE EXCEPTION 'Só o Super Admin pode ativar ou desativar o Almoxarifado' USING ERRCODE = '42501';
  END IF;
  IF _habilitado IS NULL THEN RAISE EXCEPTION 'Informe ligado ou desligado'; END IF;
  UPDATE public.companies SET almoxarifado_habilitado = _habilitado WHERE id = _company;
  IF NOT FOUND THEN RAISE EXCEPTION 'Empresa não encontrada'; END IF;
  RETURN _habilitado;
END $$;
REVOKE EXECUTE ON FUNCTION public.almox_liberar(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.almox_liberar(uuid, boolean) TO authenticated;