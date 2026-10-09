CREATE OR REPLACE FUNCTION public.inovachat_meu_acesso() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'ver', public.inovachat_ativo(public.get_user_company_id(auth.uid())) AND public.inovachat_tem_permissao('inovachat.visualizar'),
    'gerenciar', public.inovachat_ativo(public.get_user_company_id(auth.uid())) AND public.inovachat_tem_permissao('inovachat.gerenciar'))
$$;
REVOKE ALL ON FUNCTION public.inovachat_meu_acesso() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.inovachat_meu_acesso() TO authenticated;