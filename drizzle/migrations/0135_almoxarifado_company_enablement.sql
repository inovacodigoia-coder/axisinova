ALTER TABLE public.companies ADD COLUMN almoxarifado_habilitado boolean NOT NULL DEFAULT false;
ALTER TABLE public.companies ALTER COLUMN financeiro_habilitado SET DEFAULT false;
CREATE OR REPLACE FUNCTION public.almox_modulo_liberado() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.companies c WHERE c.id=public.get_user_company_id(auth.uid()) AND c.almoxarifado_habilitado);
$$;
REVOKE EXECUTE ON FUNCTION public.almox_modulo_liberado() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.almox_modulo_liberado() TO authenticated;
CREATE OR REPLACE FUNCTION public.almox_permissao(_acao text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.almox_modulo_liberado() AND (public.is_company_manager(auth.uid()) OR EXISTS (
 SELECT 1 FROM sector_users su JOIN company_sectors s ON s.id=su.sector_id AND s.company_id=public.get_user_company_id(auth.uid()) AND coalesce(s.is_active,true)
 JOIN access_profiles p ON p.id=ANY(s.allowed_profile_ids::text[]) AND p.company_id=s.company_id AND coalesce(p.is_active,true)
 WHERE su.user_id=auth.uid() AND coalesce(p.permissions->'inventory','[]'::jsonb) ? _acao));
$$;
CREATE OR REPLACE FUNCTION public.almox_setor_acesso(_setor text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.almox_modulo_liberado() AND EXISTS(SELECT 1 FROM company_sectors s WHERE s.id=_setor AND s.company_id=public.get_user_company_id(auth.uid()) AND coalesce(s.is_active,true) AND (public.is_company_manager(auth.uid()) OR EXISTS(SELECT 1 FROM sector_users u WHERE u.sector_id=s.id AND u.user_id=auth.uid() AND u.company_id=s.company_id)));
$$;
REVOKE EXECUTE ON FUNCTION public.almox_permissao(text),public.almox_setor_acesso(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.almox_permissao(text),public.almox_setor_acesso(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.almox_setor_opcoes_iniciais() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
 BEGIN
 NEW.module_overrides:=coalesce(NEW.module_overrides,'{}'::jsonb)||jsonb_build_object('/app/estoque/solicitacoes',NEW.id='sec_admin_'||replace(NEW.company_id::text,'-',''),'/app/farmacia/solicitacoes',NEW.id='sec_admin_'||replace(NEW.company_id::text,'-',''));
 RETURN NEW;
 END;
$$;
REVOKE EXECUTE ON FUNCTION public.almox_setor_opcoes_iniciais() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER almox_setor_opcoes_iniciais BEFORE INSERT ON public.company_sectors FOR EACH ROW EXECUTE FUNCTION public.almox_setor_opcoes_iniciais();